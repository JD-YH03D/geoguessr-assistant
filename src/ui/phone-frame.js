// ============================================
// PHONE FRAME UI
// Komponen utama: membuat dan mengelola phone-like panel
// ============================================

import { APP_CONFIG } from '../config/constants.js';
import { state, internals } from '../core/state.js';
import { Security } from '../utils/security.js';
import { Logger } from '../utils/logger.js';
import { initMiniMap, updateMiniMap } from '../features/minimap.js';
import {
  createSettingsView,
  createHotkeysView,
  createDiscordView,
  createCopyView,
  createMapsView,
  createHistoryView
} from './views.js';
import { isPhoneAppView, getPhoneViewOffset } from './navigation.js';

/**
 * Cache original inline styles sebelum theme di-apply
 */
export function cacheOriginalInlineStyles(root) {
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
export function applyOneUiAppViews(root, force = false) {
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
export function getUiRefs() {
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
export function togglePanel() {
  state.infoVisible = !state.infoVisible;
  updateInfoDisplay();
}

/**
 * Open home/map view quickly
 */
export function openHomeQuick() {
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

export function updateInfoDisplay() {
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
export function applyPhoneLikeButtonTheme(root) {
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
export function setupActionButtons() {
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
export function createPhoneFrame() {
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
