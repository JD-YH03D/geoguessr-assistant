// ============================================
// REQUEST TOKEN SYSTEM
// Mencegah race condition pada async operations
// ============================================

export const RequestTokens = {
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
