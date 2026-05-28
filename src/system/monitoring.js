// ============================================
// MONITORING LOOP
// Loop utama yang memantau dan mengekstrak koordinat
// ============================================

import { APP_CONFIG, TIMING, MAP_DEFAULTS } from '../config/constants.js';
import { state, internals } from '../core/state.js';
import { telemetryInc } from '../core/telemetry.js';
import { Logger } from '../utils/logger.js';
import { Validators } from '../utils/validators.js';
import { isXHRInterceptorInstalled } from '../extraction/xhr-interceptor.js';
import { installXHRInterceptor } from '../extraction/xhr-interceptor.js';
import { extractionCache } from '../extraction/cache.js';
import { extractCoordinatesLegacyImpl } from '../extraction/coordinate-extractor.js';
import { ExtractorRegistry } from '../extraction/extractor-registry.js';
import { lookupAddress } from '../features/address-lookup.js';
import { addRoundHistoryEntry, buildHistoryAddressLabel } from '../features/history.js';
import { autoPlaceMarker, findMapInstance } from '../features/marker-placement.js';
import { updateMiniMap } from '../features/minimap.js';
import { updateInfoDisplay, getUiRefs } from '../ui/phone-frame.js';
import { IntegrityManager } from '../protection/integrity-manager.js';

/**
 * Start monitoring loop
 */
export function startMonitoring() {
  if (internals.monitoringInterval) {
    clearInterval(internals.monitoringInterval);
  }

  internals.monitoringFailCount = 0;
  internals.monitoringLastValidCoords = null;
  internals.monitoringConsecutiveErrors = 0;

  internals.monitoringInterval = setInterval(async () => {
    if (internals.monitoringBusy) {
      if (internals.monitoringBusySince && (Date.now() - internals.monitoringBusySince) > 10000) {
        Logger.warn('Monitoring was stuck - forcing reset');
        internals.monitoringBusy = false;
        internals.monitoringBusySince = 0;
      }
      return;
    }

    internals.monitoringBusy = true;
    internals.monitoringBusySince = Date.now();

    try {
      const coords = extractCoordinatesLegacyImpl();

      if (coords && Validators.isValidCoord(coords.lat, coords.lng)) {
        internals.monitoringFailCount = 0;
        internals.monitoringConsecutiveErrors = 0;

        const changed = coords.lat !== internals.lastCoords.lat || coords.lng !== internals.lastCoords.lng;

        if (changed) {
          internals.lastCoords = { lat: coords.lat, lng: coords.lng };
          state.coords = { lat: coords.lat, lng: coords.lng };

          Logger.debug('New coordinates:', coords.lat.toFixed(6), coords.lng.toFixed(6));

          // Detect new round
          let isNewRound = !internals.monitoringLastValidCoords;

          if (internals.monitoringLastValidCoords) {
            const distance = Math.abs(coords.lat - internals.monitoringLastValidCoords.lat) +
              Math.abs(coords.lng - internals.monitoringLastValidCoords.lng);
            if (distance > MAP_DEFAULTS.NEW_ROUND_THRESHOLD) {
              isNewRound = true;
              Logger.info('New round detected');
              state.markerPlacedThisRound = false;
              state.address = null;
              extractionCache.invalidate();

              if (state.marker) {
                try {
                  if (typeof google !== 'undefined' && google.maps && state.marker.setMap) {
                    state.marker.setMap(null);
                  } else if (typeof L !== 'undefined' && state.gameMap) {
                    state.gameMap.removeLayer(state.marker);
                  }
                } catch (e) { /* silent */ }
                state.marker = null;
              }
            }
          }

          if (isNewRound) {
            addRoundHistoryEntry(coords, state.address);
          }
          internals.monitoringLastValidCoords = { lat: coords.lat, lng: coords.lng };

          // Address lookup
          try {
            state.address = await lookupAddress(coords.lat, coords.lng);
            Logger.debug('Address:', buildHistoryAddressLabel(state.address));

            const latest = state.roundHistory[0];
            if (latest &&
              Math.abs(latest.lat - coords.lat) < 0.00001 &&
              Math.abs(latest.lng - coords.lng) < 0.00001) {
              latest.address = buildHistoryAddressLabel(state.address);
            }
          } catch (e) {
            Logger.debug('Address lookup failed:', e?.message || 'unknown');
          }

          // Update displays
          try {
            if (state.infoVisible) {
              updateInfoDisplay();
            }
            if (state.miniMapVisible && state.miniMap) {
              updateMiniMap();
            }
          } catch (e) {
            Logger.debug('Display update error:', e?.message);
          }

          // Auto marker
          try { autoPlaceMarker(); } catch (e) { /* silent */ }

          // Update marker position
          if (state.marker) {
            try {
              if (typeof google !== 'undefined' && state.marker.setPosition) {
                state.marker.setPosition(new google.maps.LatLng(coords.lat, coords.lng));
              } else if (typeof L !== 'undefined' && state.marker.setLatLng) {
                state.marker.setLatLng([coords.lat, coords.lng]);
              }
            } catch (e) { /* silent */ }
          }

          if (!state.gameMap) {
            findMapInstance();
          }
        }
      } else {
        internals.monitoringFailCount++;
        if (internals.monitoringFailCount === 10) {
          Logger.debug('Waiting for coordinates... (platform:', state.platform, ')');
          internals.monitoringFailCount = 0;

          if (!isXHRInterceptorInstalled()) {
            Logger.warn('XHR interceptor lost - reinstalling');
            installXHRInterceptor();
          }
        }

        if (internals.monitoringFailCount % 20 === 5 && !state.gameMap) {
          findMapInstance();
        }
      }
    } catch (e) {
      internals.monitoringConsecutiveErrors++;
      Logger.error('Monitoring error:', e);
      IntegrityManager.scheduleSoon('monitor_error', 1500);

      if (internals.monitoringConsecutiveErrors >= 5) {
        Logger.warn('Monitoring crashed repeatedly - restarting in 3s');
        clearInterval(internals.monitoringInterval);
        internals.monitoringInterval = null;
        internals.monitoringBusy = false;
        internals.monitoringBusySince = 0;
        setTimeout(() => {
          Logger.info('Restarting monitoring after crash recovery');
          startMonitoring();
        }, 3000);
        return;
      }
    } finally {
      internals.monitoringBusy = false;
      internals.monitoringBusySince = 0;
    }
  }, TIMING.MONITORING_INTERVAL);
}
