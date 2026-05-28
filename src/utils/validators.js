// ============================================
// VALIDATORS
// ============================================

import { PRESETS, UI_SCALES } from '../config/defaults.js';
import { MAP_LAYERS } from '../config/maps.js';

export const Validators = {
  isValidCoord(lat, lng) {
    return typeof lat === 'number' && typeof lng === 'number' &&
      !isNaN(lat) && !isNaN(lng) &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  },

  isValidPreset(presetName) {
    return presetName && PRESETS.hasOwnProperty(presetName);
  },

  isValidMapLayer(layerName) {
    return layerName && MAP_LAYERS.hasOwnProperty(layerName);
  },

  isValidTheme(themeName) {
    return themeName === 'dark';
  },

  isValidUiScale(scaleName) {
    return scaleName && UI_SCALES.hasOwnProperty(scaleName);
  }
};
