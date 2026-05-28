// ============================================
// STORAGE UTILITIES
// Wrapper untuk GM_* functions dan localStorage fallback
// ============================================

import { APP_CONFIG } from '../config/constants.js';
import { DEFAULT_HOTKEYS, DEFAULT_FEATURES, DEFAULT_SETTINGS } from '../config/defaults.js';
import { Validators } from './validators.js';
import { Logger } from './logger.js';

/**
 * Baca nilai dari storage (GM_getValue > localStorage)
 */
export function safeGM_getValue(key, defaultValue) {
  try {
    if (typeof GM_getValue !== 'undefined') {
      const val = GM_getValue(key);
      return val !== undefined ? val : defaultValue;
    }
    const stored = localStorage.getItem(key);
    return stored !== null ? JSON.parse(stored) : defaultValue;
  } catch (e) {
    Logger.debug('Storage read error:', e.message);
    return defaultValue;
  }
}

/**
 * Simpan nilai ke storage (GM_setValue > localStorage)
 */
export function safeGM_setValue(key, value) {
  try {
    if (typeof GM_setValue !== 'undefined') {
      GM_setValue(key, value);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    Logger.error('Storage write error:', e);
  }
}

/**
 * Baca semua settings tersimpan
 */
export function readStoredSettings() {
  const hotkeys = {
    ...DEFAULT_HOTKEYS,
    ...(safeGM_getValue(APP_CONFIG.STORAGE_KEYS.HOTKEYS, null) || {})
  };

  // Safety: jangan gunakan Tab sebagai hotkey panel
  if (hotkeys.panel === 'Tab' || hotkeys.panel === 'tab') {
    hotkeys.panel = 'Home';
  }

  const features = {
    ...DEFAULT_FEATURES,
    ...(safeGM_getValue(APP_CONFIG.STORAGE_KEYS.FEATURES, null) || {})
  };

  let preset = safeGM_getValue(APP_CONFIG.STORAGE_KEYS.PRESET, null) || detectPresetFromFeatures(features);
  if (!Validators.isValidPreset(preset)) {
    preset = detectPresetFromFeatures(features);
  }

  let mapLayer = safeGM_getValue(APP_CONFIG.STORAGE_KEYS.MAP_LAYER, DEFAULT_SETTINGS.MAP_LAYER);
  if (!Validators.isValidMapLayer(mapLayer)) {
    mapLayer = DEFAULT_SETTINGS.MAP_LAYER;
  }

  let uiScale = safeGM_getValue(APP_CONFIG.STORAGE_KEYS.UI_SCALE, DEFAULT_SETTINGS.UI_SCALE);
  if (!Validators.isValidUiScale(uiScale)) {
    uiScale = DEFAULT_SETTINGS.UI_SCALE;
  }

  return {
    hotkeys,
    features,
    preset,
    mapLayer,
    themeMode: 'dark',
    uiScale,
    discordWebhook: String(safeGM_getValue(APP_CONFIG.STORAGE_KEYS.DISCORD_WEBHOOK, '') || '').trim()
  };
}

/**
 * Deteksi preset dari fitur yang aktif
 */
/**
 * Apply settings ke state
 */
export function applySettingsToState(state, settings) {
  const s = settings || readStoredSettings();
  state.hotkeys = { ...DEFAULT_HOTKEYS, ...(s.hotkeys || {}) };
  state.features = { ...DEFAULT_FEATURES, ...(s.features || {}) };
  state.currentPreset = Validators.isValidPreset(s.preset) ? s.preset : detectPresetFromFeatures(state.features);
  state.currentMapLayer = Validators.isValidMapLayer(s.mapLayer) ? s.mapLayer : DEFAULT_SETTINGS.MAP_LAYER;
  state.themeMode = 'dark';
  state.uiScale = Validators.isValidUiScale(s.uiScale) ? s.uiScale : DEFAULT_SETTINGS.UI_SCALE;
}

export function detectPresetFromFeatures(features) {
  const f = features || {};
  for (const [name, preset] of Object.entries({
    exact: DEFAULT_FEATURES, // { autoMarker: false, safeMode: false }
    safe: { autoMarker: false, safeMode: true },
    stealth: { autoMarker: true, safeMode: true }
  })) {
    if (f.autoMarker === preset.autoMarker && f.safeMode === preset.safeMode) {
      return name;
    }
  }
  return 'custom';
}

/**
 * Ambil snapshot settings saat ini
 */
export function getCurrentSettingsSnapshot(state, overrides = null) {
  const base = {
    hotkeys: { ...(state.hotkeys || DEFAULT_HOTKEYS) },
    features: { ...(state.features || DEFAULT_FEATURES) },
    preset: state.currentPreset || detectPresetFromFeatures(state.features),
    mapLayer: state.currentMapLayer || DEFAULT_SETTINGS.MAP_LAYER,
    themeMode: 'dark',
    uiScale: state.uiScale || DEFAULT_SETTINGS.UI_SCALE,
    discordWebhook: String(safeGM_getValue(APP_CONFIG.STORAGE_KEYS.DISCORD_WEBHOOK, '') || '').trim()
  };

  const next = { ...base, ...(overrides || {}) };

  next.hotkeys = { ...DEFAULT_HOTKEYS, ...(next.hotkeys || {}) };
  next.features = { ...DEFAULT_FEATURES, ...(next.features || {}) };
  next.preset = Validators.isValidPreset(next.preset) ? next.preset : detectPresetFromFeatures(next.features);
  next.mapLayer = Validators.isValidMapLayer(next.mapLayer) ? next.mapLayer : DEFAULT_SETTINGS.MAP_LAYER;
  next.uiScale = Validators.isValidUiScale(next.uiScale) ? next.uiScale : DEFAULT_SETTINGS.UI_SCALE;
  next.themeMode = 'dark';
  next.discordWebhook = String(next.discordWebhook || '').trim();

  return next;
}

/**
 * Simpan settings ke storage
 */
export function persistSettingsSnapshot(state, settings) {
  const s = getCurrentSettingsSnapshot(state, settings);
  safeGM_setValue(APP_CONFIG.STORAGE_KEYS.HOTKEYS, s.hotkeys);
  safeGM_setValue(APP_CONFIG.STORAGE_KEYS.FEATURES, s.features);
  safeGM_setValue(APP_CONFIG.STORAGE_KEYS.PRESET, s.preset);
  safeGM_setValue(APP_CONFIG.STORAGE_KEYS.MAP_LAYER, s.mapLayer);
  safeGM_setValue(APP_CONFIG.STORAGE_KEYS.THEME, 'dark');
  safeGM_setValue(APP_CONFIG.STORAGE_KEYS.UI_SCALE, s.uiScale);
  safeGM_setValue(APP_CONFIG.STORAGE_KEYS.DISCORD_WEBHOOK, s.discordWebhook);
  return s;
}

/**
 * Reset ke default
 */
export function resetSettingsToDefaults(state, persist = true) {
  const defaults = {
    hotkeys: { ...DEFAULT_HOTKEYS },
    features: { ...DEFAULT_FEATURES },
    preset: DEFAULT_SETTINGS.PRESET,
    mapLayer: DEFAULT_SETTINGS.MAP_LAYER,
    themeMode: 'dark',
    uiScale: DEFAULT_SETTINGS.UI_SCALE,
    discordWebhook: ''
  };

  state.hotkeys = { ...DEFAULT_HOTKEYS };
  state.features = { ...DEFAULT_FEATURES };
  state.currentPreset = DEFAULT_SETTINGS.PRESET;
  state.currentMapLayer = DEFAULT_SETTINGS.MAP_LAYER;
  state.themeMode = 'dark';
  state.uiScale = DEFAULT_SETTINGS.UI_SCALE;

  if (persist) {
    persistSettingsSnapshot(state, defaults);
  }
  return defaults;
}
