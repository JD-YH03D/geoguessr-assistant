// ============================================
// MAIN ENTRY POINT
// Inisialisasi dan cleanup aplikasi
// ============================================

import { APP_CONFIG, INIT_GUARD_KEY, CLEANUP_GUARD_KEY } from './config/constants.js';
import { state, internals } from './core/state.js';
import { telemetrySnapshot } from './core/telemetry.js';
import { Logger } from './utils/logger.js';
import { readStoredSettings, applySettingsToState } from './utils/storage.js';
import { Throttle } from './utils/throttle.js';
import { RequestTokens } from './core/request-tokens.js';
import { installXHRInterceptor, uninstallXHRInterceptor, isXHRInterceptorInstalled } from './extraction/xhr-interceptor.js';
import { PatchManager } from './extraction/patch-manager.js';
import { extractionCache } from './extraction/cache.js';
import { ExtractorRegistry } from './extraction/extractor-registry.js';
import { detectPlatform } from './platform/detector.js';
import { IntegrityManager } from './protection/integrity-manager.js';
import { handleKeydown } from './system/keyboard-handler.js';
import { startMonitoring } from './system/monitoring.js';
import { findMapInstance } from './features/marker-placement.js';

/**
 * Install debug bridge ke window
 */
function installDebugBridge() {
  const pw = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;

  const debugBridge = {
    version: APP_CONFIG.VERSION,
    _stage: 'initialized',
    getFlags() { return { ...(state.runtime?.flags || {}) }; },
    getTelemetry() { return telemetrySnapshot(); },
    getExtractorHealth() {
      return ExtractorRegistry.getHealthSnapshot();
    },
    getPatchStatus() { return PatchManager.status(); },
    getProtectionState() { return { ...(state.runtime?.protection || {}) }; },
    runIntegrityCheck(r) {
      IntegrityManager.runCheck(r || 'manual_debug', true);
      return true;
    },
    getIntegrityDiagnostics() {
      return {
        managerExists: typeof IntegrityManager === 'object',
        started: IntegrityManager?.started,
        checking: IntegrityManager?.checking,
        degraded: !!state.runtime?.degraded,
        degradedReason: state.runtime?.degradedReason || null,
        currentVersion: APP_CONFIG.VERSION,
        initCompleted: internals.isInitialized
      };
    },
    getRuntimeSummary() {
      return {
        platform: state.platform,
        initCompleted: internals.isInitialized,
        infoVisible: !!state.infoVisible,
        miniMapVisible: !!state.miniMapVisible,
        coordsValid: !!(state.coords?.lat && state.coords?.lng),
        hasAddress: !!state.address,
        markerPlacedThisRound: !!state.markerPlacedThisRound,
        degraded: !!state.runtime?.degraded,
        phoneView: state.phoneView || 'map',
        timestamp: Date.now()
      };
    }
  };

  window.__btpDebug = debugBridge;
  pw.__btpDebug = debugBridge;

  console.log('[BintangTobaPro] __btpDebug bridge installed');
}

/**
 * Uninstall debug bridge
 */
function uninstallDebugBridge() {
  try { delete window.__btpDebug; } catch (e) { window.__btpDebug = null; }
  try {
    const pw = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
    delete pw.__btpDebug;
  } catch (e) { /* silent */ }
}

/**
 * Initialize application
 */
function init() {
  if (internals.isInitialized || window[INIT_GUARD_KEY]) {
    Logger.debug('Init skipped: already initialized');
    return;
  }

  internals.isInitialized = true;
  internals.isCleaningUp = false;
  window[INIT_GUARD_KEY] = true;
  window[CLEANUP_GUARD_KEY] = false;

  // Reset state
  internals.oneUiViewsStyled = false;
  internals.panelUiBootstrapped = false;
  internals.monitoringBusySince = 0;
  state._uiRefs = null;

  Logger.initDebugFlag();

  state.platform = detectPlatform();

  Logger.info('========================================');
  Logger.info(`${APP_CONFIG.NAME} v${APP_CONFIG.VERSION}`);
  Logger.info('Platform:', state.platform);
  Logger.info('========================================');

  // Load settings
  applySettingsToState(state, readStoredSettings());
  Logger.debug('Settings loaded');

  // Install XHR interceptor
  if (state.runtime?.flags?.USE_PATCH_MANAGER) {
    PatchManager.installXHRPatch();
  } else {
    installXHRInterceptor();
  }

  // Debug bridge
  installDebugBridge();

  // Integrity protection
  IntegrityManager.start();

  // Keyboard handler
  document.addEventListener('keydown', handleKeydown, true);
  Logger.debug('Keyboard listener attached');

  // Start monitoring
  startMonitoring();
  Logger.debug('Coordinate monitoring started');

  // Find map instance after delay
  setTimeout(() => {
    Logger.debug('Attempting to find map instance...');
    findMapInstance();
  }, 2000);

  // SPA navigation detection
  let lastUrl = window.location.href;
  const spaCheckInterval = setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      Logger.debug('SPA navigation detected:', currentUrl);

      // Reinstall XHR interceptor after navigation
      if (!isXHRInterceptorInstalled()) {
        Logger.warn('XHR interceptor lost after navigation - reinstalling');
        installXHRInterceptor();
      }

      // Reset state
      extractionCache.invalidate();
      state.gameMap = null;

      setTimeout(() => {
        findMapInstance();
      }, 2000);
    }
  }, 1000);

  if (!window.__btp_spa_interval) {
    window.__btp_spa_interval = spaCheckInterval;
  }

  // Add pulse animation style
  const style = document.createElement('style');
  style.textContent = '@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}';
  document.head.appendChild(style);

  Logger.info('Initialization complete!');
  Logger.info(`Press ${state.hotkeys.panel} to show panel`);
}

/**
 * Cleanup application
 */
function cleanup() {
  if (internals.isCleaningUp || window[CLEANUP_GUARD_KEY]) return;

  internals.isCleaningUp = true;
  window[CLEANUP_GUARD_KEY] = true;
  Logger.debug('Cleaning up...');

  // Clear intervals
  if (internals.monitoringInterval) {
    clearInterval(internals.monitoringInterval);
    internals.monitoringInterval = null;
  }

  if (internals.phoneClockInterval) {
    clearInterval(internals.phoneClockInterval);
    internals.phoneClockInterval = null;
  }

  if (window.__btp_spa_interval) {
    clearInterval(window.__btp_spa_interval);
    window.__btp_spa_interval = null;
  }

  // Uninstall XHR patch
  if (state.runtime?.flags?.USE_PATCH_MANAGER) {
    PatchManager.uninstallXHRPatch();
  } else {
    uninstallXHRInterceptor();
  }

  // Remove keyboard listener
  document.removeEventListener('keydown', handleKeydown, true);

  // Remove resize handler
  if (internals.phoneResizeHandler) {
    window.removeEventListener('resize', internals.phoneResizeHandler);
    internals.phoneResizeHandler = null;
  }

  // Remove marker
  if (state.marker) {
    try {
      if (typeof google !== 'undefined' && google.maps && state.marker.setMap) {
        state.marker.setMap(null);
      } else if (typeof L !== 'undefined' && state.gameMap && state.marker) {
        state.gameMap.removeLayer(state.marker);
      }
    } catch (e) { /* silent */ }
    state.marker = null;
  }

  // Remove mini map
  if (state.miniMapMarker && state.miniMap) {
    try { state.miniMap.removeLayer(state.miniMapMarker); } catch (e) { /* silent */ }
    state.miniMapMarker = null;
  }

  if (state.miniMap) {
    try {
      state.miniMap.off();
      state.miniMap.remove();
    } catch (e) { /* silent */ }
    state.miniMap = null;
    state.miniMapTileLayer = null;
  }

  // Remove UI
  document.getElementById('geohelper-phone-frame')?.remove();
  state.panel?.remove();
  state.panel = null;

  // Stop integrity manager
  IntegrityManager.stop();

  // Uninstall debug bridge
  uninstallDebugBridge();

  // Reset all
  Throttle.resetAll();
  RequestTokens.resetAll();
  internals.lastKeydownTime = 0;
  internals.discordInFlight = false;
  internals.monitoringBusy = false;
  internals.monitoringBusySince = 0;
  internals.oneUiViewsStyled = false;
  internals.panelUiBootstrapped = false;
  internals.refreshRequestId++;
  state.roundHistory = [];
  state.lastImportBackup = null;
  state.swapPhoneView = null;
  state.phoneView = 'map';
  state._uiRefs = null;

  internals.isInitialized = false;
  internals.isCleaningUp = false;
  window[INIT_GUARD_KEY] = false;

  Logger.debug('Cleanup complete');
}

// --- Entry Point ---

(function () {
  'use strict';

  // Install early debug bridge
  try {
    window.__btpDebug = { version: APP_CONFIG.VERSION, _stage: 'early' };
    console.log('[BintangTobaPro] Early bridge installed');
  } catch (e) {
    console.error('[BintangTobaPro] Early bridge failed:', e);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('beforeunload', cleanup);
  window.addEventListener('pagehide', cleanup);
})();
