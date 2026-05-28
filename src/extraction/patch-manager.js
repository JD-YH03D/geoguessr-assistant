// ============================================
// PATCH MANAGER
// Wrapper untuk XHR interceptor dengan tracking status
// ============================================

import { installXHRInterceptor, uninstallXHRInterceptor, isXHRInterceptorInstalled, isOurXHRInterceptor } from './xhr-interceptor.js';
import { telemetryInc } from '../core/telemetry.js';
import { Logger } from '../utils/logger.js';

const PatchManager = {
  _status: {
    xhrInstalled: false,
    installedByUs: false,
    lastInstallAt: 0,
    lastUninstallAt: 0,
    lastError: null
  },

  installXHRPatch() {
    telemetryInc('patch.installAttempts');
    try {
      const wasPatchedBefore = isXHRInterceptorInstalled();
      const hadOurOriginalBefore = isOurXHRInterceptor();

      installXHRInterceptor();

      const installedNow = isXHRInterceptorInstalled();
      const hasOurOriginalNow = isOurXHRInterceptor();

      this._status.xhrInstalled = installedNow;
      this._status.installedByUs =
        (wasPatchedBefore && hadOurOriginalBefore) ||
        (!wasPatchedBefore && hasOurOriginalNow);
      this._status.lastInstallAt = Date.now();
      this._status.lastError = null;
      telemetryInc('patch.installSuccess');
      return this._status.xhrInstalled;
    } catch (e) {
      this._status.lastError = e?.message || 'install failed';
      telemetryInc('patch.installFail');
      return false;
    }
  },

  uninstallXHRPatch() {
    telemetryInc('patch.uninstallAttempts');
    try {
      const hasOurOriginal = isOurXHRInterceptor();

      if (hasOurOriginal || this._status.installedByUs) {
        uninstallXHRInterceptor();
      }

      this._status.xhrInstalled = isXHRInterceptorInstalled();
      this._status.installedByUs = isOurXHRInterceptor();
      this._status.lastUninstallAt = Date.now();
      this._status.lastError = null;
      telemetryInc('patch.uninstallSuccess');
      return !this._status.xhrInstalled || !hasOurOriginal;
    } catch (e) {
      this._status.lastError = e?.message || 'uninstall failed';
      telemetryInc('patch.uninstallFail');
      return false;
    }
  },

  ensureXHRPatch() {
    telemetryInc('patch.ensureChecks');
    if (isXHRInterceptorInstalled()) {
      this._status.xhrInstalled = true;
      this._status.installedByUs = isOurXHRInterceptor();
      return true;
    }
    telemetryInc('patch.ensureReinstalls');
    return this.installXHRPatch();
  },

  status() {
    return {
      ...this._status,
      xhrInstalled: isXHRInterceptorInstalled()
    };
  }
};

export { PatchManager };
