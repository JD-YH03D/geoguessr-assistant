// ============================================
// UI THEMING & STATE
// Mengatur tampilan tombol, toggle, dan theme
// ============================================

import { APP_CONFIG } from '../config/constants.js';
import { MAP_LAYERS } from '../config/maps.js';
import { PRESETS, DEFAULT_HOTKEYS } from '../config/defaults.js';
import { state } from '../core/state.js';
import { Validators } from '../utils/validators.js';
import { detectPresetFromFeatures, persistSettingsSnapshot, safeGM_getValue } from '../utils/storage.js';
import { applyPhoneLikeButtonTheme } from './phone-frame.js';
import { getHotkeys } from './navigation.js';

/**
 * Update toggle switches UI
 */
export function setFeatureToggleUi(container) {
  const wrap = container || document.getElementById('geohelper-phone-frame') || state.panel;
  if (!wrap) return;

  const updateToggle = (id, isOn) => {
    const cb = wrap.querySelector(`#${id}`);
    const slider = wrap.querySelector(`#${id}-slider`);
    const dot = wrap.querySelector(`#${id}-dot`);

    if (cb && slider && dot) {
      cb.checked = isOn;
      slider.style.backgroundColor = isOn ? '#2f7cf6' : '#2b313b';
      slider.style.borderColor = isOn ? '#2f7cf6' : '#465062';
      dot.style.left = isOn ? '24px' : '4px';
      dot.style.backgroundColor = isOn ? '#f8fafc' : '#9ca3af';
    }
  };

  updateToggle('geohelper-auto-marker', !!state.features?.autoMarker);
  updateToggle('geohelper-safe-mode', !!state.features?.safeMode);
}

/**
 * Update preset buttons UI
 */
export function setPresetButtonsUi(container) {
  const wrap = container || document.getElementById('geohelper-phone-frame') || state.panel;
  if (!wrap) return;

  wrap.querySelectorAll('[data-preset]').forEach((btn) => {
    const active = btn.dataset.preset === state.currentPreset;
    btn.style.background = active ? '#2f7cf6' : '#1f232a';
    btn.style.color = active ? '#f8fbff' : '#c9d1dc';
    btn.style.borderColor = active ? '#2f7cf6' : '#3c4350';
    btn.style.borderWidth = '2px';
    btn.style.borderStyle = 'solid';
  });

  const label = wrap.querySelector('#geohelper-preset-status');
  if (label) label.textContent = `MODE: ${state.currentPreset.toUpperCase()}`;
}

/**
 * Update map layer buttons UI
 */
export function setMapLayerButtonsUi(container) {
  const wrap = container || document.getElementById('geohelper-maps-view') ||
    document.getElementById('geohelper-phone-frame') || state.panel;
  if (!wrap) return;

  const darkMode = true;

  wrap.querySelectorAll('[data-map-layer]').forEach((btn) => {
    const layerName = btn.dataset.mapLayer;
    const isActive = layerName === state.currentMapLayer;
    const indicator = btn.querySelector(`.layer-indicator-${layerName}`);
    const circle = indicator?.parentElement;

    if (circle && indicator) {
      circle.style.borderColor = isActive ? (darkMode ? '#2f7cf6' : '#1a73e8') : (darkMode ? '#4b5563' : '#e5e7eb');
      indicator.style.background = isActive ? (darkMode ? '#2f7cf6' : '#1a73e8') : 'transparent';
    }

    const textSpan = btn.querySelector('span');
    if (textSpan) {
      textSpan.style.color = isActive ? (darkMode ? '#7eb2ff' : '#1a73e8') : (darkMode ? '#c9d1dc' : '#1f2937');
      textSpan.style.fontWeight = isActive ? '600' : '500';
    }
  });

  document.querySelectorAll('#geohelper-maplayer-status').forEach((label) => {
    const conf = MAP_LAYERS[state.currentMapLayer] || MAP_LAYERS['default'];
    label.textContent = `LAYER: ${conf.name.toUpperCase()}`;
  });
}

/**
 * Update UI scale toggle
 */
export function setUiScaleButtonsUi(container) {
  const wrap = container || document.getElementById('geohelper-phone-frame') || state.panel;
  if (!wrap) return;

  const isCompact = state.uiScale === 'compact';

  const cb = wrap.querySelector('#geohelper-ui-scale');
  const slider = wrap.querySelector('#geohelper-ui-scale-slider');
  const dot = wrap.querySelector('#geohelper-ui-scale-dot');

  if (cb && slider && dot) {
    cb.checked = isCompact;
    slider.style.backgroundColor = isCompact ? '#2f7cf6' : '#2b313b';
    slider.style.borderColor = isCompact ? '#2f7cf6' : '#465062';
    dot.style.left = isCompact ? '24px' : '4px';
    dot.style.backgroundColor = isCompact ? '#f8fafc' : '#9ca3af';
  }

  const label = wrap.querySelector('#geohelper-scale-status');
  if (label) label.textContent = `SCALE: ${(state.uiScale || 'normal').toUpperCase()}`;
}

/**
 * Apply preset mode
 */
export function applyPresetMode(presetName, persist = false) {
  const preset = PRESETS[presetName];
  if (!preset) return;

  state.features = { ...state.features, ...preset };
  state.currentPreset = presetName;

  setFeatureToggleUi();
  setPresetButtonsUi();

  if (persist) {
    persistSettingsSnapshot(state, {
      features: state.features,
      preset: state.currentPreset
    });
  }
}

/**
 * Apply theme mode
 */
export function applyThemeMode(themeMode, persist = false) {
  state.themeMode = 'dark';
  setThemeButtonsUi();

  const panel = document.getElementById('geohelper-phone-frame');
  if (panel) applyPhoneLikeButtonTheme(panel);

  if (persist) {
    persistSettingsSnapshot(state, { themeMode: 'dark' });
  }
}

/**
 * Apply UI scale
 */
export function applyUiScale(scaleMode, persist = false) {
  const next = Validators.isValidUiScale(scaleMode) ? scaleMode : 'normal';
  state.uiScale = next;
  setUiScaleButtonsUi();

  const panel = document.getElementById('geohelper-phone-frame');
  if (panel) applyPhoneLikeButtonTheme(panel);

  if (persist) {
    persistSettingsSnapshot(state, { uiScale: state.uiScale });
  }
}

/**
 * Apply mini map layer
 */
export function applyMiniMapLayer(layerKey, persist = false) {
  const resolved = Validators.isValidMapLayer(layerKey) ? layerKey : 'default';
  const conf = MAP_LAYERS[resolved] || MAP_LAYERS['default'];
  state.currentMapLayer = resolved;

  if (state.miniMap && typeof L !== 'undefined') {
    if (state.miniMapTileLayer) {
      try {
        state.miniMap.removeLayer(state.miniMapTileLayer);
      } catch (e) { /* silent */ }
      state.miniMapTileLayer = null;
    }

    const layerOptions = {
      maxZoom: 19,
      worldCopyJump: true,
      ...(conf.options || {})
    };
    state.miniMapTileLayer = L.tileLayer(conf.url, layerOptions);
    state.miniMapTileLayer.addTo(state.miniMap);
  }

  setMapLayerButtonsUi();

  if (persist) {
    persistSettingsSnapshot(state, { mapLayer: state.currentMapLayer });
  }
}

/**
 * Set theme buttons UI
 */
export function setThemeButtonsUi() {
  state.themeMode = 'dark';
}

/**
 * Sync panel settings UI dari state
 */
export function syncPanelSettingsUiFromState() {
  const panel = document.getElementById('geohelper-phone-frame') || state.panel;
  if (!panel) return;

  const hotkeys = getHotkeys() || DEFAULT_HOTKEYS;

  panel.querySelectorAll('[data-hotkey]').forEach((input) => {
    const key = input.dataset.hotkey;
    input.value = hotkeys[key] || DEFAULT_HOTKEYS[key];
  });

  const webhookEl = panel.querySelector('#geohelper-discord-webhook');
  if (webhookEl) {
    webhookEl.value = safeGM_getValue(APP_CONFIG.STORAGE_KEYS.DISCORD_WEBHOOK, '');
  }

  setFeatureToggleUi(panel);
  setPresetButtonsUi(panel);
  setThemeButtonsUi();
  setUiScaleButtonsUi(panel);
  setMapLayerButtonsUi(panel);
  applyPhoneLikeButtonTheme(panel);
}
