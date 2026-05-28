// ============================================
// MARKER PLACEMENT & GAME MAP PIN ENGINE
// Menempatkan marker pada peta game
// ============================================

import { MAP_DEFAULTS } from '../config/constants.js';
import { state } from '../core/state.js';
import { Logger } from '../utils/logger.js';
import { Validators } from '../utils/validators.js';
import { Security } from '../utils/security.js';
import { Throttle } from '../utils/throttle.js';
import { COOLDOWNS } from '../config/constants.js';
import { updateStatusText, updateLedIndicator } from './status-indicators.js';
import { guardProtectedUsage } from '../protection/integrity-manager.js';
import { extractCoordinates } from '../extraction/coordinate-extractor.js';

/**
 * Apply safe mode jitter ke koordinat
 */
export function applySafeMode(coords) {
  if (!state.features?.safeMode) return coords;

  const maxOffset = MAP_DEFAULTS.SAFE_MODE_OFFSET_DEGREES;
  const latOffset = (Math.random() - 0.5) * 2 * maxOffset;
  const lngOffset = (Math.random() - 0.5) * 2 * maxOffset;

  return {
    lat: coords.lat + latOffset,
    lng: coords.lng + lngOffset
  };
}

/**
 * Resolve Google Map instance dari React Fiber
 */
export function resolveGoogleMapFromFiber(domNode, maxDepth = 8) {
  if (!domNode) return null;

  const fiberKey = Object.keys(domNode).find(k =>
    k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
  );
  if (!fiberKey) return null;

  let fiber = domNode[fiberKey];

  for (let depth = 0; fiber && depth < maxDepth; depth++) {
    try {
      const props = fiber.memoizedProps;
      if (props?.map && typeof props.map === 'object') {
        if (props.map.__e3_ || props.map.getCenter || props.map.setCenter) {
          return props.map;
        }
      }

      if (fiber.stateNode?.map && fiber.stateNode.map.__e3_) {
        return fiber.stateNode.map;
      }
    } catch (_) { /* guard against sealed props */ }

    fiber = fiber.return;
  }

  return null;
}

/**
 * Build synthetic map click event
 */
export function buildSyntheticMapEvent(lat, lng) {
  return {
    latLng: {
      lat: () => lat,
      lng: () => lng,
      toJSON: () => ({ lat, lng }),
      toString: () => `(${lat}, ${lng})`
    },
    stop: null,
    pixel: null
  };
}

/**
 * Dispatch event ke click listeners pada Google Map
 */
export function dispatchToClickListeners(mapInst, syntheticEvent) {
  const registryKeys = ['__e3_', '__listeners_', 'gm_bindings_'];
  let invoked = false;

  for (const regKey of registryKeys) {
    const registry = mapInst[regKey];
    if (!registry || typeof registry !== 'object') continue;

    const clickBucket = registry.click;
    if (!clickBucket || typeof clickBucket !== 'object') continue;

    const bucketKeys = Object.keys(clickBucket);
    for (let i = bucketKeys.length - 1; i >= 0; i--) {
      const entry = clickBucket[bucketKeys[i]];
      if (!entry || typeof entry !== 'object') continue;

      const fnKeys = Object.keys(entry);
      for (const fk of fnKeys) {
        if (typeof entry[fk] === 'function') {
          try {
            entry[fk](syntheticEvent);
            invoked = true;
            Logger.debug(`dispatchToClickListeners: invoked handler [${regKey}][${bucketKeys[i]}][${fk}]`);
          } catch (err) {
            Logger.debug('dispatchToClickListeners: handler threw', err.message);
          }
        }
      }
    }

    if (invoked) break;
  }

  return invoked;
}

/**
 * Locate guess map node pada DOM
 */
export function locateGuessMapNode() {
  const candidates = [
    '[class^="guess-map_canvas"]',
    '[class*="guess-map_canvas"]',
    '[data-qa="guess-map"] [class*="canvas"]',
    '[class*="region-map_mapCanvas"]',
    '[class*="region-map_canvas"]',
    '[class*="map_canvas__"]',
    '[class*="mapCanvas__"]'
  ];

  for (const sel of candidates) {
    const nodes = document.querySelectorAll(sel);
    for (const node of nodes) {
      const r = node.getBoundingClientRect();
      if (r.width > 30 && r.height > 30) return node;
    }
  }

  return null;
}

/**
 * Pin guess ke game map
 */
export function pinGuessToGameMap(lat, lng) {
  const mapNode = locateGuessMapNode();
  if (!mapNode) {
    Logger.debug('pinGuessToGameMap: guess-map node not found');
    return false;
  }

  const gMapInst = resolveGoogleMapFromFiber(mapNode, 10);
  if (!gMapInst) {
    Logger.debug('pinGuessToGameMap: Google Maps instance not found in Fiber');
    return false;
  }

  const synEvent = buildSyntheticMapEvent(lat, lng);
  const ok = dispatchToClickListeners(gMapInst, synEvent);

  if (ok) {
    Logger.debug('pinGuessToGameMap: successfully dispatched at', lat.toFixed(6), lng.toFixed(6));
  } else {
    Logger.debug('pinGuessToGameMap: no click listeners accepted the event');
  }

  return ok;
}

/**
 * Jitter coordinates dengan distribusi uniform
 */
export function jitterCoordinates(lat, lng) {
  const maxR = MAP_DEFAULTS.SAFE_MODE_OFFSET_DEGREES;
  const angle = Math.random() * 2 * Math.PI;
  const radius = maxR * Math.sqrt(Math.random());
  return {
    lat: lat + radius * Math.cos(angle),
    lng: lng + radius * Math.sin(angle)
  };
}

/**
 * Place guess on game map (main function)
 */
export function placeGuessOnMap(withJitter = false) {
  if (!guardProtectedUsage('Place Guess')) return false;

  const raw = extractCoordinates();
  if (!raw || !Validators.isValidCoord(raw.lat, raw.lng)) {
    updateStatusText('No coords', '#ef4444');
    return false;
  }

  const target = withJitter ? jitterCoordinates(raw.lat, raw.lng) : raw;
  const ok = pinGuessToGameMap(target.lat, target.lng);

  if (ok) {
    state.markerPlacedThisRound = true;
    updateStatusText(withJitter ? 'Safe Pinned!' : 'Pinned!', '#4ade80');
    updateLedIndicator('ready');
    Logger.info('📌 Guess pinned on game map',
      withJitter ? '(jittered)' : '(exact)',
      target.lat.toFixed(6), target.lng.toFixed(6));
  } else {
    updateStatusText('Pin failed', '#ef4444');
    Logger.warn('placeGuessOnMap: could not pin guess');
  }

  return ok;
}

/**
 * Toggle marker (legacy manual mode)
 */
export function toggleMarker(forceCoords = null) {
  const coords = forceCoords || extractCoordinates();
  if (!coords || !Validators.isValidCoord(coords.lat, coords.lng)) {
    Logger.debug('No valid coordinates');
    return false;
  }

  const finalCoords = applySafeMode(coords);

  // Remove existing marker
  if (state.marker) {
    try {
      if (typeof google !== 'undefined' && google.maps && state.marker.setMap) {
        state.marker.setMap(null);
      } else if (typeof L !== 'undefined' && state.gameMap) {
        state.gameMap.removeLayer(state.marker);
      }
    } catch (e) {
      Logger.debug('Marker removal error:', e.message);
    }
    state.marker = null;
    Logger.debug('Marker removed');
    return false;
  }

  // Add new marker
  if (typeof google !== 'undefined' && google.maps && state.gameMap) {
    state.marker = new google.maps.Marker({
      position: new google.maps.LatLng(finalCoords.lat, finalCoords.lng),
      map: state.gameMap,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#ff4444',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    });
    Logger.debug('Marker added (Google Maps)', state.features?.safeMode ? '[Safe Mode]' : '[Exact]');
    return true;
  }

  if (typeof L !== 'undefined' && state.gameMap) {
    state.marker = L.marker([finalCoords.lat, finalCoords.lng]).addTo(state.gameMap);
    Logger.debug('Marker added (Leaflet)', state.features?.safeMode ? '[Safe Mode]' : '[Exact]');
    return true;
  }

  Logger.debug('No map available');
  return false;
}

/**
 * Auto place marker (dipanggil monitoring loop)
 */
export function autoPlaceMarker() {
  // Placeholder untuk auto-place logic
  return;
}

/**
 * Find map instance dari DOM
 */
export function findMapInstance() {
  try {
    const selectors = [
      "[class*='guess-map_canvas']",
      ".leaflet-container",
      "[class*='mapCanvas']",
      "[class*='map-canvas']",
      "[data-qa*='map']",
      "[id*='map']"
    ];

    const containers = document.querySelectorAll(selectors.join(', '));

    for (const container of containers) {
      const fiberKey = Object.keys(container).find(k => k.startsWith('__reactFiber'));
      if (fiberKey) {
        const fiber = container[fiberKey];
        state.gameMap = fiber.return?.memoizedProps?.map ||
          fiber.return?.return?.memoizedProps?.map ||
          fiber.child?.memoizedProps?.value?.map ||
          null;
        if (state.gameMap) {
          Logger.debug('Map found via React Fiber');
          return true;
        }
      }
    }
  } catch (e) {
    Logger.error('Map find error:', e);
  }
  return false;
}
