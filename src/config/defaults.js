// ============================================
// DEFAULT SETTINGS
// ============================================

export const DEFAULT_HOTKEYS = Object.freeze({
  panel: 'Home',
  marker: 'M',
  info: 'V',
  refresh: 'X',
  zoomIn: 'S',
  zoomOut: 'A',
  copyCoords: 'C',
  googleMaps: 'G',
  discord: 'D',
  autoPlace: '1',
  safePlace: '2'
});

export const DEFAULT_FEATURES = Object.freeze({
  autoMarker: false,
  safeMode: false
});

export const PRESETS = Object.freeze({
  exact: Object.freeze({ autoMarker: false, safeMode: false }),
  safe: Object.freeze({ autoMarker: false, safeMode: true }),
  stealth: Object.freeze({ autoMarker: true, safeMode: true })
});

export const UI_SCALES = Object.freeze({
  normal: { name: 'Normal', factor: 1 },
  compact: { name: 'Compact', factor: 0.92 }
});

export const DEFAULT_SETTINGS = Object.freeze({
  MAP_LAYER: 'default',
  THEME: 'dark',
  UI_SCALE: 'normal',
  PRESET: 'exact'
});
