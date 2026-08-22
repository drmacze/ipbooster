(() => {
  'use strict';

  const STORAGE = {
    games: 'ipbooster.games.v1',
    profile: 'ipbooster.profile.v1',
    network: 'ipbooster.network.v1',
    bridge: 'ipbooster.bridge.v1',
    device: 'ipbooster.device.v1'
  };

  const PROFILES = {
    competitive: { label: 'Competitive', note: 'Low distraction · performance first' },
    balanced: { label: 'Balanced', note: 'Gaming with normal system balance' },
    battery: { label: 'Battery Saver', note: 'Conservative session profile' }
  };

  // Official Indonesian App Store IDs. Artwork is resolved at runtime from
  // Apple's iTunes Search/Lookup API so the launcher follows current icons.
  const OFFICIAL_GAMES = {
    'minecraft': { appStoreId: '479516143' },
    'mobile legends': { appStoreId: '1160056295' },
    'mobile legends bang bang': { appStoreId: '1160056295' },
    'mobile legends: bang bang': { appStoreId: '1160056295' },
    'call of duty': { appStoreId: '1465688043' },
    'call of duty mobile': { appStoreId: '1465688043' },
    'call of duty: mobile': { appStoreId: '1465688043' }
  };

  const defaultGames = [
    { id: cryptoId(), name: 'Minecraft', emoji: '⛏️', shortcut: '', profile: 'balanced', appStoreId: '479516143', artworkUrl: '' },
    { id: cryptoId(), name: 'Mobile Legends', emoji: '⚔️', shortcut: '', profile: 'competitive', appStoreId: '1160056295', artworkUrl: '' },
    { id: cryptoId(), name: 'Call of Duty', emoji: '🎯', shortcut: '', profile: 'competitive', appStoreId: '1465688043', artworkUrl: '' }
  ];

  const state = {
    games: load(STORAGE.games, defaultGames).map(withOfficialMetadata),
    profile: localStorage.getItem(STORAGE.profile) || 'competitive',
    history: load(STORAGE.network, []),
    bridge: load(STORAGE.bridge, { statusShortcut: 'iPBooster Device Status' }),
    device: load(STORAGE.device, null),
    testing: false,
    artworkLoading: false
  };

  function $(sel, root = document) { return root.querySelector(sel); }
  function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }
  function load(key, fallback) {
    try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; }
  }
  function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function cryptoId() { return self.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function escapeHtml(input = '') { return String(input).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function median(values) { const s = [...values].sort((a,b)=>a-b); const m = Math.floor(s.length/2); return s.length % 2 ? s[m] : (s[m-1]+s[m])/2; }
  function avg(values) { return values.reduce((a,b)=>a+b,0) / Math.max(values.length,1); }
  function round(n, digits = 1) { const p = 10 ** digits; return Math.round(n*p)/p; }
  function normalizeGameName(name = '') { return name.toLowerCase().replace(/[®™]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }

  function withOfficialMetadata(game) {
    const known = OFFICIAL_GAMES[normalizeGameName(game?.name)];
    return {
      ...game,
      appStoreId: game?.appStoreId || known?.appStoreId || '',
      artworkUrl: game?.artworkUrl || '',
      storeUrl: game?.storeUrl || ''
    };
  }

  function showToast(message, ms = 2700) {
    const el = $('#toast'); el.textContent = message; el.classList.add('show');
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => el.classList.remove('show'), ms);
  }

  function setView(view) {
    $$('.view').forEach(v => v.classList.toggle('active', v.dataset.view === view));
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === view));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function gameArtwork(game, size = 64, lazy = false) {
    const radius = size >= 60 ? 18 : 15;
    const shared = `width:${size}px;height:${size}px;border-radius:${radius}px;display:grid;place-items:center;overflow:hidden;background:rgba(255,255,255,.07);box-shadow:0 10px 24px rgba(0,0,0,.22);flex:0 0 auto`;
    if (game.artworkUrl) {
      return `<span style="${shared}"><img src="${escapeHtml(game.artworkUrl)}" alt="${escapeHtml(game.name)} official app icon" width="${size}" height="${size}" ${lazy ? 'loading="lazy"' : ''} referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;display:block"></span>`;
    }
    return `<span style="${shared};font-size:${Math.round(size * .48)}px">${escapeHtml(game.emoji || '🎮')}</span>`;
  }

  function itunesJsonp(path, params) {
    return new Promise((resolve, reject) => {
      const callback = `ipboosterItunes_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const query = new URLSearchParams({ ...params, callback });
      const script = document.createElement('script');
      let timer;
      const cleanup = () => {
        clearTimeout(timer);
        script.remove();
        try { delete window[callback]; } catch { window[callback] = undefined; }
      };
      window[callback] = data => { cleanup(); resolve(data); };
      script.onerror = () => { cleanup(); reject(new Error('Apple artwork lookup failed')); };
      script.src = `https://itunes.apple.com/${path}?${query.toString()}`;
      script.async = true;
      timer = setTimeout(() => { cleanup(); reject(new Error('Apple artwork lookup timed out')); }, 8000);
      document.head.appendChild(script);
    });
  }

  function pickArtworkResult(data, gameName) {
    const results = Array.isArray(data?.results) ? data.results : [];
    if (!results.length) return null;
    const wanted = normalizeGameName(gameName);
    return results.find(r => normalizeGameName(r.trackName) === wanted)
      || results.find(r => normalizeGameName(r.trackName).includes(wanted) || wanted.includes(normalizeGameName(r.trackName)))
      || results[0];
  }

  async function resolveOfficialArtwork(game) {
    let data;
    if (game.appStoreId) {
      data = await itunesJsonp('lookup', { id: game.appStoreId, country: 'id', entity: 'software' });
    } else {
      data = await itunesJsonp('search', { term: game.name, country: 'id', entity: 'software', limit: '5' });
    }
    const result = pickArtworkResult(data, game.name);
    if (!result) return false;
    const artwork = result.artworkUrl512 || result.artworkUrl100 || result.artworkUrl60;
    if (!artwork) return false;
    game.appStoreId = String(result.trackId || game.appStoreId || '');
    game.artworkUrl = artwork;
    game.storeUrl = result.trackViewUrl || game.storeUrl || '';
    return true;
  }

  async function hydrateOfficialArtwork() {
    if (state.artworkLoading) return;
    const pending = state.games.filter(g => !g.artworkUrl);
    if (!pending.length) return;
    state.artworkLoading = true;
    try {
      const results = await Promise.allSettled(pending.map(resolveOfficialArtwork));
      if (results.some(r => r.status === 'fulfilled' && r.value)) {
        save(STORAGE.games, state.games);
        renderHome();
        renderGames();
      }
    } finally {
      state.artworkLoading = false;
    }
  }

  function renderCompatibility() {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const osMatch = ua.match(/OS (\d+)[_.]/i);
    const safariMatch = ua.match(/Version\/(\d+)/i);
    const major = Number(osMatch?.[1] || (isIOS ? safariMatch?.[1] : 0) || 0);
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const banner = $('#compatBanner');
    let message = '';
    if (isIOS && major && major < 26) message = `iPBooster menargetkan iOS 26+. Perangkat ini terdeteksi iOS ${major}; beberapa flow sengaja tidak dijamin.`;
    else if (!isIOS) message = 'Preview mode — iPBooster dibuat khusus iPhone/iPad dengan iOS/iPadOS 26+.';
    else if (!standalone) message = 'Tip: Add to Home Screen agar launcher berjalan sebagai web app standalone.';
    if (message) { banner.textContent = message; banner.classList.remove('hidden'); }
    $('#readyLabel').textContent = isIOS && (!major || major >= 26) ? 'iOS 26+ target ready' : 'iOS 26+ target';
  }

  function renderHome() {
    const latest = state.history[0];
    $('#metricLatency').textContent = latest ? `${latest.latency} ms` : '—';
    $('#metricJitter').textContent = latest ? `${latest.jitter} ms jitter` : 'Tap to test';
    $('#metricProfile').textContent = PROFILES[state.profile]?.label || 'Competitive';
    $('#metricBridge').textContent = state.device ? 'Live data' : (state.bridge.statusShortcut ? 'Configured' : 'Setup');
    $('#metricBridgeSub').textContent = state.device?.battery != null ? `Battery ${state.device.battery}%` : 'Shortcuts';
    const hour = new Date().getHours();
    $('#greeting').textContent = hour < 11 ? 'GOOD MORNING' : hour < 18 ? 'READY TO PLAY' : 'GOOD EVENING';

    const homeList = $('#homeGameList');
    if (!state.games.length) {
      homeList.innerHTML = `<button class="game-card glass" data-action="open-add-game"><div class="game-emoji">＋</div><div><strong>Add your first game</strong><small>Connect it to a Shortcut</small><div class="play-chip">SETUP</div></div></button>`;
      return;
    }
    homeList.innerHTML = state.games.map(g => `
      <button class="game-card glass" data-game-play="${escapeHtml(g.id)}">
        ${gameArtwork(g, 66)}
        <div><strong>${escapeHtml(g.name)}</strong><small>${escapeHtml(PROFILES[g.profile]?.label || 'Balanced')}</small><div class="play-chip">${g.shortcut ? 'PLAY' : 'SETUP'}</div></div>
      </button>`).join('');
  }

  function renderGames() {
    const root = $('#gameLibrary');
    if (!state.games.length) {
      root.innerHTML = `<div class="empty-state glass"><strong>No games yet</strong>Add a game and connect it to an Apple Shortcut.</div>`;
      return;
    }
    root.innerHTML = state.games.map(g => `
      <article class="library-row glass">
        ${gameArtwork(g, 52, true)}
        <div><strong>${escapeHtml(g.name)}</strong><small>${escapeHtml(PROFILES[g.profile]?.label || 'Balanced')} · ${g.shortcut ? escapeHtml(g.shortcut) : 'Shortcut not configured'}</small></div>
        <div class="row-actions"><button data-game-edit="${escapeHtml(g.id)}">Edit</button><button class="play" data-game-play="${escapeHtml(g.id)}">${g.shortcut ? 'Play' : 'Setup'}</button></div>
      </article>`).join('');
  }

  function renderNetwork() {
    const latest = state.history[0];
    if (latest) updateNetworkDisplay(latest);
    renderHistory();
    $('#onlinePill').innerHTML = `<span class="live-dot" style="background:${navigator.onLine ? 'var(--accent)' : 'var(--danger)'}"></span>${navigator.onLine ? 'Online' : 'Offline'}`;
  }

  function renderHistory() {
    const root = $('#networkHistory');
    if (!state.history.length) { root.innerHTML = `<div class="empty-state glass"><strong>No tests yet</strong>Run a real network test to build local history.</div>`; return; }
    root.innerHTML = state.history.slice(0, 8).map(r => `
      <div class="history-item glass"><div><strong>${new Date(r.at).toLocaleString()}</strong><p>${r.latency} ms latency · ${r.jitter} ms jitter · ${r.download ?? '—'} Mbps down · ${r.upload ?? '—'} Mbps up</p></div><div class="history-score">${escapeHtml(quality(r.latency, r.jitter).label)}</div></div>`).join('');
  }

  function renderBridge() {
    $('#statusShortcutName').value = state.bridge.statusShortcut || '';
    if (state.bridge.statusShortcut) {
      $('#bridgeStatusTitle').textContent = state.device ? 'Connected' : 'Configured';
      $('#bridgeStatusText').textContent = state.device ? `Last callback ${new Date(state.device.receivedAt).toLocaleString()}` : `Ready to call “${state.bridge.statusShortcut}”.`;
    } else {
      $('#bridgeStatusTitle').textContent = 'Not configured';
      $('#bridgeStatusText').textContent = 'Isi nama Shortcut status perangkat untuk mengaktifkan callback.';
    }
    const root = $('#deviceData');
    if (!state.device) { root.innerHTML = '<p>Belum ada data dari Shortcuts.</p>'; return; }
    const entries = Object.entries(state.device).filter(([k]) => !['receivedAt','raw'].includes(k));
    root.innerHTML = `<div class="device-data-grid">${entries.map(([k,v]) => `<div><span>${escapeHtml(k)}</span><strong>${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : v)}</strong></div>`).join('')}</div>`;
  }

  function renderAll() { renderHome(); renderGames(); renderNetwork(); renderBridge(); }

  function quality(latency, jitter) {
    const l = Number(latency); const j = Number(jitter);
    if (l <= 35 && j <= 8) return { label: 'Excellent', caption: 'Great for fast-paced competitive games.', deg: 330 };
    if (l <= 65 && j <= 15) return { label: 'Good', caption: 'Good gaming connection with minor variability.', deg: 255 };
    if (l <= 110 && j <= 28) return { label: 'Playable', caption: 'Playable, but timing-sensitive games may feel delayed.', deg: 175 };
    return { label: 'Unstable', caption: 'High delay or variation detected. Consider changing network.', deg: 95 };
  }

  function updateNetworkDisplay(result) {
    const q = quality(result.latency, result.jitter);
    $('#gaugeValue').textContent = result.latency;
    $('#gaugeRing').style.background = `conic-gradient(var(--accent) ${q.deg}deg, rgba(255,255,255,.08) ${q.deg}deg)`;
    $('#networkQuality').textContent = q.label;
    $('#networkCaption').textContent = q.caption;
    $('#statLatency').textContent = result.latency ?? '—';
    $('#statJitter').textContent = result.jitter ?? '—';
    $('#statDown').textContent = result.download ?? '—';
    $('#statUp').textContent = result.upload ?? '—';
  }

  async function timedFetch(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const start = performance.now();
    try {
      const response = await fetch(url, { cache: 'no-store', ...options, signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.arrayBuffer();
      return { ms: performance.now() - start, bytes: body.byteLength };
    } finally { clearTimeout(timeout); }
  }

  async function runNetworkTest() {
    if (state.testing) return;
    if (!navigator.onLine) { showToast('Device sedang offline.'); return; }
    state.testing = true;
    const btn = $('#fullTestButton'); const progress = $('#testProgress'); const bar = $('#progressBar'); const text = $('#progressText');
    btn.disabled = true; progress.classList.remove('hidden');
    const update = (pct, label) => { bar.style.width = `${pct}%`; text.textContent = label; };
    try {
      const latencySamples = [];
      for (let i = 0; i < 7; i++) {
        update(5 + i * 5, `Latency sample ${i + 1}/7…`);
        const r = await timedFetch(`https://speed.cloudflare.com/__down?bytes=1&cb=${Date.now()}-${i}`);
        latencySamples.push(r.ms);
      }
      const latency = median(latencySamples);
      const diffs = latencySamples.slice(1).map((v,i) => Math.abs(v - latencySamples[i]));
      const jitter = avg(diffs);

      update(48, 'Measuring download throughput…');
      const down = await timedFetch(`https://speed.cloudflare.com/__down?bytes=3000000&cb=${Date.now()}`);
      const downMbps = (down.bytes * 8) / (down.ms / 1000) / 1e6;

      let upMbps = null;
      try {
        update(76, 'Measuring upload throughput…');
        const payload = new Uint8Array(750000);
        self.crypto?.getRandomValues?.(payload.subarray(0, 65536));
        const start = performance.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        try {
          const response = await fetch(`https://speed.cloudflare.com/__up?cb=${Date.now()}`, { method: 'POST', body: payload, cache: 'no-store', signal: controller.signal });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          await response.text();
          upMbps = (payload.byteLength * 8) / ((performance.now() - start) / 1000) / 1e6;
        } finally { clearTimeout(timeout); }
      } catch (error) {
        console.warn('Upload measurement unavailable:', error);
      }

      update(95, 'Saving result locally…');
      const result = { at: Date.now(), latency: round(latency), jitter: round(jitter), download: round(downMbps), upload: upMbps == null ? null : round(upMbps) };
      state.history.unshift(result); state.history = state.history.slice(0, 20); save(STORAGE.network, state.history);
      updateNetworkDisplay(result); renderHistory(); renderHome();
      update(100, 'Done');
      showToast(upMbps == null ? 'Test complete. Upload measurement unavailable on this route.' : 'Network test complete.');
    } catch (error) {
      console.error(error);
      showToast('Network test gagal. Coba lagi atau cek apakah endpoint test diblokir jaringan.', 4000);
      update(0, 'Test failed');
    } finally {
      state.testing = false; btn.disabled = false; setTimeout(() => progress.classList.add('hidden'), 1500);
    }
  }

  function buildShortcutUrl(name, payload, marker) {
    const callback = new URL(location.href);
    callback.searchParams.set('bridge_callback', marker);
    callback.searchParams.delete('result'); callback.searchParams.delete('errorMessage');
    const fail = new URL(callback); fail.searchParams.set('bridge_error', '1');
    const params = new URLSearchParams({ name, input: 'text', text: JSON.stringify(payload), 'x-success': callback.href, 'x-error': fail.href, 'x-cancel': fail.href });
    return `shortcuts://x-callback-url/run-shortcut?${params.toString()}`;
  }

  function callStatusShortcut() {
    const name = state.bridge.statusShortcut?.trim();
    if (!name) { setView('bridge'); showToast('Configure Device Status Shortcut dulu.'); return; }
    const payload = { source: 'iPBooster', action: 'device-status', requestedAt: new Date().toISOString() };
    location.href = buildShortcutUrl(name, payload, 'device-status');
  }

  function playGame(id) {
    const game = state.games.find(g => g.id === id); if (!game) return;
    if (!game.shortcut?.trim()) { openGameDialog(game); showToast('Isi Launch Shortcut untuk game ini.'); return; }
    const payload = { source: 'iPBooster', action: 'launch-game', game: game.name, profile: game.profile, requestedAt: new Date().toISOString() };
    const url = buildShortcutUrl(game.shortcut.trim(), payload, `game-${game.id}`);
    location.href = url;
  }

  function handleCallback() {
    const url = new URL(location.href);
    const marker = url.searchParams.get('bridge_callback');
    const result = url.searchParams.get('result');
    const hasError = url.searchParams.has('bridge_error') || url.searchParams.has('errorMessage');
    if (!marker && !hasError) return;
    if (hasError) showToast(url.searchParams.get('errorMessage') || 'Shortcut dibatalkan atau gagal.', 4000);
    else if (marker === 'device-status' && result != null) {
      let parsed;
      try { parsed = JSON.parse(result); } catch { parsed = { result }; }
      if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) parsed = { result: parsed };
      state.device = { ...parsed, receivedAt: Date.now() }; save(STORAGE.device, state.device); renderBridge(); renderHome(); showToast('Real device data diterima dari Shortcuts.');
    } else if (marker?.startsWith('game-')) showToast('Shortcut selesai dan callback diterima.');
    ['bridge_callback','result','bridge_error','errorMessage'].forEach(k => url.searchParams.delete(k));
    history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function openGameDialog(game = null) {
    $('#dialogTitle').textContent = game ? 'Edit Game' : 'Add Game';
    $('#editGameId').value = game?.id || '';
    $('#gameName').value = game?.name || '';
    $('#gameShortcut').value = game?.shortcut || '';
    $('#gameEmoji').value = game?.emoji || '🎮';
    $('#gameProfile').value = game?.profile || state.profile;
    $('#gameDialog').showModal();
  }

  function saveGameFromForm(event) {
    event.preventDefault();
    const id = $('#editGameId').value;
    const previous = state.games.find(g => g.id === id);
    const name = $('#gameName').value.trim();
    const known = OFFICIAL_GAMES[normalizeGameName(name)];
    const game = {
      id: id || cryptoId(),
      name,
      shortcut: $('#gameShortcut').value.trim(),
      emoji: $('#gameEmoji').value.trim() || '🎮',
      profile: $('#gameProfile').value,
      appStoreId: previous?.appStoreId || known?.appStoreId || '',
      artworkUrl: previous?.name === name ? (previous?.artworkUrl || '') : '',
      storeUrl: previous?.name === name ? (previous?.storeUrl || '') : ''
    };
    if (!game.name || !game.shortcut) { showToast('Game name dan Launch Shortcut wajib diisi.'); return; }
    const idx = state.games.findIndex(g => g.id === id);
    if (idx >= 0) state.games[idx] = game; else state.games.unshift(game);
    save(STORAGE.games, state.games); renderHome(); renderGames(); $('#gameDialog').close();
    showToast(idx >= 0 ? 'Game updated. Loading official icon…' : 'Game added. Loading official icon…');
    hydrateOfficialArtwork();
  }

  function cycleProfile() {
    const keys = Object.keys(PROFILES); const idx = keys.indexOf(state.profile); state.profile = keys[(idx + 1) % keys.length];
    localStorage.setItem(STORAGE.profile, state.profile); renderHome(); showToast(`Profile: ${PROFILES[state.profile].label}`);
  }

  async function shareApp() {
    try {
      if (navigator.share) await navigator.share({ title: 'iPBooster', text: 'iOS 26+ gaming control launcher', url: location.href });
      else { await navigator.clipboard.writeText(location.href); showToast('Link copied.'); }
    } catch (error) { if (error?.name !== 'AbortError') showToast('Share tidak tersedia.'); }
  }

  function installPwa() { $('#installDialog').showModal(); }

  function bindEvents() {
    document.addEventListener('click', e => {
      const tab = e.target.closest('[data-tab]'); if (tab) { setView(tab.dataset.tab); return; }
      const play = e.target.closest('[data-game-play]'); if (play) { playGame(play.dataset.gamePlay); return; }
      const edit = e.target.closest('[data-game-edit]'); if (edit) { const g = state.games.find(x => x.id === edit.dataset.gameEdit); if (g) openGameDialog(g); return; }
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action) return;
      ({
        'run-network': () => { setView('network'); runNetworkTest(); },
        'open-bridge': () => setView('bridge'),
        'cycle-profile': cycleProfile,
        'open-add-game': () => openGameDialog(),
        'run-device-status': callStatusShortcut,
        'share-app': shareApp
      }[action] || (()=>{}))();
    });
    $('#fullTestButton').addEventListener('click', runNetworkTest);
    $('#clearHistory').addEventListener('click', () => { state.history = []; save(STORAGE.network, state.history); renderNetwork(); renderHome(); showToast('Network history cleared.'); });
    $('#saveBridge').addEventListener('click', () => { state.bridge.statusShortcut = $('#statusShortcutName').value.trim(); save(STORAGE.bridge, state.bridge); renderBridge(); renderHome(); showToast('Bridge configuration saved.'); });
    $('#gameForm').addEventListener('submit', saveGameFromForm);
    $('#installButton').addEventListener('click', installPwa);
    $$('[data-close-dialog]').forEach(btn => btn.addEventListener('click', () => document.getElementById(btn.dataset.closeDialog)?.close()));
    addEventListener('online', () => { renderNetwork(); hydrateOfficialArtwork(); });
    addEventListener('offline', renderNetwork);
  }

  async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try { await navigator.serviceWorker.register('./sw.js', { scope: './' }); } catch (error) { console.warn('Service worker:', error); }
    }
  }

  save(STORAGE.games, state.games);
  handleCallback();
  renderCompatibility();
  renderAll();
  bindEvents();
  registerServiceWorker();
  hydrateOfficialArtwork();
})();