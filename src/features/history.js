// ============================================
// ROUND HISTORY MANAGEMENT
// Menyimpan dan mengelola riwayat lokasi per round
// ============================================

import { APP_CONFIG } from '../config/constants.js';
import { state } from '../core/state.js';
import { Security } from '../utils/security.js';
import { Logger } from '../utils/logger.js';
import { Validators } from '../utils/validators.js';
import { Throttle } from '../utils/throttle.js';
import { COOLDOWNS } from '../config/constants.js';

/**
 * Format address object ke string
 */
export function formatAddress(addr) {
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
export function buildHistoryAddressLabel(addressObj) {
  return formatAddress(addressObj) || 'Unknown location';
}

/**
 * Tambah entry ke round history
 */
export function addRoundHistoryEntry(coords, addressObj = null) {
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
export function normalizeImportedHistory(rawRounds) {
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
export function normalizeRoundSequence(history) {
  return history.map((entry, idx, arr) => ({
    ...entry,
    round: arr.length - idx
  }));
}

/**
 * Merge round history
 */
export function mergeRoundHistory(existing, imported) {
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
export function refreshHistoryView() {
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
export function exportRoundHistory(format = 'json') {
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
export function importRoundHistoryFromJsonText(text, mode = 'replace') {
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
