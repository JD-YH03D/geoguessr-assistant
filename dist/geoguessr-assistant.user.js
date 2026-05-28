// ==UserScript==
// @name         GeoGuessr - Let's explore the world!
// @namespace    https://github.com/JD-YH03D/release
// @version      2.1.0
// @description  Universal geography game assistant with Mini Map - GeoGuessr, WorldGuessr, OpenGuessr, FreeGuessr
// @author       Bintang Toba Pro
// @license      MIT
// @match        *://*.geoguessr.com/*
// @match        *://openguessr.com/*
// @match        *://*.worldguessr.com/*
// @match        *://*.worldguessr.net/*
// @match        *://freeguessr.com/*
// @match        *://geoduels.io/*
// @match        *://guesswhereyouare.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @connect      nominatim.openstreetmap.org
// @connect      discord.com
// @connect      raw.githubusercontent.com
// @connect      npoint.io
// @run-at       document-idle
// @icon         https://www.geoguessr.com/favicon.ico
// @downloadURL  https://update.greasyfork.org/scripts/578278/GeoGuessr%20-%20Let%27s%20explore%20the%20world%21.user.js
// @updateURL    https://update.greasyfork.org/scripts/578278/GeoGuessr%20-%20Let%27s%20explore%20the%20world%21.meta.js
// ==/UserScript==
(function () {
  'use strict';

  /* global google, L */
  /* eslint-disable */


  // ============================================
  // KONSTANTA & KONFIGURASI UTAMA
  // Edit file ini untuk mengubah perilaku dasar script
  // ============================================

  const INIT_GUARD_KEY = '__btp_initialized';
  const CLEANUP_GUARD_KEY = '__btp_cleaned';

  const APP_CONFIG = Object.freeze({
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

  const TIMING = Object.freeze({
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

  const COOLDOWNS = Object.freeze({
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

  const MAP_DEFAULTS = Object.freeze({
    DEFAULT_ZOOM: 13,
    WORLD_VIEW_ZOOM: 2,
    MIN_ZOOM: 1,
    PAN_THRESHOLD: 0.0001,
    JUMP_THRESHOLD: 1.0,
    NEW_ROUND_THRESHOLD: 0.1,
    SAFE_MODE_OFFSET_DEGREES: 0.00045 // ~50 meters
  });

  // ============================================
  // DEFAULT SETTINGS
  // ============================================

  const DEFAULT_HOTKEYS = Object.freeze({
    panel: 'Home',
    marker: 'M',
    info: 'V',
    refresh: 'X',
    zoomIn: 'S',
    zoomOut: 'A',
    copyCoords: 'C',
    googleMaps: 'G',
    discord: 'D',
    autoPlace: '1',
    safePlace: '2'
  });

  const DEFAULT_FEATURES = Object.freeze({
    autoMarker: false,
    safeMode: false
  });

  const PRESETS = Object.freeze({
    exact: Object.freeze({ autoMarker: false, safeMode: false }),
    safe: Object.freeze({ autoMarker: false, safeMode: true }),
    stealth: Object.freeze({ autoMarker: true, safeMode: true })
  });

  const UI_SCALES = Object.freeze({
    normal: { name: 'Normal', factor: 1 },
    compact: { name: 'Compact', factor: 0.92 }
  });

  const DEFAULT_SETTINGS = Object.freeze({
    MAP_LAYER: 'default',
    THEME: 'dark',
    UI_SCALE: 'normal',
    PRESET: 'exact'
  });

  // ============================================
  // GLOBAL STATE MANAGEMENT
  // Semua state runtime berada di sini
  // ============================================


  // State utama aplikasi
  const state = {
    platform: null,

    coords: { lat: null, lng: null },
    address: null,

    // Map instances
    gameMap: null,
    marker: null,
    miniMap: null,
    miniMapTileLayer: null,
    miniMapMarker: null,

    // UI state
    panel: null,
    infoVisible: false,
    miniMapVisible: false,
    phoneView: 'map',
    swapPhoneView: null,

    // Settings
    hotkeys: { ...DEFAULT_HOTKEYS },
    features: { ...DEFAULT_FEATURES },
    currentPreset: DEFAULT_SETTINGS.PRESET,
    currentMapLayer: DEFAULT_SETTINGS.MAP_LAYER,
    themeMode: DEFAULT_SETTINGS.THEME,
    uiScale: DEFAULT_SETTINGS.UI_SCALE,

    // Data
    roundHistory: [],
    lastImportBackup: null,

    // Round state
    markerPlacedThisRound: false,
    _pendingAddressCoords: null,
    _uiRefs: null,

    // Runtime
    runtime: {
      flags: { ...APP_CONFIG.FLAGS },
      degraded: false,
      degradedReason: null,
      lastDegradedAt: 0,
      protection: {
        blocked: false,
        forceUpdate: false,
        modifiedBuild: false,
        outdated: false,
        reason: null,
        message: '',
        localHash: null,
        remoteHash: null,
        currentVersion: APP_CONFIG.VERSION,
        latestVersion: APP_CONFIG.VERSION,
        checkedAt: 0,
        sourceAvailable: false
      }
    }
  };

  // Internal tracking variables
  const internals = {
    monitoringInterval: null,
    phoneClockInterval: null,
    phoneResizeHandler: null,
    monitoringBusy: false,
    monitoringBusySince: 0,
    oneUiViewsStyled: false,
    panelUiBootstrapped: false,
    refreshRequestId: 0,
    isInitialized: false,
    isCleaningUp: false,
    leafletInitializing: false,
    discordInFlight: false,
    integrityCheckInterval: null,
    integrityHeartbeatInterval: null,
    protectionErrorHandler: null,
    protectionRejectionHandler: null,
    lastKeydownTime: 0,
    lastExtractLog: 0,
    lastAddressCall: 0,
    hotkeyCache: null,
    hotkeyCacheTime: 0,
    actionCooldowns: Object.create(null),
    lastCoords: { lat: null, lng: null },
    interceptedCoords: { lat: null, lng: null },
    addressQueue: [],
    addressProcessing: false,
    addressBackoffMs: 0,
    addressConsecutiveErrors: 0,
    shadowExtractionTick: 0,
    monitoringLastValidCoords: null,
    monitoringFailCount: 0,
    monitoringConsecutiveErrors: 0
  };

  // ============================================
  // TELEMETRY SYSTEM
  // Untuk debugging dan monitoring performa
  // ============================================

  const telemetry = {
    startedAt: Date.now(),
    patch: {
      installAttempts: 0,
      installSuccess: 0,
      installFail: 0,
      uninstallAttempts: 0,
      uninstallSuccess: 0,
      uninstallFail: 0,
      ensureChecks: 0,
      ensureReinstalls: 0
    },
    extraction: {
      strategy: Object.create(null),
      primaryUsed: 0,
      fallbackToLegacy: 0,
      shadowRuns: 0,
      shadowMismatches: 0
    },
    async: {
      addressIssued: 0,
      addressApplied: 0,
      addressDiscardedStale: 0,
      refreshIssued: 0,
      refreshApplied: 0,
      refreshDiscardedStale: 0
    },
    degraded: {
      enterCount: 0,
      exitCount: 0,
      current: false
    },
    protection: {
      checks: 0,
      blockedEvents: 0,
      overlayShows: 0,
      remoteFetchOk: 0,
      remoteFetchFail: 0,
      hashComputed: 0,
      hashMismatch: 0,
      modifiedDetected: 0,
      forceUpdateDetected: 0,
      outdatedDetected: 0
    }
  };

  function telemetryInc(path, value = 1) {
    try {
      const parts = String(path).split('.');
      let ref = telemetry;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!ref[parts[i]] || typeof ref[parts[i]] !== 'object') {
          ref[parts[i]] = {};
        }
        ref = ref[parts[i]];
      }
      const key = parts[parts.length - 1];
      ref[key] = (Number(ref[key]) || 0) + value;
    } catch (e) { /* silent */ }
  }

  function telemetryTime(strategyName, ms, ok) {
    try {
      const name = String(strategyName || 'unknown');
      if (!telemetry.extraction.strategy[name]) {
        telemetry.extraction.strategy[name] = {
          attempts: 0,
          success: 0,
          fail: 0,
          totalMs: 0,
          avgMs: 0,
          lastMs: 0,
          lastOkAt: 0,
          lastFailAt: 0
        };
      }
      const s = telemetry.extraction.strategy[name];
      s.attempts++;
      s.totalMs += Math.max(0, Number(ms) || 0);
      s.lastMs = Math.max(0, Number(ms) || 0);
      s.avgMs = s.attempts ? +(s.totalMs / s.attempts).toFixed(3) : 0;
      if (ok) {
        s.success++;
        s.lastOkAt = Date.now();
      } else {
        s.fail++;
        s.lastFailAt = Date.now();
      }
    } catch (e) { /* silent */ }
  }

  function telemetrySnapshot() {
    try {
      return JSON.parse(JSON.stringify(telemetry));
    } catch (e) {
      return { startedAt: telemetry.startedAt, error: 'snapshot failed' };
    }
  }

  // ============================================
  // LOGGER UTILITY
  // ============================================


  let _debugEnabled = APP_CONFIG.DEBUG;

  const Logger = {
    info(...args) {
      console.log('[BintangTobaPro]', ...args);
    },
    debug(...args) {
      if (_debugEnabled) {
        console.log('[BintangTobaPro:DBG]', ...args);
      }
    },
    warn(...args) {
      console.warn('[BintangTobaPro]', ...args);
    },
    error(...args) {
      console.error('[BintangTobaPro]', ...args);
    },

    initDebugFlag() {
      try {
        const debugVal = typeof GM_getValue !== 'undefined'
          ? GM_getValue(APP_CONFIG.STORAGE_KEYS.DEBUG, false)
          : false;
        _debugEnabled = APP_CONFIG.DEBUG || !!debugVal;
      } catch (e) {
        _debugEnabled = APP_CONFIG.DEBUG;
      }
    },

    setDebug(enabled) {
      _debugEnabled = !!enabled;
    }
  };

  // ============================================
  // MAP LAYER CONFIGURATIONS
  // Tambahkan layer baru di sini jika diperlukan
  // ============================================

  const MAP_LAYERS = Object.freeze({
    default: Object.freeze({
      name: 'Default',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: { maxZoom: 19 }
    }),
    dark: Object.freeze({
      name: 'Dark',
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      options: { maxZoom: 19, subdomains: 'abcd' }
    }),
    terrain: Object.freeze({
      name: 'Terrain',
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      options: { maxZoom: 17 }
    })
  });

  const HOTKEY_DESCRIPTIONS = Object.freeze({
    panel: 'Open settings panel',
    marker: 'Place marker on map',
    info: 'Show location info',
    refresh: 'Refresh coordinates',
    zoomIn: 'Zoom in mini map',
    zoomOut: 'Zoom out mini map',
    copyCoords: 'Copy coordinates',
    googleMaps: 'Open in Google Maps',
    discord: 'Send to Discord',
    autoPlace: 'Auto place marker',
    safePlace: 'Safe place (~50m)'
  });

  // ============================================
  // VALIDATORS
  // ============================================


  const Validators = {
    isValidCoord(lat, lng) {
      return typeof lat === 'number' && typeof lng === 'number' &&
        !isNaN(lat) && !isNaN(lng) &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    },

    isValidPreset(presetName) {
      return presetName && PRESETS.hasOwnProperty(presetName);
    },

    isValidMapLayer(layerName) {
      return layerName && MAP_LAYERS.hasOwnProperty(layerName);
    },

    isValidTheme(themeName) {
      return themeName === 'dark';
    },

    isValidUiScale(scaleName) {
      return scaleName && UI_SCALES.hasOwnProperty(scaleName);
    }
  };

  // ============================================
  // STORAGE UTILITIES
  // Wrapper untuk GM_* functions dan localStorage fallback
  // ============================================


  /**
   * Baca nilai dari storage (GM_getValue > localStorage)
   */
  function safeGM_getValue(key, defaultValue) {
    try {
      if (typeof GM_getValue !== 'undefined') {
        const val = GM_getValue(key);
        return val !== undefined ? val : defaultValue;
      }
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch (e) {
      Logger.debug('Storage read error:', e.message);
      return defaultValue;
    }
  }

  /**
   * Simpan nilai ke storage (GM_setValue > localStorage)
   */
  function safeGM_setValue(key, value) {
    try {
      if (typeof GM_setValue !== 'undefined') {
        GM_setValue(key, value);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      Logger.error('Storage write error:', e);
    }
  }

  /**
   * Baca semua settings tersimpan
   */
  function readStoredSettings() {
    const hotkeys = {
      ...DEFAULT_HOTKEYS,
      ...(safeGM_getValue(APP_CONFIG.STORAGE_KEYS.HOTKEYS, null) || {})
    };

    // Safety: jangan gunakan Tab sebagai hotkey panel
    if (hotkeys.panel === 'Tab' || hotkeys.panel === 'tab') {
      hotkeys.panel = 'Home';
    }

    const features = {
      ...DEFAULT_FEATURES,
      ...(safeGM_getValue(APP_CONFIG.STORAGE_KEYS.FEATURES, null) || {})
    };

    let preset = safeGM_getValue(APP_CONFIG.STORAGE_KEYS.PRESET, null) || detectPresetFromFeatures(features);
    if (!Validators.isValidPreset(preset)) {
      preset = detectPresetFromFeatures(features);
    }

    let mapLayer = safeGM_getValue(APP_CONFIG.STORAGE_KEYS.MAP_LAYER, DEFAULT_SETTINGS.MAP_LAYER);
    if (!Validators.isValidMapLayer(mapLayer)) {
      mapLayer = DEFAULT_SETTINGS.MAP_LAYER;
    }

    let uiScale = safeGM_getValue(APP_CONFIG.STORAGE_KEYS.UI_SCALE, DEFAULT_SETTINGS.UI_SCALE);
    if (!Validators.isValidUiScale(uiScale)) {
      uiScale = DEFAULT_SETTINGS.UI_SCALE;
    }

    return {
      hotkeys,
      features,
      preset,
      mapLayer,
      themeMode: 'dark',
      uiScale,
      discordWebhook: String(safeGM_getValue(APP_CONFIG.STORAGE_KEYS.DISCORD_WEBHOOK, '') || '').trim()
    };
  }

  /**
   * Deteksi preset dari fitur yang aktif
   */
  /**
   * Apply settings ke state
   */
  function applySettingsToState(state, settings) {
    const s = settings || readStoredSettings();
    state.hotkeys = { ...DEFAULT_HOTKEYS, ...(s.hotkeys || {}) };
    state.features = { ...DEFAULT_FEATURES, ...(s.features || {}) };
    state.currentPreset = Validators.isValidPreset(s.preset) ? s.preset : detectPresetFromFeatures(state.features);
    state.currentMapLayer = Validators.isValidMapLayer(s.mapLayer) ? s.mapLayer : DEFAULT_SETTINGS.MAP_LAYER;
    state.themeMode = 'dark';
    state.uiScale = Validators.isValidUiScale(s.uiScale) ? s.uiScale : DEFAULT_SETTINGS.UI_SCALE;
  }

  function detectPresetFromFeatures(features) {
    const f = features || {};
    for (const [name, preset] of Object.entries({
      exact: DEFAULT_FEATURES, // { autoMarker: false, safeMode: false }
      safe: { autoMarker: false, safeMode: true },
      stealth: { autoMarker: true, safeMode: true }
    })) {
      if (f.autoMarker === preset.autoMarker && f.safeMode === preset.safeMode) {
        return name;
      }
    }
    return 'custom';
  }

  /**
   * Ambil snapshot settings saat ini
   */
  function getCurrentSettingsSnapshot(state, overrides = null) {
    const base = {
      hotkeys: { ...(state.hotkeys || DEFAULT_HOTKEYS) },
      features: { ...(state.features || DEFAULT_FEATURES) },
      preset: state.currentPreset || detectPresetFromFeatures(state.features),
      mapLayer: state.currentMapLayer || DEFAULT_SETTINGS.MAP_LAYER,
      themeMode: 'dark',
      uiScale: state.uiScale || DEFAULT_SETTINGS.UI_SCALE,
      discordWebhook: String(safeGM_getValue(APP_CONFIG.STORAGE_KEYS.DISCORD_WEBHOOK, '') || '').trim()
    };

    const next = { ...base, ...(overrides || {}) };

    next.hotkeys = { ...DEFAULT_HOTKEYS, ...(next.hotkeys || {}) };
    next.features = { ...DEFAULT_FEATURES, ...(next.features || {}) };
    next.preset = Validators.isValidPreset(next.preset) ? next.preset : detectPresetFromFeatures(next.features);
    next.mapLayer = Validators.isValidMapLayer(next.mapLayer) ? next.mapLayer : DEFAULT_SETTINGS.MAP_LAYER;
    next.uiScale = Validators.isValidUiScale(next.uiScale) ? next.uiScale : DEFAULT_SETTINGS.UI_SCALE;
    next.themeMode = 'dark';
    next.discordWebhook = String(next.discordWebhook || '').trim();

    return next;
  }

  /**
   * Simpan settings ke storage
   */
  function persistSettingsSnapshot(state, settings) {
    const s = getCurrentSettingsSnapshot(state, settings);
    safeGM_setValue(APP_CONFIG.STORAGE_KEYS.HOTKEYS, s.hotkeys);
    safeGM_setValue(APP_CONFIG.STORAGE_KEYS.FEATURES, s.features);
    safeGM_setValue(APP_CONFIG.STORAGE_KEYS.PRESET, s.preset);
    safeGM_setValue(APP_CONFIG.STORAGE_KEYS.MAP_LAYER, s.mapLayer);
    safeGM_setValue(APP_CONFIG.STORAGE_KEYS.THEME, 'dark');
    safeGM_setValue(APP_CONFIG.STORAGE_KEYS.UI_SCALE, s.uiScale);
    safeGM_setValue(APP_CONFIG.STORAGE_KEYS.DISCORD_WEBHOOK, s.discordWebhook);
    return s;
  }

  /**
   * Reset ke default
   */
  function resetSettingsToDefaults(state, persist = true) {
    const defaults = {
      hotkeys: { ...DEFAULT_HOTKEYS },
      features: { ...DEFAULT_FEATURES },
      preset: DEFAULT_SETTINGS.PRESET,
      mapLayer: DEFAULT_SETTINGS.MAP_LAYER,
      themeMode: 'dark',
      uiScale: DEFAULT_SETTINGS.UI_SCALE,
      discordWebhook: ''
    };

    state.hotkeys = { ...DEFAULT_HOTKEYS };
    state.features = { ...DEFAULT_FEATURES };
    state.currentPreset = DEFAULT_SETTINGS.PRESET;
    state.currentMapLayer = DEFAULT_SETTINGS.MAP_LAYER;
    state.themeMode = 'dark';
    state.uiScale = DEFAULT_SETTINGS.UI_SCALE;

    if (persist) {
      persistSettingsSnapshot(state, defaults);
    }
    return defaults;
  }

  // ============================================
  // THROTTLE / COOLDOWN SYSTEM
  // Mencegah spam pada tombol dan hotkey
  // ============================================

  const actionCooldowns = Object.create(null);

  const Throttle = {
    canRun(actionKey, cooldownMs = 250) {
      const now = Date.now();
      const last = actionCooldowns[actionKey] || 0;
      if ((now - last) < cooldownMs) return false;
      actionCooldowns[actionKey] = now;
      return true;
    },

    createHandler(actionKey, cooldownMs, handler) {
      return function (e) {
        if (!Throttle.canRun(actionKey, cooldownMs)) return;
        if (e && e.preventDefault) e.preventDefault();
        handler.call(this, e);
      };
    },

    resetAll() {
      Object.keys(actionCooldowns).forEach(k => delete actionCooldowns[k]);
    }
  };

  // ============================================
  // REQUEST TOKEN SYSTEM
  // Mencegah race condition pada async operations
  // ============================================

  const RequestTokens = {
    _seq: 0,
    _latestByScope: Object.create(null),

    issue(scope) {
      const key = String(scope || 'default');
      const id = ++this._seq;
      this._latestByScope[key] = id;
      return id;
    },

    isCurrent(scope, id) {
      const key = String(scope || 'default');
      return this._latestByScope[key] === id;
    },

    resetAll() {
      this._seq = 0;
      this._latestByScope = Object.create(null);
    }
  };

  // ============================================
  // XHR INTERCEPTOR
  // Menangkap koordinat dari request Google Maps API
  // ============================================


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
  function installXHRInterceptor() {
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
  function uninstallXHRInterceptor() {
    if (XMLHttpRequest.prototype[XHR_PATCH_FLAG] && XMLHttpRequest.prototype[XHR_ORIGINAL_OPEN_KEY]) {
      XMLHttpRequest.prototype.open = XMLHttpRequest.prototype[XHR_ORIGINAL_OPEN_KEY];
      delete XMLHttpRequest.prototype[XHR_PATCH_FLAG];
      delete XMLHttpRequest.prototype[XHR_ORIGINAL_OPEN_KEY];
    }
  }

  /**
   * Cek apakah interceptor sudah terinstall
   */
  function isXHRInterceptorInstalled() {
    return !!XMLHttpRequest.prototype[XHR_PATCH_FLAG];
  }

  /**
   * Cek apakah interceptor terinstall oleh kita
   */
  function isOurXHRInterceptor() {
    return !!XMLHttpRequest.prototype[XHR_ORIGINAL_OPEN_KEY];
  }

  // ============================================
  // PATCH MANAGER
  // Wrapper untuk XHR interceptor dengan tracking status
  // ============================================


  const PatchManager = {
    _status: {
      xhrInstalled: false,
      installedByUs: false,
      lastInstallAt: 0,
      lastUninstallAt: 0,
      lastError: null
    },

    installXHRPatch() {
      telemetryInc('patch.installAttempts');
      try {
        const wasPatchedBefore = isXHRInterceptorInstalled();
        const hadOurOriginalBefore = isOurXHRInterceptor();

        installXHRInterceptor();

        const installedNow = isXHRInterceptorInstalled();
        const hasOurOriginalNow = isOurXHRInterceptor();

        this._status.xhrInstalled = installedNow;
        this._status.installedByUs =
          (wasPatchedBefore && hadOurOriginalBefore) ||
          (!wasPatchedBefore && hasOurOriginalNow);
        this._status.lastInstallAt = Date.now();
        this._status.lastError = null;
        telemetryInc('patch.installSuccess');
        return this._status.xhrInstalled;
      } catch (e) {
        this._status.lastError = e?.message || 'install failed';
        telemetryInc('patch.installFail');
        return false;
      }
    },

    uninstallXHRPatch() {
      telemetryInc('patch.uninstallAttempts');
      try {
        const hasOurOriginal = isOurXHRInterceptor();

        if (hasOurOriginal || this._status.installedByUs) {
          uninstallXHRInterceptor();
        }

        this._status.xhrInstalled = isXHRInterceptorInstalled();
        this._status.installedByUs = isOurXHRInterceptor();
        this._status.lastUninstallAt = Date.now();
        this._status.lastError = null;
        telemetryInc('patch.uninstallSuccess');
        return !this._status.xhrInstalled || !hasOurOriginal;
      } catch (e) {
        this._status.lastError = e?.message || 'uninstall failed';
        telemetryInc('patch.uninstallFail');
        return false;
      }
    },

    ensureXHRPatch() {
      telemetryInc('patch.ensureChecks');
      if (isXHRInterceptorInstalled()) {
        this._status.xhrInstalled = true;
        this._status.installedByUs = isOurXHRInterceptor();
        return true;
      }
      telemetryInc('patch.ensureReinstalls');
      return this.installXHRPatch();
    },

    status() {
      return {
        ...this._status,
        xhrInstalled: isXHRInterceptorInstalled()
      };
    }
  };

  // ============================================
  // EXTRACTION CACHE
  // Mencegah ekstraksi koordinat berulang-ulang
  // ============================================


  const extractionCache = {
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

  // ============================================
  // COORDINATE EXTRACTOR
  // Ekstrak koordinat dari berbagai sumber pada halaman
  // ============================================


  /**
   * Ambil koordinat dari XHR intercept
   */
  function getInterceptedCoords() {
    if (Validators.isValidCoord(internals.interceptedCoords.lat, internals.interceptedCoords.lng)) {
      return { lat: internals.interceptedCoords.lat, lng: internals.interceptedCoords.lng };
    }
    return null;
  }

  /**
   * Walk React Fiber tree untuk menemukan Street View data
   */
  function walkFiber(fiber, depth = 0) {
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
  function extractFromGoogleSV() {
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
  function extractFromIframes() {
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
  function extractFromUrlParams() {
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
  function extractFromGlobalVars() {
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
  function extractFromGeoGuessrFiber() {
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
  function extractFromOtherPlatforms() {
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
  function extractCoordinatesLegacyImpl$1() {
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

  /**
   * Fungsi ekstraksi utama (wrapper dengan shadow telemetry)
   */
  function extractCoordinates() {
    const live = extractCoordinatesLegacyImpl$1();
    ExtractorRegistry.runShadowAgainst(live);
    return live;
  }

  /**
   * Koordinat equivalency check untuk shadow extraction
   */
  function areCoordsEquivalent(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    if (!Validators.isValidCoord(a.lat, a.lng) || !Validators.isValidCoord(b.lat, b.lng)) return false;
    return Math.abs(a.lat - b.lat) < 0.000001 && Math.abs(a.lng - b.lng) < 0.000001;
  }

  // ============================================
  // EXTRACTOR REGISTRY (Shadow Mode)
  // Sistem telemetry untuk membandingkan strategi ekstraksi
  // ============================================


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

  // ============================================
  // PLATFORM DETECTION
  // Deteksi situs game yang sedang dibuka
  // ============================================

  const PLATFORM_MAP = {
    'geoguessr': 'geoguessr',
    'worldguessr': 'worldguessr',
    'openguessr': 'openguessr',
    'freeguessr': 'freeguessr',
    'guesswhereyouare': 'freeguessr',
    'geoduel': 'geoduels'
  };

  /**
   * Deteksi platform dari URL saat ini
   */
  function detectPlatform() {
    const url = window.location.href.toLowerCase();

    for (const [keyword, platform] of Object.entries(PLATFORM_MAP)) {
      if (url.includes(keyword)) return platform;
    }
    return 'unknown';
  }

  /**
   * Daftar semua platform yang didukung
   */
  function getSupportedPlatforms() {
    return Object.values(PLATFORM_MAP).filter((v, i, a) => a.indexOf(v) === i);
  }

  // ============================================
  // INTEGRITY MANAGER
  // Sistem proteksi untuk mencegah modifikasi script
  // ============================================


  const PROTECTION_OVERLAY_ID = 'btp-protection-overlay';

  let integrityScheduledTimeout = null;
  let lastRemoteFetchAt = 0;
  let baselineFingerprints = null;

  // --- Hash Functions ---

  function fnv1aHash(input) {
    let hash = 0x811c9dc5;
    const str = String(input || '');
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  function compareSemanticVersion(a, b) {
    const pa = String(a || '0.0.0').split('.').map(v => parseInt(v, 10) || 0);
    const pb = String(b || '0.0.0').split('.').map(v => parseInt(v, 10) || 0);
    const len = Math.max(pa.length, pb.length, 3);
    for (let i = 0; i < len; i++) {
      const va = pa[i] || 0;
      const vb = pb[i] || 0;
      if (va > vb) return 1;
      if (va < vb) return -1;
    }
    return 0;
  }

  function bufferToHex(buffer) {
    const bytes = new Uint8Array(buffer);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  async function generateScriptHash(sourceCode) {
    try {
      if (!sourceCode || typeof sourceCode !== 'string') return null;
      if (typeof crypto === 'undefined' || !crypto.subtle || typeof TextEncoder === 'undefined') {
        return null;
      }
      const data = new TextEncoder().encode(sourceCode);
      const digest = await crypto.subtle.digest('SHA-256', data);
      telemetryInc('protection.hashComputed');
      return bufferToHex(digest);
    } catch (e) {
      Logger.debug('Hash generation failed:', e?.message || 'unknown');
      return null;
    }
  }

  // --- Source Extraction ---

  function getLocalRuntimeSource() {
    try {
      if (typeof GM_info !== 'undefined') {
        if (typeof GM_info.scriptSource === 'string' && GM_info.scriptSource.length > 100) {
          return GM_info.scriptSource;
        }
        if (typeof GM_info.script?.source === 'string' && GM_info.script.source.length > 100) {
          return GM_info.script.source;
        }
        if (typeof GM_info.script?.code === 'string' && GM_info.script.code.length > 100) {
          return GM_info.script.code;
        }
      }
    } catch (e) {
      Logger.warn('[Integrity] GM_info extraction error:', e?.message);
    }

    try {
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const text = script.textContent || '';
        if (text.length > 500 &&
          text.includes('Bintang Toba Pro') &&
          text.includes('__btp_initialized')) {
          return text;
        }
      }
    } catch (e) { /* silent */ }

    try {
      const criticalFns = [
        typeof extractCoordinatesLegacyImpl === 'function' ? extractCoordinatesLegacyImpl : null,
        typeof handleKeydown === 'function' ? handleKeydown : null,
        typeof togglePanel === 'function' ? togglePanel : null,
        typeof startMonitoring === 'function' ? startMonitoring : null
      ].filter(Boolean);

      if (criticalFns.length >= 3) {
        const composite = criticalFns.map(fn => fn.toString()).join('\n');
        if (composite.length > 1000) return composite;
      }
    } catch (e) { /* silent */ }

    return null;
  }

  async function getLocalRuntimeSourceAsync() {
    const syncSource = getLocalRuntimeSource();
    if (syncSource) return syncSource;

    try {
      if (typeof GM_info !== 'undefined' && GM_info.script?.downloadURL) {
        const url = GM_info.script.downloadURL;
        const source = await new Promise((resolve, reject) => {
          if (typeof GM_xmlhttpRequest !== 'undefined') {
            GM_xmlhttpRequest({
              method: 'GET',
              url: url,
              timeout: 8000,
              onload: (res) => {
                if (res.status === 200 && res.responseText?.length > 500) {
                  resolve(res.responseText);
                } else {
                  reject(new Error('HTTP ' + res.status));
                }
              },
              onerror: () => reject(new Error('Network error')),
              ontimeout: () => reject(new Error('Timeout'))
            });
          } else {
            reject(new Error('GM_xmlhttpRequest unavailable'));
          }
        });
        return source;
      }
    } catch (e) {
      Logger.debug('[Integrity] Self-fetch failed:', e?.message);
    }

    return null;
  }

  // --- Remote Fetch ---

  async function fetchJsonWithTimeout(url, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeout = Math.max(1000, Number(timeoutMs) || TIMING.INTEGRITY_FETCH_TIMEOUT);

      if (typeof GM_xmlhttpRequest !== 'undefined') {
        GM_xmlhttpRequest({
          method: 'GET',
          url,
          headers: { 'Accept': 'application/json' },
          timeout,
          onload: (res) => {
            if (res.status >= 200 && res.status < 300) {
              try { resolve(JSON.parse(res.responseText)); }
              catch (e) { reject(new Error('Invalid JSON')); }
            } else {
              reject(new Error(`HTTP ${res.status}`));
            }
          },
          onerror: () => reject(new Error('Network error')),
          ontimeout: () => reject(new Error('Request timeout'))
        });
        return;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' }, signal: controller.signal })
        .then(res => {
          clearTimeout(timer);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(resolve)
        .catch((e) => { clearTimeout(timer); reject(e); });
    });
  }

  async function loadRemoteVersionMetadata(forceRefresh = false) {
    const now = Date.now();
    const cache = safeGM_getValue(APP_CONFIG.STORAGE_KEYS.REMOTE_VERSION_CACHE, null);

    if (!forceRefresh && cache?.data && cache?.cachedAt && (now - cache.cachedAt) < TIMING.INTEGRITY_CACHE_TTL) {
      return cache.data;
    }

    if (!forceRefresh && (now - lastRemoteFetchAt) < TIMING.INTEGRITY_MIN_FETCH_GAP) {
      return cache?.data || null;
    }

    lastRemoteFetchAt = now;

    try {
      const data = await fetchJsonWithTimeout(APP_CONFIG.VERSION_METADATA_URL, TIMING.INTEGRITY_FETCH_TIMEOUT);
      const normalized = {
        version: String(data?.version || ''),
        hash: String(data?.hash || '').toLowerCase(),
        force: !!data?.force,
        message: String(data?.message || ''),
        build: {
          channel: String(data?.build?.channel || 'stable'),
          timestamp: String(data?.build?.timestamp || ''),
          runtime: String(data?.build?.runtime || APP_CONFIG.NAME),
          protection: !!data?.build?.protection
        }
      };

      if (!normalized.version || normalized.version === '0.0.0') {
        throw new Error('Invalid version manifest');
      }

      safeGM_setValue(APP_CONFIG.STORAGE_KEYS.REMOTE_VERSION_CACHE, { cachedAt: now, data: normalized });
      telemetryInc('protection.remoteFetchOk');
      return normalized;
    } catch (e) {
      telemetryInc('protection.remoteFetchFail');
      Logger.debug('Remote metadata fetch failed:', e?.message || 'unknown');
      return cache?.data || null;
    }
  }

  // --- Fingerprints ---

  function buildProtectedFunctionFingerprint() {
    return {
      handleKeydown: fnv1aHash(typeof handleKeydown === 'function' ? handleKeydown.toString() : ''),
      togglePanel: fnv1aHash(typeof togglePanel === 'function' ? togglePanel.toString() : ''),
      extractCoordinatesLegacyImpl: fnv1aHash(typeof extractCoordinatesLegacyImpl === 'function' ? extractCoordinatesLegacyImpl.toString() : '')
    };
  }

  function buildConfigProtectionFingerprint() {
    const signature = [
      APP_CONFIG.NAME,
      APP_CONFIG.VERSION,
      APP_CONFIG.NOMINATIM_URL,
      APP_CONFIG.VERSION_METADATA_URL,
      TIMING.INTEGRITY_CHECK_INTERVAL,
      TIMING.INTEGRITY_HEARTBEAT_INTERVAL
    ].join('|');
    return fnv1aHash(signature);
  }

  function captureProtectionBaseline() {
    baselineFingerprints = {
      config: buildConfigProtectionFingerprint(),
      functions: buildProtectedFunctionFingerprint()
    };
  }

  function verifyRuntimeTamperSignals() {
    const issues = [];
    if (!baselineFingerprints) return issues;

    if (buildConfigProtectionFingerprint() !== baselineFingerprints.config) {
      issues.push('CONFIG fingerprint changed');
    }

    const currentFns = buildProtectedFunctionFingerprint();
    for (const [name, baseline] of Object.entries(baselineFingerprints.functions)) {
      if (currentFns[name] !== baseline) {
        issues.push(`Function modified: ${name}`);
      }
    }

    return issues;
  }

  // --- Overlay ---

  function getGithubProjectUrl() {
    return 'https://github.com/JD-YH03D/release';
  }

  function showProtectionOverlay(payload) {
    const data = payload || {};
    let root = document.getElementById(PROTECTION_OVERLAY_ID);

    if (!root) {
      const style = document.createElement('style');
      style.id = 'btp-modern-overlay-styles';
      style.textContent = `
      @keyframes btpFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes btpScaleIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      .btp-btn-primary {
        flex: 1; min-width: 180px; padding: 14px 20px; border: none; border-radius: 12px;
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #fff;
        font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
      }
      .btp-btn-primary:hover {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        transform: translateY(-1px); box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
      }
      .btp-btn-secondary {
        flex: 1; min-width: 180px; padding: 14px 20px; border: 1px solid rgba(148, 163, 184, 0.15);
        border-radius: 12px; background: rgba(30, 41, 59, 0.5); color: #f1f5f9;
        font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s ease;
      }
      .btp-btn-secondary:hover {
        background: rgba(30, 41, 59, 0.8); border-color: rgba(148, 163, 184, 0.3);
        transform: translateY(-1px); color: #fff;
      }
    `;
      document.head.appendChild(style);
    }

    root = document.createElement('div');
    root.id = PROTECTION_OVERLAY_ID;
    root.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483646', 'display:flex',
      'align-items:center', 'justify-content:center',
      'background:rgba(8, 10, 19, 0.8)', 'backdrop-filter:blur(16px)',
      '-webkit-backdrop-filter:blur(16px)',
      'animation:btpFadeIn .3s cubic-bezier(0.16, 1, 0.3, 1)', 'padding:20px'
    ].join(';');

    root.innerHTML = `
    <div style="width:min(580px,100%); background:linear-gradient(180deg, #0f1424 0%, #090d1a 100%); border:1px solid rgba(59, 130, 246, 0.2); border-radius:24px; box-shadow:0 30px 100px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05); padding:32px; color:#f1f5f9; font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; animation:btpScaleIn .4s cubic-bezier(0.16, 1, 0.3, 1); box-sizing:border-box;">
      <div style="display:flex; align-items:flex-start; gap:16px; margin-bottom:24px;">
        <div style="width:44px; height:44px; border-radius:14px; background:linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); display:flex; align-items:center; justify-content:center; font-weight:800; color:#fff; font-size:20px; box-shadow:0 0 20px rgba(239, 68, 68, 0.3); flex-shrink:0;">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <div style="flex:1;">
          <div style="font-size:20px; font-weight:700; letter-spacing:-0.2px; color:#ffffff; margin-bottom:4px;">Bintang Toba Pro Integrity</div>
          <div style="font-size:13px; font-weight:500; color:#3b82f6; text-transform:uppercase; letter-spacing:0.5px;">${data.forceUpdate ? 'Forced Update Required' : 'Runtime Integrity Warning'}</div>
        </div>
      </div>
      <div style="font-size:14px; line-height:1.6; color:#94a3b8; background:rgba(30, 41, 59, 0.3); border:1px solid rgba(255,255,255,0.03); padding:16px; border-radius:14px; margin-bottom:24px;">${data.reason || 'Integrity check detected a runtime mismatch.'}</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:28px;">
        <div style="background:rgba(15, 23, 42, 0.4); border:1px solid rgba(255,255,255,0.04); border-radius:14px; padding:14px 16px;">
          <div style="font-size:12px; color:#64748b; font-weight:500; margin-bottom:4px;">Current Version</div>
          <div style="font-size:15px; font-weight:600; color:#f8fafc; font-family:monospace;">${data.currentVersion || APP_CONFIG.VERSION}</div>
        </div>
        <div style="background:rgba(15, 23, 42, 0.4); border:1px solid rgba(255,255,255,0.04); border-radius:14px; padding:14px 16px;">
          <div style="font-size:12px; color:#64748b; font-weight:500; margin-bottom:4px;">Latest Official</div>
          <div style="font-size:15px; font-weight:600; color:#10b981; font-family:monospace;">${data.latestVersion || APP_CONFIG.VERSION}</div>
        </div>
      </div>
      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <button id="btp-protection-update" class="btp-btn-primary">Update Official Build</button>
        <button id="btp-protection-github" class="btp-btn-secondary">Open GitHub Source</button>
      </div>
    </div>
  `;

    document.body.appendChild(root);
    telemetryInc('protection.overlayShows');

    root.querySelector('#btp-protection-update').onclick = () => {
      const url = 'https://update.greasyfork.org/scripts/578278/GeoGuessr%20-%20Let%27s%20explore%20the%20world%21.user.js';
      window.open(url, '_blank');
    };

    root.querySelector('#btp-protection-github').onclick = () => {
      window.open(getGithubProjectUrl(), '_blank');
    };
  }

  function hideProtectionOverlay() {
    document.getElementById(PROTECTION_OVERLAY_ID)?.remove();
  }

  // --- Protection State ---

  function applyProtectionState(next) {
    const current = state.runtime.protection || {};
    state.runtime.protection = { ...current, ...next, checkedAt: Date.now() };

    const p = state.runtime.protection;
    Logger.debug('[Integrity] state:', 'blocked=' + p.blocked, 'modified=' + p.modifiedBuild, 'outdated=' + p.outdated, 'forceUpdate=' + p.forceUpdate);

    if (p.modifiedBuild) {
      state.runtime.degraded = true;
      state.runtime.degradedReason = p.reason || 'Modified build detected';
      telemetryInc('protection.modifiedDetected');
      Logger.warn('[Integrity] MODIFIED BUILD');
    }

    if (p.outdated) {
      telemetryInc('protection.outdatedDetected');
      Logger.warn('[Integrity] OUTDATED BUILD');
    }

    if (p.forceUpdate) {
      telemetryInc('protection.forceUpdateDetected');
      Logger.warn('[Integrity] FORCE UPDATE REQUIRED');
    }

    if (p.blocked) {
      state.infoVisible = false;
      state.miniMapVisible = false;
      const panel = document.getElementById('geohelper-phone-frame');
      if (panel) panel.style.display = 'none';
      Logger.warn('[Integrity] RUNTIME BLOCKED');
    }

    safeGM_setValue(APP_CONFIG.STORAGE_KEYS.PROTECTION_STATE, p);

    const shouldShow = !!(p.forceUpdate || p.modifiedBuild || p.outdated);

    if (shouldShow) {
      showProtectionOverlay({
        forceUpdate: p.forceUpdate,
        reason: p.reason,
        currentVersion: p.currentVersion,
        latestVersion: p.latestVersion,
        message: p.message,
        integrityStatus: p.modifiedBuild ? 'MODIFIED BUILD DETECTED' : (p.outdated ? 'OUTDATED BUILD DETECTED' : 'INTEGRITY WARNING')
      });
    } else {
      hideProtectionOverlay();
    }
  }

  function isProtectionBlocked() {
    return !!state.runtime?.protection?.blocked;
  }

  function guardProtectedUsage(actionName = 'feature') {
    if (!isProtectionBlocked()) return true;
    Logger.warn('[Integrity] Action BLOCKED:', actionName);
    telemetryInc('protection.blockedEvents');
    showProtectionOverlay({
      forceUpdate: !!state.runtime?.protection?.forceUpdate,
      reason: `Action blocked: ${actionName}. ${state.runtime?.protection?.reason || 'Protection active.'}`,
      currentVersion: state.runtime?.protection?.currentVersion || APP_CONFIG.VERSION,
      latestVersion: state.runtime?.protection?.latestVersion || APP_CONFIG.VERSION,
      message: state.runtime?.protection?.message || 'Please install the official build.',
      integrityStatus: state.runtime?.protection?.forceUpdate ? 'FORCED UPDATE REQUIRED' : 'PROTECTED MODE ACTIVE'
    });
    return false;
  }

  // --- Integrity Manager ---

  const IntegrityManager = {
    started: false,
    checking: false,

    async runCheck(reason = 'manual', forceRemote = false) {
      if (this.checking) {
        Logger.debug('[Integrity] runCheck skipped - already checking');
        return;
      }
      this.checking = true;
      telemetryInc('protection.checks');
      Logger.info('[Integrity] CHECK START - reason:', reason);

      try {
        if (!baselineFingerprints) {
          captureProtectionBaseline();
        }

        const runtimeIssues = verifyRuntimeTamperSignals();
        if (runtimeIssues.length > 0) {
          Logger.warn('[Integrity] Runtime tamper signals:', runtimeIssues.join('; '));
        }

        let localSource = getLocalRuntimeSource();
        if (!localSource) {
          localSource = await getLocalRuntimeSourceAsync();
        }

        let localHash = null;
        const integrityCache = safeGM_getValue(APP_CONFIG.STORAGE_KEYS.INTEGRITY_CACHE, null);

        if (localSource) {
          localHash = await generateScriptHash(localSource);
          if (localHash) {
            safeGM_setValue(APP_CONFIG.STORAGE_KEYS.INTEGRITY_CACHE, {
              checkedAt: Date.now(),
              version: APP_CONFIG.VERSION,
              hash: localHash,
              sourceLength: localSource.length
            });
          }
        } else if (integrityCache?.version === APP_CONFIG.VERSION && integrityCache?.hash) {
          localHash = integrityCache.hash;
        }

        const remote = await loadRemoteVersionMetadata(forceRemote);

        if (!remote) {
          this.checking = false;
          return;
        }

        const latestVersion = remote.version || APP_CONFIG.VERSION;
        const versionCmp = compareSemanticVersion(latestVersion, APP_CONFIG.VERSION);
        const outdated = versionCmp > 0;
        const forceUpdate = !!remote.force;

        let hashMismatch = false;
        if (localHash && remote.hash && remote.hash.length > 8) {
          hashMismatch = String(localHash).toLowerCase() !== String(remote.hash).toLowerCase();
          if (hashMismatch) telemetryInc('protection.hashMismatch');
        }

        const modifiedBuild = runtimeIssues.length > 0 || hashMismatch;
        const blocked = forceUpdate || modifiedBuild;

        const reasonText = modifiedBuild
          ? (runtimeIssues[0] || 'Runtime hash mismatch with official build.')
          : (forceUpdate ? 'Official build requires mandatory update.' : (outdated ? 'A newer official version is available.' : null));

        applyProtectionState({
          blocked,
          forceUpdate,
          modifiedBuild,
          outdated,
          reason: reasonText,
          message: remote.message || `Integrity check source: ${reason}`,
          localHash: localHash || null,
          remoteHash: remote.hash || null,
          currentVersion: APP_CONFIG.VERSION,
          latestVersion,
          sourceAvailable: !!localSource
        });

        Logger.info('[Integrity] CHECK COMPLETE');

      } catch (e) {
        Logger.error('[Integrity] Check FAILED:', e?.message || 'unknown');
      } finally {
        this.checking = false;
      }
    },

    scheduleSoon(reason = 'scheduled', delayMs = 1200) {
      if (integrityScheduledTimeout) return;
      integrityScheduledTimeout = setTimeout(() => {
        integrityScheduledTimeout = null;
        this.runCheck(reason, false);
      }, Math.max(300, Number(delayMs) || 1200));
    },

    start() {
      if (this.started) return;
      this.started = true;
      Logger.info('[Integrity] PROTECTION SYSTEM STARTING');

      captureProtectionBaseline();

      const cached = safeGM_getValue(APP_CONFIG.STORAGE_KEYS.PROTECTION_STATE, null);
      if (cached && typeof cached === 'object') {
        state.runtime.protection = { ...state.runtime.protection, ...cached };
        if (state.runtime.protection.blocked || state.runtime.protection.outdated) {
          applyProtectionState(state.runtime.protection);
        }
      }

      this.runCheck('startup', true).catch((e) => {
        Logger.error('[Integrity] Startup check failed:', e?.message);
      });

      internals.integrityCheckInterval = setInterval(() => {
        this.runCheck('interval', false);
      }, TIMING.INTEGRITY_CHECK_INTERVAL);

      internals.integrityHeartbeatInterval = setInterval(() => {
        const issues = verifyRuntimeTamperSignals();
        if (issues.length > 0) {
          Logger.warn('[Integrity] Heartbeat detected tamper:', issues.join('; '));
          this.scheduleSoon('heartbeat_tamper', 400);
        }
      }, TIMING.INTEGRITY_HEARTBEAT_INTERVAL);

      internals.protectionErrorHandler = () => { this.scheduleSoon('runtime_error', 800); };
      internals.protectionRejectionHandler = () => { this.scheduleSoon('runtime_rejection', 800); };

      window.addEventListener('error', internals.protectionErrorHandler, true);
      window.addEventListener('unhandledrejection', internals.protectionRejectionHandler, true);

      Logger.info('[Integrity] PROTECTION SYSTEM STARTED');
    },

    stop() {
      this.started = false;

      if (internals.integrityCheckInterval) {
        clearInterval(internals.integrityCheckInterval);
        internals.integrityCheckInterval = null;
      }
      if (internals.integrityHeartbeatInterval) {
        clearInterval(internals.integrityHeartbeatInterval);
        internals.integrityHeartbeatInterval = null;
      }
      if (integrityScheduledTimeout) {
        clearTimeout(integrityScheduledTimeout);
        integrityScheduledTimeout = null;
      }

      if (internals.protectionErrorHandler) {
        window.removeEventListener('error', internals.protectionErrorHandler, true);
        internals.protectionErrorHandler = null;
      }
      if (internals.protectionRejectionHandler) {
        window.removeEventListener('unhandledrejection', internals.protectionRejectionHandler, true);
        internals.protectionRejectionHandler = null;
      }

      hideProtectionOverlay();
      Logger.debug('[Integrity] PROTECTION SYSTEM STOPPED');
    }
  };

  // ============================================
  // SECURITY UTILITIES
  // ============================================

  const Security = {
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = String(text);
      return div.innerHTML;
    },

    escapeAttr(text) {
      return this.escapeHtml(text).replace(/"/g, '&quot;');
    },

    encodeParam(value) {
      return encodeURIComponent(String(value));
    },

    isValidDiscordWebhook(url) {
      if (!url || typeof url !== 'string') return false;
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' &&
          parsed.hostname === 'discord.com' &&
          parsed.pathname.includes('/api/webhooks/');
      } catch (e) {
        return false;
      }
    }
  };

  // ============================================
  // UI NAVIGATION
  // Menangani perpindahan antar view dan hotkey cache
  // ============================================


  // Hotkey cache
  let hotkeyCache = null;
  let hotkeyCacheTime = 0;

  /**
   * Ambil hotkeys dari cache/storage
   */
  function getHotkeys() {
    const now = Date.now();
    if (!hotkeyCache || (now - hotkeyCacheTime) > TIMING.HOTKEY_CACHE_TTL) {
      hotkeyCache = safeGM_getValue('bintang_toba_hotkeys', { ...DEFAULT_HOTKEYS });

      if (hotkeyCache.panel === 'Tab' || hotkeyCache.panel === 'tab') {
        hotkeyCache.panel = 'Home';
        try {
          if (typeof GM_setValue !== 'undefined') {
            GM_setValue('bintang_toba_hotkeys', hotkeyCache);
          }
        } catch (e) { /* silent */ }
      }

      hotkeyCacheTime = now;
    }
    return hotkeyCache;
  }

  /**
   * Invalidate hotkey cache
   */
  function invalidateHotkeyCache() {
    hotkeyCache = null;
    hotkeyCacheTime = 0;
  }

  /**
   * Normalize hotkey string
   */
  function normalizeHotkey(key) {
    return String(key || '').toLowerCase().trim();
  }

  // View definitions
  const PHONE_APP_VIEWS = Object.freeze([
    'settings', 'hotkeys', 'discord', 'copyApp', 'mapsApp', 'historyApp'
  ]);

  const PHONE_VIEW_OFFSETS = Object.freeze({
    map: 0,
    menu: -100,
    settings: -200,
    hotkeys: -300,
    discord: -400,
    copyApp: -500,
    mapsApp: -600,
    historyApp: -700
  });

  /**
   * Cek apakah view adalah app view
   */
  function isPhoneAppView(view) {
    return PHONE_APP_VIEWS.includes(view);
  }

  /**
   * Ambil offset translateX untuk view
   */
  function getPhoneViewOffset(view) {
    return PHONE_VIEW_OFFSETS[view] ?? 0;
  }

  // ============================================
  // UI THEMING & STATE
  // Mengatur tampilan tombol, toggle, dan theme
  // ============================================


  /**
   * Update toggle switches UI
   */
  function setFeatureToggleUi(container) {
    const wrap = container || document.getElementById('geohelper-phone-frame') || state.panel;
    if (!wrap) return;

    const updateToggle = (id, isOn) => {
      const cb = wrap.querySelector(`#${id}`);
      const slider = wrap.querySelector(`#${id}-slider`);
      const dot = wrap.querySelector(`#${id}-dot`);

      if (cb && slider && dot) {
        cb.checked = isOn;
        slider.style.backgroundColor = isOn ? '#2f7cf6' : '#2b313b';
        slider.style.borderColor = isOn ? '#2f7cf6' : '#465062';
        dot.style.left = isOn ? '24px' : '4px';
        dot.style.backgroundColor = isOn ? '#f8fafc' : '#9ca3af';
      }
    };

    updateToggle('geohelper-auto-marker', !!state.features?.autoMarker);
    updateToggle('geohelper-safe-mode', !!state.features?.safeMode);
  }

  /**
   * Update preset buttons UI
   */
  function setPresetButtonsUi(container) {
    const wrap = container || document.getElementById('geohelper-phone-frame') || state.panel;
    if (!wrap) return;

    wrap.querySelectorAll('[data-preset]').forEach((btn) => {
      const active = btn.dataset.preset === state.currentPreset;
      btn.style.background = active ? '#2f7cf6' : '#1f232a';
      btn.style.color = active ? '#f8fbff' : '#c9d1dc';
      btn.style.borderColor = active ? '#2f7cf6' : '#3c4350';
      btn.style.borderWidth = '2px';
      btn.style.borderStyle = 'solid';
    });

    const label = wrap.querySelector('#geohelper-preset-status');
    if (label) label.textContent = `MODE: ${state.currentPreset.toUpperCase()}`;
  }

  /**
   * Update map layer buttons UI
   */
  function setMapLayerButtonsUi(container) {
    const wrap = container || document.getElementById('geohelper-maps-view') ||
      document.getElementById('geohelper-phone-frame') || state.panel;
    if (!wrap) return;

    const darkMode = true;

    wrap.querySelectorAll('[data-map-layer]').forEach((btn) => {
      const layerName = btn.dataset.mapLayer;
      const isActive = layerName === state.currentMapLayer;
      const indicator = btn.querySelector(`.layer-indicator-${layerName}`);
      const circle = indicator?.parentElement;

      if (circle && indicator) {
        circle.style.borderColor = isActive ? (darkMode ? '#2f7cf6' : '#1a73e8') : (darkMode ? '#4b5563' : '#e5e7eb');
        indicator.style.background = isActive ? (darkMode ? '#2f7cf6' : '#1a73e8') : 'transparent';
      }

      const textSpan = btn.querySelector('span');
      if (textSpan) {
        textSpan.style.color = isActive ? (darkMode ? '#7eb2ff' : '#1a73e8') : (darkMode ? '#c9d1dc' : '#1f2937');
        textSpan.style.fontWeight = isActive ? '600' : '500';
      }
    });

    document.querySelectorAll('#geohelper-maplayer-status').forEach((label) => {
      const conf = MAP_LAYERS[state.currentMapLayer] || MAP_LAYERS['default'];
      label.textContent = `LAYER: ${conf.name.toUpperCase()}`;
    });
  }

  /**
   * Update UI scale toggle
   */
  function setUiScaleButtonsUi(container) {
    const wrap = container || document.getElementById('geohelper-phone-frame') || state.panel;
    if (!wrap) return;

    const isCompact = state.uiScale === 'compact';

    const cb = wrap.querySelector('#geohelper-ui-scale');
    const slider = wrap.querySelector('#geohelper-ui-scale-slider');
    const dot = wrap.querySelector('#geohelper-ui-scale-dot');

    if (cb && slider && dot) {
      cb.checked = isCompact;
      slider.style.backgroundColor = isCompact ? '#2f7cf6' : '#2b313b';
      slider.style.borderColor = isCompact ? '#2f7cf6' : '#465062';
      dot.style.left = isCompact ? '24px' : '4px';
      dot.style.backgroundColor = isCompact ? '#f8fafc' : '#9ca3af';
    }

    const label = wrap.querySelector('#geohelper-scale-status');
    if (label) label.textContent = `SCALE: ${(state.uiScale || 'normal').toUpperCase()}`;
  }

  /**
   * Apply preset mode
   */
  function applyPresetMode(presetName, persist = false) {
    const preset = PRESETS[presetName];
    if (!preset) return;

    state.features = { ...state.features, ...preset };
    state.currentPreset = presetName;

    setFeatureToggleUi();
    setPresetButtonsUi();

    if (persist) {
      persistSettingsSnapshot(state, {
        features: state.features,
        preset: state.currentPreset
      });
    }
  }

  /**
   * Apply theme mode
   */
  function applyThemeMode(themeMode, persist = false) {
    state.themeMode = 'dark';
    setThemeButtonsUi();

    const panel = document.getElementById('geohelper-phone-frame');
    if (panel) applyPhoneLikeButtonTheme(panel);

    if (persist) {
      persistSettingsSnapshot(state, { themeMode: 'dark' });
    }
  }

  /**
   * Apply UI scale
   */
  function applyUiScale(scaleMode, persist = false) {
    const next = Validators.isValidUiScale(scaleMode) ? scaleMode : 'normal';
    state.uiScale = next;
    setUiScaleButtonsUi();

    const panel = document.getElementById('geohelper-phone-frame');
    if (panel) applyPhoneLikeButtonTheme(panel);

    if (persist) {
      persistSettingsSnapshot(state, { uiScale: state.uiScale });
    }
  }

  /**
   * Apply mini map layer
   */
  function applyMiniMapLayer(layerKey, persist = false) {
    const resolved = Validators.isValidMapLayer(layerKey) ? layerKey : 'default';
    const conf = MAP_LAYERS[resolved] || MAP_LAYERS['default'];
    state.currentMapLayer = resolved;

    if (state.miniMap && typeof L !== 'undefined') {
      if (state.miniMapTileLayer) {
        try {
          state.miniMap.removeLayer(state.miniMapTileLayer);
        } catch (e) { /* silent */ }
        state.miniMapTileLayer = null;
      }

      const layerOptions = {
        maxZoom: 19,
        worldCopyJump: true,
        ...(conf.options || {})
      };
      state.miniMapTileLayer = L.tileLayer(conf.url, layerOptions);
      state.miniMapTileLayer.addTo(state.miniMap);
    }

    setMapLayerButtonsUi();

    if (persist) {
      persistSettingsSnapshot(state, { mapLayer: state.currentMapLayer });
    }
  }

  /**
   * Set theme buttons UI
   */
  function setThemeButtonsUi() {
    state.themeMode = 'dark';
  }

  /**
   * Sync panel settings UI dari state
   */
  function syncPanelSettingsUiFromState() {
    const panel = document.getElementById('geohelper-phone-frame') || state.panel;
    if (!panel) return;

    const hotkeys = getHotkeys() || DEFAULT_HOTKEYS;

    panel.querySelectorAll('[data-hotkey]').forEach((input) => {
      const key = input.dataset.hotkey;
      input.value = hotkeys[key] || DEFAULT_HOTKEYS[key];
    });

    const webhookEl = panel.querySelector('#geohelper-discord-webhook');
    if (webhookEl) {
      webhookEl.value = safeGM_getValue(APP_CONFIG.STORAGE_KEYS.DISCORD_WEBHOOK, '');
    }

    setFeatureToggleUi(panel);
    setPresetButtonsUi(panel);
    setThemeButtonsUi();
    setUiScaleButtonsUi(panel);
    setMapLayerButtonsUi(panel);
    applyPhoneLikeButtonTheme(panel);
  }

  // ============================================
  // MINI MAP (Leaflet)
  // Menampilkan peta kecil dengan lokasi saat ini
  // ============================================


  /**
   * Load Leaflet library secara dinamis
   */
  function initMiniMap() {
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
  function updateMiniMap() {
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

  // ============================================
  // UI VIEWS
  // HTML generator untuk semua halaman dalam phone UI
  // ============================================


  /**
   * Generate Settings View HTML
   */
  function createSettingsView() {
    const savedHotkeys = getHotkeys();
    const savedWebhook = safeGM_getValue(APP_CONFIG.STORAGE_KEYS.DISCORD_WEBHOOK, '');

    const settingsView = document.createElement('div');
    settingsView.id = 'geohelper-settings-view';
    settingsView.style.cssText = 'min-width: 100%; display: flex; flex-direction: column; background: #f3f4f6; height: 100%;';

    settingsView.innerHTML = `
    <div style="background:#fff;padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:12px;">
      <h2 style="margin:0;font-size:18px;font-weight:700;color:#111827;">Settings</h2>
    </div>
    <div style="flex:1;overflow-y:auto;padding:16px;">
      <!-- Auto Marker Toggle -->
      <div style="background:#fff;border-radius:16px;padding:16px;margin-bottom:16px;">
        <div style="font-size:12px;color:#6b7280;font-weight:700;margin-bottom:14px;">SETTING MARKER</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div>
            <div style="font-weight:600;font-size:14px;">Auto Click Mode</div>
            <div style="font-size:11px;color:#6b7280;">Press 1/2 = auto click game map</div>
          </div>
          <label style="position:relative;display:inline-block;width:48px;height:26px;">
            <input type="checkbox" id="geohelper-auto-marker" ${state.features?.autoMarker ? 'checked' : ''} style="opacity:0;width:0;height:0;">
            <span id="geohelper-auto-marker-slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:#f3f4f6;border:2px solid #d1d5db;transition:.3s;border-radius:20px;"></span>
            <span id="geohelper-auto-marker-dot" style="position:absolute;height:18px;width:18px;left:4px;bottom:4px;background-color:#9ca3af;transition:.3s;border-radius:50%;"></span>
          </label>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:600;font-size:14px;">Safe Mode</div>
            <div style="font-size:11px;color:#6b7280;">Random offset (4.5k+ pts)</div>
          </div>
          <label style="position:relative;display:inline-block;width:48px;height:26px;">
            <input type="checkbox" id="geohelper-safe-mode" ${state.features?.safeMode ? 'checked' : ''} style="opacity:0;width:0;height:0;">
            <span id="geohelper-safe-mode-slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:#f3f4f6;border:2px solid #d1d5db;transition:.3s;border-radius:20px;"></span>
            <span id="geohelper-safe-mode-dot" style="position:absolute;height:18px;width:18px;left:4px;bottom:4px;background-color:#9ca3af;transition:.3s;border-radius:50%;"></span>
          </label>
        </div>
      </div>

      <!-- Presets -->
      <div style="background:#fff;border-radius:16px;padding:16px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div style="font-size:12px;color:#6b7280;font-weight:700;">Preset Mode</div>
          <div id="geohelper-preset-status" style="font-size:10px;color:#4ade80;font-weight:800;">MODE: ${state.currentPreset.toUpperCase()}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
          <button data-preset="exact" style="padding:10px;border-radius:10px;border:2px solid #e5e7eb;background:#fff;cursor:pointer;font-size:12px;font-weight:700;">Exact</button>
          <button data-preset="safe" style="padding:10px;border-radius:10px;border:2px solid #e5e7eb;background:#fff;cursor:pointer;font-size:12px;font-weight:700;">Safe</button>
          <button data-preset="stealth" style="padding:10px;border-radius:10px;border:2px solid #e5e7eb;background:#fff;cursor:pointer;font-size:12px;font-weight:700;">Stealth</button>
        </div>
      </div>

      <!-- UI Scale -->
      <div style="background:#fff;border-radius:16px;padding:16px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div style="font-size:12px;color:#6b7280;font-weight:700;">UI Scale</div>
          <div id="geohelper-scale-status" style="font-size:10px;color:#4ade80;font-weight:800;">SCALE: ${(state.uiScale || 'normal').toUpperCase()}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:600;font-size:14px;">Compact Mode</div>
            <div style="font-size:11px;color:#6b7280;">Off: Normal, On: Compact</div>
          </div>
          <label style="position:relative;display:inline-block;width:48px;height:26px;">
            <input type="checkbox" id="geohelper-ui-scale" ${state.uiScale === 'compact' ? 'checked' : ''} style="opacity:0;width:0;height:0;">
            <span id="geohelper-ui-scale-slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:#2b313b;border:2px solid #465062;transition:.3s;border-radius:20px;"></span>
            <span id="geohelper-ui-scale-dot" style="position:absolute;height:18px;width:18px;left:4px;bottom:4px;background-color:#9ca3af;transition:.3s;border-radius:50%;"></span>
          </label>
        </div>
      </div>

      <!-- Session Backup -->
      <div style="background:#fff;border-radius:16px;padding:16px;margin-bottom:16px;">
        <div style="font-size:12px;color:#6b7280;font-weight:700;margin-bottom:12px;">Session Backup</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <button id="geohelper-export-session" style="padding:12px;background:#fff;border:2px solid #e5e7eb;border-radius:12px;cursor:pointer;font-size:12px;font-weight:700;">Backup</button>
          <button id="geohelper-import-session" style="padding:12px;background:#fff;border:2px solid #e5e7eb;border-radius:12px;cursor:pointer;font-size:12px;font-weight:700;">Restore</button>
        </div>
      </div>

      <!-- Save/Reset -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:40px;">
        <button id="geohelper-save" style="padding:14px;background:#1a73e8;color:#fff;border:none;border-radius:14px;cursor:pointer;font-weight:700;font-size:14px;">Save</button>
        <button id="geohelper-reset" style="padding:14px;background:#fff;color:#ef4444;border:2px solid #ef4444;border-radius:14px;cursor:pointer;font-weight:700;font-size:14px;">Reset</button>
      </div>
    </div>
  `;

    return settingsView;
  }

  /**
   * Generate Hotkeys View HTML
   */
  function createHotkeysView() {
    const savedHotkeys = getHotkeys();

    const hotkeysView = document.createElement('div');
    hotkeysView.id = 'geohelper-hotkeys-view';
    hotkeysView.style.cssText = 'min-width: 100%; display: flex; flex-direction: column; background: #f3f4f6; height: 100%;';

    const hotkeyRows = Object.entries(DEFAULT_HOTKEYS).map(([hk, val]) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f3f4f6;">
      <div>
        <label style="font-size:13px;font-weight:600;text-transform:capitalize;">${hk.replace(/([A-Z])/g, ' $1')}</label>
        <div style="font-size:10px;color:#9ca3af;">${HOTKEY_DESCRIPTIONS[hk] || ''}</div>
      </div>
      <input type="text" maxlength="10" data-hotkey="${hk}" value="${Security.escapeAttr(savedHotkeys[hk] || val)}"
        style="width:80px;text-align:center;padding:8px;border:2px solid #e5e7eb;border-radius:10px;font-size:12px;font-weight:700;color:#ec4899;">
    </div>
  `).join('');

    hotkeysView.innerHTML = `
    <div style="background:linear-gradient(135deg, #ec4899 0%, #be185d 100%);padding:16px 20px;display:flex;align-items:center;gap:12px;">
      <h2 style="margin:0;font-size:18px;font-weight:700;color:#fff;">Hotkeys</h2>
    </div>
    <div style="flex:1;overflow-y:auto;padding:16px;">
      <div style="background:#fff;border-radius:16px;padding:16px;margin-bottom:16px;">
        <div style="font-size:12px;color:#6b7280;font-weight:700;margin-bottom:14px;">Key Bindings</div>
        ${hotkeyRows}
      </div>
      <button id="geohelper-hotkeys-save" style="width:100%;padding:14px;background:linear-gradient(135deg, #ec4899 0%, #be185d 100%);color:#fff;border:none;border-radius:14px;cursor:pointer;font-weight:700;font-size:14px;">Save Hotkeys</button>
    </div>
  `;

    return hotkeysView;
  }

  /**
   * Generate Discord View HTML
   */
  function createDiscordView() {
    const savedWebhook = safeGM_getValue(APP_CONFIG.STORAGE_KEYS.DISCORD_WEBHOOK, '');

    const discordView = document.createElement('div');
    discordView.id = 'geohelper-discord-view';
    discordView.style.cssText = 'min-width: 100%; display: flex; flex-direction: column; background: #f3f4f6; height: 100%;';

    discordView.innerHTML = `
    <div style="background:linear-gradient(135deg, #5865F2 0%, #4752c4 100%);padding:16px 20px;display:flex;align-items:center;gap:12px;">
      <h2 style="margin:0;font-size:18px;font-weight:700;color:#fff;">Discord</h2>
    </div>
    <div style="flex:1;overflow-y:auto;padding:16px;">
      <div style="background:#fff;border-radius:16px;padding:16px;margin-bottom:16px;">
        <div style="font-size:12px;color:#6b7280;font-weight:700;margin-bottom:12px;">Webhook URL</div>
        <input type="text" id="geohelper-discord-webhook" value="${Security.escapeAttr(savedWebhook)}"
          placeholder="https://discord.com/api/webhooks/..."
          style="width:100%;padding:14px;border:2px solid #e5e7eb;border-radius:12px;font-size:13px;">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <button id="geohelper-discord-save" style="padding:14px;background:linear-gradient(135deg, #5865F2 0%, #4752c4 100%);color:#fff;border:none;border-radius:14px;cursor:pointer;font-weight:700;">Save</button>
        <button id="geohelper-discord-test" style="padding:14px;background:#fff;color:#5865F2;border:2px solid #5865F2;border-radius:14px;cursor:pointer;font-weight:700;">Test</button>
      </div>
    </div>
  `;

    return discordView;
  }

  /**
   * Generate Copy View HTML
   */
  function createCopyView() {
    const copyView = document.createElement('div');
    copyView.id = 'geohelper-copy-view';
    copyView.style.cssText = 'min-width: 100%; display: flex; flex-direction: column; background: #f3f4f6; height: 100%;';

    copyView.innerHTML = `
    <div style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);padding:16px 20px;display:flex;align-items:center;gap:12px;">
      <h2 style="margin:0;font-size:18px;font-weight:700;color:#fff;">Copy</h2>
    </div>
    <div style="flex:1;overflow-y:auto;padding:16px;">
      <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:16px;">
        <div id="geohelper-copy-coords" style="font-family:monospace;font-size:16px;font-weight:600;text-align:center;padding:16px;background:#f9fafb;border-radius:12px;">Waiting for location...</div>
      </div>
      <button id="geohelper-copy-main" style="width:100%;padding:16px;background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);color:#fff;border:none;border-radius:16px;cursor:pointer;font-size:15px;font-weight:600;">Copy Coordinates</button>
    </div>
  `;

    return copyView;
  }

  /**
   * Generate Maps View HTML
   */
  function createMapsView() {
    const mapsView = document.createElement('div');
    mapsView.id = 'geohelper-maps-view';
    mapsView.style.cssText = 'min-width: 100%; display: flex; flex-direction: column; background: #f3f4f6; height: 100%;';

    const layerButtons = Object.entries(MAP_LAYERS).map(([key, layer]) => `
    <button data-map-layer="${key}" style="width:100%;display:flex;align-items:center;gap:14px;padding:16px;background:#fff;border:none;border-bottom:1px solid #f3f4f6;cursor:pointer;text-align:left;">
      <div style="width:20px;height:20px;border-radius:50%;border:2px solid #e5e7eb;display:flex;align-items:center;justify-content:center;">
        <div class="layer-indicator-${key}" style="width:10px;height:10px;border-radius:50%;"></div>
      </div>
      <span style="font-size:15px;">${layer.name}</span>
    </button>
  `).join('');

    mapsView.innerHTML = `
    <div style="background:linear-gradient(135deg, #1a73e8 0%, #1557b0 100%);padding:16px 20px;display:flex;align-items:center;gap:12px;">
      <h2 style="margin:0;font-size:18px;font-weight:700;color:#fff;">Maps</h2>
    </div>
    <div style="flex:1;overflow-y:auto;padding:16px;">
      <div style="background:#fff;border-radius:16px;overflow:hidden;margin-bottom:16px;">
        <div style="padding:14px 16px;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:600;">Map Layer Style</div>
        ${layerButtons}
      </div>
      <div id="geohelper-open-gmaps" style="background:#fff;border-radius:16px;padding:16px;cursor:pointer;display:flex;align-items:center;gap:14px;">
        <div style="width:44px;height:44px;background:#eff6ff;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;">🌐</div>
        <div style="flex:1;">
          <div style="font-size:15px;font-weight:500;">Open in Google Maps</div>
          <div style="font-size:13px;color:#6b7280;">View current location</div>
        </div>
        <span style="font-size:20px;color:#9ca3af;">›</span>
      </div>
    </div>
  `;

    return mapsView;
  }

  /**
   * Generate History View HTML
   */
  function createHistoryView() {
    const historyView = document.createElement('div');
    historyView.id = 'geohelper-history-view';
    historyView.style.cssText = 'min-width: 100%; display: flex; flex-direction: column; background: #f3f4f6; height: 100%;';

    historyView.innerHTML = `
    <div style="background:linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:12px;">
        <h2 style="margin:0;font-size:18px;font-weight:700;color:#fff;">History</h2>
      </div>
      <div id="geohelper-history-count" style="background:rgba(255,255,255,0.2);padding:4px 10px;border-radius:12px;font-size:11px;color:#fff;font-weight:600;">0 rounds</div>
    </div>
    <div id="geohelper-history-content" style="flex:1;overflow-y:auto;padding:16px;">
      <div id="geohelper-history-list"></div>
    </div>
  `;

    return historyView;
  }

  // ============================================
  // PHONE FRAME UI
  // Komponen utama: membuat dan mengelola phone-like panel
  // ============================================


  /**
   * Cache original inline styles sebelum theme di-apply
   */
  function cacheOriginalInlineStyles(root) {
    if (!root) return;
    root.querySelectorAll('[style]').forEach((el) => {
      if (!el.dataset.geohelperBaseStyle) {
        el.dataset.geohelperBaseStyle = el.getAttribute('style') || '';
      }
    });
  }

  /**
   * Apply OneUI dark theme ke app views
   */
  function applyOneUiAppViews(root, force = false) {
    if (!root) return;
    if (internals.oneUiViewsStyled && !force) return;

    const appViewIds = [
      'geohelper-settings-view',
      'geohelper-hotkeys-view',
      'geohelper-discord-view',
      'geohelper-copy-view',
      'geohelper-maps-view',
      'geohelper-history-view'
    ];

    appViewIds.forEach((id) => {
      const view = root.querySelector(`#${id}`);
      if (!view) return;

      view.style.background = '#000000';

      const header = view.firstElementChild;
      if (header) {
        header.style.background = '#000000';
        header.style.borderBottom = '1px solid #1f232a';
        header.style.padding = '14px 16px';
        header.querySelectorAll('h2').forEach((title) => {
          title.style.color = '#f3f4f6';
          title.style.fontSize = '18px';
          title.style.fontWeight = '700';
          title.style.letterSpacing = '-0.2px';
        });
        header.querySelectorAll('button').forEach((btn) => {
          btn.style.display = 'none';
        });
      }

      const body = header ? header.nextElementSibling : null;
      if (!body) return;
      body.style.background = '#000000';
      body.style.padding = '12px 10px 34px';

      body.querySelectorAll('div[style*="background:#fff"]').forEach((card) => {
        card.style.background = '#15181d';
        card.style.border = '1px solid #262b34';
        card.style.borderRadius = '20px';
        card.style.boxShadow = 'none';
      });

      body.querySelectorAll('button').forEach((btn) => {
        const idKey = btn.id || '';
        const isPrimary =
          idKey === 'geohelper-save' ||
          idKey === 'geohelper-hotkeys-save' ||
          idKey === 'geohelper-discord-save' ||
          idKey === 'geohelper-copy-main';

        if (isPrimary) {
          btn.style.background = '#2f7cf6';
          btn.style.color = '#f8fbff';
          btn.style.border = 'none';
        } else {
          btn.style.background = '#1b2028';
          btn.style.color = '#e5e7eb';
          btn.style.border = '1px solid #313846';
        }
      });

      body.querySelectorAll('input[type="text"]').forEach((input) => {
        input.style.background = '#101319';
        input.style.border = '1px solid #323949';
        input.style.color = '#f3f4f6';
      });

      body.querySelectorAll('[style*="color:#6b7280"], [style*="color:#9ca3af"], [style*="color:#374151"], [style*="color:#111827"]').forEach((el) => {
        if (!el.closest('button')) {
          el.style.color = '#9aa3b2';
        }
      });
    });

    internals.oneUiViewsStyled = true;
  }

  /**
   * Get UI refs (cached DOM elements)
   */
  function getUiRefs() {
    if (!state._uiRefs) state._uiRefs = {};
    const refs = state._uiRefs;

    if (!refs.display || !document.body.contains(refs.display)) {
      refs.display = document.getElementById('geohelper-phone-frame');
    }
    const root = refs.display;
    if (!root) return refs;

    if (!refs.locationInfo || !root.contains(refs.locationInfo)) {
      refs.locationInfo = root.querySelector('#geohelper-location-info');
    }
    if (!refs.statusBadge || !root.contains(refs.statusBadge)) {
      refs.statusBadge = root.querySelector('#geohelper-status-badge');
    }
    if (!refs.coordsOverlay || !root.contains(refs.coordsOverlay)) {
      refs.coordsOverlay = root.querySelector('#geohelper-coords-overlay');
    }
    if (!refs.copyCoords || !root.contains(refs.copyCoords)) {
      refs.copyCoords = root.querySelector('#geohelper-copy-coords');
    }

    return refs;
  }

  /**
   * Update info display pada panel
   */
  /**
   * Toggle panel visibility
   */
  function togglePanel$1() {
    state.infoVisible = !state.infoVisible;
    updateInfoDisplay();
  }

  /**
   * Open home/map view quickly
   */
  function openHomeQuick$1() {
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

  function updateInfoDisplay() {
    let refs = getUiRefs();
    let display = refs.display;

    if (!display) {
      display = createPhoneFrame();
      refs = getUiRefs();
    }

    const locationInfo = refs.locationInfo;
    const statusBadge = refs.statusBadge;
    const coordsOverlay = refs.coordsOverlay;

    if (!locationInfo) return;

    if (state.infoVisible) {
      display.style.display = 'block';
      state.miniMapVisible = true;

      if (!internals.panelUiBootstrapped) {
        applyPhoneLikeButtonTheme(display);
        applyOneUiAppViews(display);
        setupActionButtons();

        setTimeout(() => {
          try {
            initMiniMap();
            updateMiniMap();
          } catch (e) {
            Logger.debug('Mini map init deferred');
          }
        }, 200);

        internals.panelUiBootstrapped = true;
      }
    } else {
      display.style.display = 'none';
      state.miniMapVisible = false;
    }
  }

  /**
   * Apply phone-like button theme
   */
  function applyPhoneLikeButtonTheme(root) {
    if (!root) return;
    cacheOriginalInlineStyles(root);

    root.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    root.style.background = '#000';
    root.style.width = '306px';
    root.style.padding = '8px';

    const screen = root.firstElementChild;
    if (screen?.style) {
      screen.style.background = '#000';
      screen.style.height = '500px';
    }

    ['#geohelper-map-view', '#geohelper-menu-view'].forEach(sel => {
      const el = root.querySelector(sel);
      if (el) el.style.background = '#0b0d11';
    });

    const locationInfo = root.querySelector('#geohelper-location-info');
    if (locationInfo) {
      locationInfo.style.background = '#0f1319';
    }

    const navBar = root.querySelector('#geohelper-nav-bar');
    if (navBar) {
      navBar.style.display = 'flex';
    }

    const navShell = root.querySelector('#geohelper-nav-shell');
    const navStrip = root.querySelector('#geohelper-nav-strip');
    if (navShell) {
      navShell.style.background = 'rgba(67, 70, 77, 0.92)';
      navShell.style.border = 'none';
      navShell.style.boxShadow = 'none';
    }
    if (navStrip) {
      navStrip.style.background = '#05070b';
    }

    root.querySelectorAll('.geohelper-app-icon').forEach((iconBox) => {
      iconBox.style.background = 'linear-gradient(180deg, #2f3339 0%, #22252a 100%)';
      iconBox.style.border = '1px solid #3a3f48';
      iconBox.style.width = '46px';
      iconBox.style.height = '46px';
    });

    root.querySelectorAll('.geohelper-app-label').forEach((label) => {
      label.style.fontSize = '8px';
      label.style.color = '#d1d5db';
    });
  }

  /**
   * Setup action buttons (Mark, Safe, Refresh)
   */
  function setupActionButtons() {
    const flashActionButton = (container, labelText) => {
      if (!container) return;
      const label = container.querySelector('span:last-child');
      const iconDiv = container.querySelector('div');
      if (!label || !iconDiv) return;

      const originalLabel = label.textContent;
      const originalBg = iconDiv.style.background;

      label.textContent = labelText;
      iconDiv.style.background = '#4ade80';

      setTimeout(() => {
        label.textContent = originalLabel;
        iconDiv.style.background = originalBg;
      }, 1000);
    };

    const markBtn = document.getElementById('geohelper-action-mark');
    if (markBtn) {
      markBtn.onclick = () => {
        Logger.debug('Mark button clicked');
        flashActionButton(markBtn, 'Marked!');
      };
    }

    const safeBtn = document.getElementById('geohelper-action-safe');
    if (safeBtn) {
      safeBtn.onclick = () => {
        Logger.debug('Safe button clicked');
        flashActionButton(safeBtn, 'Safe Set!');
      };
    }

    const refreshBtn = document.getElementById('geohelper-action-refresh');
    if (refreshBtn) {
      refreshBtn.onclick = () => {
        Logger.debug('Refresh button clicked');
        flashActionButton(refreshBtn, 'Syncing...');
      };
    }
  }

  /**
   * Buat phone frame utama
   */
  function createPhoneFrame() {
    // Hapus frame lama jika ada
    const existing = document.getElementById('geohelper-phone-frame');
    if (existing) existing.remove();

    const phoneFrame = document.createElement('div');
    phoneFrame.id = 'geohelper-phone-frame';
    phoneFrame.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    width: 320px;
    background: #000000;
    border-radius: 30px;
    padding: 10px;
    z-index: 999998;
    display: none;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 2px #1a1a1a;
    border: 3px solid #1a1a1a;
    user-select: none;
    -webkit-user-select: none;
  `;

    const screenContainer = document.createElement('div');
    screenContainer.style.cssText = `
    background: #ffffff;
    border-radius: 25px;
    overflow: hidden;
    height: 520px;
    position: relative;
  `;

    // Status Bar
    const statusBar = document.createElement('div');
    statusBar.style.cssText = `
    background: #000;
    color: #fff;
    padding: 8px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    font-weight: 600;
    cursor: grab;
    user-select: none;
  `;
    statusBar.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <div id="geohelper-led-indicator" style="width:6px;height:6px;border-radius:50%;background:#4ade80;box-shadow:0 0 6px #4ade80;transition:all 0.3s;"></div>
      <span id="geohelper-clock">12:00</span>
    </div>
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:10px;font-weight:700;color:#9ca3af;letter-spacing:0.3px;">${APP_CONFIG.NAME}</span>
      <div style="display:flex;gap:6px;align-items:center;">
        <span>📶</span>
        <span>📳</span>
        <span>🔋</span>
      </div>
    </div>
  `;

    // Content Area
    const contentArea = document.createElement('div');
    contentArea.style.cssText = `
    background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
    height: calc(100% - 35px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
  `;

    // Views Container
    const viewsContainer = document.createElement('div');
    viewsContainer.id = 'geohelper-views-container';
    viewsContainer.style.cssText = `
    display: flex;
    transition: transform 0.3s ease;
    height: 100%;
  `;

    // Map View
    const mapView = createMapView();
    viewsContainer.appendChild(mapView);

    // Menu View
    const menuView = createMenuView();
    viewsContainer.appendChild(menuView);

    // App Views
    viewsContainer.appendChild(createSettingsView());
    viewsContainer.appendChild(createHotkeysView());
    viewsContainer.appendChild(createDiscordView());
    viewsContainer.appendChild(createCopyView());
    viewsContainer.appendChild(createMapsView());
    viewsContainer.appendChild(createHistoryView());

    contentArea.appendChild(viewsContainer);

    // Navigation Bar
    const navBar = createNavigationBar(viewsContainer);
    contentArea.appendChild(navBar);

    // Home Indicator
    const homeIndicator = document.createElement('div');
    homeIndicator.style.cssText = 'display:none;';

    screenContainer.appendChild(statusBar);
    screenContainer.appendChild(contentArea);
    screenContainer.appendChild(homeIndicator);
    phoneFrame.appendChild(screenContainer);
    document.body.appendChild(phoneFrame);

    // Enable drag and clock
    enablePhoneDragAndClock(phoneFrame, statusBar);

    // Initial theme
    cacheOriginalInlineStyles(phoneFrame);
    applyPhoneLikeButtonTheme(phoneFrame);
    applyOneUiAppViews(phoneFrame, true);

    state._uiRefs = {
      display: phoneFrame,
      locationInfo: phoneFrame.querySelector('#geohelper-location-info'),
      statusBadge: phoneFrame.querySelector('#geohelper-status-badge'),
      coordsOverlay: phoneFrame.querySelector('#geohelper-coords-overlay'),
      copyCoords: phoneFrame.querySelector('#geohelper-copy-coords')
    };

    return phoneFrame;
  }

  /**
   * Create Map View
   */
  function createMapView() {
    const mapView = document.createElement('div');
    mapView.id = 'geohelper-map-view';
    mapView.style.cssText = 'min-width: 100%; display: flex; flex-direction: column; background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);';

    const mapSection = document.createElement('div');
    mapSection.id = 'geohelper-minimap-container';
    mapSection.style.cssText = 'height: 280px; position: relative; background: #cbd5e1; flex-shrink: 0; overflow: hidden;';
    mapSection.innerHTML = `
    <div id="geohelper-minimap" style="width:100%;height:100%;background:#cbd5e1;"></div>
    <div id="geohelper-status-badge" style="position:absolute;top:12px;left:12px;background:rgba(74,222,128,0.95);padding:4px 10px;border-radius:6px;font-size:11px;color:#064e3b;font-weight:800;cursor:pointer;z-index:1000;">✓ Ready</div>
    <div style="position:absolute;top:12px;right:12px;display:flex;flex-direction:column;gap:4px;z-index:1000;">
      <div style="display:flex;flex-direction:column;gap:1px;box-shadow:0 2px 8px rgba(0,0,0,0.15);border-radius:18px;overflow:hidden;">
        <button id="geohelper-zoom-in" style="width:36px;height:36px;background:#fff;border:none;color:#374151;cursor:pointer;font-size:18px;font-weight:bold;">+</button>
        <button id="geohelper-zoom-out" style="width:36px;height:36px;background:#fff;border:none;color:#374151;cursor:pointer;font-size:18px;font-weight:bold;">−</button>
      </div>
      <div id="geohelper-zoom-level" style="background:rgba(255,255,255,0.9);padding:2px 8px;border-radius:10px;font-size:10px;font-weight:800;color:#1f2937;text-align:center;">x2</div>
    </div>
    <div id="geohelper-coords-overlay" style="position:absolute;bottom:12px;left:12px;background:rgba(255,255,255,0.9);padding:4px 10px;border-radius:6px;font-family:monospace;font-size:11px;color:#1f2937;font-weight:700;z-index:1000;">--, --</div>
  `;

    const locationInfo = document.createElement('div');
    locationInfo.id = 'geohelper-location-info';
    locationInfo.style.cssText = 'flex: 1; background: #0f1319; padding: 12px 16px; overflow-y: auto;';
    locationInfo.innerHTML = `
    <div style="text-align:center;padding:20px 10px;">
      <div style="font-size:32px;margin-bottom:8px;">🌍</div>
      <div style="color:#d1d5db;font-size:13px;font-weight:500;">Waiting for location...</div>
    </div>
  `;

    mapView.appendChild(mapSection);
    mapView.appendChild(locationInfo);

    return mapView;
  }

  /**
   * Create Menu View
   */
  function createMenuView() {
    const menuView = document.createElement('div');
    menuView.id = 'geohelper-menu-view';
    menuView.style.cssText = 'min-width: 100%; display: flex; flex-direction: column; background: linear-gradient(180deg, #667eea 0%, #764ba2 100%); padding: 16px 12px;';

    const appGrid = document.createElement('div');
    appGrid.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px 10px; flex: 1; align-content: start;';

    const appIcons = [
      { id: 'geohelper-maps-btn', icon: '🗺️', label: 'Maps', bg: 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)' },
      { id: 'geohelper-copy-btn', icon: '📋', label: 'Copy', bg: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)' },
      { id: 'geohelper-action-mark', icon: '📍', label: 'Mark', bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
      { id: 'geohelper-action-safe', icon: '🎲', label: 'Safe', bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
      { id: 'geohelper-action-refresh', icon: '🔄', label: 'Refresh', bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
      { id: 'geohelper-app-history', icon: '📜', label: 'History', bg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' },
      { id: 'geohelper-app-hotkeys', icon: '⌨️', label: 'Hotkeys', bg: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' },
      { id: 'geohelper-app-discord', icon: '💬', label: 'Discord', bg: 'linear-gradient(135deg, #5865F2 0%, #4752c4 100%)' },
      { id: 'geohelper-app-settings', icon: '⚙️', label: 'Settings', bg: 'linear-gradient(135deg, #6b7280 0%, #374151 100%)' }
    ];

    appIcons.forEach(app => {
      const appBtn = document.createElement('div');
      appBtn.id = app.id;
      appBtn.className = 'geohelper-app-btn';
      appBtn.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 5px; cursor: pointer; transition: transform 0.15s; user-select: none;';
      appBtn.innerHTML = `
      <div class="geohelper-app-icon" data-bg="${Security.escapeAttr(app.bg)}" style="width:56px;height:56px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:25px;background:${app.bg};">
        ${app.icon}
      </div>
      <span class="geohelper-app-label" style="font-size:10px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.3);">${app.label}</span>
    `;
      appBtn.onmouseenter = function () { this.style.transform = 'scale(1.05)'; };
      appBtn.onmouseleave = function () { this.style.transform = 'scale(1)'; };
      appBtn.addEventListener('click', (e) => e.stopPropagation());
      appGrid.appendChild(appBtn);
    });

    menuView.appendChild(appGrid);
    return menuView;
  }

  /**
   * Create Navigation Bar
   */
  function createNavigationBar(viewsContainer) {
    let currentView = 'map';
    state.phoneView = currentView;

    const navBar = document.createElement('div');
    navBar.id = 'geohelper-nav-bar';
    navBar.style.cssText = 'position:absolute;left:0;right:0;bottom:-1px;display:flex;align-items:flex-end;z-index:1000;';

    const navShell = document.createElement('div');
    navShell.id = 'geohelper-nav-shell';
    navShell.style.cssText = 'width:100%;padding:0;border-radius:0;';

    const navStrip = document.createElement('div');
    navStrip.id = 'geohelper-nav-strip';
    navStrip.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:18px;padding:5px 0 4px;border-radius:0;background:#05070b;';

    const menuBtn = document.createElement('button');
    menuBtn.id = 'geohelper-nav-menu-btn';
    menuBtn.type = 'button';
    menuBtn.textContent = '☰';
    menuBtn.style.cssText = 'width:44px;height:20px;border:none;background:transparent;color:#f3f4f6;font-size:11px;font-weight:800;cursor:pointer;letter-spacing:1px;border-radius:4px;';

    const homeBtn = document.createElement('button');
    homeBtn.id = 'geohelper-nav-home-btn';
    homeBtn.type = 'button';
    homeBtn.textContent = '▢';
    homeBtn.style.cssText = 'width:44px;height:20px;border:none;background:transparent;color:#f3f4f6;font-size:13px;font-weight:700;cursor:pointer;border-radius:4px;';

    const swapBtn = document.createElement('button');
    swapBtn.id = 'geohelper-nav-toggle-btn';
    swapBtn.type = 'button';
    swapBtn.textContent = '<';
    swapBtn.style.cssText = 'width:44px;height:20px;border:none;background:transparent;color:#f3f4f6;font-size:13px;font-weight:700;cursor:pointer;border-radius:4px;';

    const syncBottomNavState = (view) => {
      menuBtn.style.color = view === 'menu' ? '#ffffff' : '#9ca3af';
      homeBtn.style.color = view === 'map' ? '#ffffff' : '#9ca3af';
      swapBtn.style.color = '#ffffff';
    };

    const swapToView = (view) => {
      if (view === currentView) return;
      const toOffset = getPhoneViewOffset(view);
      currentView = view;
      state.phoneView = currentView;

      viewsContainer.style.transform = `translateX(${toOffset}%)`;
      syncBottomNavState(view);

      navBar.style.display = 'flex';
    };
    state.swapPhoneView = swapToView;

    menuBtn.onclick = (e) => { e.stopPropagation(); swapToView('menu'); };
    homeBtn.onclick = (e) => { e.stopPropagation(); swapToView('map'); };
    swapBtn.onclick = (e) => {
      e.stopPropagation();
      const inAppView = isPhoneAppView(currentView);
      if (inAppView) {
        swapToView('menu');
      } else {
        swapToView(currentView === 'map' ? 'menu' : 'map');
      }
    };

    syncBottomNavState('map');

    navStrip.appendChild(menuBtn);
    navStrip.appendChild(homeBtn);
    navStrip.appendChild(swapBtn);
    navShell.appendChild(navStrip);
    navBar.appendChild(navShell);

    return navBar;
  }

  /**
   * Enable phone drag and clock
   */
  function enablePhoneDragAndClock(phoneFrame, statusBar) {
    let dragActive = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    const DRAG_MARGIN = 8;

    const clampPosition = (rawX, rawY) => {
      const pw = phoneFrame.offsetWidth || 320;
      const ph = phoneFrame.offsetHeight || 560;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const minX = DRAG_MARGIN;
      const minY = DRAG_MARGIN;
      const maxX = vw - pw - DRAG_MARGIN;
      const maxY = vh - ph - DRAG_MARGIN;

      return {
        x: Math.round(Math.min(Math.max(rawX, minX), Math.max(maxX, minX))),
        y: Math.round(Math.min(Math.max(rawY, minY), Math.max(maxY, minY)))
      };
    };

    const applyPosition = (rawX, rawY) => {
      const { x, y } = clampPosition(rawX, rawY);
      phoneFrame.style.left = x + 'px';
      phoneFrame.style.top = y + 'px';
    };

    // Mouse drag
    const onMouseMove = (e) => {
      if (!dragActive) return;
      applyPosition(e.clientX - dragOffsetX, e.clientY - dragOffsetY);
    };

    const endMouseDrag = () => {
      if (!dragActive) return;
      dragActive = false;
      statusBar.style.cursor = 'grab';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', endMouseDrag);
    };

    statusBar.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const rect = phoneFrame.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      dragActive = true;
      statusBar.style.cursor = 'grabbing';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', endMouseDrag);
    });

    // Touch drag
    const onTouchMove = (e) => {
      if (!dragActive || !e.touches?.[0]) return;
      e.preventDefault();
      applyPosition(
        e.touches[0].clientX - dragOffsetX,
        e.touches[0].clientY - dragOffsetY
      );
    };

    const endTouchDrag = () => {
      if (!dragActive) return;
      dragActive = false;
      statusBar.style.cursor = 'grab';
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', endTouchDrag);
      document.removeEventListener('touchcancel', endTouchDrag);
    };

    statusBar.addEventListener('touchstart', (e) => {
      if (!e.touches?.[0]) return;
      const rect = phoneFrame.getBoundingClientRect();
      dragOffsetX = e.touches[0].clientX - rect.left;
      dragOffsetY = e.touches[0].clientY - rect.top;
      dragActive = true;
      statusBar.style.cursor = 'grabbing';
      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', endTouchDrag);
      document.addEventListener('touchcancel', endTouchDrag);
    }, { passive: true });

    // Window resize
    const onWindowResize = () => {
      const rect = phoneFrame.getBoundingClientRect();
      applyPosition(rect.left, rect.top);
    };
    window.addEventListener('resize', onWindowResize);
    internals.phoneResizeHandler = onWindowResize;

    // Initial position
    setTimeout(() => {
      const margin = 12;
      const x = Math.max(margin, window.innerWidth - (phoneFrame.offsetWidth || 320) - margin);
      const y = Math.max(margin, window.innerHeight - (phoneFrame.offsetHeight || 560) - margin);
      applyPosition(x, y);
    }, 0);

    // Clock
    const clockEl = document.getElementById('geohelper-clock');
    if (clockEl) {
      const updateClock = () => {
        const now = new Date();
        clockEl.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      };
      updateClock();
      internals.phoneClockInterval = setInterval(updateClock, APP_CONFIG.TIMING.CLOCK_UPDATE_INTERVAL);
    }
  }

  // ============================================
  // STATUS INDICATORS
  // Update teks status dan LED indicator pada UI
  // ============================================

  /**
   * Update status text pada UI
   */
  function updateStatusText(text, color) {
    const el = document.getElementById('geohelper-status-text');
    const badge = document.getElementById('geohelper-status-badge');

    if (el) {
      el.textContent = text;
      el.style.color = color;
    }

    if (badge) {
      badge.textContent = text.includes('Ready') ? '✓ Ready' :
        text.includes('Refresh') ? '🔄 ' + text : text;
      badge.style.background = color;
    }
  }

  /**
   * Update LED indicator
   */
  function updateLedIndicator(status) {
    const led = document.getElementById('geohelper-led-indicator');
    if (!led) return;

    const colors = {
      ready: { bg: '#4ade80', shadow: '#4ade80' },
      refreshing: { bg: '#fbbf24', shadow: '#fbbf24' },
      error: { bg: '#ef4444', shadow: '#ef4444' },
      reset: { bg: '#ef4444', shadow: '#ef4444' },
      waiting: { bg: '#9ca3af', shadow: '#9ca3af' }
    };

    const c = colors[status] || colors.ready;
    led.style.background = c.bg;
    led.style.boxShadow = `0 0 6px ${c.shadow}`;
  }

  // ============================================
  // MARKER PLACEMENT & GAME MAP PIN ENGINE
  // Menempatkan marker pada peta game
  // ============================================


  /**
   * Apply safe mode jitter ke koordinat
   */
  function applySafeMode(coords) {
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
  function resolveGoogleMapFromFiber(domNode, maxDepth = 8) {
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
  function buildSyntheticMapEvent(lat, lng) {
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
  function dispatchToClickListeners(mapInst, syntheticEvent) {
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
  function locateGuessMapNode() {
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
  function pinGuessToGameMap(lat, lng) {
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
  function jitterCoordinates(lat, lng) {
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
  function placeGuessOnMap(withJitter = false) {
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
  function toggleMarker(forceCoords = null) {
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
  function autoPlaceMarker() {
    // Placeholder untuk auto-place logic
    return;
  }

  /**
   * Find map instance dari DOM
   */
  function findMapInstance() {
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

  // ============================================
  // ROUND HISTORY MANAGEMENT
  // Menyimpan dan mengelola riwayat lokasi per round
  // ============================================


  /**
   * Format address object ke string
   */
  function formatAddress(addr) {
    if (!addr?.address) return null;
    const a = addr.address;
    const parts = [
      a.road || a.street,
      a.city || a.town || a.village,
      a.state || a.province,
      a.country
    ].filter(Boolean);
    return parts.join(', ') || a.country || 'Unknown';
  }

  /**
   * Build history address label
   */
  function buildHistoryAddressLabel(addressObj) {
    return formatAddress(addressObj) || 'Unknown location';
  }

  /**
   * Tambah entry ke round history
   */
  function addRoundHistoryEntry(coords, addressObj = null) {
    if (!coords || !Validators.isValidCoord(coords.lat, coords.lng)) return;

    const lastEntry = state.roundHistory[0] || null;
    if (lastEntry) {
      const veryClose = Math.abs(lastEntry.lat - coords.lat) < 0.00001 &&
        Math.abs(lastEntry.lng - coords.lng) < 0.00001;
      if (veryClose) return;
    }

    const nextRoundNumber = (state.roundHistory[0]?.round || 0) + 1;
    const entry = {
      round: nextRoundNumber,
      lat: coords.lat,
      lng: coords.lng,
      address: buildHistoryAddressLabel(addressObj),
      timestamp: Date.now()
    };

    state.roundHistory.unshift(entry);
    if (state.roundHistory.length > APP_CONFIG.LIMITS.HISTORY_MAX_ITEMS) {
      state.roundHistory.length = APP_CONFIG.LIMITS.HISTORY_MAX_ITEMS;
    }
  }

  /**
   * Normalize imported history
   */
  function normalizeImportedHistory(rawRounds) {
    if (!Array.isArray(rawRounds)) return [];

    const cleaned = rawRounds
      .map((item, idx) => {
        const lat = Number(item?.lat);
        const lng = Number(item?.lng);
        if (!Validators.isValidCoord(lat, lng)) return null;

        const tsRaw = item?.timestamp;
        const ts = Number.isFinite(Number(tsRaw))
          ? Number(tsRaw)
          : Date.now() - ((rawRounds.length - idx) * 1000);

        return {
          round: Number.isFinite(Number(item?.round)) ? Number(item.round) : idx + 1,
          lat,
          lng,
          address: String(item?.address || 'Unknown location'),
          timestamp: ts
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, APP_CONFIG.LIMITS.HISTORY_MAX_ITEMS);

    return normalizeRoundSequence(cleaned);
  }

  /**
   * Normalize round sequence
   */
  function normalizeRoundSequence(history) {
    return history.map((entry, idx, arr) => ({
      ...entry,
      round: arr.length - idx
    }));
  }

  /**
   * Merge round history
   */
  function mergeRoundHistory(existing, imported) {
    const combined = [...existing, ...imported].sort((a, b) => b.timestamp - a.timestamp);

    const seen = new Set();
    const deduped = [];
    for (const entry of combined) {
      const key = `${entry.lat.toFixed(6)}|${entry.lng.toFixed(6)}|${Math.floor(entry.timestamp / 1000)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(entry);
      if (deduped.length >= APP_CONFIG.LIMITS.HISTORY_MAX_ITEMS) break;
    }
    return normalizeRoundSequence(deduped);
  }

  /**
   * Refresh history view pada UI
   */
  function refreshHistoryView() {
    const historyList = document.getElementById('geohelper-history-list');
    const historyCount = document.getElementById('geohelper-history-count');

    if (!historyList) return;

    const count = state.roundHistory?.length || 0;
    if (historyCount) {
      historyCount.textContent = `${count} round${count !== 1 ? 's' : ''}`;
    }

    if (count === 0) {
      historyList.innerHTML = `
      <div style="text-align:center;padding:40px 20px;">
        <div style="font-size:48px;margin-bottom:16px;opacity:0.5;">📭</div>
        <div style="color:#6b7280;font-size:14px;font-weight:500;margin-bottom:8px;">No History Yet</div>
        <div style="color:#9ca3af;font-size:12px;">Play a round to start tracking your locations</div>
      </div>
    `;
      return;
    }

    let html = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
      <button data-history-action="copy-latest" style="flex:1;min-width:80px;padding:10px;border:1px solid #d1d5db;background:#fff;border-radius:10px;cursor:pointer;font-size:12px;font-weight:600;">📋 Copy Latest</button>
      <button data-history-action="copy-all" style="flex:1;min-width:80px;padding:10px;border:1px solid #d1d5db;background:#fff;border-radius:10px;cursor:pointer;font-size:12px;font-weight:600;">📄 Copy All</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
      <button data-history-action="export-json" style="flex:1;padding:10px;border:1px solid #d1d5db;background:#fff;border-radius:10px;cursor:pointer;font-size:12px;font-weight:600;">💾 JSON</button>
      <button data-history-action="export-csv" style="flex:1;padding:10px;border:1px solid #d1d5db;background:#fff;border-radius:10px;cursor:pointer;font-size:12px;font-weight:600;">📊 CSV</button>
      <button data-history-action="import-json" style="flex:1;padding:10px;border:1px solid #d1d5db;background:#fff;border-radius:10px;cursor:pointer;font-size:12px;font-weight:600;">📥 Import</button>
      <button data-history-action="undo-import" style="flex:1;padding:10px;border:1px solid #d1d5db;background:${state.lastImportBackup ? '#fff' : '#f3f4f6'};color:${state.lastImportBackup ? '#111827' : '#9ca3af'};border-radius:10px;cursor:${state.lastImportBackup ? 'pointer' : 'not-allowed'};font-size:12px;font-weight:600;">↩️ Undo</button>
    </div>
  `;

    html += '<div style="display:flex;flex-direction:column;gap:10px;">';

    state.roundHistory.forEach((entry) => {
      const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const date = new Date(entry.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });

      html += `
      <div style="background:#fff;border-radius:14px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="background:linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);color:#fff;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;">R${entry.round}</span>
            <span style="font-size:11px;color:#9ca3af;">${date} ${time}</span>
          </div>
          <button data-copy-entry="${entry.round}" style="background:#f3f4f6;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:11px;">📋</button>
        </div>
        <div style="font-size:13px;color:#374151;line-height:1.4;margin-bottom:6px;font-weight:500;">${Security.escapeHtml(entry.address)}</div>
        <div style="font-family:monospace;font-size:12px;color:#6b7280;background:#f9fafb;padding:6px 10px;border-radius:8px;">${entry.lat.toFixed(6)}, ${entry.lng.toFixed(6)}</div>
      </div>
    `;
    });

    html += '</div>';

    historyList.innerHTML = html;

    // Bind actions
    bindRoundHistoryActions(historyList);

    // Bind individual copy buttons
    historyList.querySelectorAll('[data-copy-entry]').forEach(btn => {
      btn.onclick = () => {
        const roundNum = parseInt(btn.dataset.copyEntry);
        const entry = state.roundHistory.find(e => e.round === roundNum);
        if (entry) {
          navigator.clipboard.writeText(`${entry.lat.toFixed(6)}, ${entry.lng.toFixed(6)}`).then(() => {
            btn.textContent = '✓';
            setTimeout(() => { btn.textContent = '📋'; }, 1000);
          });
        }
      };
    });
  }

  /**
   * Bind round history action buttons
   */
  function bindRoundHistoryActions(container) {
    if (!container) return;

    const actions = {
      'copy-latest': () => {
        const latest = state.roundHistory[0];
        if (!latest) return;
        const text = `Round ${latest.round}: ${latest.lat.toFixed(6)}, ${latest.lng.toFixed(6)} | ${latest.address}`;
        navigator.clipboard.writeText(text).then(() => {
          const btn = container.querySelector('[data-history-action="copy-latest"]');
          if (btn) {
            btn.textContent = 'Copied';
            setTimeout(() => { btn.textContent = 'Copy Latest'; }, 900);
          }
        }).catch(() => Logger.debug('History copy latest failed'));
      },

      'copy-all': () => {
        if (!state.roundHistory.length) return;
        const text = state.roundHistory.map((e) =>
          `Round ${e.round}: ${e.lat.toFixed(6)}, ${e.lng.toFixed(6)} | ${e.address}`
        ).join('\n');
        navigator.clipboard.writeText(text).then(() => {
          const btn = container.querySelector('[data-history-action="copy-all"]');
          if (btn) {
            btn.textContent = 'Copied';
            setTimeout(() => { btn.textContent = 'Copy All'; }, 900);
          }
        }).catch(() => Logger.debug('History copy all failed'));
      },

      'export-json': () => exportRoundHistory('json'),
      'export-csv': () => exportRoundHistory('csv'),

      'import-json': () => {
        const merge = window.confirm('Import mode:\nOK = Merge with existing history\nCancel = Replace existing history');
        pickAndImportHistoryFile(merge ? 'merge' : 'replace');
      },

      'undo-import': () => {
        if (!state.lastImportBackup) return;
        state.roundHistory = state.lastImportBackup.map((e) => ({ ...e }));
        state.lastImportBackup = null;
        Logger.info('History undo applied');
      }
    };

    for (const [action, handler] of Object.entries(actions)) {
      const btn = container.querySelector(`[data-history-action="${action}"]`);
      if (btn) btn.onclick = handler;
    }
  }

  /**
   * Export round history
   */
  function exportRoundHistory(format = 'json') {
    if (!state.roundHistory.length) return;
    const dateKey = new Date().toISOString().replace(/[:.]/g, '-');

    if (format === 'csv') {
      const header = 'round,timestamp_iso,lat,lng,address';
      const rows = state.roundHistory.map((e) => {
        const address = `"${String(e.address || '').replace(/"/g, '""')}"`;
        return `${e.round},${new Date(e.timestamp).toISOString()},${e.lat.toFixed(6)},${e.lng.toFixed(6)},${address}`;
      });
      downloadTextFile(`bintang-history-${dateKey}.csv`, [header, ...rows].join('\n'), 'text/csv;charset=utf-8');
      return;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      platform: state.platform,
      total: state.roundHistory.length,
      rounds: state.roundHistory
    };
    downloadTextFile(`bintang-history-${dateKey}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  }

  /**
   * Import round history dari JSON text
   */
  function importRoundHistoryFromJsonText(text, mode = 'replace') {
    try {
      const parsed = JSON.parse(text);
      const rounds = Array.isArray(parsed) ? parsed : parsed?.rounds;
      const normalized = normalizeImportedHistory(rounds);

      if (!normalized.length) {
        alert('Import failed: no valid round entries in file.');
        return;
      }

      state.lastImportBackup = state.roundHistory.map((e) => ({ ...e }));

      if (mode === 'merge') {
        state.roundHistory = mergeRoundHistory(state.roundHistory, normalized);
      } else {
        state.roundHistory = normalizeRoundSequence(normalized.slice(0, APP_CONFIG.LIMITS.HISTORY_MAX_ITEMS));
      }

      Logger.info('History imported:', normalized.length, 'entries', '| mode:', mode);
    } catch (e) {
      alert('Import failed: invalid JSON file.');
      Logger.error('Import JSON error:', e.message);
    }
  }

  /**
   * Pick and import history file
   */
  function pickAndImportHistoryFile(mode = 'replace') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        importRoundHistoryFromJsonText(text, mode);
      } catch (e) {
        alert('Import failed: unable to read file.');
      }
    };
    document.body.appendChild(input);
    input.click();
    setTimeout(() => input.remove(), 0);
  }

  /**
   * Download text file
   */
  function downloadTextFile(filename, content, mime = 'text/plain;charset=utf-8') {
    try {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      Logger.error('Download failed:', e.message);
    }
  }

  // ============================================
  // DISCORD INTEGRATION
  // Kirim lokasi ke Discord webhook
  // ============================================


  /**
   * Kirim lokasi ke Discord webhook
   */
  async function sendToDiscord() {
    if (!guardProtectedUsage('Discord Send')) return;

    if (internals.discordInFlight) {
      Logger.debug('Discord send skipped: request in flight');
      return;
    }

    if (!Throttle.canRun('discord_send', COOLDOWNS.DISCORD_SEND)) {
      Logger.debug('Discord send throttled');
      return;
    }

    const webhook = safeGM_getValue(APP_CONFIG.STORAGE_KEYS.DISCORD_WEBHOOK, '');
    if (!webhook) {
      alert('Please set Discord webhook URL in the Discord view first.');
      return;
    }

    if (!Security.isValidDiscordWebhook(webhook)) {
      alert('Invalid Discord webhook URL. Please check your settings.');
      Logger.warn('Invalid webhook URL detected');
      return;
    }

    const coords = extractCoordinates();
    if (!coords || !Validators.isValidCoord(coords.lat, coords.lng)) {
      alert('No valid coordinates');
      return;
    }

    const safeAddress = Security.escapeHtml(formatAddress(state.address) || 'Unknown location');
    const safeLat = Security.encodeParam(coords.lat.toFixed(6));
    const safeLng = Security.encodeParam(coords.lng.toFixed(6));

    const embed = {
      title: '📍 Location Tracked',
      description: `**${safeAddress}**\n\n[🗺️ Google Maps](https://www.google.com/maps?q=${safeLat},${safeLng})`,
      color: 516235,
      fields: [
        { name: 'Coordinates', value: `\`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}\``, inline: true },
        { name: 'Platform', value: state.platform, inline: true }
      ],
      footer: { text: `${APP_CONFIG.NAME} v${APP_CONFIG.VERSION}` },
      timestamp: new Date().toISOString()
    };

    internals.discordInFlight = true;

    try {
      if (typeof GM_xmlhttpRequest !== 'undefined') {
        await new Promise((resolve, reject) => {
          GM_xmlhttpRequest({
            method: 'POST',
            url: webhook,
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({ embeds: [embed] }),
            timeout: 10000,
            onload: (res) => {
              if (res.status >= 200 && res.status < 300) {
                resolve();
              } else {
                reject(new Error(`Discord HTTP ${res.status}`));
              }
            },
            onerror: (err) => reject(err),
            ontimeout: () => reject(new Error('Discord request timeout'))
          });
        });
      } else {
        const res = await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ embeds: [embed] })
        });
        if (!res.ok) throw new Error(`Discord HTTP ${res.status}`);
      }
      Logger.info('Discord message sent');
    } catch (e) {
      Logger.error('Discord error:', e);
      alert('Failed to send to Discord');
    } finally {
      internals.discordInFlight = false;
    }
  }

  // ============================================
  // KEYBOARD HANDLER
  // Menangani semua hotkey
  // ============================================


  /**
   * Handle keydown events
   */
  function handleKeydown$1(e) {
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
      togglePanel$1();
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

  // ============================================
  // ADDRESS LOOKUP (Nominatim API)
  // Reverse geocoding untuk mendapatkan alamat dari koordinat
  // ============================================


  const ADDRESS_MAX_BACKOFF = 30000;

  /**
   * Lookup address dari koordinat
   */
  async function lookupAddress(lat, lng) {
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

  // ============================================
  // MONITORING LOOP
  // Loop utama yang memantau dan mengekstrak koordinat
  // ============================================


  /**
   * Start monitoring loop
   */
  function startMonitoring$1() {
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
        const coords = extractCoordinatesLegacyImpl$1();

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
            startMonitoring$1();
          }, 3000);
          return;
        }
      } finally {
        internals.monitoringBusy = false;
        internals.monitoringBusySince = 0;
      }
    }, TIMING.MONITORING_INTERVAL);
  }

  // ============================================
  // MAIN ENTRY POINT
  // Inisialisasi dan cleanup aplikasi
  // ============================================


  /**
   * Install debug bridge ke window
   */
  function installDebugBridge() {
    const pw = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;

    const debugBridge = {
      version: APP_CONFIG.VERSION,
      _stage: 'initialized',
      getFlags() { return { ...(state.runtime?.flags || {}) }; },
      getTelemetry() { return telemetrySnapshot(); },
      getExtractorHealth() {
        return ExtractorRegistry.getHealthSnapshot();
      },
      getPatchStatus() { return PatchManager.status(); },
      getProtectionState() { return { ...(state.runtime?.protection || {}) }; },
      runIntegrityCheck(r) {
        IntegrityManager.runCheck(r || 'manual_debug', true);
        return true;
      },
      getIntegrityDiagnostics() {
        return {
          managerExists: typeof IntegrityManager === 'object',
          started: IntegrityManager?.started,
          checking: IntegrityManager?.checking,
          degraded: !!state.runtime?.degraded,
          degradedReason: state.runtime?.degradedReason || null,
          currentVersion: APP_CONFIG.VERSION,
          initCompleted: internals.isInitialized
        };
      },
      getRuntimeSummary() {
        return {
          platform: state.platform,
          initCompleted: internals.isInitialized,
          infoVisible: !!state.infoVisible,
          miniMapVisible: !!state.miniMapVisible,
          coordsValid: !!(state.coords?.lat && state.coords?.lng),
          hasAddress: !!state.address,
          markerPlacedThisRound: !!state.markerPlacedThisRound,
          degraded: !!state.runtime?.degraded,
          phoneView: state.phoneView || 'map',
          timestamp: Date.now()
        };
      }
    };

    window.__btpDebug = debugBridge;
    pw.__btpDebug = debugBridge;

    console.log('[BintangTobaPro] __btpDebug bridge installed');
  }

  /**
   * Uninstall debug bridge
   */
  function uninstallDebugBridge() {
    try { delete window.__btpDebug; } catch (e) { window.__btpDebug = null; }
    try {
      const pw = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
      delete pw.__btpDebug;
    } catch (e) { /* silent */ }
  }

  /**
   * Initialize application
   */
  function init() {
    if (internals.isInitialized || window[INIT_GUARD_KEY]) {
      Logger.debug('Init skipped: already initialized');
      return;
    }

    internals.isInitialized = true;
    internals.isCleaningUp = false;
    window[INIT_GUARD_KEY] = true;
    window[CLEANUP_GUARD_KEY] = false;

    // Reset state
    internals.oneUiViewsStyled = false;
    internals.panelUiBootstrapped = false;
    internals.monitoringBusySince = 0;
    state._uiRefs = null;

    Logger.initDebugFlag();

    state.platform = detectPlatform();

    Logger.info('========================================');
    Logger.info(`${APP_CONFIG.NAME} v${APP_CONFIG.VERSION}`);
    Logger.info('Platform:', state.platform);
    Logger.info('========================================');

    // Load settings
    applySettingsToState(state, readStoredSettings());
    Logger.debug('Settings loaded');

    // Install XHR interceptor
    if (state.runtime?.flags?.USE_PATCH_MANAGER) {
      PatchManager.installXHRPatch();
    } else {
      installXHRInterceptor();
    }

    // Debug bridge
    installDebugBridge();

    // Integrity protection
    IntegrityManager.start();

    // Keyboard handler
    document.addEventListener('keydown', handleKeydown$1, true);
    Logger.debug('Keyboard listener attached');

    // Start monitoring
    startMonitoring$1();
    Logger.debug('Coordinate monitoring started');

    // Find map instance after delay
    setTimeout(() => {
      Logger.debug('Attempting to find map instance...');
      findMapInstance();
    }, 2000);

    // SPA navigation detection
    let lastUrl = window.location.href;
    const spaCheckInterval = setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        Logger.debug('SPA navigation detected:', currentUrl);

        // Reinstall XHR interceptor after navigation
        if (!isXHRInterceptorInstalled()) {
          Logger.warn('XHR interceptor lost after navigation - reinstalling');
          installXHRInterceptor();
        }

        // Reset state
        extractionCache.invalidate();
        state.gameMap = null;

        setTimeout(() => {
          findMapInstance();
        }, 2000);
      }
    }, 1000);

    if (!window.__btp_spa_interval) {
      window.__btp_spa_interval = spaCheckInterval;
    }

    // Add pulse animation style
    const style = document.createElement('style');
    style.textContent = '@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}';
    document.head.appendChild(style);

    Logger.info('Initialization complete!');
    Logger.info(`Press ${state.hotkeys.panel} to show panel`);
  }

  /**
   * Cleanup application
   */
  function cleanup() {
    if (internals.isCleaningUp || window[CLEANUP_GUARD_KEY]) return;

    internals.isCleaningUp = true;
    window[CLEANUP_GUARD_KEY] = true;
    Logger.debug('Cleaning up...');

    // Clear intervals
    if (internals.monitoringInterval) {
      clearInterval(internals.monitoringInterval);
      internals.monitoringInterval = null;
    }

    if (internals.phoneClockInterval) {
      clearInterval(internals.phoneClockInterval);
      internals.phoneClockInterval = null;
    }

    if (window.__btp_spa_interval) {
      clearInterval(window.__btp_spa_interval);
      window.__btp_spa_interval = null;
    }

    // Uninstall XHR patch
    if (state.runtime?.flags?.USE_PATCH_MANAGER) {
      PatchManager.uninstallXHRPatch();
    } else {
      uninstallXHRInterceptor();
    }

    // Remove keyboard listener
    document.removeEventListener('keydown', handleKeydown$1, true);

    // Remove resize handler
    if (internals.phoneResizeHandler) {
      window.removeEventListener('resize', internals.phoneResizeHandler);
      internals.phoneResizeHandler = null;
    }

    // Remove marker
    if (state.marker) {
      try {
        if (typeof google !== 'undefined' && google.maps && state.marker.setMap) {
          state.marker.setMap(null);
        } else if (typeof L !== 'undefined' && state.gameMap && state.marker) {
          state.gameMap.removeLayer(state.marker);
        }
      } catch (e) { /* silent */ }
      state.marker = null;
    }

    // Remove mini map
    if (state.miniMapMarker && state.miniMap) {
      try { state.miniMap.removeLayer(state.miniMapMarker); } catch (e) { /* silent */ }
      state.miniMapMarker = null;
    }

    if (state.miniMap) {
      try {
        state.miniMap.off();
        state.miniMap.remove();
      } catch (e) { /* silent */ }
      state.miniMap = null;
      state.miniMapTileLayer = null;
    }

    // Remove UI
    document.getElementById('geohelper-phone-frame')?.remove();
    state.panel?.remove();
    state.panel = null;

    // Stop integrity manager
    IntegrityManager.stop();

    // Uninstall debug bridge
    uninstallDebugBridge();

    // Reset all
    Throttle.resetAll();
    RequestTokens.resetAll();
    internals.lastKeydownTime = 0;
    internals.discordInFlight = false;
    internals.monitoringBusy = false;
    internals.monitoringBusySince = 0;
    internals.oneUiViewsStyled = false;
    internals.panelUiBootstrapped = false;
    internals.refreshRequestId++;
    state.roundHistory = [];
    state.lastImportBackup = null;
    state.swapPhoneView = null;
    state.phoneView = 'map';
    state._uiRefs = null;

    internals.isInitialized = false;
    internals.isCleaningUp = false;
    window[INIT_GUARD_KEY] = false;

    Logger.debug('Cleanup complete');
  }

  // --- Entry Point ---

  (function () {
    'use strict';

    // Install early debug bridge
    try {
      window.__btpDebug = { version: APP_CONFIG.VERSION, _stage: 'early' };
      console.log('[BintangTobaPro] Early bridge installed');
    } catch (e) {
      console.error('[BintangTobaPro] Early bridge failed:', e);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);
  })();

  /* End of GeoGuessr Assistant */


})();
