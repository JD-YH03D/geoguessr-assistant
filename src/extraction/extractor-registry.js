// ============================================
// EXTRACTOR REGISTRY (Shadow Mode)
// Sistem telemetry untuk membandingkan strategi ekstraksi
// ============================================

import { state, internals } from '../core/state.js';
import { telemetryInc, telemetryTime } from '../core/telemetry.js';
import { Validators } from '../utils/validators.js';
import {
  getInterceptedCoords,
  extractFromIframes,
  extractFromGoogleSV,
  extractFromUrlParams,
  extractFromGlobalVars,
  areCoordsEquivalent
} from './coordinate-extractor.js';

const ExtractorRegistry = {
  _initialized: false,
  _strategies: [],
  _health: Object.create(null),

  register(name, runFn) {
    this._strategies.push({ name, run: runFn });
    if (!this._health[name]) {
      this._health[name] = {
        attempts: 0,
        success: 0,
        nulls: 0,
        mismatches: 0,
        totalMs: 0,
        avgMs: 0,
        lastMs: 0,
        lastOkAt: 0,
        lastNullAt: 0
      };
    }
  },

  initDefaults() {
    if (this._initialized) return;
    this._initialized = true;

    this.register('shadow_xhr_intercept', () => getInterceptedCoords());
    this.register('shadow_iframe', () => extractFromIframes());
    this.register('shadow_google_sv', () => extractFromGoogleSV());
    this.register('shadow_url_params', () => extractFromUrlParams());
    this.register('shadow_global_vars', () => extractFromGlobalVars());
  },

  runShadowAgainst(liveResult) {
    if (!state.runtime?.flags?.ENABLE_SHADOW_EXTRACTION_TELEMETRY) return;

    internals.shadowExtractionTick++;
    if ((internals.shadowExtractionTick % 5) !== 0) return;

    this.initDefaults();
    telemetryInc('extraction.shadowRuns');

    setTimeout(() => {
      for (const strategy of this._strategies) {
        const started = (typeof performance !== 'undefined' && performance.now)
          ? performance.now()
          : Date.now();

        let result = null;
        try {
          result = strategy.run();
        } catch (e) {
          result = null;
        }

        const ended = (typeof performance !== 'undefined' && performance.now)
          ? performance.now()
          : Date.now();
        const ms = Math.max(0, ended - started);
        const ok = !!(result && Validators.isValidCoord(result.lat, result.lng));

        telemetryTime(strategy.name, ms, ok);

        const h = this._health[strategy.name];
        h.attempts++;
        h.lastMs = ms;
        h.totalMs += ms;
        h.avgMs = h.attempts ? +(h.totalMs / h.attempts).toFixed(3) : 0;

        if (ok) {
          h.success++;
          h.lastOkAt = Date.now();
        } else {
          h.nulls++;
          h.lastNullAt = Date.now();
          telemetryInc(`extraction.strategy.${strategy.name}.nulls`);
        }

        if (!areCoordsEquivalent(liveResult, result)) {
          h.mismatches++;
          telemetryInc('extraction.shadowMismatches');
          telemetryInc(`extraction.strategy.${strategy.name}.mismatch`);
        }
      }
    }, 0);
  },

  getHealthSnapshot() {
    try {
      return JSON.parse(JSON.stringify(this._health));
    } catch (e) {
      return {};
    }
  }
};

export { ExtractorRegistry };
