// ============================================
// XHR INTERCEPTOR
// Menangkap koordinat dari request Google Maps API
// ============================================

import { Logger } from '../utils/logger.js';
import { Validators } from '../utils/validators.js';
import { internals } from '../core/state.js';

const XHR_LISTENER_FLAG = '__btp_listened';
const XHR_PATCH_FLAG = '__btp_open_patched';
const XHR_ORIGINAL_OPEN_KEY = '__btp_original_open';

const TARGET_URLS = [
  'https://maps.googleapis.com/$rpc/google.internal.maps.mapsjs.v1.MapsJsInternalService/GetMetadata',
  'https://maps.googleapis.com/$rpc/google.internal.maps.mapsjs.v1.MapsJsInternalService/SingleImageSearch'
];

/**
 * Install interceptor pada XMLHttpRequest.prototype.open
 */
export function installXHRInterceptor() {
  if (XMLHttpRequest.prototype[XHR_PATCH_FLAG]) return;

  XMLHttpRequest.prototype[XHR_ORIGINAL_OPEN_KEY] = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype[XHR_PATCH_FLAG] = true;

  XMLHttpRequest.prototype.open = function (method, url) {
    if (!this[XHR_LISTENER_FLAG] &&
      method.toUpperCase() === 'POST' &&
      TARGET_URLS.some(target => url.startsWith(target))) {

      this[XHR_LISTENER_FLAG] = true;
      this.addEventListener('load', function () {
        try {
          const pattern = /-?\d+\.\d+,-?\d+\.\d+/g;
          const matches = this.responseText.match(pattern);
          if (matches && matches.length > 0) {
            const [latStr, lngStr] = matches[0].split(',');
            const lat = parseFloat(latStr);
            const lng = parseFloat(lngStr);
            if (Validators.isValidCoord(lat, lng)) {
              internals.interceptedCoords = { lat, lng };
              Logger.debug('XHR intercepted:', lat.toFixed(6), lng.toFixed(6));
            }
          }
        } catch (e) { /* silent */ }
      });
    }

    return XMLHttpRequest.prototype[XHR_ORIGINAL_OPEN_KEY].apply(this, arguments);
  };
}

/**
 * Uninstall interceptor
 */
export function uninstallXHRInterceptor() {
  if (XMLHttpRequest.prototype[XHR_PATCH_FLAG] && XMLHttpRequest.prototype[XHR_ORIGINAL_OPEN_KEY]) {
    XMLHttpRequest.prototype.open = XMLHttpRequest.prototype[XHR_ORIGINAL_OPEN_KEY];
    delete XMLHttpRequest.prototype[XHR_PATCH_FLAG];
    delete XMLHttpRequest.prototype[XHR_ORIGINAL_OPEN_KEY];
  }
}

/**
 * Cek apakah interceptor sudah terinstall
 */
export function isXHRInterceptorInstalled() {
  return !!XMLHttpRequest.prototype[XHR_PATCH_FLAG];
}

/**
 * Cek apakah interceptor terinstall oleh kita
 */
export function isOurXHRInterceptor() {
  return !!XMLHttpRequest.prototype[XHR_ORIGINAL_OPEN_KEY];
}
