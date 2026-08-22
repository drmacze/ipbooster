(() => {
  'use strict';

  const KEYS = {
    games: 'ipbooster.games.v1',
    smart: 'ipbooster.smartplay.v3',
    bridge: 'ipbooster.bridge.v1',
    pendingSession: 'ipbooster.pending-session.v2'
  };

  const DEFAULTS = {
    universalShortcut: 'iPBooster Play',
    universalReady: false,
    targets: {}
  };

  const state = {
    config: load(KEYS.smart, DEFAULTS),
    activeGameId: null,
    syncing: false
  };

  function load(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function enc(value = '') {
    return encodeURIComponent(String(value)).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'\"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;'
    }[char]));
  }

  function games() {
    const value = load(KEYS.games, []);
    return Array.isArray(value) ? value : [];
  }

  function gameById(id) {
    return games().find(game => String(game.id) === String(id));
  }

  function targetFor(game) {
    const override = state.config.targets?.[game.id]?.appName?.trim();
    return override || game.bundleId || game.name || '';
  }

  function directUrlFor(game) {
    return state.config.targets?.[game.id]?.deepLink?.trim() || '';
  }

  function showToast(message, ms = 3200) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), ms);
  }

  function beginPendingSession(game) {
    save(KEYS.pendingSession, {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      gameId: game.id,
      gameName: game.name,
      artworkUrl: game.artworkUrl || '',
      appStoreId: game.appStoreId || '',
      profile: game.profile || 'balanced',
      startedAt: Date.now()
    });
  }

  // Important: Apple documents URL-encoded spaces as %20. URLSearchParams uses
  // application/x-www-form-urlencoded and serializes spaces as '+', which the
  // Shortcuts URL scheme can interpret literally in the shortcut name.
  function buildRunShortcutUrl(name, text) {
    return `shortcuts://run-shortcut?name=${enc(name)}&input=text&text=${enc(text)}`;
  }

  function buildOpenShortcutUrl(name) {
    return `shortcuts://open-shortcut?name=${enc(name)}`;
  }

  function buildStatusShortcutUrl(name) {
    const callback = new URL(location.href);
    callback.searchParams.set('bridge_callback', 'device-status');
    callback.searchParams.delete('result');
    callback.searchParams.delete('bridge_error');
    callback.searchParams.delete('errorMessage');
    const fail = new URL(callback);
    fail.searchParams.set('bridge_error', '1');
    const payload = JSON.stringify({
      source: 'iPBooster',
      version: 2.5,
      action: 'device-status',
      requestedAt: new Date().toISOString()
    });
    return `shortcuts://x-callback-url/run-shortcut?name=${enc(name)}&input=text&text=${enc(payload)}&x-success=${enc(callback.href)}&x-error=${enc(fail.href)}&x-cancel=${enc(fail.href)}`;
  }

  function universalLaunchUrl(game) {
    const name = state.config.universalShortcut?.trim() || DEFAULTS.universalShortcut;
    return buildRunShortcutUrl(name, targetFor(game));
  }

  function detectDevice() {
    const ua = navigator.userAgent || '';
    const touchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    const isIPad = /iPad/.test(ua) || touchMac;
    const isIPhone = /iPhone/.test(ua);
    const isIOS = isIPhone || isIPad || /iPod/.test(ua);
    const osMatch = ua.match(/OS (\d+)[_.](\d+)?/i);
    const safariMatch = ua.match(/Version\/(\d+)(?:\.(\d+))?/i);
    const major = Number(osMatch?.[1] || (isIOS ? safariMatch?.[1] : 0) || 0);
    const minor = Number(osMatch?.[2] || 0);
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    let webgl2 = false;
    try {
      webgl2 = Boolean(document.createElement('canvas').getContext('webgl2'));
    } catch {}
    return {
      platform: isIPad ? 'iPad' : isIPhone ? 'iPhone' : isIOS ? 'iOS device' : 'Browser preview',
      ios: isIOS ? (major ? `${major}.${minor}` : 'Detected') : 'Not iOS',
      standalone,
      screen: `${screen.width}×${screen.height} CSS px`,
      dpr: Number(devicePixelRatio || 1).toFixed(2),
      touch: navigator.maxTouchPoints || 0,
      cores: navigator.hardwareConcurrency || 'Hidden',
      webgpu: Boolean(navigator.gpu),
      webgl2,
      serviceWorker: 'serviceWorker' in navigator,
      language: navigator.language || 'Unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown'
    };
  }

  function injectStyles() {
    if (document.getElementById('smartPlayStyles')) return;
    const style = document.createElement('style');
    style.id = 'smartPlayStyles';
    style.textContent = `
      .smart-play-card{margin:12px 0 18px;border-radius:22px;padding:16px;display:grid;grid-template-columns:44px 1fr auto;gap:12px;align-items:center;cursor:pointer}
      .smart-play-card .smart-icon{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:rgba(139,255,115,.1);color:var(--accent);font-size:20px}
      .smart-play-card strong{display:block;font-size:13px}.smart-play-card small{display:block;color:var(--muted);font-size:10px;line-height:1.45;margin-top:3px}
      .smart-status{font-size:10px;font-weight:800;padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.07);color:var(--muted)}
      .smart-status.ready{background:rgba(139,255,115,.1);color:var(--accent)}
      .smart-device{margin:12px 0;border-radius:22px;padding:16px}.smart-device-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}
      .smart-device-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.smart-device-grid div{padding:10px;border-radius:13px;background:rgba(255,255,255,.045);min-width:0}
      .smart-device-grid span{display:block;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.06em}.smart-device-grid strong{display:block;margin-top:5px;font-size:12px;overflow:hidden;text-overflow:ellipsis}
      .smart-note{margin-top:10px;color:var(--muted);font-size:10px;line-height:1.5}
      .smart-steps{display:grid;gap:10px;margin:14px 0}.smart-step{display:grid;grid-template-columns:28px 1fr;gap:10px;align-items:start}.smart-step>span{width:27px;height:27px;border-radius:9px;display:grid;place-items:center;background:rgba(139,255,115,.1);color:var(--accent);font-size:11px;font-weight:800}.smart-step strong{font-size:12px}.smart-step p{margin:3px 0 0;color:var(--muted);font-size:10px;line-height:1.45}
      .smart-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.smart-actions button{margin-top:0}
      .smart-field{display:block;margin-top:12px;font-size:11px;font-weight:750}.smart-field input{margin-top:7px}
      .smart-current-game{display:flex;gap:11px;align-items:center;padding:11px;border-radius:16px;background:rgba(255,255,255,.045);margin:12px 0}.smart-current-game img{width:46px;height:46px;border-radius:13px;object-fit:cover}.smart-current-game strong{font-size:13px}.smart-current-game small{display:block;color:var(--muted);font-size:10px;margin-top:3px}
      .smart-warning{padding:11px;border-radius:14px;background:rgba(255,209,102,.06);border:1px solid rgba(255,209,102,.16);color:#c8b98a;font-size:10px;line-height:1.5}
      .smart-template-link{display:flex;align-items:center;justify-content:center;text-decoration:none;border:1px solid var(--stroke);background:rgba(255,255,255,.05);color:var(--text);border-radius:15px;min-height:48px;font-size:12px;font-weight:800}
      @media(max-width:430px){.smart-play-card{grid-template-columns:40px 1fr}.smart-status{grid-column:1/-1;width:max-content}.smart-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function injectDialog() {
    if (document.getElementById('smartPlayDialog')) return;
    const dialog = document.createElement('dialog');
    dialog.id = 'smartPlayDialog';
    dialog.className = 'modal';
    dialog.innerHTML = `
      <div class="modal-card glass strong-glass">
        <div class="modal-head">
          <div><p class="eyebrow">SMART PLAY v2.6</p><h2>Universal Launcher</h2></div>
          <button type="button" class="close-button" id="smartPlayClose" aria-label="Close">×</button>
        </div>
        <div id="smartCurrentGame"></div>
        <p class="page-intro" style="margin:0 0 10px">Satu Shortcut untuk seluruh library. iPBooster mengirim nama atau bundle ID game sebagai input.</p>
        <label class="smart-field">Universal Shortcut name
          <input id="smartShortcutName" maxlength="100" value="${escapeHtml(state.config.universalShortcut || DEFAULTS.universalShortcut)}" />
        </label>
        <div class="smart-steps">
          <div class="smart-step"><span>1</span><div><strong>Sudah punya “iPBooster Play”?</strong><p>Seperti di screenshot kamu, cukup tap Open Existing. Bug tanda + sudah diperbaiki menjadi encoding %20 yang benar.</p></div></div>
          <div class="smart-step"><span>2</span><div><strong>Template source tersedia</strong><p>Repo sekarang menyertakan file template Open App ← Shortcut Input. File sumber perlu Apple signing sebelum dapat diimpor sebagai file di iOS modern.</p></div></div>
          <div class="smart-step"><span>3</span><div><strong>Enable sekali</strong><p>Sesudah shortcut siap, tap Save & Enable. Semua tombol Play memakai launcher yang sama.</p></div></div>
        </div>
        <div class="smart-warning">Apple mengharuskan file Shortcut yang dibagikan ditandatangani. iPBooster tidak akan menyamarkan file unsigned sebagai template “siap instal”. Shortcut yang sudah ada di perangkatmu dapat dipakai langsung.</div>
        <details style="margin-top:12px">
          <summary style="font-size:11px;color:var(--muted);cursor:pointer">Advanced target</summary>
          <label class="smart-field">App target<input id="smartAppTarget" maxlength="160" placeholder="Bundle ID or app name" /></label>
          <label class="smart-field">Direct deep link (optional)<input id="smartDeepLink" maxlength="300" placeholder="game-scheme://" /></label>
          <p class="smart-note">Bundle ID dari App Store diprioritaskan karena lebih stabil daripada nama app ketika tersedia.</p>
        </details>
        <div class="smart-actions">
          <button type="button" class="secondary-button" id="smartOpenExisting">Open Existing</button>
          <button type="button" class="secondary-button" id="smartCreateShortcut">Create Blank</button>
          <a class="smart-template-link" href="./shortcuts/iPBooster%20Play.shortcut" target="_blank" rel="noopener">Template Source</a>
          <button type="button" class="primary-button" id="smartMarkReady">Save & Enable</button>
        </div>
      </div>`;
    document.body.appendChild(dialog);

    document.getElementById('smartPlayClose').addEventListener('click', () => dialog.close());
    document.getElementById('smartOpenExisting').addEventListener('click', () => {
      persistDialogConfig(false);
      const name = state.config.universalShortcut?.trim() || DEFAULTS.universalShortcut;
      location.href = buildOpenShortcutUrl(name);
    });
    document.getElementById('smartCreateShortcut').addEventListener('click', () => {
      persistDialogConfig(false);
      location.href = 'shortcuts://create-shortcut';
    });
    document.getElementById('smartMarkReady').addEventListener('click', () => {
      persistDialogConfig(true);
      dialog.close();
      syncUi();
      showToast('Smart Play enabled. Tap Play to launch.');
    });
  }

  function persistDialogConfig(markReady) {
    const name = document.getElementById('smartShortcutName')?.value.trim() || DEFAULTS.universalShortcut;
    state.config.universalShortcut = name;
    if (markReady) state.config.universalReady = true;
    if (!state.config.targets || typeof state.config.targets !== 'object') state.config.targets = {};
    if (state.activeGameId) {
      const appName = document.getElementById('smartAppTarget')?.value.trim() || '';
      const deepLink = document.getElementById('smartDeepLink')?.value.trim() || '';
      state.config.targets[state.activeGameId] = { appName, deepLink };
    }
    save(KEYS.smart, state.config);
  }

  function openSmartSetup(game = null) {
    injectDialog();
    state.activeGameId = game?.id || null;
    document.getElementById('smartShortcutName').value = state.config.universalShortcut || DEFAULTS.universalShortcut;
    const targetConfig = game ? state.config.targets?.[game.id] || {} : {};
    document.getElementById('smartAppTarget').value = game ? (targetConfig.appName || game.bundleId || game.name || '') : '';
    document.getElementById('smartDeepLink').value = game ? (targetConfig.deepLink || '') : '';
    const current = document.getElementById('smartCurrentGame');
    current.innerHTML = game ? `<div class="smart-current-game">${game.artworkUrl ? `<img src="${escapeHtml(game.artworkUrl)}" alt="">` : '<span class="smart-icon">🎮</span>'}<div><strong>${escapeHtml(game.name)}</strong><small>Target: ${escapeHtml(targetFor(game))}</small></div></div>` : '';
    document.getElementById('smartPlayDialog').showModal();
  }

  function launchGame(game) {
    const deepLink = directUrlFor(game);
    if (deepLink) {
      beginPendingSession(game);
      location.href = deepLink;
      return;
    }

    if (state.config.universalReady && state.config.universalShortcut?.trim()) {
      beginPendingSession(game);
      location.href = universalLaunchUrl(game);
      return;
    }

    if (game.shortcut?.trim()) {
      beginPendingSession(game);
      const payload = JSON.stringify({
        source: 'iPBooster', version: 2.6, action: 'launch-game', game: game.name,
        appStoreId: game.appStoreId || null, bundleId: game.bundleId || null,
        profile: game.profile || 'balanced', requestedAt: new Date().toISOString()
      });
      location.href = buildRunShortcutUrl(game.shortcut.trim(), payload);
      return;
    }

    openSmartSetup(game);
  }

  function runDeviceStatus() {
    const bridge = load(KEYS.bridge, {});
    const name = bridge?.statusShortcut?.trim();
    if (!name) {
      document.querySelector('[data-tab="bridge"]')?.click();
      showToast('Configure Device Status Shortcut dulu.');
      return;
    }
    location.href = buildStatusShortcutUrl(name);
  }

  function injectSmartCards() {
    const gamesView = document.querySelector('[data-view="games"]');
    if (gamesView && !document.getElementById('smartPlayCard')) {
      const intro = gamesView.querySelector('.page-intro');
      const card = document.createElement('button');
      card.type = 'button';
      card.id = 'smartPlayCard';
      card.className = 'smart-play-card glass';
      card.innerHTML = `<span class="smart-icon">▶</span><span><strong>Smart Play</strong><small id="smartPlayDesc">One universal shortcut for every game</small></span><span id="smartPlayStatus" class="smart-status">Setup</span>`;
      card.addEventListener('click', () => openSmartSetup());
      intro?.insertAdjacentElement('afterend', card);
    }

    const bridgeView = document.querySelector('[data-view="bridge"]');
    if (bridgeView && !document.getElementById('smartDeviceSnapshot')) {
      const intro = bridgeView.querySelector('.page-intro');
      const section = document.createElement('section');
      section.id = 'smartDeviceSnapshot';
      section.className = 'smart-device glass';
      section.innerHTML = `<div class="smart-device-head"><div><p class="eyebrow">NO SHORTCUT REQUIRED</p><h3>Device snapshot</h3></div><button type="button" id="refreshSmartDevice" class="small-button">Refresh</button></div><div id="smartDeviceGrid" class="smart-device-grid"></div><p class="smart-note">Browser-readable capabilities only. Installed-app list, Wi‑Fi SSID, current Focus, and other protected system values are not exposed to a PWA.</p>`;
      intro?.insertAdjacentElement('afterend', section);
      document.getElementById('refreshSmartDevice').addEventListener('click', renderDeviceSnapshot);
    }
  }

  function renderDeviceSnapshot() {
    const root = document.getElementById('smartDeviceGrid');
    if (!root) return;
    const d = detectDevice();
    const rows = [
      ['Device', d.platform], ['iOS', d.ios], ['PWA', d.standalone ? 'Standalone' : 'Safari tab'],
      ['Screen', d.screen], ['Pixel ratio', d.dpr], ['Touch points', d.touch], ['CPU threads', d.cores],
      ['WebGPU', d.webgpu ? 'Available' : 'Unavailable'], ['WebGL 2', d.webgl2 ? 'Available' : 'Unavailable'],
      ['Service Worker', d.serviceWorker ? 'Available' : 'Unavailable'], ['Language', d.language], ['Timezone', d.timezone]
    ];
    root.innerHTML = rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
  }

  function syncPlayLabels() {
    document.querySelectorAll('[data-game-play]').forEach(button => {
      const chip = button.querySelector('.play-chip');
      if (chip) chip.textContent = 'PLAY';
      if (button.classList.contains('play')) button.textContent = 'Play';
    });
    document.querySelectorAll('#gameLibrary .library-row').forEach(row => {
      const small = row.querySelector('div > small');
      if (small && /Shortcut not configured/i.test(small.textContent)) {
        small.textContent = small.textContent.replace(/Shortcut not configured/i, state.config.universalReady ? 'Smart Play ready' : 'Smart Play setup');
      }
    });
  }

  function patchLegacyCopy() {
    const formHelp = document.querySelector('#gameDialog .form-help');
    if (formHelp) formHelp.innerHTML = 'Per-game Shortcut is optional. <strong>Smart Play</strong> can use one Universal Launcher for the entire library.';
    const shortcutLabel = document.querySelector('#gameShortcut')?.closest('label');
    if (shortcutLabel?.firstChild) shortcutLabel.firstChild.textContent = 'Per-game Shortcut name (optional)';
    const gameIntro = document.querySelector('[data-view="games"] .page-intro');
    if (gameIntro) gameIntro.textContent = 'Cari game di katalog Apple Indonesia. Tombol Play dapat memakai satu Universal Launcher untuk seluruh library.';
  }

  function syncUi() {
    if (state.syncing) return;
    state.syncing = true;
    injectSmartCards();
    patchLegacyCopy();
    syncPlayLabels();
    renderDeviceSnapshot();
    const status = document.getElementById('smartPlayStatus');
    const desc = document.getElementById('smartPlayDesc');
    if (status) {
      status.textContent = state.config.universalReady ? 'Ready' : 'Setup';
      status.classList.toggle('ready', state.config.universalReady);
    }
    if (desc) desc.textContent = state.config.universalReady
      ? `${state.config.universalShortcut} · correctly URL-encoded`
      : 'One universal shortcut, not one per game';
    state.syncing = false;
  }

  function bindCapture() {
    document.addEventListener('click', event => {
      const play = event.target.closest?.('[data-game-play]');
      if (play) {
        const game = gameById(play.dataset.gamePlay);
        if (!game) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        launchGame(game);
        return;
      }

      const action = event.target.closest?.('[data-action="run-device-status"]');
      if (action) {
        event.preventDefault();
        event.stopImmediatePropagation();
        runDeviceStatus();
      }
    }, true);
  }

  function watchUi() {
    const observer = new MutationObserver(() => {
      clearTimeout(watchUi.timer);
      watchUi.timer = setTimeout(syncUi, 35);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  injectStyles();
  injectDialog();
  injectSmartCards();
  bindCapture();
  renderDeviceSnapshot();
  syncUi();
  watchUi();
})();