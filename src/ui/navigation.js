// ============================================
// UI NAVIGATION
// Menangani perpindahan antar view dan hotkey cache
// ============================================

import { TIMING } from '../config/constants.js';
import { DEFAULT_HOTKEYS } from '../config/defaults.js';
import { internals } from '../core/state.js';
import { safeGM_getValue } from '../utils/storage.js';

// Hotkey cache
let hotkeyCache = null;
let hotkeyCacheTime = 0;

/**
 * Ambil hotkeys dari cache/storage
 */
export function getHotkeys() {
  const now = Date.now();
  if (!hotkeyCache || (now - hotkeyCacheTime) > TIMING.HOTKEY_CACHE_TTL) {
    hotkeyCache = safeGM_getValue('bintang_toba_hotkeys', { ...DEFAULT_HOTKEYS });

    if (hotkeyCache.panel === 'Tab' || hotkeyCache.panel === 'tab') {
      hotkeyCache.panel = 'Home';
      try {
        if (typeof GM_setValue !== 'undefined') {
          GM_setValue('bintang_toba_hotkeys', hotkeyCache);
        }
      } catch (e) { /* silent */ }
    }

    hotkeyCacheTime = now;
  }
  return hotkeyCache;
}

/**
 * Invalidate hotkey cache
 */
export function invalidateHotkeyCache() {
  hotkeyCache = null;
  hotkeyCacheTime = 0;
}

/**
 * Normalize hotkey string
 */
export function normalizeHotkey(key) {
  return String(key || '').toLowerCase().trim();
}

// View definitions
export const PHONE_APP_VIEWS = Object.freeze([
  'settings', 'hotkeys', 'discord', 'copyApp', 'mapsApp', 'historyApp'
]);

export const PHONE_VIEW_OFFSETS = Object.freeze({
  map: 0,
  menu: -100,
  settings: -200,
  hotkeys: -300,
  discord: -400,
  copyApp: -500,
  mapsApp: -600,
  historyApp: -700
});

/**
 * Cek apakah view adalah app view
 */
export function isPhoneAppView(view) {
  return PHONE_APP_VIEWS.includes(view);
}

/**
 * Ambil offset translateX untuk view
 */
export function getPhoneViewOffset(view) {
  return PHONE_VIEW_OFFSETS[view] ?? 0;
}
