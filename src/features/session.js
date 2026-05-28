// ============================================
// SESSION BACKUP & RESTORE
// Backup dan restore seluruh session termasuk settings dan history
// ============================================

import { APP_CONFIG } from '../config/constants.js';
import { state } from '../core/state.js';
import { Logger } from '../utils/logger.js';
import { safeGM_getValue, persistSettingsSnapshot, applySettingsToState } from '../utils/storage.js';
import { normalizeImportedHistory, normalizeRoundSequence } from './history.js';
import { syncPanelSettingsUiFromState, applyMiniMapLayer } from '../ui/theming.js';

/**
 * Build snapshot session lengkap
 */
export function buildSessionSnapshot() {
  return {
    exportedAt: new Date().toISOString(),
    app: APP_CONFIG.NAME,
    version: APP_CONFIG.VERSION,
    platform: state.platform,
    settings: {
      hotkeys: { ...(state.hotkeys || {}) },
      features: { ...(state.features || {}) },
      preset: state.currentPreset,
      mapLayer: state.currentMapLayer,
      themeMode: state.themeMode,
      uiScale: state.uiScale,
      discordWebhook: safeGM_getValue(APP_CONFIG.STORAGE_KEYS.DISCORD_WEBHOOK, '')
    },
    history: Array.isArray(state.roundHistory) ? state.roundHistory.map((e) => ({ ...e })) : []
  };
}

/**
 * Export full session backup
 */
export function exportFullSessionBackup() {
  const snapshot = buildSessionSnapshot();
  const dateKey = new Date().toISOString().replace(/[:.]/g, '-');
  downloadTextFile(
    `bintang-session-backup-${dateKey}.json`,
    JSON.stringify(snapshot, null, 2),
    'application/json;charset=utf-8'
  );
}

/**
 * Import session backup dari JSON text
 */
export function importSessionBackupFromJsonText(text) {
  try {
    const parsed = JSON.parse(text);
    const settings = parsed?.settings || {};

    const importOverrides = {};
    if (settings.hotkeys && typeof settings.hotkeys === 'object') importOverrides.hotkeys = settings.hotkeys;
    if (settings.features && typeof settings.features === 'object') importOverrides.features = settings.features;
    if (settings.preset) importOverrides.preset = settings.preset;
    if (settings.mapLayer) importOverrides.mapLayer = settings.mapLayer;
    if (settings.uiScale) importOverrides.uiScale = settings.uiScale;
    if (typeof settings.discordWebhook === 'string') importOverrides.discordWebhook = settings.discordWebhook.trim();

    const importedSettings = getCurrentSettingsSnapshot(importOverrides);

    persistSettingsSnapshot(state, importedSettings);
    applySettingsToState(state, importedSettings);

    applyMiniMapLayer(state.currentMapLayer, false);

    const importedHistory = normalizeImportedHistory(parsed?.history || parsed?.rounds || []);
    if (importedHistory.length) {
      state.lastImportBackup = state.roundHistory.map((e) => ({ ...e }));
      state.roundHistory = normalizeRoundSequence(importedHistory);
    }

    syncPanelSettingsUiFromState();
    Logger.info('Session backup imported successfully');
  } catch (e) {
    alert('Session import failed: invalid backup file.');
    Logger.error('Session import error:', e.message);
  }
}

/**
 * Pick and import session backup file
 */
export function pickAndImportSessionBackupFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.style.display = 'none';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      importSessionBackupFromJsonText(text);
    } catch (e) {
      alert('Session import failed: unable to read file.');
    }
  };
  document.body.appendChild(input);
  input.click();
  setTimeout(() => input.remove(), 0);
}

/**
 * Get current settings snapshot
 */
function getCurrentSettingsSnapshot(overrides = null) {
  const base = {
    hotkeys: { ...(state.hotkeys || {}) },
    features: { ...(state.features || {}) },
    preset: state.currentPreset || 'exact',
    mapLayer: state.currentMapLayer || 'default',
    themeMode: 'dark',
    uiScale: state.uiScale || 'normal',
    discordWebhook: String(safeGM_getValue(APP_CONFIG.STORAGE_KEYS.DISCORD_WEBHOOK, '') || '').trim()
  };
  return { ...base, ...(overrides || {}) };
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
