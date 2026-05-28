// ============================================
// GLOBAL STATE MANAGEMENT
// Semua state runtime berada di sini
// ============================================

import { APP_CONFIG } from '../config/constants.js';
import { DEFAULT_HOTKEYS, DEFAULT_FEATURES, DEFAULT_SETTINGS } from '../config/defaults.js';

// State utama aplikasi
export const state = {
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
export const internals = {
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
