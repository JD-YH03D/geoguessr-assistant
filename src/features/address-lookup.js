// ============================================
// ADDRESS LOOKUP (Nominatim API)
// Reverse geocoding untuk mendapatkan alamat dari koordinat
// ============================================

import { APP_CONFIG, TIMING } from '../config/constants.js';
import { state, internals } from '../core/state.js';
import { Logger } from '../utils/logger.js';
import { Validators } from '../utils/validators.js';

const ADDRESS_MAX_BACKOFF = 30000;

/**
 * Lookup address dari koordinat
 */
export async function lookupAddress(lat, lng) {
  return new Promise((resolve, reject) => {
    if (!Validators.isValidCoord(lat, lng)) {
      reject(new Error('Invalid coordinates'));
      return;
    }

    while (internals.addressQueue.length >= APP_CONFIG.LIMITS.ADDRESS_QUEUE_MAX) {
      const stale = internals.addressQueue.shift();
      stale.reject(new Error('Queue overflow - stale request dropped'));
    }

    internals.addressQueue.push({ lat, lng, resolve, reject });
    processAddressQueue();
  });
}

/**
 * Process address queue dengan rate limiting
 */
function processAddressQueue() {
  if (internals.addressProcessing || internals.addressQueue.length === 0) return;

  const now = Date.now();
  const minInterval = state.platform === 'geoguessr'
    ? TIMING.ADDRESS_RATE_LIMIT_GEOGUESSR
    : TIMING.ADDRESS_RATE_LIMIT_DEFAULT;
  const effectiveInterval = Math.max(minInterval, internals.addressBackoffMs);
  const elapsed = now - internals.lastAddressCall;

  if (elapsed >= effectiveInterval) {
    internals.addressProcessing = true;
    const { lat, lng, resolve, reject } = internals.addressQueue.shift();

    const url = `${APP_CONFIG.NOMINATIM_URL}?lat=${lat}&lon=${lng}&format=json&accept-language=en`;

    const handleResponse = (data) => {
      internals.lastAddressCall = Date.now();
      internals.addressProcessing = false;
      internals.addressConsecutiveErrors = 0;
      internals.addressBackoffMs = 0;
      resolve(data);
      setTimeout(processAddressQueue, minInterval);
    };

    const handleError = (error, statusCode) => {
      internals.lastAddressCall = Date.now();
      internals.addressProcessing = false;
      internals.addressConsecutiveErrors++;

      if (statusCode === 429 || internals.addressConsecutiveErrors >= 2) {
        internals.addressBackoffMs = Math.min(
          ADDRESS_MAX_BACKOFF,
          Math.max(2000, internals.addressBackoffMs * 2 || 2000)
        );
        Logger.warn(`Address API throttled - backing off ${(internals.addressBackoffMs / 1000).toFixed(0)}s`);
      }

      reject(error);
      setTimeout(processAddressQueue, Math.max(minInterval, internals.addressBackoffMs));
    };

    if (typeof GM_xmlhttpRequest !== 'undefined') {
      GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        headers: { 'Accept': 'application/json' },
        timeout: 10000,
        onload: (res) => {
          if (res.status === 200) {
            try {
              handleResponse(JSON.parse(res.responseText));
            } catch (e) {
              handleError(e, res.status);
            }
          } else {
            handleError(new Error(`HTTP ${res.status}`), res.status);
          }
        },
        onerror: (e) => handleError(e, 0),
        ontimeout: () => handleError(new Error('Request timeout'), 0)
      });
    } else {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      })
        .then(res => {
          clearTimeout(timeoutId);
          if (res.ok) return res.json();
          throw { message: `HTTP ${res.status}`, status: res.status };
        })
        .then(handleResponse)
        .catch((e) => {
          clearTimeout(timeoutId);
          handleError(e, e?.status || 0);
        });
    }
  } else {
    setTimeout(processAddressQueue, effectiveInterval - elapsed);
  }
}
