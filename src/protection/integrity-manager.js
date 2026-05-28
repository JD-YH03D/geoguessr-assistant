// ============================================
// INTEGRITY MANAGER
// Sistem proteksi untuk mencegah modifikasi script
// ============================================

import { APP_CONFIG, TIMING } from '../config/constants.js';
import { state, internals } from '../core/state.js';
import { telemetryInc } from '../core/telemetry.js';
import { Logger } from '../utils/logger.js';
import { safeGM_getValue, safeGM_setValue } from '../utils/storage.js';

const PROTECTION_OVERLAY_ID = 'btp-protection-overlay';

let integrityScheduledTimeout = null;
let lastRemoteFetchAt = 0;
let baselineFingerprints = null;

// --- Hash Functions ---

function fnv1aHash(input) {
  let hash = 0x811c9dc5;
  const str = String(input || '');
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
}

function compareSemanticVersion(a, b) {
  const pa = String(a || '0.0.0').split('.').map(v => parseInt(v, 10) || 0);
  const pb = String(b || '0.0.0').split('.').map(v => parseInt(v, 10) || 0);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

function bufferToHex(buffer) {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

async function generateScriptHash(sourceCode) {
  try {
    if (!sourceCode || typeof sourceCode !== 'string') return null;
    if (typeof crypto === 'undefined' || !crypto.subtle || typeof TextEncoder === 'undefined') {
      return null;
    }
    const data = new TextEncoder().encode(sourceCode);
    const digest = await crypto.subtle.digest('SHA-256', data);
    telemetryInc('protection.hashComputed');
    return bufferToHex(digest);
  } catch (e) {
    Logger.debug('Hash generation failed:', e?.message || 'unknown');
    return null;
  }
}

// --- Source Extraction ---

function getLocalRuntimeSource() {
  try {
    if (typeof GM_info !== 'undefined') {
      if (typeof GM_info.scriptSource === 'string' && GM_info.scriptSource.length > 100) {
        return GM_info.scriptSource;
      }
      if (typeof GM_info.script?.source === 'string' && GM_info.script.source.length > 100) {
        return GM_info.script.source;
      }
      if (typeof GM_info.script?.code === 'string' && GM_info.script.code.length > 100) {
        return GM_info.script.code;
      }
    }
  } catch (e) {
    Logger.warn('[Integrity] GM_info extraction error:', e?.message);
  }

  try {
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent || '';
      if (text.length > 500 &&
        text.includes('Bintang Toba Pro') &&
        text.includes('__btp_initialized')) {
        return text;
      }
    }
  } catch (e) { /* silent */ }

  try {
    const criticalFns = [
      typeof extractCoordinatesLegacyImpl === 'function' ? extractCoordinatesLegacyImpl : null,
      typeof handleKeydown === 'function' ? handleKeydown : null,
      typeof togglePanel === 'function' ? togglePanel : null,
      typeof startMonitoring === 'function' ? startMonitoring : null
    ].filter(Boolean);

    if (criticalFns.length >= 3) {
      const composite = criticalFns.map(fn => fn.toString()).join('\n');
      if (composite.length > 1000) return composite;
    }
  } catch (e) { /* silent */ }

  return null;
}

async function getLocalRuntimeSourceAsync() {
  const syncSource = getLocalRuntimeSource();
  if (syncSource) return syncSource;

  try {
    if (typeof GM_info !== 'undefined' && GM_info.script?.downloadURL) {
      const url = GM_info.script.downloadURL;
      const source = await new Promise((resolve, reject) => {
        if (typeof GM_xmlhttpRequest !== 'undefined') {
          GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            timeout: 8000,
            onload: (res) => {
              if (res.status === 200 && res.responseText?.length > 500) {
                resolve(res.responseText);
              } else {
                reject(new Error('HTTP ' + res.status));
              }
            },
            onerror: () => reject(new Error('Network error')),
            ontimeout: () => reject(new Error('Timeout'))
          });
        } else {
          reject(new Error('GM_xmlhttpRequest unavailable'));
        }
      });
      return source;
    }
  } catch (e) {
    Logger.debug('[Integrity] Self-fetch failed:', e?.message);
  }

  return null;
}

// --- Remote Fetch ---

async function fetchJsonWithTimeout(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = Math.max(1000, Number(timeoutMs) || TIMING.INTEGRITY_FETCH_TIMEOUT);

    if (typeof GM_xmlhttpRequest !== 'undefined') {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        headers: { 'Accept': 'application/json' },
        timeout,
        onload: (res) => {
          if (res.status >= 200 && res.status < 300) {
            try { resolve(JSON.parse(res.responseText)); }
            catch (e) { reject(new Error('Invalid JSON')); }
          } else {
            reject(new Error(`HTTP ${res.status}`));
          }
        },
        onerror: () => reject(new Error('Network error')),
        ontimeout: () => reject(new Error('Request timeout'))
      });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' }, signal: controller.signal })
      .then(res => {
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(resolve)
      .catch((e) => { clearTimeout(timer); reject(e); });
  });
}

async function loadRemoteVersionMetadata(forceRefresh = false) {
  const now = Date.now();
  const cache = safeGM_getValue(APP_CONFIG.STORAGE_KEYS.REMOTE_VERSION_CACHE, null);

  if (!forceRefresh && cache?.data && cache?.cachedAt && (now - cache.cachedAt) < TIMING.INTEGRITY_CACHE_TTL) {
    return cache.data;
  }

  if (!forceRefresh && (now - lastRemoteFetchAt) < TIMING.INTEGRITY_MIN_FETCH_GAP) {
    return cache?.data || null;
  }

  lastRemoteFetchAt = now;

  try {
    const data = await fetchJsonWithTimeout(APP_CONFIG.VERSION_METADATA_URL, TIMING.INTEGRITY_FETCH_TIMEOUT);
    const normalized = {
      version: String(data?.version || ''),
      hash: String(data?.hash || '').toLowerCase(),
      force: !!data?.force,
      message: String(data?.message || ''),
      build: {
        channel: String(data?.build?.channel || 'stable'),
        timestamp: String(data?.build?.timestamp || ''),
        runtime: String(data?.build?.runtime || APP_CONFIG.NAME),
        protection: !!data?.build?.protection
      }
    };

    if (!normalized.version || normalized.version === '0.0.0') {
      throw new Error('Invalid version manifest');
    }

    safeGM_setValue(APP_CONFIG.STORAGE_KEYS.REMOTE_VERSION_CACHE, { cachedAt: now, data: normalized });
    telemetryInc('protection.remoteFetchOk');
    return normalized;
  } catch (e) {
    telemetryInc('protection.remoteFetchFail');
    Logger.debug('Remote metadata fetch failed:', e?.message || 'unknown');
    return cache?.data || null;
  }
}

// --- Fingerprints ---

function buildProtectedFunctionFingerprint() {
  return {
    handleKeydown: fnv1aHash(typeof handleKeydown === 'function' ? handleKeydown.toString() : ''),
    togglePanel: fnv1aHash(typeof togglePanel === 'function' ? togglePanel.toString() : ''),
    extractCoordinatesLegacyImpl: fnv1aHash(typeof extractCoordinatesLegacyImpl === 'function' ? extractCoordinatesLegacyImpl.toString() : '')
  };
}

function buildConfigProtectionFingerprint() {
  const signature = [
    APP_CONFIG.NAME,
    APP_CONFIG.VERSION,
    APP_CONFIG.NOMINATIM_URL,
    APP_CONFIG.VERSION_METADATA_URL,
    TIMING.INTEGRITY_CHECK_INTERVAL,
    TIMING.INTEGRITY_HEARTBEAT_INTERVAL
  ].join('|');
  return fnv1aHash(signature);
}

function captureProtectionBaseline() {
  baselineFingerprints = {
    config: buildConfigProtectionFingerprint(),
    functions: buildProtectedFunctionFingerprint()
  };
}

function verifyRuntimeTamperSignals() {
  const issues = [];
  if (!baselineFingerprints) return issues;

  if (buildConfigProtectionFingerprint() !== baselineFingerprints.config) {
    issues.push('CONFIG fingerprint changed');
  }

  const currentFns = buildProtectedFunctionFingerprint();
  for (const [name, baseline] of Object.entries(baselineFingerprints.functions)) {
    if (currentFns[name] !== baseline) {
      issues.push(`Function modified: ${name}`);
    }
  }

  return issues;
}

// --- Overlay ---

function getGithubProjectUrl() {
  return 'https://github.com/JD-YH03D/release';
}

function showProtectionOverlay(payload) {
  const data = payload || {};
  let root = document.getElementById(PROTECTION_OVERLAY_ID);

  if (!root) {
    const style = document.createElement('style');
    style.id = 'btp-modern-overlay-styles';
    style.textContent = `
      @keyframes btpFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes btpScaleIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      .btp-btn-primary {
        flex: 1; min-width: 180px; padding: 14px 20px; border: none; border-radius: 12px;
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #fff;
        font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
      }
      .btp-btn-primary:hover {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        transform: translateY(-1px); box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
      }
      .btp-btn-secondary {
        flex: 1; min-width: 180px; padding: 14px 20px; border: 1px solid rgba(148, 163, 184, 0.15);
        border-radius: 12px; background: rgba(30, 41, 59, 0.5); color: #f1f5f9;
        font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s ease;
      }
      .btp-btn-secondary:hover {
        background: rgba(30, 41, 59, 0.8); border-color: rgba(148, 163, 184, 0.3);
        transform: translateY(-1px); color: #fff;
      }
    `;
    document.head.appendChild(style);
  }

  root = document.createElement('div');
  root.id = PROTECTION_OVERLAY_ID;
  root.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:2147483646', 'display:flex',
    'align-items:center', 'justify-content:center',
    'background:rgba(8, 10, 19, 0.8)', 'backdrop-filter:blur(16px)',
    '-webkit-backdrop-filter:blur(16px)',
    'animation:btpFadeIn .3s cubic-bezier(0.16, 1, 0.3, 1)', 'padding:20px'
  ].join(';');

  root.innerHTML = `
    <div style="width:min(580px,100%); background:linear-gradient(180deg, #0f1424 0%, #090d1a 100%); border:1px solid rgba(59, 130, 246, 0.2); border-radius:24px; box-shadow:0 30px 100px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05); padding:32px; color:#f1f5f9; font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; animation:btpScaleIn .4s cubic-bezier(0.16, 1, 0.3, 1); box-sizing:border-box;">
      <div style="display:flex; align-items:flex-start; gap:16px; margin-bottom:24px;">
        <div style="width:44px; height:44px; border-radius:14px; background:linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); display:flex; align-items:center; justify-content:center; font-weight:800; color:#fff; font-size:20px; box-shadow:0 0 20px rgba(239, 68, 68, 0.3); flex-shrink:0;">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <div style="flex:1;">
          <div style="font-size:20px; font-weight:700; letter-spacing:-0.2px; color:#ffffff; margin-bottom:4px;">Bintang Toba Pro Integrity</div>
          <div style="font-size:13px; font-weight:500; color:#3b82f6; text-transform:uppercase; letter-spacing:0.5px;">${data.forceUpdate ? 'Forced Update Required' : 'Runtime Integrity Warning'}</div>
        </div>
      </div>
      <div style="font-size:14px; line-height:1.6; color:#94a3b8; background:rgba(30, 41, 59, 0.3); border:1px solid rgba(255,255,255,0.03); padding:16px; border-radius:14px; margin-bottom:24px;">${data.reason || 'Integrity check detected a runtime mismatch.'}</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:28px;">
        <div style="background:rgba(15, 23, 42, 0.4); border:1px solid rgba(255,255,255,0.04); border-radius:14px; padding:14px 16px;">
          <div style="font-size:12px; color:#64748b; font-weight:500; margin-bottom:4px;">Current Version</div>
          <div style="font-size:15px; font-weight:600; color:#f8fafc; font-family:monospace;">${data.currentVersion || APP_CONFIG.VERSION}</div>
        </div>
        <div style="background:rgba(15, 23, 42, 0.4); border:1px solid rgba(255,255,255,0.04); border-radius:14px; padding:14px 16px;">
          <div style="font-size:12px; color:#64748b; font-weight:500; margin-bottom:4px;">Latest Official</div>
          <div style="font-size:15px; font-weight:600; color:#10b981; font-family:monospace;">${data.latestVersion || APP_CONFIG.VERSION}</div>
        </div>
      </div>
      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <button id="btp-protection-update" class="btp-btn-primary">Update Official Build</button>
        <button id="btp-protection-github" class="btp-btn-secondary">Open GitHub Source</button>
      </div>
    </div>
  `;

  document.body.appendChild(root);
  telemetryInc('protection.overlayShows');

  root.querySelector('#btp-protection-update').onclick = () => {
    const url = 'https://update.greasyfork.org/scripts/578278/GeoGuessr%20-%20Let%27s%20explore%20the%20world%21.user.js';
    window.open(url, '_blank');
  };

  root.querySelector('#btp-protection-github').onclick = () => {
    window.open(getGithubProjectUrl(), '_blank');
  };
}

function hideProtectionOverlay() {
  document.getElementById(PROTECTION_OVERLAY_ID)?.remove();
}

// --- Protection State ---

function applyProtectionState(next) {
  const current = state.runtime.protection || {};
  state.runtime.protection = { ...current, ...next, checkedAt: Date.now() };

  const p = state.runtime.protection;
  Logger.debug('[Integrity] state:', 'blocked=' + p.blocked, 'modified=' + p.modifiedBuild, 'outdated=' + p.outdated, 'forceUpdate=' + p.forceUpdate);

  if (p.modifiedBuild) {
    state.runtime.degraded = true;
    state.runtime.degradedReason = p.reason || 'Modified build detected';
    telemetryInc('protection.modifiedDetected');
    Logger.warn('[Integrity] MODIFIED BUILD');
  }

  if (p.outdated) {
    telemetryInc('protection.outdatedDetected');
    Logger.warn('[Integrity] OUTDATED BUILD');
  }

  if (p.forceUpdate) {
    telemetryInc('protection.forceUpdateDetected');
    Logger.warn('[Integrity] FORCE UPDATE REQUIRED');
  }

  if (p.blocked) {
    state.infoVisible = false;
    state.miniMapVisible = false;
    const panel = document.getElementById('geohelper-phone-frame');
    if (panel) panel.style.display = 'none';
    Logger.warn('[Integrity] RUNTIME BLOCKED');
  }

  safeGM_setValue(APP_CONFIG.STORAGE_KEYS.PROTECTION_STATE, p);

  const shouldShow = !!(p.forceUpdate || p.modifiedBuild || p.outdated);

  if (shouldShow) {
    showProtectionOverlay({
      forceUpdate: p.forceUpdate,
      reason: p.reason,
      currentVersion: p.currentVersion,
      latestVersion: p.latestVersion,
      message: p.message,
      integrityStatus: p.modifiedBuild ? 'MODIFIED BUILD DETECTED' : (p.outdated ? 'OUTDATED BUILD DETECTED' : 'INTEGRITY WARNING')
    });
  } else {
    hideProtectionOverlay();
  }
}

export function isProtectionBlocked() {
  return !!state.runtime?.protection?.blocked;
}

export function guardProtectedUsage(actionName = 'feature') {
  if (!isProtectionBlocked()) return true;
  Logger.warn('[Integrity] Action BLOCKED:', actionName);
  telemetryInc('protection.blockedEvents');
  showProtectionOverlay({
    forceUpdate: !!state.runtime?.protection?.forceUpdate,
    reason: `Action blocked: ${actionName}. ${state.runtime?.protection?.reason || 'Protection active.'}`,
    currentVersion: state.runtime?.protection?.currentVersion || APP_CONFIG.VERSION,
    latestVersion: state.runtime?.protection?.latestVersion || APP_CONFIG.VERSION,
    message: state.runtime?.protection?.message || 'Please install the official build.',
    integrityStatus: state.runtime?.protection?.forceUpdate ? 'FORCED UPDATE REQUIRED' : 'PROTECTED MODE ACTIVE'
  });
  return false;
}

// --- Integrity Manager ---

export const IntegrityManager = {
  started: false,
  checking: false,

  async runCheck(reason = 'manual', forceRemote = false) {
    if (this.checking) {
      Logger.debug('[Integrity] runCheck skipped - already checking');
      return;
    }
    this.checking = true;
    telemetryInc('protection.checks');
    Logger.info('[Integrity] CHECK START - reason:', reason);

    try {
      if (!baselineFingerprints) {
        captureProtectionBaseline();
      }

      const runtimeIssues = verifyRuntimeTamperSignals();
      if (runtimeIssues.length > 0) {
        Logger.warn('[Integrity] Runtime tamper signals:', runtimeIssues.join('; '));
      }

      let localSource = getLocalRuntimeSource();
      if (!localSource) {
        localSource = await getLocalRuntimeSourceAsync();
      }

      let localHash = null;
      const integrityCache = safeGM_getValue(APP_CONFIG.STORAGE_KEYS.INTEGRITY_CACHE, null);

      if (localSource) {
        localHash = await generateScriptHash(localSource);
        if (localHash) {
          safeGM_setValue(APP_CONFIG.STORAGE_KEYS.INTEGRITY_CACHE, {
            checkedAt: Date.now(),
            version: APP_CONFIG.VERSION,
            hash: localHash,
            sourceLength: localSource.length
          });
        }
      } else if (integrityCache?.version === APP_CONFIG.VERSION && integrityCache?.hash) {
        localHash = integrityCache.hash;
      }

      const remote = await loadRemoteVersionMetadata(forceRemote);

      if (!remote) {
        this.checking = false;
        return;
      }

      const latestVersion = remote.version || APP_CONFIG.VERSION;
      const versionCmp = compareSemanticVersion(latestVersion, APP_CONFIG.VERSION);
      const outdated = versionCmp > 0;
      const forceUpdate = !!remote.force;

      let hashMismatch = false;
      if (localHash && remote.hash && remote.hash.length > 8) {
        hashMismatch = String(localHash).toLowerCase() !== String(remote.hash).toLowerCase();
        if (hashMismatch) telemetryInc('protection.hashMismatch');
      }

      const modifiedBuild = runtimeIssues.length > 0 || hashMismatch;
      const blocked = forceUpdate || modifiedBuild;

      const reasonText = modifiedBuild
        ? (runtimeIssues[0] || 'Runtime hash mismatch with official build.')
        : (forceUpdate ? 'Official build requires mandatory update.' : (outdated ? 'A newer official version is available.' : null));

      applyProtectionState({
        blocked,
        forceUpdate,
        modifiedBuild,
        outdated,
        reason: reasonText,
        message: remote.message || `Integrity check source: ${reason}`,
        localHash: localHash || null,
        remoteHash: remote.hash || null,
        currentVersion: APP_CONFIG.VERSION,
        latestVersion,
        sourceAvailable: !!localSource
      });

      Logger.info('[Integrity] CHECK COMPLETE');

    } catch (e) {
      Logger.error('[Integrity] Check FAILED:', e?.message || 'unknown');
    } finally {
      this.checking = false;
    }
  },

  scheduleSoon(reason = 'scheduled', delayMs = 1200) {
    if (integrityScheduledTimeout) return;
    integrityScheduledTimeout = setTimeout(() => {
      integrityScheduledTimeout = null;
      this.runCheck(reason, false);
    }, Math.max(300, Number(delayMs) || 1200));
  },

  start() {
    if (this.started) return;
    this.started = true;
    Logger.info('[Integrity] PROTECTION SYSTEM STARTING');

    captureProtectionBaseline();

    const cached = safeGM_getValue(APP_CONFIG.STORAGE_KEYS.PROTECTION_STATE, null);
    if (cached && typeof cached === 'object') {
      state.runtime.protection = { ...state.runtime.protection, ...cached };
      if (state.runtime.protection.blocked || state.runtime.protection.outdated) {
        applyProtectionState(state.runtime.protection);
      }
    }

    this.runCheck('startup', true).catch((e) => {
      Logger.error('[Integrity] Startup check failed:', e?.message);
    });

    internals.integrityCheckInterval = setInterval(() => {
      this.runCheck('interval', false);
    }, TIMING.INTEGRITY_CHECK_INTERVAL);

    internals.integrityHeartbeatInterval = setInterval(() => {
      const issues = verifyRuntimeTamperSignals();
      if (issues.length > 0) {
        Logger.warn('[Integrity] Heartbeat detected tamper:', issues.join('; '));
        this.scheduleSoon('heartbeat_tamper', 400);
      }
    }, TIMING.INTEGRITY_HEARTBEAT_INTERVAL);

    internals.protectionErrorHandler = () => { this.scheduleSoon('runtime_error', 800); };
    internals.protectionRejectionHandler = () => { this.scheduleSoon('runtime_rejection', 800); };

    window.addEventListener('error', internals.protectionErrorHandler, true);
    window.addEventListener('unhandledrejection', internals.protectionRejectionHandler, true);

    Logger.info('[Integrity] PROTECTION SYSTEM STARTED');
  },

  stop() {
    this.started = false;

    if (internals.integrityCheckInterval) {
      clearInterval(internals.integrityCheckInterval);
      internals.integrityCheckInterval = null;
    }
    if (internals.integrityHeartbeatInterval) {
      clearInterval(internals.integrityHeartbeatInterval);
      internals.integrityHeartbeatInterval = null;
    }
    if (integrityScheduledTimeout) {
      clearTimeout(integrityScheduledTimeout);
      integrityScheduledTimeout = null;
    }

    if (internals.protectionErrorHandler) {
      window.removeEventListener('error', internals.protectionErrorHandler, true);
      internals.protectionErrorHandler = null;
    }
    if (internals.protectionRejectionHandler) {
      window.removeEventListener('unhandledrejection', internals.protectionRejectionHandler, true);
      internals.protectionRejectionHandler = null;
    }

    hideProtectionOverlay();
    Logger.debug('[Integrity] PROTECTION SYSTEM STOPPED');
  }
};
