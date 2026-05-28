// ============================================
// KEYBOARD HANDLER
// Menangani semua hotkey
// ============================================

import { APP_CONFIG, TIMING, COOLDOWNS } from '../config/constants.js';
import { state, internals } from '../core/state.js';
import { Throttle } from '../utils/throttle.js';
import { Logger } from '../utils/logger.js';
import { Security } from '../utils/security.js';
import { Validators } from '../utils/validators.js';
import { normalizeHotkey, getHotkeys } from '../ui/navigation.js';
import { isProtectionBlocked } from '../protection/integrity-manager.js';
import { extractionCache } from '../extraction/cache.js';
import { extractCoordinates } from '../extraction/coordinate-extractor.js';
import { togglePanel, updateInfoDisplay } from '../ui/phone-frame.js';
import { toggleMarker, placeGuessOnMap, findMapInstance } from '../features/marker-placement.js';
import { sendToDiscord } from '../features/discord.js';
import { updateStatusText } from '../features/status-indicators.js';

/**
 * Handle keydown events
 */
export function handleKeydown(e) {
  if (isProtectionBlocked()) {
    e.preventDefault();
    return;
  }

  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
    return;
  }

  const now = Date.now();
  if (now - internals.lastKeydownTime < TIMING.KEYDOWN_DEBOUNCE) return;
  internals.lastKeydownTime = now;

  const hotkeys = getHotkeys();
  const key = normalizeHotkey(e.key);

  const hkMap = {};
  for (const [action, hk] of Object.entries(hotkeys)) {
    hkMap[action] = normalizeHotkey(hk);
  }

  // Panel toggle
  if (hkMap.panel && key === hkMap.panel) {
    if (!Throttle.canRun('hk_toggle', COOLDOWNS.TOGGLE_PANEL)) return;
    e.preventDefault();
    togglePanel();
    return;
  }

  // Marker
  if (hkMap.marker && key === hkMap.marker) {
    if (!Throttle.canRun('hk_marker', COOLDOWNS.MARKER)) return;
    e.preventDefault();
    if (!state.gameMap) findMapInstance();
    toggleMarker();
    return;
  }

  // Refresh
  if (hkMap.refresh && key === hkMap.refresh && state.infoVisible) {
    if (!Throttle.canRun('hk_refresh', COOLDOWNS.REFRESH)) return;
    e.preventDefault();
    e.stopPropagation();
    refreshLocation();
    return;
  }

  // Info
  if (hkMap.info && key === hkMap.info) {
    if (!Throttle.canRun('hk_info', COOLDOWNS.INFO)) return;
    e.preventDefault();
    e.stopPropagation();
    openHomeQuick();
    return;
  }

  // Copy coords
  if (hkMap.copyCoords && key === hkMap.copyCoords) {
    if (!Throttle.canRun('hk_copy', COOLDOWNS.COPY)) return;
    e.preventDefault();
    const coords = extractCoordinates();
    if (coords && Validators.isValidCoord(coords.lat, coords.lng)) {
      navigator.clipboard.writeText(`${coords.lat}, ${coords.lng}`)
        .then(() => Logger.debug('Coords copied'))
        .catch(() => Logger.debug('Clipboard failed'));
    }
    return;
  }

  // Google Maps
  if (hkMap.googleMaps && key === hkMap.googleMaps) {
    if (!Throttle.canRun('hk_maps', COOLDOWNS.MAPS)) return;
    e.preventDefault();
    e.stopPropagation();

    const coords = extractCoordinates();
    if (coords && Validators.isValidCoord(coords.lat, coords.lng)) {
      const lat = Security.encodeParam(coords.lat.toFixed(6));
      const lng = Security.encodeParam(coords.lng.toFixed(6));
      const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}&ll=${lat},${lng}&z=6`;
      try {
        const newWindow = window.open(mapsUrl, '_blank');
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          window.location.href = mapsUrl;
        }
      } catch (err) {
        window.location.href = mapsUrl;
      }
    } else {
      updateStatusText('No coords', '#ef4444');
    }
    return;
  }

  // Auto Place
  if (hkMap.autoPlace && key === hkMap.autoPlace) {
    if (!Throttle.canRun('hk_auto_place', COOLDOWNS.AUTO_PLACE)) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    if (state.features?.autoMarker) {
      placeGuessOnMap(false);
    } else {
      if (!state.gameMap) findMapInstance();
      const ok = toggleMarker();
      updateStatusText(ok ? 'Marked' : 'No map', ok ? '#4ade80' : '#ef4444');
    }
    return;
  }

  // Safe Place
  if (hkMap.safePlace && key === hkMap.safePlace) {
    if (!Throttle.canRun('hk_safe_place', COOLDOWNS.SAFE_PLACE)) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    if (state.features?.autoMarker) {
      placeGuessOnMap(true);
    } else {
      const prev = !!state.features?.safeMode;
      state.features.safeMode = true;
      if (!state.gameMap) findMapInstance();
      const ok = toggleMarker();
      state.features.safeMode = prev;
      updateStatusText(ok ? 'Safe Marked' : 'No map', ok ? '#4ade80' : '#ef4444');
    }
    return;
  }

  // Zoom In
  if (hkMap.zoomIn && key === hkMap.zoomIn && state.miniMapVisible) {
    if (!Throttle.canRun('hk_zoom_in', COOLDOWNS.ZOOM)) return;
    e.preventDefault();
    e.stopPropagation();
    state.miniMap?.zoomIn();
    return;
  }

  // Zoom Out
  if (hkMap.zoomOut && key === hkMap.zoomOut && state.miniMapVisible) {
    if (!Throttle.canRun('hk_zoom_out', COOLDOWNS.ZOOM)) return;
    e.preventDefault();
    e.stopPropagation();
    state.miniMap?.zoomOut();
    return;
  }

  // Discord
  if (hkMap.discord && key === hkMap.discord) {
    if (!Throttle.canRun('hk_discord', COOLDOWNS.DISCORD)) return;
    e.preventDefault();
    sendToDiscord();
  }
}

/**
 * Quick open menu
 */
function openHomeQuick() {
  if (!state.infoVisible) {
    state.infoVisible = true;
    updateInfoDisplay();
  }
  setTimeout(() => {
    if (typeof state.swapPhoneView === 'function') {
      state.swapPhoneView('map');
    }
  }, 20);
}

/**
 * Refresh location
 */
function refreshLocation() {
  Logger.info('Refreshing location...');
  state.coords = { lat: null, lng: null };
  state.address = null;
  state.markerPlacedThisRound = false;
  internals.interceptedCoords = { lat: null, lng: null };
  internals.lastCoords = { lat: null, lng: null };
  extractionCache.invalidate();

  updateInfoDisplay();
}

// togglePanel sudah di-import dari ui/phone-frame.js
