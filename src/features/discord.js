// ============================================
// DISCORD INTEGRATION
// Kirim lokasi ke Discord webhook
// ============================================

import { APP_CONFIG } from '../config/constants.js';
import { state, internals } from '../core/state.js';
import { Logger } from '../utils/logger.js';
import { Security } from '../utils/security.js';
import { Validators } from '../utils/validators.js';
import { safeGM_getValue } from '../utils/storage.js';
import { Throttle } from '../utils/throttle.js';
import { COOLDOWNS } from '../config/constants.js';
import { guardProtectedUsage } from '../protection/integrity-manager.js';
import { extractCoordinates } from '../extraction/coordinate-extractor.js';
import { formatAddress } from './history.js';

/**
 * Kirim lokasi ke Discord webhook
 */
export async function sendToDiscord() {
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
