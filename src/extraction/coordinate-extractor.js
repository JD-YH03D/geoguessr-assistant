// ============================================
// COORDINATE EXTRACTOR
// Ekstrak koordinat dari berbagai sumber pada halaman
// ============================================

import { APP_CONFIG } from '../config/constants.js';
import { state, internals } from '../core/state.js';
import { extractionCache } from './cache.js';
import { telemetryInc, telemetryTime } from '../core/telemetry.js';
import { Validators } from '../utils/validators.js';
import { Logger } from '../utils/logger.js';

/**
 * Ambil koordinat dari XHR intercept
 */
export function getInterceptedCoords() {
  if (Validators.isValidCoord(internals.interceptedCoords.lat, internals.interceptedCoords.lng)) {
    return { lat: internals.interceptedCoords.lat, lng: internals.interceptedCoords.lng };
  }
  return null;
}

/**
 * Walk React Fiber tree untuk menemukan Street View data
 */
export function walkFiber(fiber, depth = 0) {
  if (!fiber || depth > APP_CONFIG.LIMITS.FIBER_WALK_MAX_DEPTH) return null;

  try {
    const props = fiber.memoizedProps;
    if (props) {
      if (props.panorama?.location?.latLng) return props.panorama;
      if (props.streetView?.location?.latLng) return props.streetView;
      if (props.children?.props?.panorama?.location?.latLng) return props.children.props.panorama;
    }

    const queue = fiber.updateQueue;
    if (queue?.lastEffect) {
      let effect = queue.lastEffect;
      const seen = new Set();
      do {
        if (seen.has(effect)) break;
        seen.add(effect);
        if (effect.deps) {
          for (const dep of effect.deps) {
            if (dep?.location?.latLng) return dep;
          }
        }
        effect = effect.next;
      } while (effect && effect !== queue.lastEffect);
    }

    const fromSibling = walkFiber(fiber.sibling, depth + 1);
    if (fromSibling) return fromSibling;

    const fromReturn = walkFiber(fiber.return, depth + 1);
    if (fromReturn) return fromReturn;

  } catch (e) { /* silent */ }
  return null;
}

/**
 * Ekstrak dari Google Street View canvas
 */
export function extractFromGoogleSV() {
  try {
    const canvases = document.querySelectorAll('.widget-scene-canvas, canvas[class*="scene"]');
    for (const canvas of canvases) {
      let el = canvas;
      for (let i = 0; i < 10 && el; i++) {
        el = el.parentElement;
        if (!el) break;
        const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber'));
        if (fiberKey) {
          const sv = walkFiber(el[fiberKey], 0);
          if (sv?.location?.latLng) {
            const lat = typeof sv.location.latLng.lat === 'function'
              ? sv.location.latLng.lat() : sv.location.latLng.lat;
            const lng = typeof sv.location.latLng.lng === 'function'
              ? sv.location.latLng.lng() : sv.location.latLng.lng;
            if (Validators.isValidCoord(lat, lng)) return { lat, lng };
          }
        }
      }
    }
  } catch (e) { /* silent */ }
  return null;
}

/**
 * Ekstrak koordinat dari iframe URLs
 */
export function extractFromIframes() {
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    const src = iframe.src || iframe.getAttribute('data-src') || '';
    if (!src || src.length < 10) continue;

    try {
      const baseUrl = src.startsWith('http') ? src : window.location.origin + src;
      const url = new URL(baseUrl);

      const paramPatterns = [
        { key: 'location', separator: ',' },
        { key: 'cbll', separator: ',' },
        { key: 'viewpoint', separator: ',' },
        { keys: ['lat', 'lng'] },
        { keys: ['lat', 'lon'] }
      ];

      for (const pattern of paramPatterns) {
        if (pattern.key) {
          const value = url.searchParams.get(pattern.key);
          if (value) {
            const parts = value.split(pattern.separator);
            if (parts.length >= 2) {
              const lat = parseFloat(parts[0]);
              const lng = parseFloat(parts[1]);
              if (Validators.isValidCoord(lat, lng)) return { lat, lng };
            }
          }
        } else if (pattern.keys) {
          const lat = parseFloat(url.searchParams.get(pattern.keys[0]));
          const lng = parseFloat(url.searchParams.get(pattern.keys[1]));
          if (Validators.isValidCoord(lat, lng)) return { lat, lng };
        }
      }
    } catch (e) { continue; }
  }
  return null;
}

/**
 * Ekstrak dari URL params
 */
export function extractFromUrlParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get('lat'));
    const lng = parseFloat(params.get('lng') || params.get('lon'));
    return Validators.isValidCoord(lat, lng) ? { lat, lng } : null;
  } catch (e) { return null; }
}

/**
 * Ekstrak dari global variables
 */
export function extractFromGlobalVars() {
  try {
    const safeWin = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
    const c1 = safeWin?.__gameState?.coords;
    if (c1 && Validators.isValidCoord(c1.lat, c1.lng)) {
      return { lat: c1.lat, lng: c1.lng };
    }
    const c2 = safeWin?.gameCoordinates;
    if (c2 && Validators.isValidCoord(c2.lat, c2.lng)) {
      return { lat: c2.lat, lng: c2.lng };
    }
  } catch (e) { /* silent */ }
  return null;
}

/**
 * Ekstrak dari GeoGuessr React Fiber secara spesifik
 */
export function extractFromGeoGuessrFiber() {
  try {
    const panorama = document.querySelector(
      'div[data-qa="panorama"], [data-qa="street-view"], [class*="panorama"], [class*="streetview"]'
    );
    if (panorama) {
      const fiberKey = Object.keys(panorama).find(k => k.startsWith('__reactFiber'));
      if (fiberKey) {
        const fiber = panorama[fiberKey];

        const paths = [
          fiber.return?.return?.return?.sibling?.memoizedProps?.panorama,
          fiber.return?.return?.return?.return?.sibling?.memoizedProps?.panorama,
          fiber.return?.updateQueue?.lastEffect?.deps?.[0],
          fiber.return?.return?.updateQueue?.lastEffect?.deps?.[0],
          fiber.child?.memoizedProps?.panorama,
          fiber.return?.memoizedProps?.panorama,
        ];

        for (const sv of paths) {
          if (sv?.location?.latLng) {
            const lat = typeof sv.location.latLng.lat === 'function'
              ? sv.location.latLng.lat() : sv.location.latLng.lat;
            const lng = typeof sv.location.latLng.lng === 'function'
              ? sv.location.latLng.lng() : sv.location.latLng.lng;
            if (Validators.isValidCoord(lat, lng)) return { lat, lng };
          }
        }

        const sv = walkFiber(fiber, 0);
        if (sv?.location?.latLng) {
          const lat = typeof sv.location.latLng.lat === 'function'
            ? sv.location.latLng.lat() : sv.location.latLng.lat;
          const lng = typeof sv.location.latLng.lng === 'function'
            ? sv.location.latLng.lng() : sv.location.latLng.lng;
          if (Validators.isValidCoord(lat, lng)) return { lat, lng };
        }
      }
    }
  } catch (e) { /* silent */ }
  return null;
}

/**
 * Ekstrak dari platform non-GeoGuessr
 */
export function extractFromOtherPlatforms() {
  const freeGuessrSelectors = [
    '.iframeWithStreetView',
    '[class*="streetview"]',
    '[class*="panorama"]',
    '[data-testid*="street"]',
    '[id*="streetview"]'
  ];

  for (const selector of freeGuessrSelectors) {
    const el = document.querySelector(selector);
    if (!el) continue;
    const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber'));
    if (!fiberKey) continue;

    const fiber = el[fiberKey];

    const latLong = fiber.return?.memoizedProps?.latLong
      || fiber.return?.return?.memoizedProps?.latLong
      || fiber.memoizedProps?.latLong;

    if (Array.isArray(latLong) && latLong.length === 2) {
      const [lat, lng] = latLong;
      if (Validators.isValidCoord(lat, lng)) return { lat, lng };
    }

    const coordinates = fiber.return?.memoizedProps?.coordinates
      || fiber.return?.return?.memoizedProps?.coordinates;

    if (coordinates) {
      const lat = coordinates.lat || coordinates.latitude;
      const lng = coordinates.lng || coordinates.lon || coordinates.longitude;
      if (Validators.isValidCoord(lat, lng)) return { lat, lng };
    }
  }
  return null;
}

/**
 * Fungsi ekstraksi utama - legacy implementation
 */
export function extractCoordinatesLegacyImpl() {
  const cached = extractionCache.get();
  if (cached) return cached;

  try {
    // 1. XHR intercept (paling cepat)
    const fromXHR = getInterceptedCoords();
    if (fromXHR) {
      extractionCache.set(fromXHR, 'xhr');
      return fromXHR;
    }

    // 2. GeoGuessr React Fiber
    if (state.platform === 'geoguessr') {
      const fromFiber = extractFromGeoGuessrFiber();
      if (fromFiber) {
        extractionCache.set(fromFiber, 'fiber');
        return fromFiber;
      }

      const fromSV = extractFromGoogleSV();
      if (fromSV) {
        extractionCache.set(fromSV, 'sv-canvas-geo');
        return fromSV;
      }
    }

    // 3. Iframes
    const fromIframe = extractFromIframes();
    if (fromIframe) {
      extractionCache.set(fromIframe, 'iframe');
      return fromIframe;
    }

    // 4. Non-GeoGuessr platforms
    if (state.platform !== 'geoguessr') {
      const fromOther = extractFromOtherPlatforms();
      if (fromOther) {
        extractionCache.set(fromOther, 'fiber-other');
        return fromOther;
      }

      const fromSV = extractFromGoogleSV();
      if (fromSV) {
        extractionCache.set(fromSV, 'sv-canvas');
        return fromSV;
      }
    }

    // 5. URL params
    const fromUrl = extractFromUrlParams();
    if (fromUrl) {
      extractionCache.set(fromUrl, 'url-params');
      return fromUrl;
    }

    // 6. Global variables
    const fromGlobal = extractFromGlobalVars();
    if (fromGlobal) {
      extractionCache.set(fromGlobal, 'global');
      return fromGlobal;
    }

  } catch (e) {
    Logger.error('Extract error:', e);
  }

  // Log jika tidak ada koordinat
  const now = Date.now();
  if (now - internals.lastExtractLog > APP_CONFIG.TIMING.EXTRACT_LOG_INTERVAL) {
    internals.lastExtractLog = now;
    Logger.debug('No coordinates found (platform:', state.platform, ')');
  }

  return null;
}

import { ExtractorRegistry } from './extractor-registry.js';

/**
 * Fungsi ekstraksi utama (wrapper dengan shadow telemetry)
 */
export function extractCoordinates() {
  const live = extractCoordinatesLegacyImpl();
  ExtractorRegistry.runShadowAgainst(live);
  return live;
}

/**
 * Koordinat equivalency check untuk shadow extraction
 */
export function areCoordsEquivalent(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (!Validators.isValidCoord(a.lat, a.lng) || !Validators.isValidCoord(b.lat, b.lng)) return false;
  return Math.abs(a.lat - b.lat) < 0.000001 && Math.abs(a.lng - b.lng) < 0.000001;
}
