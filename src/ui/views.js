// ============================================
// UI VIEWS
// HTML generator untuk semua halaman dalam phone UI
// ============================================

import { APP_CONFIG } from '../config/constants.js';
import { DEFAULT_HOTKEYS, PRESETS, UI_SCALES } from '../config/defaults.js';
import { MAP_LAYERS, HOTKEY_DESCRIPTIONS } from '../config/maps.js';
import { state, internals } from '../core/state.js';
import { Security } from '../utils/security.js';
import { safeGM_getValue } from '../utils/storage.js';
import { getHotkeys } from './navigation.js';

/**
 * Generate Settings View HTML
 */
export function createSettingsView() {
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
export function createHotkeysView() {
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
export function createDiscordView() {
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
export function createCopyView() {
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
export function createMapsView() {
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
export function createHistoryView() {
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
