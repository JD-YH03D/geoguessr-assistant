// ============================================
// TELEMETRY SYSTEM
// Untuk debugging dan monitoring performa
// ============================================

export const telemetry = {
  startedAt: Date.now(),
  patch: {
    installAttempts: 0,
    installSuccess: 0,
    installFail: 0,
    uninstallAttempts: 0,
    uninstallSuccess: 0,
    uninstallFail: 0,
    ensureChecks: 0,
    ensureReinstalls: 0
  },
  extraction: {
    strategy: Object.create(null),
    primaryUsed: 0,
    fallbackToLegacy: 0,
    shadowRuns: 0,
    shadowMismatches: 0
  },
  async: {
    addressIssued: 0,
    addressApplied: 0,
    addressDiscardedStale: 0,
    refreshIssued: 0,
    refreshApplied: 0,
    refreshDiscardedStale: 0
  },
  degraded: {
    enterCount: 0,
    exitCount: 0,
    current: false
  },
  protection: {
    checks: 0,
    blockedEvents: 0,
    overlayShows: 0,
    remoteFetchOk: 0,
    remoteFetchFail: 0,
    hashComputed: 0,
    hashMismatch: 0,
    modifiedDetected: 0,
    forceUpdateDetected: 0,
    outdatedDetected: 0
  }
};

export function telemetryInc(path, value = 1) {
  try {
    const parts = String(path).split('.');
    let ref = telemetry;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!ref[parts[i]] || typeof ref[parts[i]] !== 'object') {
        ref[parts[i]] = {};
      }
      ref = ref[parts[i]];
    }
    const key = parts[parts.length - 1];
    ref[key] = (Number(ref[key]) || 0) + value;
  } catch (e) { /* silent */ }
}

export function telemetryTime(strategyName, ms, ok) {
  try {
    const name = String(strategyName || 'unknown');
    if (!telemetry.extraction.strategy[name]) {
      telemetry.extraction.strategy[name] = {
        attempts: 0,
        success: 0,
        fail: 0,
        totalMs: 0,
        avgMs: 0,
        lastMs: 0,
        lastOkAt: 0,
        lastFailAt: 0
      };
    }
    const s = telemetry.extraction.strategy[name];
    s.attempts++;
    s.totalMs += Math.max(0, Number(ms) || 0);
    s.lastMs = Math.max(0, Number(ms) || 0);
    s.avgMs = s.attempts ? +(s.totalMs / s.attempts).toFixed(3) : 0;
    if (ok) {
      s.success++;
      s.lastOkAt = Date.now();
    } else {
      s.fail++;
      s.lastFailAt = Date.now();
    }
  } catch (e) { /* silent */ }
}

export function telemetrySnapshot() {
  try {
    return JSON.parse(JSON.stringify(telemetry));
  } catch (e) {
    return { startedAt: telemetry.startedAt, error: 'snapshot failed' };
  }
}
