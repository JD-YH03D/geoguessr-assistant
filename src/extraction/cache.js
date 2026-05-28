// ============================================
// EXTRACTION CACHE
// Mencegah ekstraksi koordinat berulang-ulang
// ============================================

import { APP_CONFIG } from '../config/constants.js';

export const extractionCache = {
  result: null,
  source: null,
  timestamp: 0,
  hits: 0,
  misses: 0,

  get() {
    if (this.result && (Date.now() - this.timestamp) < APP_CONFIG.TIMING.EXTRACTION_CACHE_TTL) {
      this.hits++;
      return this.result;
    }
    return null;
  },

  set(result, source) {
    this.result = result;
    this.source = source;
    this.timestamp = Date.now();
    this.misses++;
  },

  invalidate() {
    this.result = null;
    this.source = null;
    this.timestamp = 0;
  },

  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : 'N/A';
    return { hits: this.hits, misses: this.misses, hitRate };
  }
};
