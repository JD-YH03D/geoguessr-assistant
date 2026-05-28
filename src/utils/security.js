// ============================================
// SECURITY UTILITIES
// ============================================

export const Security = {
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
