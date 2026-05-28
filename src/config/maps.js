// ============================================
// MAP LAYER CONFIGURATIONS
// Tambahkan layer baru di sini jika diperlukan
// ============================================

export const MAP_LAYERS = Object.freeze({
  default: Object.freeze({
    name: 'Default',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: { maxZoom: 19 }
  }),
  dark: Object.freeze({
    name: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    options: { maxZoom: 19, subdomains: 'abcd' }
  }),
  terrain: Object.freeze({
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    options: { maxZoom: 17 }
  })
});

export const HOTKEY_DESCRIPTIONS = Object.freeze({
  panel: 'Open settings panel',
  marker: 'Place marker on map',
  info: 'Show location info',
  refresh: 'Refresh coordinates',
  zoomIn: 'Zoom in mini map',
  zoomOut: 'Zoom out mini map',
  copyCoords: 'Copy coordinates',
  googleMaps: 'Open in Google Maps',
  discord: 'Send to Discord',
  autoPlace: 'Auto place marker',
  safePlace: 'Safe place (~50m)'
});
