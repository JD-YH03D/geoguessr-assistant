// ============================================
// MINI MAP (Leaflet)
// Menampilkan peta kecil dengan lokasi saat ini
// ============================================

import { APP_CONFIG, MAP_DEFAULTS } from '../config/constants.js';
import { state, internals } from '../core/state.js';
import { Logger } from '../utils/logger.js';
import { Validators } from '../utils/validators.js';
import { getUiRefs } from '../ui/phone-frame.js';
import { applyMiniMapLayer } from '../ui/theming.js';
import { extractCoordinates } from '../extraction/coordinate-extractor.js';

/**
 * Load Leaflet library secara dinamis
 */
export function initMiniMap() {
  if (typeof L !== 'undefined') {
    setupMiniMap();
    return;
  }

  Logger.debug('Loading Leaflet...');

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = APP_CONFIG.LEAFLET_CSS;
  document.head.appendChild(link);

  const script = document.createElement('script');
  script.src = APP_CONFIG.LEAFLET_JS;

  let loadTimeout;
  let pollInterval;

  const cleanup = () => {
    clearTimeout(loadTimeout);
    clearInterval(pollInterval);
  };

  pollInterval = setInterval(() => {
    if (typeof L !== 'undefined' && L.map) {
      cleanup();
      Logger.info('Leaflet loaded successfully');
      setupMiniMap();
    }
  }, APP_CONFIG.TIMING.LEAFLET_POLL_INTERVAL);

  loadTimeout = setTimeout(() => {
    cleanup();
    Logger.error('Leaflet load timeout');
  }, APP_CONFIG.TIMING.LEAFLET_LOAD_TIMEOUT);

  script.onerror = () => {
    cleanup();
    Logger.error('Failed to load Leaflet');
  };

  document.head.appendChild(script);
}

/**
 * Setup mini map setelah Leaflet tersedia
 */
function setupMiniMap() {
  if (state.miniMap || typeof L === 'undefined' || internals.leafletInitializing) return;

  internals.leafletInitializing = true;

  try {
    state.miniMap = L.map('geohelper-minimap', {
      zoomControl: false,
      attributionControl: false,
      zoomAnimation: true,
      fadeAnimation: true,
      minZoom: MAP_DEFAULTS.MIN_ZOOM,
      worldCopyJump: true
    });

    applyMiniMapLayer(state.currentMapLayer, false);
    state.miniMap.setView([0, 0], MAP_DEFAULTS.WORLD_VIEW_ZOOM);

    Logger.debug('Mini map initialized');

    // Zoom controls
    const zoomInBtn = document.getElementById('geohelper-zoom-in');
    const zoomOutBtn = document.getElementById('geohelper-zoom-out');
    const zoomLevelLabel = document.getElementById('geohelper-zoom-level');

    const updateZoomLabel = () => {
      if (state.miniMap && zoomLevelLabel) {
        zoomLevelLabel.textContent = 'x' + state.miniMap.getZoom();
      }
    };

    if (zoomInBtn) zoomInBtn.onclick = () => state.miniMap?.zoomIn();
    if (zoomOutBtn) zoomOutBtn.onclick = () => state.miniMap?.zoomOut();

    state.miniMap.on('zoomend', updateZoomLabel);
    updateZoomLabel();

    internals.leafletInitializing = false;

  } catch (e) {
    internals.leafletInitializing = false;
    Logger.error('Mini map setup error:', e);
  }
}

/**
 * Update mini map dengan koordinat terbaru
 */
export function updateMiniMap() {
  if (!state.miniMap) return;

  const coords = extractCoordinates();
  if (!coords || !Validators.isValidCoord(coords.lat, coords.lng)) return;

  const currentCenter = state.miniMap.getCenter();
  const dist = Math.abs(currentCenter.lat - coords.lat) + Math.abs(currentCenter.lng - coords.lng);

  if (dist > MAP_DEFAULTS.PAN_THRESHOLD) {
    if (dist < MAP_DEFAULTS.JUMP_THRESHOLD) {
      state.miniMap.panTo([coords.lat, coords.lng], { animate: true, duration: 0.5 });
    } else {
      state.miniMap.setView([coords.lat, coords.lng], MAP_DEFAULTS.DEFAULT_ZOOM);
    }
  }

  if (state.miniMapMarker) {
    state.miniMapMarker.setLatLng([coords.lat, coords.lng]);
  } else {
    state.miniMapMarker = L.marker([coords.lat, coords.lng]).addTo(state.miniMap);
  }

  // Update coords overlay
  const refs = getUiRefs();
  const overlay = refs.coordsOverlay;
  if (overlay) {
    overlay.textContent = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
  }

  // Fix size
  if (!state.miniMap._sizeFixed) {
    setTimeout(() => {
      if (state.miniMap && !state.miniMap._destroyed) {
        state.miniMap.invalidateSize({ animate: false, pan: false });
        state.miniMap._sizeFixed = true;
      }
    }, 250);
  }
}
