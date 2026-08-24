(() => {
  'use strict';

  const K = {
    games: 'ipbooster.games.v1', sessions: 'ipbooster.sessions.v2', network: 'ipbooster.network.v1',
    profile: 'ipbooster.profile.v1', router: 'ipbooster.smartplay.v4', native: 'ipbooster.native-mode.v1',
    template: 'ipbooster.shortcut-template.v1'
  };
  const TEMPLATE_URL = 'https://www.icloud.com/shortcuts/480203c0db2f4fe1b0920ca4cf53900c';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const load = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const esc = value => String(value ?? '').replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
  const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };

  function games() { const v = load(K.games, []); return Array.isArray(v) ? v : []; }
  function sessions() { const v = load(K.sessions, []); return Array.isArray(v) ? v : []; }
  function network() { const v = load(K.network, []); return Array.isArray(v) ? v : []; }
  function router() { return load(K.router, {}); }
  function nativeState() { return load(K.native, {}); }
  function templateState() { return load(K.template, {}); }
  function profile() { return localStorage.getItem(K.profile) || 'competitive'; }
  function labelProfile(v) { return ({competitive:'Competitive',balanced:'Balanced',battery:'Battery Saver'})[v] || 'Balanced'; }

  function focusGame() {
    const list = games();
    if (!list.length) return null;
    const last = sessions()[0];
    return (last && list.find(g => String(g.id) === String(last.gameId))) || list[0];
  }

  function quality(latency, jitter) {
    const l = Number(latency), j = Number(jitter);
    if (!Number.isFinite(l) || !Number.isFinite(j)) return 'Belum dites';
    if (l <= 35 && j <= 8) return 'Excellent';
    if (l <= 65 && j <= 15) return 'Good';
    if (l <= 110 && j <= 28) return 'Playable';
    return 'Unstable';
  }

  function simplifyNavigation() {
    const nav = $('.tabbar');
    if (!nav) return;
    const map = {
      home: ['⌂', 'Home'], games: ['▦', 'Games'], bridge: ['⌁', 'Automation'],
      network: ['↯', 'Network'], sessions: ['◷', 'Profile']
    };
    Object.entries(map).forEach(([key, [icon, text]]) => {
      const tab = nav.querySelector(`[data-tab="${key}"]`);
      if (!tab) return;
      setText(tab.querySelector('span'), icon);
      setText(tab.querySelector('small'), text);
    });
    const wanted = ['home','games','bridge','network','sessions'];
    const current = [...nav.querySelectorAll(':scope > .tab')].map(x => x.dataset.tab);
    if (wanted.some((x, i) => current[i] !== x)) {
      wanted.forEach(key => { const tab = nav.querySelector(`[data-tab="${key}"]`); if (tab) nav.appendChild(tab); });
    }
  }

  function simplifyCopy() {
    if (document.title !== 'iPBooster — iOS Gaming Control') document.title = 'iPBooster — iOS Gaming Control';
    $$('.version-chip').forEach(v => setText(v, 'v4'));
    setText($('[data-view="home"] .section-heading h3'), 'Continue Playing');

    const gamesView = $('[data-view="games"]');
    if (gamesView) {
      setText(gamesView.querySelector('.topbar .eyebrow'), 'YOUR LIBRARY');
      setText(gamesView.querySelector('.topbar h1'), 'Games');
      setText(gamesView.querySelector('.page-intro'), 'Cari game, tambahkan ke library, lalu tekan Play. Logo dan metadata diambil dari katalog App Store.');
      setText($('#gameSearchButton'), 'Cari');
      setText(gamesView.querySelector('.compact-heading h3'), 'Library');
    }

    const networkView = $('[data-view="network"]');
    if (networkView) {
      setText(networkView.querySelector('.topbar .eyebrow'), 'CONNECTION QUALITY');
      setText(networkView.querySelector('.topbar h1'), 'Network');
      setText(networkView.querySelector('.page-intro'), 'Cek latency dan jitter sebelum bermain. Hasil memakai koneksi HTTP nyata dari iPhone.');
      setText($('#fullTestButton'), 'Test Network');
      setText(networkView.querySelector('.compact-heading h3'), 'Recent Tests');
    }

    const metric = $('#metricBridge')?.closest('.metric');
    if (metric) {
      if (metric.dataset.action !== 'open-bridge') metric.dataset.action = 'open-bridge';
      setText(metric.querySelector('.metric-label'), 'Automation');
      setText(metric.querySelector('.metric-icon'), '⌁');
    }

    $$('.quick-action').forEach(item => {
      const action = item.dataset.action, strong = item.querySelector('strong'), small = item.querySelector('small');
      if (action === 'open-onboarding') { setText(strong, 'Setup'); setText(small, 'Check what still needs attention'); }
      if (action === 'run-network') { setText(strong, 'Test Network'); setText(small, 'Latency and jitter'); }
      if (action === 'open-bridge') { setText(strong, 'Automation'); setText(small, 'Launcher and gaming setup'); }
      if (action === 'export-data') { setText(strong, 'Backup'); setText(small, 'Save launcher data'); }
    });
  }

  function mountHeroPlay() {
    const copy = $('.readiness-copy');
    if (!copy) return;
    let button = $('#ui26HeroPlay');
    const game = focusGame();
    if (!game) { button?.remove(); return; }
    if (!button) {
      button = document.createElement('button'); button.id = 'ui26HeroPlay'; button.className = 'ui26-hero-play'; copy.appendChild(button);
    }
    const sig = `${game.id}|${game.name}`;
    if (button.dataset.sig !== sig) {
      button.dataset.sig = sig; button.dataset.gamePlay = game.id;
      button.innerHTML = `<span>▶</span> Play ${esc(game.name)}`;
    }
  }

  function automationStateFor(game) {
    const r = router(), t = templateState(), n = nativeState();
    return {
      routerReady: Boolean(r.universalReady && (r.universalShortcut || '').trim()),
      templateInstalled: Boolean(t.installedAt),
      nativeConfirmed: Boolean(game && n.confirmed?.[game.id]?.profile === (game.profile || 'balanced'))
    };
  }

  function mountAutomationDashboard() {
    const view = $('[data-view="bridge"]');
    if (!view) return;
    setText(view.querySelector('.topbar .eyebrow'), 'SYSTEM SETUP');
    setText(view.querySelector('.topbar h1'), 'Automation');
    const intro = view.querySelector('.page-intro');
    setText(intro, 'Satu tempat untuk launcher, Gaming Focus, dan setup otomatis saat game dibuka atau ditutup.');

    const game = focusGame(), st = automationStateFor(game), gameText = game ? game.name : 'game';
    let root = $('#ui26AutomationDashboard');
    if (!root) { root = document.createElement('section'); root.id = 'ui26AutomationDashboard'; intro?.insertAdjacentElement('afterend', root); }
    const sig = `${game?.id||''}|${game?.profile||''}|${st.routerReady}|${st.templateInstalled}|${st.nativeConfirmed}`;
    if (root.dataset.sig !== sig) {
      root.dataset.sig = sig;
      root.innerHTML = `
        <div class="ui26-automation-grid">
          <div class="ui26-auto-card"><div class="ui26-auto-icon">▶</div><div><strong>Game Launcher</strong><small>iPBooster Play opens the selected game.</small></div><span class="ui26-status ${st.routerReady ? 'ready' : 'warn'}">${st.routerReady ? 'Ready' : 'Setup'}</span></div>
          <div class="ui26-auto-card"><div class="ui26-auto-icon">◐</div><div><strong>When Game Opens</strong><small>Gaming Focus + performance profile for ${esc(gameText)}.</small></div><span class="ui26-status ${st.nativeConfirmed ? 'ready' : 'warn'}">${st.nativeConfirmed ? 'Confirmed' : 'Check'}</span></div>
          <div class="ui26-auto-card"><div class="ui26-auto-icon">✓</div><div><strong>When Game Closes</strong><small>Restore Focus and optional battery policy.</small></div><span class="ui26-status ${st.nativeConfirmed ? 'ready' : 'warn'}">${st.nativeConfirmed ? 'Confirmed' : 'Check'}</span></div>
        </div>
        <div class="ui26-automation-actions">
          <a class="primary-button" href="${TEMPLATE_URL}" target="_blank" rel="noopener noreferrer">${st.templateInstalled ? 'Open Template' : 'Install Launcher Template'}</a>
          <button class="secondary-button" data-ui26-open-shortcuts>Open Shortcuts</button>
          ${game ? `<button class="secondary-button" data-native-setup="${esc(game.id)}">Gaming Setup</button>` : ''}
          <a class="secondary-button" href="./refresh.html">Refresh App</a>
        </div>`;
    }

    if (!$('#ui26AutomationAdvanced')) {
      const advanced = document.createElement('details');
      advanced.id = 'ui26AutomationAdvanced'; advanced.className = 'ui26-advanced';
      advanced.innerHTML = '<summary>Advanced device info</summary><div id="ui26AutomationAdvancedBody"></div>';
      root.insertAdjacentElement('afterend', advanced);
      const body = $('#ui26AutomationAdvancedBody');
      const bridgeStatus = view.querySelector('.bridge-status'), settings = view.querySelector('.settings-group');
      const callback = view.querySelector('[data-action="run-device-status"]');
      const deviceHeading = [...view.querySelectorAll('.section-heading')].find(x => x.textContent.includes('Device') || x.textContent.includes('LAST CALLBACK'));
      const deviceData = $('#deviceData'), recipe = view.querySelector('.recipe'), truth = view.querySelector('.truth-card');
      [bridgeStatus, settings, callback, deviceHeading, deviceData, recipe, truth].filter(Boolean).forEach(el => body.appendChild(el));
    }
  }

  function mountProfilePanel() {
    const view = $('[data-view="sessions"]');
    if (!view) return;
    setText(view.querySelector('.topbar .eyebrow'), 'YOUR GAMING');
    setText(view.querySelector('.topbar h1'), 'Profile');
    const intro = view.querySelector('.page-intro');
    setText(intro, 'Profile aktif, aktivitas bermain, backup, dan update aplikasi.');
    setText($('#clearSessions'), 'Clear History');

    let root = $('#ui26ProfileCard');
    if (!root) { root = document.createElement('section'); root.id = 'ui26ProfileCard'; root.className = 'ui26-profile-card'; intro?.insertAdjacentElement('afterend', root); }
    const p = profile();
    if (root.dataset.sig !== p) {
      root.dataset.sig = p;
      root.innerHTML = `
        <div class="ui26-profile-top"><div><span class="eyebrow">ACTIVE PROFILE</span><strong>${esc(labelProfile(p))}</strong><p>${p === 'competitive' ? 'Performance first · Low Power Mode off recommended.' : p === 'battery' ? 'Longer battery life with reduced performance headroom.' : 'Balanced gaming setup.'}</p></div><span class="ui26-status ready">iOS 26+</span></div>
        <div class="ui26-profile-actions"><button class="secondary-button" data-action="cycle-profile">Switch Profile</button><button class="secondary-button" data-action="export-data">Backup Data</button><a class="secondary-button" href="./refresh.html">Refresh PWA</a><button class="secondary-button" data-tab="bridge">Automation Setup</button></div>`;
    }
  }

  function ensureGameDetail() {
    if ($('#ui26GameDetail')) return;
    const d = document.createElement('dialog'); d.id = 'ui26GameDetail'; d.className = 'modal';
    d.innerHTML = `<div class="modal-card glass strong-glass"><div class="modal-head"><div><p class="eyebrow">GAME</p><h2>Details</h2></div><button class="close-button" data-ui26-detail-close>×</button></div><div id="ui26GameDetailBody"></div></div>`;
    document.body.appendChild(d);
  }

  function openGameDetail(id) {
    const game = games().find(g => String(g.id) === String(id)); if (!game) return;
    ensureGameDetail();
    const st = automationStateFor(game), n = network()[0], ownSessions = sessions().filter(s => String(s.gameId) === String(game.id));
    const art = game.artworkUrl ? `<img src="${esc(game.artworkUrl)}" alt="">` : '<div class="app-art" style="width:82px;height:82px;border-radius:22px;display:grid;place-items:center;font-size:34px">🎮</div>';
    $('#ui26GameDetailBody').innerHTML = `
      <div class="ui26-game-hero">${art}<div><h2>${esc(game.name)}</h2><p>${esc(game.seller || 'App Store')} · ${esc(labelProfile(game.profile))}</p></div></div>
      <div class="ui26-detail-status"><div><span>Launcher</span><strong>${st.routerReady ? 'Ready' : 'Needs Setup'}</strong></div><div><span>Automation</span><strong>${st.nativeConfirmed ? 'Confirmed' : 'Check Setup'}</strong></div><div><span>Network</span><strong>${n ? `${quality(n.latency,n.jitter)} · ${n.latency} ms` : 'Not Tested'}</strong></div><div><span>Sessions</span><strong>${ownSessions.length} launches</strong></div></div>
      <div class="ui26-detail-actions"><button class="secondary-button" data-game-edit="${esc(game.id)}">Edit</button><button class="primary-button" data-game-play="${esc(game.id)}">Play ${esc(game.name)}</button></div>`;
    $('#ui26GameDetail').showModal();
  }

  function bind() {
    document.addEventListener('click', event => {
      if (event.target.closest('[data-ui26-detail-close]')) { $('#ui26GameDetail')?.close(); return; }
      if (event.target.closest('[data-ui26-open-shortcuts]')) { location.href = 'shortcuts://'; return; }
      const row = event.target.closest('.library-row');
      if (row && !event.target.closest('button,a,input,select')) {
        const id = row.querySelector('[data-game-play]')?.dataset.gamePlay || row.querySelector('[data-game-edit]')?.dataset.gameEdit;
        if (id) openGameDetail(id);
      }
      if (event.target.closest('#ui26GameDetail [data-game-play],#ui26GameDetail [data-game-edit]')) setTimeout(() => $('#ui26GameDetail')?.close(), 60);
    }, true);
  }

  let raf = 0;
  function refreshUI() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { simplifyNavigation(); simplifyCopy(); mountHeroPlay(); mountAutomationDashboard(); mountProfilePanel(); });
  }

  ensureGameDetail(); bind(); refreshUI();
  const observer = new MutationObserver(() => { clearTimeout(observer.t); observer.t = setTimeout(refreshUI, 180); });
  observer.observe(document.body, { childList: true, subtree: true });
  addEventListener('pageshow', () => setTimeout(refreshUI, 450));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(refreshUI, 450); });
})();
