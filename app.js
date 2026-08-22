(() => {
  'use strict';

  const STORAGE = {
    games: 'ipbooster.games.v1',
    profile: 'ipbooster.profile.v1',
    network: 'ipbooster.network.v1',
    bridge: 'ipbooster.bridge.v1',
    device: 'ipbooster.device.v1',
    sessions: 'ipbooster.sessions.v2',
    pendingSession: 'ipbooster.pending-session.v2',
    onboardingSeen: 'ipbooster.onboarding-seen.v2'
  };

  const PROFILES = {
    competitive: { label: 'Competitive', note: 'Low distraction · performance first' },
    balanced: { label: 'Balanced', note: 'Gaming with normal system balance' },
    battery: { label: 'Battery Saver', note: 'Conservative session profile' }
  };

  const OFFICIAL_GAMES = {
    'minecraft': { appStoreId: '479516143' },
    'mobile legends': { appStoreId: '1160056295' },
    'mobile legends bang bang': { appStoreId: '1160056295' },
    'call of duty': { appStoreId: '1465688043' },
    'call of duty mobile': { appStoreId: '1465688043' }
  };

  function cryptoId() {
    return self.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  const defaultGames = [
    { id: cryptoId(), name: 'Minecraft', shortcut: '', profile: 'balanced', appStoreId: '479516143', artworkUrl: '', storeUrl: '', seller: 'Mojang' },
    { id: cryptoId(), name: 'Mobile Legends: Bang Bang', shortcut: '', profile: 'competitive', appStoreId: '1160056295', artworkUrl: '', storeUrl: '', seller: 'MOONTON' },
    { id: cryptoId(), name: 'Call of Duty: Mobile', shortcut: '', profile: 'competitive', appStoreId: '1465688043', artworkUrl: '', storeUrl: '', seller: 'Garena' }
  ];

  const state = {
    games: load(STORAGE.games, defaultGames).map(withOfficialMetadata),
    profile: localStorage.getItem(STORAGE.profile) || 'competitive',
    history: load(STORAGE.network, []),
    bridge: load(STORAGE.bridge, { statusShortcut: 'iPBooster Device Status' }),
    device: load(STORAGE.device, null),
    sessions: load(STORAGE.sessions, []),
    pendingSession: load(STORAGE.pendingSession, null),
    testing: false,
    artworkLoading: false,
    storeSearching: false,
    compatibility: detectCompatibility()
  };

  function $(selector, root = document) { return root.querySelector(selector); }
  function $$(selector, root = document) { return [...root.querySelectorAll(selector)]; }

  function load(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(input = '') {
    return String(input).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function normalizeGameName(name = '') {
    return String(name).toLowerCase().replace(/[®™]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function withOfficialMetadata(game = {}) {
    const known = OFFICIAL_GAMES[normalizeGameName(game.name)];
    return {
      id: game.id || cryptoId(),
      name: game.name || 'Game',
      shortcut: game.shortcut || '',
      profile: PROFILES[game.profile] ? game.profile : 'balanced',
      appStoreId: String(game.appStoreId || known?.appStoreId || ''),
      artworkUrl: game.artworkUrl || '',
      storeUrl: game.storeUrl || '',
      seller: game.seller || '',
      bundleId: game.bundleId || ''
    };
  }

  function detectCompatibility() {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const osMatch = ua.match(/OS (\d+)[_.]/i);
    const major = Number(osMatch?.[1] || 0);
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    return { isIOS, major, standalone };
  }

  function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function avg(values) {
    return values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1);
  }

  function round(value, digits = 1) {
    const power = 10 ** digits;
    return Math.round(value * power) / power;
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '—';
    if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`;
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem ? `${hours}h ${rem}m` : `${hours}h`;
  }

  function showToast(message, ms = 2800) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => el.classList.remove('show'), ms);
  }

  function closeDialogs() {
    $$('dialog[open]').forEach(dialog => dialog.close());
  }

  function setView(view) {
    $$('.view').forEach(el => el.classList.toggle('active', el.dataset.view === view));
    $$('.tab').forEach(el => el.classList.toggle('active', el.dataset.tab === view));
    closeDialogs();
    if (view === 'games') renderGames();
    if (view === 'network') renderNetwork();
    if (view === 'sessions') renderSessions();
    if (view === 'bridge') renderBridge();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function appArtwork(game, size = 64, lazy = false) {
    const radius = Math.round(size * .26);
    if (game?.artworkUrl) {
      return `<img class="app-art" src="${escapeHtml(game.artworkUrl)}" alt="${escapeHtml(game.name)} official App Store icon" width="${size}" height="${size}" ${lazy ? 'loading="lazy"' : ''} referrerpolicy="no-referrer" style="width:${size}px;height:${size}px;border-radius:${radius}px">`;
    }
    return `<span class="app-art" aria-hidden="true" style="width:${size}px;height:${size}px;border-radius:${radius}px;display:grid;place-items:center;font-size:${Math.round(size*.42)}px">🎮</span>`;
  }

  function itunesJsonp(path, params) {
    return new Promise((resolve, reject) => {
      const callback = `ipboosterApple_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const query = new URLSearchParams({ ...params, callback });
      const script = document.createElement('script');
      let timer;

      const cleanup = () => {
        clearTimeout(timer);
        script.remove();
        try { delete window[callback]; } catch { window[callback] = undefined; }
      };

      window[callback] = data => {
        cleanup();
        resolve(data);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error('Apple catalog request failed'));
      };

      script.src = `https://itunes.apple.com/${path}?${query.toString()}`;
      script.async = true;
      timer = setTimeout(() => {
        cleanup();
        reject(new Error('Apple catalog request timed out'));
      }, 9000);
      document.head.appendChild(script);
    });
  }

  function mapStoreResult(result) {
    return {
      appStoreId: String(result.trackId || ''),
      name: result.trackName || 'Game',
      artworkUrl: result.artworkUrl512 || result.artworkUrl100 || result.artworkUrl60 || '',
      storeUrl: result.trackViewUrl || '',
      seller: result.sellerName || result.artistName || '',
      bundleId: result.bundleId || '',
      primaryGenre: result.primaryGenreName || '',
      genres: Array.isArray(result.genres) ? result.genres : []
    };
  }

  async function resolveOfficialArtwork(game) {
    let data;
    if (game.appStoreId) {
      data = await itunesJsonp('lookup', { id: game.appStoreId, country: 'id', entity: 'software' });
    } else {
      data = await itunesJsonp('search', { term: game.name, country: 'id', entity: 'software', limit: '6' });
    }
    const results = Array.isArray(data?.results) ? data.results : [];
    if (!results.length) return false;
    const wanted = normalizeGameName(game.name);
    const result = results.find(item => normalizeGameName(item.trackName) === wanted)
      || results.find(item => normalizeGameName(item.trackName).includes(wanted) || wanted.includes(normalizeGameName(item.trackName)))
      || results[0];
    const mapped = mapStoreResult(result);
    Object.assign(game, mapped);
    return Boolean(game.artworkUrl);
  }

  async function hydrateOfficialArtwork() {
    if (state.artworkLoading || !navigator.onLine) return;
    const pending = state.games.filter(game => !game.artworkUrl);
    if (!pending.length) return;
    state.artworkLoading = true;
    try {
      const results = await Promise.allSettled(pending.map(resolveOfficialArtwork));
      if (results.some(result => result.status === 'fulfilled' && result.value)) {
        save(STORAGE.games, state.games);
        renderHome();
        renderGames();
      }
    } finally {
      state.artworkLoading = false;
    }
  }

  async function searchAppStore(term) {
    const query = term.trim();
    if (!query || state.storeSearching) return;
    state.storeSearching = true;
    const root = $('#appStoreResults');
    root.innerHTML = `<div class="loading-card glass">Searching Apple App Store…</div>`;
    try {
      const data = await itunesJsonp('search', {
        term: query,
        country: 'id',
        entity: 'software',
        media: 'software',
        limit: '12'
      });
      const raw = Array.isArray(data?.results) ? data.results : [];
      const results = raw
        .map(mapStoreResult)
        .filter(item => item.appStoreId && item.name)
        .filter(item => item.primaryGenre === 'Games' || item.genres.includes('Games'))
        .filter((item, index, arr) => arr.findIndex(other => other.appStoreId === item.appStoreId) === index)
        .slice(0, 8);
      renderStoreResults(results);
    } catch (error) {
      console.error(error);
      root.innerHTML = `<div class="loading-card glass">App Store search gagal. Cek koneksi lalu coba lagi.</div>`;
    } finally {
      state.storeSearching = false;
    }
  }

  function renderStoreResults(results) {
    const root = $('#appStoreResults');
    if (!results.length) {
      root.innerHTML = `<div class="loading-card glass">Tidak ada hasil yang cocok di App Store Indonesia.</div>`;
      return;
    }
    root.innerHTML = results.map(item => {
      const duplicate = state.games.some(game => game.appStoreId === item.appStoreId);
      return `<article class="store-result glass">
        ${appArtwork(item, 56, true)}
        <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.seller || 'App Store')} ${item.genres?.length ? `· ${escapeHtml(item.genres.slice(0, 2).join(', '))}` : ''}</small></div>
        <button class="store-add" data-store-id="${escapeHtml(item.appStoreId)}" data-store-name="${escapeHtml(item.name)}" data-store-art="${escapeHtml(item.artworkUrl)}" data-store-url="${escapeHtml(item.storeUrl)}" data-store-seller="${escapeHtml(item.seller)}" data-store-bundle="${escapeHtml(item.bundleId)}">${duplicate ? 'Open' : 'Add'}</button>
      </article>`;
    }).join('');
  }

  function quality(latency, jitter) {
    const l = Number(latency);
    const j = Number(jitter);
    if (l <= 35 && j <= 8) return { label: 'Excellent', caption: 'Great for timing-sensitive competitive games.', deg: 330, score: 100 };
    if (l <= 65 && j <= 15) return { label: 'Good', caption: 'Solid gaming connection with minor variability.', deg: 255, score: 82 };
    if (l <= 110 && j <= 28) return { label: 'Playable', caption: 'Playable, but fast games may feel delayed.', deg: 175, score: 58 };
    return { label: 'Unstable', caption: 'High delay or variation detected.', deg: 95, score: 30 };
  }

  function readiness() {
    const latest = state.history[0];
    const networkAge = latest ? Date.now() - latest.at : Infinity;
    const deviceAge = state.device?.receivedAt ? Date.now() - state.device.receivedAt : Infinity;
    const configuredGames = state.games.filter(game => game.shortcut?.trim()).length;
    const officialIcons = state.games.filter(game => game.artworkUrl).length;
    const c = state.compatibility;
    let score = 0;
    const reasons = [];

    const iosReady = c.isIOS && (!c.major || c.major >= 26);
    if (iosReady) score += 15;
    reasons.push({ label: c.isIOS ? (c.major ? `iOS ${c.major}` : 'iOS') : 'Preview', good: iosReady });

    if (c.standalone) score += 10;
    reasons.push({ label: c.standalone ? 'Home Screen' : 'Safari', good: c.standalone });

    if (state.bridge.statusShortcut?.trim()) score += 15;
    reasons.push({ label: 'Bridge', good: Boolean(state.bridge.statusShortcut?.trim()) });

    if (deviceAge < 24 * 60 * 60 * 1000) score += 15;
    reasons.push({ label: 'Device data', good: deviceAge < 24 * 60 * 60 * 1000 });

    if (configuredGames > 0) score += 15;
    reasons.push({ label: configuredGames ? `${configuredGames} launch ready` : 'No shortcut', good: configuredGames > 0 });

    if (latest && networkAge < 60 * 60 * 1000) {
      score += quality(latest.latency, latest.jitter).score >= 58 ? 20 : 10;
    } else if (latest) score += 8;
    reasons.push({ label: latest ? quality(latest.latency, latest.jitter).label : 'No network test', good: Boolean(latest && networkAge < 60 * 60 * 1000 && quality(latest.latency, latest.jitter).score >= 58) });

    if (officialIcons > 0) score += 10;
    reasons.push({ label: 'Official artwork', good: officialIcons > 0 });

    return { score: Math.min(100, score), reasons };
  }

  function renderCompatibility() {
    const { isIOS, major, standalone } = state.compatibility;
    const banner = $('#compatBanner');
    let message = '';
    if (isIOS && major && major < 26) {
      message = `iPBooster v2 menargetkan iOS 26+. Perangkat ini terdeteksi iOS ${major}.`;
    } else if (!isIOS) {
      message = 'Preview mode — fitur launcher ditujukan untuk iPhone/iPad dengan iOS/iPadOS 26+.';
    } else if (!standalone) {
      message = 'Tip: Add to Home Screen agar launcher berjalan sebagai PWA standalone.';
    }
    banner.textContent = message;
    banner.classList.toggle('hidden', !message);
    $('#readyLabel').textContent = isIOS && (!major || major >= 26) ? 'iOS 26+ target ready' : 'iOS 26+ target';
  }

  function renderReadiness() {
    const info = readiness();
    const ring = $('.readiness-ring');
    ring.style.setProperty('--score', `${info.score}%`);
    $('#readinessScore').textContent = info.score;
    let title = 'Finish your setup';
    let text = 'Connect Shortcuts, add a launch-ready game, and measure the current network.';
    if (info.score >= 85) {
      title = 'Ready to launch';
      text = 'Your launcher setup is in good shape. Tap a game to start its Shortcut flow.';
    } else if (info.score >= 60) {
      title = 'Almost ready';
      text = 'A few setup checks can still improve the launcher flow.';
    }
    $('#readinessTitle').textContent = title;
    $('#readinessText').textContent = text;
    $('#readinessReasons').innerHTML = info.reasons.slice(0, 6).map(reason =>
      `<span class="reason-chip ${reason.good ? 'good' : ''}">${reason.good ? '✓ ' : ''}${escapeHtml(reason.label)}</span>`
    ).join('');
  }

  function renderHome() {
    const latest = state.history[0];
    $('#metricLatency').textContent = latest ? `${latest.latency} ms` : '—';
    $('#metricJitter').textContent = latest ? `${latest.jitter} ms jitter` : 'Tap to test';
    $('#metricProfile').textContent = PROFILES[state.profile]?.label || 'Competitive';
    $('#metricBridge').textContent = state.device ? 'Connected' : (state.bridge.statusShortcut ? 'Configured' : 'Setup');
    $('#metricBridgeSub').textContent = state.device?.battery != null ? `Battery ${state.device.battery}%` : 'Shortcuts bridge';

    const hour = new Date().getHours();
    $('#greeting').textContent = hour < 11 ? 'GOOD MORNING' : hour < 18 ? 'READY TO PLAY' : 'GOOD EVENING';

    const homeList = $('#homeGameList');
    if (!state.games.length) {
      homeList.innerHTML = `<button class="game-card glass" data-action="open-games"><span class="app-art" style="width:66px;height:66px;border-radius:18px;display:grid;place-items:center;font-size:28px">＋</span><div><strong>Add a game</strong><small>Search the App Store</small><div class="play-chip">SETUP</div></div></button>`;
    } else {
      homeList.innerHTML = state.games.slice(0, 8).map(game => `
        <button class="game-card glass" data-game-play="${escapeHtml(game.id)}">
          ${appArtwork(game, 66)}
          <div><strong>${escapeHtml(game.name)}</strong><small>${escapeHtml(PROFILES[game.profile]?.label || 'Balanced')}</small><div class="play-chip">${game.shortcut ? 'PLAY' : 'SETUP'}</div></div>
        </button>`).join('');
    }

    const last = state.sessions[0];
    const lastRoot = $('#lastSessionCard');
    if (!last) {
      lastRoot.innerHTML = `<div class="empty-state glass"><strong>No launcher sessions yet</strong>Tap Play on a configured game to start tracking launcher activity.</div>`;
    } else {
      lastRoot.innerHTML = `<div class="last-session glass">${appArtwork(last, 48, true)}<div><strong>${escapeHtml(last.gameName)}</strong><p>${new Date(last.startedAt).toLocaleString()} · launcher estimate</p></div><span class="duration-chip">${formatDuration(last.durationSec)}</span></div>`;
    }

    renderReadiness();
  }

  function renderGames() {
    $('#libraryCount').textContent = state.games.length;
    const root = $('#gameLibrary');
    if (!state.games.length) {
      root.innerHTML = `<div class="empty-state glass"><strong>No games yet</strong>Search the official App Store catalog above to add one.</div>`;
      return;
    }
    root.innerHTML = state.games.map(game => `
      <article class="library-row glass">
        ${appArtwork(game, 52, true)}
        <div><strong>${escapeHtml(game.name)}</strong><small>${escapeHtml(PROFILES[game.profile]?.label || 'Balanced')} · ${game.shortcut ? escapeHtml(game.shortcut) : 'Shortcut not configured'}</small></div>
        <div class="row-actions"><button data-game-edit="${escapeHtml(game.id)}">Edit</button><button class="play" data-game-play="${escapeHtml(game.id)}">${game.shortcut ? 'Play' : 'Setup'}</button></div>
      </article>`).join('');
  }

  function renderNetwork() {
    const latest = state.history[0];
    if (latest) updateNetworkDisplay(latest);
    else {
      $('#gaugeValue').textContent = '—';
      $('#networkQuality').textContent = 'Ready to test';
      $('#networkCaption').textContent = 'Run a full test to measure this connection.';
      ['statLatency', 'statJitter', 'statDown', 'statUp'].forEach(id => $(`#${id}`).textContent = '—');
    }
    renderNetworkHistory();
    $('#onlinePill').innerHTML = `<span class="live-dot" style="background:${navigator.onLine ? 'var(--accent)' : 'var(--danger)'}"></span>${navigator.onLine ? 'Online' : 'Offline'}`;
    renderBrowserNetworkInfo();
  }

  function updateNetworkDisplay(result) {
    const q = quality(result.latency, result.jitter);
    $('#gaugeValue').textContent = result.latency ?? '—';
    $('#gaugeRing').style.background = `conic-gradient(var(--accent) ${q.deg}deg, rgba(255,255,255,.08) ${q.deg}deg)`;
    $('#networkQuality').textContent = q.label;
    $('#networkCaption').textContent = q.caption;
    $('#statLatency').textContent = result.latency ?? '—';
    $('#statJitter').textContent = result.jitter ?? '—';
    $('#statDown').textContent = result.download ?? '—';
    $('#statUp').textContent = result.upload ?? '—';
  }

  function renderNetworkHistory() {
    const root = $('#networkHistory');
    if (!state.history.length) {
      root.innerHTML = `<div class="empty-state glass"><strong>No tests yet</strong>Run a real network test to build local history.</div>`;
      return;
    }
    root.innerHTML = state.history.slice(0, 10).map(result => `
      <div class="history-item glass"><div><strong>${new Date(result.at).toLocaleString()}</strong><p>${result.latency} ms latency · ${result.jitter} ms jitter · ${result.download ?? '—'} Mbps down · ${result.upload ?? '—'} Mbps up</p></div><div class="history-score">${escapeHtml(quality(result.latency, result.jitter).label)}</div></div>`
    ).join('');
  }

  function renderBrowserNetworkInfo() {
    const root = $('#browserNetworkInfo');
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) {
      root.classList.add('hidden');
      return;
    }
    const bits = [];
    if (connection.effectiveType) bits.push(`<span>Type <strong>${escapeHtml(connection.effectiveType)}</strong></span>`);
    if (Number.isFinite(connection.downlink)) bits.push(`<span>Browser estimate <strong>${escapeHtml(connection.downlink)} Mbps</strong></span>`);
    if (Number.isFinite(connection.rtt)) bits.push(`<span>RTT estimate <strong>${escapeHtml(connection.rtt)} ms</strong></span>`);
    root.innerHTML = bits.join('');
    root.classList.toggle('hidden', !bits.length);
  }

  function renderSessions() {
    const total = state.sessions.reduce((sum, session) => sum + (Number(session.durationSec) || 0), 0);
    const counts = {};
    state.sessions.forEach(session => counts[session.gameName] = (counts[session.gameName] || 0) + 1);
    const favorite = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    $('#sessionSummary').innerHTML = `
      <div class="summary-card glass"><span>Launches</span><strong>${state.sessions.length}</strong></div>
      <div class="summary-card glass"><span>Estimated time</span><strong>${formatDuration(total)}</strong></div>
      <div class="summary-card glass"><span>Most launched</span><strong title="${escapeHtml(favorite)}">${escapeHtml(favorite.length > 12 ? `${favorite.slice(0, 10)}…` : favorite)}</strong></div>`;

    const root = $('#sessionHistory');
    if (!state.sessions.length) {
      root.innerHTML = `<div class="empty-state glass"><strong>No sessions yet</strong>Configured game launches will appear here after you return to iPBooster.</div>`;
      return;
    }
    root.innerHTML = state.sessions.slice(0, 30).map(session => `
      <div class="history-item glass"><div><strong>${escapeHtml(session.gameName)}</strong><p>${new Date(session.startedAt).toLocaleString()} · ${escapeHtml(PROFILES[session.profile]?.label || 'Profile')} · launcher estimate</p></div><div class="history-score">${formatDuration(session.durationSec)}</div></div>`
    ).join('');
  }

  function renderBridge() {
    $('#statusShortcutName').value = state.bridge.statusShortcut || '';
    if (state.bridge.statusShortcut) {
      $('#bridgeStatusTitle').textContent = state.device ? 'Connected' : 'Configured';
      $('#bridgeStatusText').textContent = state.device
        ? `Last callback ${new Date(state.device.receivedAt).toLocaleString()}`
        : `Ready to call “${state.bridge.statusShortcut}”.`;
    } else {
      $('#bridgeStatusTitle').textContent = 'Not configured';
      $('#bridgeStatusText').textContent = 'Set nama Shortcut status perangkat untuk mengaktifkan callback.';
    }

    const root = $('#deviceData');
    if (!state.device) {
      root.innerHTML = '<p>Belum ada data dari Shortcuts.</p>';
      return;
    }
    const entries = Object.entries(state.device).filter(([key]) => !['receivedAt', 'raw'].includes(key));
    root.innerHTML = `<div class="device-data-grid">${entries.map(([key, value]) =>
      `<div><span>${escapeHtml(key)}</span><strong>${escapeHtml(typeof value === 'object' ? JSON.stringify(value) : value)}</strong></div>`
    ).join('')}</div>`;
  }

  function renderOnboarding() {
    const latest = state.history[0];
    const checks = [
      {
        done: state.compatibility.isIOS && (!state.compatibility.major || state.compatibility.major >= 26),
        title: 'iOS / iPadOS 26+',
        text: state.compatibility.isIOS ? `Detected ${state.compatibility.major ? `iOS ${state.compatibility.major}` : 'iOS device'}.` : 'Open on an iPhone/iPad for the actual launcher.'
      },
      {
        done: state.compatibility.standalone,
        title: 'Home Screen PWA',
        text: state.compatibility.standalone ? 'Running in standalone mode.' : 'Use Safari → Share → Add to Home Screen.'
      },
      {
        done: Boolean(state.games.some(game => game.shortcut?.trim())),
        title: 'Launch-ready game',
        text: state.games.some(game => game.shortcut?.trim()) ? 'At least one game has a Shortcut.' : 'Add a game and enter its Shortcut name.'
      },
      {
        done: Boolean(state.bridge.statusShortcut?.trim()),
        title: 'Device Status bridge',
        text: state.bridge.statusShortcut?.trim() ? `Configured: ${state.bridge.statusShortcut}` : 'Configure the Device Status Shortcut.'
      },
      {
        done: Boolean(latest && Date.now() - latest.at < 60 * 60 * 1000),
        title: 'Fresh network test',
        text: latest ? `${quality(latest.latency, latest.jitter).label} · ${latest.latency} ms` : 'No network measurement yet.'
      }
    ];
    $('#onboardingChecks').innerHTML = checks.map(check => `
      <div class="check-row ${check.done ? 'done' : ''}"><div class="check-icon">${check.done ? '✓' : '·'}</div><div><strong>${escapeHtml(check.title)}</strong><small>${escapeHtml(check.text)}</small></div></div>`
    ).join('');
  }

  function renderAll() {
    renderCompatibility();
    renderHome();
    renderGames();
    renderNetwork();
    renderSessions();
    renderBridge();
    renderOnboarding();
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
    } finally {
      clearTimeout(timeout);
    }
  }

  async function runNetworkTest() {
    if (state.testing) return;
    closeDialogs();
    setView('network');
    if (!navigator.onLine) {
      showToast('Device sedang offline.');
      return;
    }

    state.testing = true;
    const button = $('#fullTestButton');
    const progress = $('#testProgress');
    const bar = $('#progressBar');
    const text = $('#progressText');
    button.disabled = true;
    progress.classList.remove('hidden');
    const update = (pct, label) => {
      bar.style.width = `${pct}%`;
      text.textContent = label;
    };

    try {
      const latencySamples = [];
      for (let i = 0; i < 7; i++) {
        update(5 + i * 5, `Latency sample ${i + 1}/7…`);
        const result = await timedFetch(`https://speed.cloudflare.com/__down?bytes=1&cb=${Date.now()}-${i}`);
        latencySamples.push(result.ms);
      }

      const latency = median(latencySamples);
      const diffs = latencySamples.slice(1).map((value, index) => Math.abs(value - latencySamples[index]));
      const jitter = avg(diffs);

      update(48, 'Measuring download throughput…');
      const down = await timedFetch(`https://speed.cloudflare.com/__down?bytes=3000000&cb=${Date.now()}`);
      const downMbps = (down.bytes * 8) / (down.ms / 1000) / 1e6;

      let upMbps = null;
      try {
        update(76, 'Measuring upload throughput…');
        const payload = new Uint8Array(750000);
        self.crypto?.getRandomValues?.(payload.subarray(0, Math.min(65536, payload.length)));
        const start = performance.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        try {
          const response = await fetch(`https://speed.cloudflare.com/__up?cb=${Date.now()}`, {
            method: 'POST', body: payload, cache: 'no-store', signal: controller.signal
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          await response.text();
          upMbps = (payload.byteLength * 8) / ((performance.now() - start) / 1000) / 1e6;
        } finally {
          clearTimeout(timeout);
        }
      } catch (error) {
        console.warn('Upload test unavailable:', error);
      }

      update(95, 'Saving result locally…');
      const result = {
        at: Date.now(),
        latency: round(latency),
        jitter: round(jitter),
        download: round(downMbps),
        upload: upMbps == null ? null : round(upMbps)
      };
      state.history.unshift(result);
      state.history = state.history.slice(0, 30);
      save(STORAGE.network, state.history);
      updateNetworkDisplay(result);
      renderNetworkHistory();
      renderHome();
      renderOnboarding();
      update(100, 'Done');
      showToast(upMbps == null ? 'Test complete. Upload measurement unavailable on this route.' : 'Network test complete.');
    } catch (error) {
      console.error(error);
      update(0, 'Test failed');
      showToast('Network test gagal. Coba lagi atau ganti jaringan.', 4200);
    } finally {
      state.testing = false;
      button.disabled = false;
      setTimeout(() => progress.classList.add('hidden'), 1400);
    }
  }

  function buildStatusShortcutUrl(name, payload) {
    const callback = new URL(location.href);
    callback.searchParams.set('bridge_callback', 'device-status');
    callback.searchParams.delete('result');
    callback.searchParams.delete('errorMessage');
    const fail = new URL(callback);
    fail.searchParams.set('bridge_error', '1');
    const params = new URLSearchParams({
      name,
      input: 'text',
      text: JSON.stringify(payload),
      'x-success': callback.href,
      'x-error': fail.href,
      'x-cancel': fail.href
    });
    return `shortcuts://x-callback-url/run-shortcut?${params.toString()}`;
  }

  function buildLaunchShortcutUrl(name, payload) {
    const params = new URLSearchParams({
      name,
      input: 'text',
      text: JSON.stringify(payload)
    });
    return `shortcuts://run-shortcut?${params.toString()}`;
  }

  function callStatusShortcut() {
    const name = state.bridge.statusShortcut?.trim();
    if (!name) {
      setView('bridge');
      showToast('Configure Device Status Shortcut dulu.');
      return;
    }
    const payload = {
      source: 'iPBooster',
      version: 2,
      action: 'device-status',
      requestedAt: new Date().toISOString()
    };
    location.href = buildStatusShortcutUrl(name, payload);
  }

  function beginPendingSession(game) {
    state.pendingSession = {
      id: cryptoId(),
      gameId: game.id,
      gameName: game.name,
      artworkUrl: game.artworkUrl || '',
      appStoreId: game.appStoreId || '',
      profile: game.profile,
      startedAt: Date.now()
    };
    save(STORAGE.pendingSession, state.pendingSession);
  }

  function finalizePendingSession() {
    const pending = load(STORAGE.pendingSession, state.pendingSession);
    if (!pending?.startedAt) return false;
    const elapsed = Math.round((Date.now() - pending.startedAt) / 1000);
    if (elapsed < 15) return false;
    if (elapsed > 12 * 60 * 60) {
      localStorage.removeItem(STORAGE.pendingSession);
      state.pendingSession = null;
      return false;
    }
    const session = { ...pending, durationSec: elapsed, endedAt: Date.now() };
    state.sessions.unshift(session);
    state.sessions = state.sessions.slice(0, 100);
    state.pendingSession = null;
    localStorage.removeItem(STORAGE.pendingSession);
    save(STORAGE.sessions, state.sessions);
    renderSessions();
    renderHome();
    return true;
  }

  function playGame(id) {
    const game = state.games.find(item => item.id === id);
    if (!game) return;
    if (!game.shortcut?.trim()) {
      openGameDialog(game);
      showToast('Isi Launch Shortcut untuk game ini.');
      return;
    }

    beginPendingSession(game);
    const payload = {
      source: 'iPBooster',
      version: 2,
      action: 'launch-game',
      game: game.name,
      appStoreId: game.appStoreId || null,
      bundleId: game.bundleId || null,
      profile: game.profile,
      requestedAt: new Date().toISOString()
    };
    location.href = buildLaunchShortcutUrl(game.shortcut.trim(), payload);
  }

  function handleCallback() {
    const url = new URL(location.href);
    const marker = url.searchParams.get('bridge_callback');
    const result = url.searchParams.get('result');
    const hasError = url.searchParams.has('bridge_error') || url.searchParams.has('errorMessage');
    if (!marker && !hasError) return;

    if (hasError) {
      showToast(url.searchParams.get('errorMessage') || 'Shortcut dibatalkan atau gagal.', 4000);
    } else if (marker === 'device-status' && result != null) {
      let parsed;
      try { parsed = JSON.parse(result); } catch { parsed = { result }; }
      if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) parsed = { result: parsed };
      state.device = { ...parsed, receivedAt: Date.now() };
      save(STORAGE.device, state.device);
      renderBridge();
      renderHome();
      renderOnboarding();
      showToast('Real device data diterima dari Shortcuts.');
    }

    ['bridge_callback', 'result', 'bridge_error', 'errorMessage'].forEach(key => url.searchParams.delete(key));
    history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function openGameDialog(game = null) {
    const dialog = $('#gameDialog');
    const item = game ? withOfficialMetadata(game) : withOfficialMetadata({ name: '', profile: state.profile });
    $('#dialogTitle').textContent = game ? 'Configure Game' : 'Add Manual Game';
    $('#editGameId').value = item.id || '';
    $('#gameName').value = item.name === 'Game' ? '' : item.name;
    $('#gameShortcut').value = item.shortcut || '';
    $('#gameProfile').value = item.profile || state.profile;
    $('#gameAppStoreId').value = item.appStoreId || '';
    $('#gameArtworkUrl').value = item.artworkUrl || '';
    $('#gameStoreUrl').value = item.storeUrl || '';
    $('#deleteGameButton').classList.toggle('hidden', !game);
    renderGamePreview(item);
    dialog.showModal();
  }

  function renderGamePreview(game) {
    const root = $('#gamePreview');
    const name = game.name || 'Manual game';
    root.innerHTML = `${appArtwork(game, 58)}<div><strong>${escapeHtml(name)}</strong><small>${game.seller ? `${escapeHtml(game.seller)} · ` : ''}${game.appStoreId ? `App Store ID ${escapeHtml(game.appStoreId)}` : 'Official artwork will be resolved when possible'}</small></div>`;
  }

  async function saveGameFromForm(event) {
    event.preventDefault();
    const id = $('#editGameId').value;
    const previous = state.games.find(game => game.id === id);
    const name = $('#gameName').value.trim();
    if (!name) {
      showToast('Game name wajib diisi.');
      return;
    }

    const known = OFFICIAL_GAMES[normalizeGameName(name)];
    const game = withOfficialMetadata({
      id: id || cryptoId(),
      name,
      shortcut: $('#gameShortcut').value.trim(),
      profile: $('#gameProfile').value,
      appStoreId: $('#gameAppStoreId').value || previous?.appStoreId || known?.appStoreId || '',
      artworkUrl: $('#gameArtworkUrl').value || (previous?.name === name ? previous?.artworkUrl : '') || '',
      storeUrl: $('#gameStoreUrl').value || (previous?.name === name ? previous?.storeUrl : '') || '',
      seller: previous?.seller || '',
      bundleId: previous?.bundleId || ''
    });

    const index = state.games.findIndex(item => item.id === id);
    if (index >= 0) state.games[index] = game;
    else state.games.unshift(game);
    save(STORAGE.games, state.games);
    $('#gameDialog').close();
    renderGames();
    renderHome();
    renderOnboarding();

    showToast(game.shortcut ? 'Game saved.' : 'Game saved. Add a Shortcut before Play.');
    if (!game.artworkUrl && navigator.onLine) {
      try {
        if (await resolveOfficialArtwork(game)) {
          save(STORAGE.games, state.games);
          renderGames();
          renderHome();
        }
      } catch (error) {
        console.warn('Official artwork resolution failed:', error);
      }
    }
  }

  function addStoreResult(button) {
    const appStoreId = button.dataset.storeId;
    const existing = state.games.find(game => game.appStoreId === appStoreId);
    if (existing) {
      openGameDialog(existing);
      return;
    }
    const game = withOfficialMetadata({
      id: cryptoId(),
      name: button.dataset.storeName,
      shortcut: '',
      profile: state.profile,
      appStoreId,
      artworkUrl: button.dataset.storeArt,
      storeUrl: button.dataset.storeUrl,
      seller: button.dataset.storeSeller,
      bundleId: button.dataset.storeBundle
    });
    state.games.unshift(game);
    save(STORAGE.games, state.games);
    renderGames();
    renderHome();
    openGameDialog(game);
    showToast('Official App Store game added. Configure its Shortcut.');
  }

  function deleteCurrentGame() {
    const id = $('#editGameId').value;
    const game = state.games.find(item => item.id === id);
    if (!game) return;
    if (!confirm(`Delete ${game.name} from iPBooster?`)) return;
    state.games = state.games.filter(item => item.id !== id);
    save(STORAGE.games, state.games);
    $('#gameDialog').close();
    renderGames();
    renderHome();
    renderOnboarding();
    showToast('Game removed from launcher.');
  }

  function cycleProfile() {
    const keys = Object.keys(PROFILES);
    const index = keys.indexOf(state.profile);
    state.profile = keys[(index + 1) % keys.length];
    localStorage.setItem(STORAGE.profile, state.profile);
    renderHome();
    showToast(`Profile: ${PROFILES[state.profile].label}`);
  }

  async function exportData() {
    const payload = {
      app: 'iPBooster',
      version: 2,
      exportedAt: new Date().toISOString(),
      games: state.games,
      profile: state.profile,
      networkHistory: state.history,
      bridge: state.bridge,
      device: state.device,
      sessions: state.sessions
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const file = new File([blob], `ipbooster-backup-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: 'iPBooster backup' });
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = file.name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast('Backup JSON exported.');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') showToast('Backup export tidak tersedia.');
    }
  }

  function openInstallOrOnboarding() {
    if (state.compatibility.standalone) {
      renderOnboarding();
      $('#onboardingDialog').showModal();
    } else {
      $('#installDialog').showModal();
    }
  }

  function bindEvents() {
    document.addEventListener('click', event => {
      const tab = event.target.closest('[data-tab]');
      if (tab) {
        setView(tab.dataset.tab);
        return;
      }

      const play = event.target.closest('[data-game-play]');
      if (play) {
        playGame(play.dataset.gamePlay);
        return;
      }

      const edit = event.target.closest('[data-game-edit]');
      if (edit) {
        const game = state.games.find(item => item.id === edit.dataset.gameEdit);
        if (game) openGameDialog(game);
        return;
      }

      const store = event.target.closest('[data-store-id]');
      if (store) {
        addStoreResult(store);
        return;
      }

      const close = event.target.closest('[data-close-dialog]');
      if (close) {
        document.getElementById(close.dataset.closeDialog)?.close();
        return;
      }

      const action = event.target.closest('[data-action]')?.dataset.action;
      if (!action) return;

      const actions = {
        'run-network': runNetworkTest,
        'run-device-status': callStatusShortcut,
        'open-bridge': () => setView('bridge'),
        'open-games': () => setView('games'),
        'open-manual-game': () => openGameDialog(),
        'open-onboarding': () => { renderOnboarding(); $('#onboardingDialog').showModal(); },
        'cycle-profile': cycleProfile,
        'export-data': exportData
      };
      actions[action]?.();
    });

    $('#gameSearchButton').addEventListener('click', () => searchAppStore($('#gameSearchInput').value));
    $('#gameSearchInput').addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        searchAppStore(event.currentTarget.value);
      }
    });

    $('#gameForm').addEventListener('submit', saveGameFromForm);
    $('#gameName').addEventListener('input', event => renderGamePreview(withOfficialMetadata({
      name: event.currentTarget.value,
      artworkUrl: $('#gameArtworkUrl').value,
      appStoreId: $('#gameAppStoreId').value
    })));
    $('#deleteGameButton').addEventListener('click', deleteCurrentGame);

    $('#fullTestButton').addEventListener('click', runNetworkTest);
    $('#clearHistory').addEventListener('click', () => {
      state.history = [];
      save(STORAGE.network, state.history);
      renderNetwork();
      renderHome();
      renderOnboarding();
      showToast('Network history cleared.');
    });

    $('#clearSessions').addEventListener('click', () => {
      if (!state.sessions.length) return;
      if (!confirm('Clear launcher session history?')) return;
      state.sessions = [];
      save(STORAGE.sessions, state.sessions);
      renderSessions();
      renderHome();
      showToast('Session history cleared.');
    });

    $('#saveBridge').addEventListener('click', () => {
      state.bridge.statusShortcut = $('#statusShortcutName').value.trim();
      save(STORAGE.bridge, state.bridge);
      renderBridge();
      renderHome();
      renderOnboarding();
      showToast('Bridge configuration saved.');
    });

    $('#installButton').addEventListener('click', openInstallOrOnboarding);

    addEventListener('online', () => {
      renderNetwork();
      hydrateOfficialArtwork();
    });
    addEventListener('offline', renderNetwork);
    addEventListener('pageshow', () => setTimeout(finalizePendingSession, 600));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') setTimeout(finalizePendingSession, 700);
    });

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    connection?.addEventListener?.('change', renderBrowserNetworkInfo);
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      registration.update?.();
    } catch (error) {
      console.warn('Service worker:', error);
    }
  }

  function maybeShowOnboarding() {
    if (localStorage.getItem(STORAGE.onboardingSeen)) return;
    localStorage.setItem(STORAGE.onboardingSeen, '1');
    setTimeout(() => {
      renderOnboarding();
      $('#onboardingDialog').showModal();
    }, 700);
  }

  save(STORAGE.games, state.games);
  handleCallback();
  finalizePendingSession();
  renderAll();
  const initialView = ['games', 'network', 'sessions', 'bridge'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
  setView(initialView);
  bindEvents();
  registerServiceWorker();
  hydrateOfficialArtwork();
  maybeShowOnboarding();
})();