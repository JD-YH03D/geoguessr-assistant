// ============================================
// THROTTLE / COOLDOWN SYSTEM
// Mencegah spam pada tombol dan hotkey
// ============================================

const actionCooldowns = Object.create(null);

export const Throttle = {
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
