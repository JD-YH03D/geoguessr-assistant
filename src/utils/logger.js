// ============================================
// LOGGER UTILITY
// ============================================

import { APP_CONFIG } from '../config/constants.js';

let _debugEnabled = APP_CONFIG.DEBUG;

export const Logger = {
  info(...args) {
    console.log('[BintangTobaPro]', ...args);
  },
  debug(...args) {
    if (_debugEnabled) {
      console.log('[BintangTobaPro:DBG]', ...args);
    }
  },
  warn(...args) {
    console.warn('[BintangTobaPro]', ...args);
  },
  error(...args) {
    console.error('[BintangTobaPro]', ...args);
  },

  initDebugFlag() {
    try {
      const debugVal = typeof GM_getValue !== 'undefined'
        ? GM_getValue(APP_CONFIG.STORAGE_KEYS.DEBUG, false)
        : false;
      _debugEnabled = APP_CONFIG.DEBUG || !!debugVal;
    } catch (e) {
      _debugEnabled = APP_CONFIG.DEBUG;
    }
  },

  setDebug(enabled) {
    _debugEnabled = !!enabled;
  }
};
