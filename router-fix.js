(() => {
  'use strict';

  const K = {
    games: 'ipbooster.games.v1',
    config: 'ipbooster.smartplay.v4',
    legacy: 'ipbooster.smartplay.v3',
    pending: 'ipbooster.pending-session.v2'
  };
  const DEFAULT_NAME = 'iPBooster Play';

  const load = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };
  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const enc = value => encodeURIComponent(String(value ?? '')).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  const esc = value => String(value ?? '').replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));

  function migrate() {
    const current = load(K.config, null);
    if (current) return { universalShortcut: DEFAULT_NAME, universalReady: false, targets: {}, ...current };
    const old = load(K.legacy, {});
    const targets = {};
    Object.entries(old.targets || {}).forEach(([id, value]) => {
      targets[id] = { routeKey: '', deepLink: value?.deepLink || '' };
    });
    const next = {
      universalShortcut: old.universalShortcut || DEFAULT_NAME,
      universalReady: false,
      targets,
      routerVersion: 1
    };
    save(K.config, next);
    return next;
  }

  let config = migrate();
  let activeGameId = null;

  const games = () => {
    const value = load(K.games, []);
    return Array.isArray(value) ? value : [];
  };
  const gameById = id => games().find(g => String(g.id) === String(id));
  const routeKey = game => config.targets?.[game.id]?.routeKey?.trim() || String(game.name || '').trim();
  const deepLink = game => config.targets?.[game.id]?.deepLink?.trim() || '';
  const shortcutName = () => config.universalShortcut?.trim() || DEFAULT_NAME;
  const runUrl = game => `shortcuts://run-shortcut?name=${enc(shortcutName())}&input=text&text=${enc(routeKey(game))}`;
  const openUrl = () => `shortcuts://open-shortcut?name=${enc(shortcutName())}`;

  function toast(message) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  function beginSession(game) {
    save(K.pending, {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      gameId: game.id,
      gameName: game.name,
      artworkUrl: game.artworkUrl || '',
      appStoreId: game.appStoreId || '',
      profile: game.profile || 'balanced',
      startedAt: Date.now()
    });
  }

  function recipeText() {
    const list = games();
    if (!list.length) return 'Tambahkan game ke library iPBooster terlebih dahulu.';
    return [
      'iPBooster Play router:',
      ...list.map((game, i) => `${i + 1}. Jika Shortcut Input adalah "${routeKey(game)}" → Buka App → ${game.name}`),
      `${list.length + 1}. Jika tidak cocok → Tampilkan Peringatan "Game belum dipetakan"`
    ].join('\n');
  }

  function ensureStyle() {
    if (document.getElementById('routerFixStyle')) return;
    const style = document.createElement('style');
    style.id = 'routerFixStyle';
    style.textContent = `
      .router-box{margin:12px 0;padding:12px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid var(--stroke)}
      .router-box strong{font-size:11px}.router-list{display:grid;gap:7px;margin-top:9px}.router-row{padding:9px;border-radius:12px;background:rgba(0,0,0,.2);font-size:10px;line-height:1.5}.router-row code{color:var(--accent)}
      .router-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.router-actions button{margin-top:0}.router-field{display:block;margin-top:12px;font-size:11px;font-weight:750}.router-field input{margin-top:7px}
      .router-warning{margin-top:12px;padding:11px;border-radius:14px;background:rgba(255,209,102,.06);border:1px solid rgba(255,209,102,.16);color:#c8b98a;font-size:10px;line-height:1.5}
      @media(max-width:430px){.router-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function renderRecipe() {
    const root = document.getElementById('routerRecipe');
    if (!root) return;
    const list = games();
    root.innerHTML = list.length
      ? `<strong>Susunan Shortcut yang benar</strong><div class="router-list">${list.map(game => `<div class="router-row">Jika <b>Shortcut Input</b> adalah <code>${esc(routeKey(game))}</code> → <b>Buka App</b> → pilih <b>${esc(game.name)}</b></div>`).join('')}<div class="router-row">Jika tidak ada yang cocok → <b>Tampilkan Peringatan</b> “Game belum dipetakan”</div></div>`
      : '<span class="smart-note">Tambahkan game ke library dulu.</span>';
  }

  function ensureDialog() {
    if (document.getElementById('routerFixDialog')) return;
    const d = document.createElement('dialog');
    d.id = 'routerFixDialog';
    d.className = 'modal';
    d.innerHTML = `
      <div class="modal-card glass strong-glass">
        <div class="modal-head"><div><p class="eyebrow">SMART PLAY v2.7</p><h2>Router Launcher</h2></div><button type="button" class="close-button" id="routerClose">×</button></div>
        <div id="routerCurrent"></div>
        <p class="page-intro" style="margin:0">Yang kamu lihat di pemilih <b>App</b> itu benar: parameter Buka App hanya menerima app yang dipilih. <b>Shortcut Input</b> dipakai di aksi <b>Jika</b>, bukan di parameter App.</p>
        <label class="router-field">Nama Shortcut<input id="routerShortcutName" maxlength="100" /></label>
        <div class="smart-steps">
          <div class="smart-step"><span>1</span><div><strong>Hapus Buka App kosong</strong><p>Di iPBooster Play, hapus aksi “Buka App” yang parameter App-nya belum dipilih.</p></div></div>
          <div class="smart-step"><span>2</span><div><strong>Tambah “Jika”</strong><p>Tap input kondisi → pilih <b>Shortcut Input</b> → kondisi <b>adalah</b> → ketik nama game persis.</p></div></div>
          <div class="smart-step"><span>3</span><div><strong>Di dalam cabang, tambah “Buka App”</strong><p>Tap App lalu pilih game sebenarnya dari daftar app seperti screenshot kamu.</p></div></div>
          <div class="smart-step"><span>4</span><div><strong>Ulangi di “Jika Tidak”</strong><p>Tambahkan Jika berikutnya untuk setiap game di library.</p></div></div>
        </div>
        <div id="routerRecipe" class="router-box"></div>
        <div class="router-warning">Jadi: <b>Buka App tetap aksi yang benar</b>, tetapi harus memilih game secara statis pada setiap cabang. Teks/bundle ID tidak bisa langsung berubah menjadi objek App.</div>
        <details style="margin-top:12px"><summary style="font-size:11px;color:var(--muted)">Advanced per-game key</summary><label class="router-field">Router key<input id="routerKey" maxlength="160" /></label><label class="router-field">Direct deep link (optional)<input id="routerDeepLink" maxlength="300" placeholder="game-scheme://" /></label></details>
        <div class="router-actions"><button type="button" class="secondary-button" id="routerOpen">Open Existing</button><button type="button" class="secondary-button" id="routerCopy">Copy Recipe</button><button type="button" class="secondary-button" id="routerCreate">Create Blank</button><button type="button" class="primary-button" id="routerReady">Router Ready</button></div>
      </div>`;
    document.body.appendChild(d);
    document.getElementById('routerClose').addEventListener('click', () => d.close());
    document.getElementById('routerOpen').addEventListener('click', () => { persist(false); location.href = openUrl(); });
    document.getElementById('routerCreate').addEventListener('click', () => { persist(false); location.href = 'shortcuts://create-shortcut'; });
    document.getElementById('routerCopy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(recipeText()); toast('Router recipe copied.'); }
      catch { toast('Copy tidak tersedia; recipe tetap terlihat di layar.'); }
    });
    document.getElementById('routerReady').addEventListener('click', () => { persist(true); d.close(); syncCard(); toast('Smart Play Router enabled.'); });
  }

  function persist(markReady) {
    config.universalShortcut = document.getElementById('routerShortcutName')?.value.trim() || DEFAULT_NAME;
    if (markReady) config.universalReady = true;
    config.targets ||= {};
    if (activeGameId) {
      config.targets[activeGameId] = {
        routeKey: document.getElementById('routerKey')?.value.trim() || '',
        deepLink: document.getElementById('routerDeepLink')?.value.trim() || ''
      };
    }
    save(K.config, config);
  }

  function openSetup(game = null) {
    ensureStyle(); ensureDialog();
    activeGameId = game?.id || null;
    document.getElementById('routerShortcutName').value = shortcutName();
    document.getElementById('routerKey').value = game ? routeKey(game) : '';
    document.getElementById('routerDeepLink').value = game ? deepLink(game) : '';
    document.getElementById('routerCurrent').innerHTML = game ? `<div class="smart-current-game">${game.artworkUrl ? `<img src="${esc(game.artworkUrl)}" alt="">` : ''}<div><strong>${esc(game.name)}</strong><small>iPBooster mengirim: ${esc(routeKey(game))}</small></div></div>` : '';
    renderRecipe();
    document.getElementById('routerFixDialog').showModal();
  }

  function launch(game) {
    const direct = deepLink(game);
    if (direct) { beginSession(game); location.href = direct; return; }
    if (!config.universalReady) { openSetup(game); return; }
    beginSession(game);
    location.href = runUrl(game);
  }

  function syncCard() {
    const card = document.getElementById('smartPlayCard');
    if (card) {
      const title = card.querySelector('strong'); if (title) title.textContent = 'Smart Play Router';
      const desc = card.querySelector('#smartPlayDesc'); if (desc) desc.textContent = config.universalReady ? `${shortcutName()} · If → Open App` : 'Setup If → Open App router';
      const status = card.querySelector('#smartPlayStatus'); if (status) { status.textContent = config.universalReady ? 'Ready' : 'Setup'; status.classList.toggle('ready', config.universalReady); }
    }
  }

  document.addEventListener('click', event => {
    const play = event.target.closest?.('[data-game-play]');
    if (play) {
      const game = gameById(play.dataset.gamePlay);
      if (!game) return;
      event.preventDefault(); event.stopImmediatePropagation(); launch(game); return;
    }
    const card = event.target.closest?.('#smartPlayCard');
    if (card) { event.preventDefault(); event.stopImmediatePropagation(); openSetup(); }
  }, true);

  ensureStyle(); ensureDialog(); syncCard();
  const observer = new MutationObserver(() => { clearTimeout(observer.t); observer.t = setTimeout(syncCard, 40); });
  observer.observe(document.body, { childList: true, subtree: true });
})();