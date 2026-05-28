// ============================================
// KONSTANTA & KONFIGURASI UTAMA
// Edit file ini untuk mengubah perilaku dasar script
// ============================================

export const INIT_GUARD_KEY = '__btp_initialized';
export const CLEANUP_GUARD_KEY = '__btp_cleaned';

export const APP_CONFIG = Object.freeze({
  NAME: 'Bintang Toba Pro',
  VERSION: '2.1.0',
  DEBUG: false, // Set true untuk logging verbose

  // URL API
  NOMINATIM_URL: 'https://nominatim.openstreetmap.org/reverse',
  LEAFLET_CSS: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  LEAFLET_JS: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  VERSION_METADATA_URL: 'https://api.npoint.io/6966baef3a45eff8cac4',

  // Kunci penyimpanan
  STORAGE_KEYS: Object.freeze({
    DISCORD_WEBHOOK: 'bintang_toba_discord_webhook',
    HOTKEYS: 'bintang_toba_hotkeys',
    PRESET: 'bintang_toba_preset',
    MAP_LAYER: 'bintang_toba_map_layer',
    THEME: 'bintang_toba_theme_mode',
    UI_SCALE: 'bintang_toba_ui_scale',
    FEATURES: 'bintang_toba_features',
    DEBUG: 'bintang_toba_debug',
    INTEGRITY_CACHE: 'bintang_toba_integrity_cache',
    PROTECTION_STATE: 'bintang_toba_protection_state',
    REMOTE_VERSION_CACHE: 'bintang_toba_remote_version_cache'
  }),

  // Batasan sistem
  LIMITS: Object.freeze({
    HISTORY_MAX_ITEMS: 10,
    ADDRESS_QUEUE_MAX: 5,
    FIBER_WALK_MAX_DEPTH: 15
  }),

  // Batasan sistem
  LIMITS: Object.freeze({
    HISTORY_MAX_ITEMS: 10,
    ADDRESS_QUEUE_MAX: 5,
    FIBER_WALK_MAX_DEPTH: 15
  }),

  // Feature flags (jangan diubah kecuali tahu apa yang dilakukan)
  FLAGS: Object.freeze({
    USE_PATCH_MANAGER: false,
    USE_EXTRACTOR_REGISTRY: false,
    USE_REQUEST_TOKENING: false,
    USE_DEGRADED_MODE: false,
    ENABLE_SHADOW_EXTRACTION_TELEMETRY: true
  })
});

export const TIMING = Object.freeze({
  MONITORING_INTERVAL: 500,
  EXTRACT_LOG_INTERVAL: 5000,
  ADDRESS_RATE_LIMIT_GEOGUESSR: 1000,
  ADDRESS_RATE_LIMIT_DEFAULT: 1500,
  EXTRACTION_CACHE_TTL: 400,
  HOTKEY_CACHE_TTL: 10000,
  KEYDOWN_DEBOUNCE: 50,
  LEAFLET_LOAD_TIMEOUT: 10000,
  LEAFLET_POLL_INTERVAL: 50,
  MAP_FIND_DELAY: 2000,
  BUTTON_FEEDBACK_DURATION: 1500,
  CLOCK_UPDATE_INTERVAL: 60000,
  INTEGRITY_CHECK_INTERVAL: 180000,
  INTEGRITY_HEARTBEAT_INTERVAL: 45000,
  INTEGRITY_FETCH_TIMEOUT: 10000,
  INTEGRITY_CACHE_TTL: 300000,
  INTEGRITY_MIN_FETCH_GAP: 30000
});

export const COOLDOWNS = Object.freeze({
  TOGGLE_PANEL: 150,
  MARKER: 200,
  REFRESH: 500,
  INFO: 200,
  COPY: 350,
  MAPS: 600,
  AUTO_PLACE: 250,
  SAFE_PLACE: 250,
  ZOOM: 100,
  DISCORD: 700,
  DISCORD_SEND: 1500,
  HISTORY_COPY: 400,
  HISTORY_EXPORT: 700,
  SESSION_BACKUP: 700
});

export const MAP_DEFAULTS = Object.freeze({
  DEFAULT_ZOOM: 13,
  WORLD_VIEW_ZOOM: 2,
  MIN_ZOOM: 1,
  PAN_THRESHOLD: 0.0001,
  JUMP_THRESHOLD: 1.0,
  NEW_ROUND_THRESHOLD: 0.1,
  SAFE_MODE_OFFSET_DEGREES: 0.00045 // ~50 meters
});
