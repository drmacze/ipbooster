(() => {
  'use strict';

  const K = {
    games: 'ipbooster.games.v1',
    router: 'ipbooster.smartplay.v4',
    perf: 'ipbooster.performance.v1',
    native: 'ipbooster.native-mode.v1'
  };

  const $ = s => document.querySelector(s);
  const load = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const enc = v => encodeURIComponent(String(v ?? '')).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  const esc = v => String(v ?? '').replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));

  const policies = {
    competitive: {
      label: 'Competitive',
      launcher: ['Set Focus → Gaming → On', 'Set Low Power Mode → Off'],
      opened: ['Set Focus → Gaming → On', 'Set Low Power Mode → Off'],
      closed: ['Set Focus → Gaming → Off', 'Get Battery Level', 'If Battery Level ≤ 20 → Set Low Power Mode → On'],
      note: 'Prioritizes native Game Mode handoff and avoids Low Power Mode performance limits.'
    },
    balanced: {
      label: 'Balanced',
      launcher: ['Set Focus → Gaming → On', 'Set Low Power Mode → Off'],
      opened: ['Set Focus → Gaming → On'],
      closed: ['Set Focus → Gaming → Off'],
      note: 'Keeps launch simple while removing notification distractions.'
    },
    battery: {
      label: 'Battery Saver',
      launcher: ['Set Focus → Gaming → On', 'Set Low Power Mode → On'],
      opened: ['Set Focus → Gaming → On', 'Set Low Power Mode → On'],
      closed: ['Set Focus → Gaming → Off'],
      note: 'Trades maximum refresh/performance headroom for battery life.'
    }
  };

  function games() {
    const g = load(K.games, []);
    return Array.isArray(g) ? g : [];
  }

  function router() { return load(K.router, {}); }
  function state() { return { confirmed: {}, ...load(K.native, {}) }; }
  function game(id) { return games().find(g => String(g.id) === String(id)); }
  function policy(g) { return policies[g?.profile] || policies.balanced; }
  function routeKey(g) { return router().targets?.[g.id]?.routeKey?.trim() || g.name; }

  function style() {
    if ($('#nativeModeStyle')) return;
    const s = document.createElement('style');
    s.id = 'nativeModeStyle';
    s.textContent = `
      .native-card{margin:14px 0;padding:16px;border-radius:22px}
      .native-card-head{display:flex;justify-content:space-between;gap:12px;align-items:start}
      .native-card-head h3{margin:2px 0 4px}.native-card-head small{color:var(--muted)}
      .native-pill{font-size:10px;font-weight:800;padding:7px 10px;border-radius:999px;background:rgba(139,255,115,.1);color:var(--accent);white-space:nowrap}
      .native-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}
      .native-grid div{padding:10px;border-radius:13px;background:rgba(255,255,255,.045)}
      .native-grid span{display:block;color:var(--muted);font-size:9px}.native-grid strong{display:block;margin-top:4px;font-size:12px}
      .native-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.native-actions button{margin:0}
      .native-section{margin-top:14px;padding:12px;border-radius:16px;background:rgba(255,255,255,.035);border:1px solid var(--stroke)}
      .native-section h4{margin:0 0 8px;font-size:12px}.native-section p{margin:0;color:var(--muted);font-size:10px;line-height:1.55}
      .native-step{padding:10px;border-radius:12px;background:rgba(0,0,0,.2);margin-top:7px;font-size:11px;line-height:1.45}
      .native-step b{color:var(--accent)}
      .native-warning{padding:11px;border-radius:14px;background:rgba(255,209,102,.06);border:1px solid rgba(255,209,102,.16);font-size:10px;line-height:1.5;color:#c8b98a;margin-top:12px}
      .native-links{display:grid;gap:8px;margin-top:12px}.native-links a{display:flex;justify-content:center;align-items:center;text-decoration:none;min-height:44px;border-radius:13px;border:1px solid var(--stroke);color:var(--text);background:rgba(255,255,255,.04);font-size:11px;font-weight:800}
      @media(max-width:430px){.native-actions,.native-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function ensureDialog() {
    if ($('#nativeModeDialog')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <dialog id="nativeModeDialog" class="modal">
        <div class="modal-card glass strong-glass">
          <div class="modal-head">
            <div><p class="eyebrow">NATIVE GAMING SYSTEM v3.2</p><h2 id="nativeModeTitle">Setup</h2></div>
            <button type="button" class="close-button" data-native-close>×</button>
          </div>
          <div id="nativeModeBody"></div>
        </div>
      </dialog>`);
  }

  function focusGame() {
    const list = games();
    if (!list.length) return null;
    const sessions = load('ipbooster.sessions.v2', []);
    const last = Array.isArray(sessions) ? sessions[0] : null;
    return last ? (list.find(g => String(g.id) === String(last.gameId)) || list[0]) : list[0];
  }

  function injectCard() {
    const home = $('[data-view="home"]');
    if (!home || $('#nativeModeCard')) return;
    const el = document.createElement('section');
    el.id = 'nativeModeCard';
    el.className = 'native-card glass strong-glass';
    const perf = $('#perfCard');
    (perf || home.querySelector('.metrics-grid'))?.insertAdjacentElement('afterend', el);
  }

  function card() {
    const root = $('#nativeModeCard');
    if (!root) return;
    const g = focusGame();
    if (!g) {
      root.innerHTML = `<div class="native-card-head"><div><p class="eyebrow">NATIVE GAMING SYSTEM</p><h3>Add a game first</h3><small>Native automation recipes will appear here.</small></div><span class="native-pill">iOS 26+</span></div>`;
      return;
    }
    const p = policy(g);
    const st = state();
    const ok = Boolean(st.confirmed?.[g.id]?.profile === (g.profile || 'balanced'));
    root.innerHTML = `
      <div class="native-card-head"><div><p class="eyebrow">NATIVE GAMING SYSTEM</p><h3>${esc(g.name)}</h3><small>${esc(p.label)} · launcher + automatic app trigger</small></div><span class="native-pill">${ok ? 'Configured' : 'Setup'}</span></div>
      <div class="native-grid"><div><span>Native Game Mode</span><strong>Automatic</strong></div><div><span>System automation</span><strong>${ok ? 'Confirmed' : 'Not confirmed'}</strong></div></div>
      <div class="native-actions"><button class="secondary-button" data-native-setup="${esc(g.id)}">Open Setup</button><button class="primary-button" data-perf-play="${esc(g.id)}">Performance Play</button></div>`;
  }

  function stepsHtml(items) {
    return items.map((x, i) => `<div class="native-step"><b>${i + 1}.</b> ${esc(x)}</div>`).join('');
  }

  function show(g) {
    if (!g) return;
    style(); ensureDialog();
    const p = policy(g);
    const st = state();
    const confirmed = Boolean(st.confirmed?.[g.id]?.profile === (g.profile || 'balanced'));
    const multiple = games().length > 1;
    const launcher = multiple ? [`If Shortcut Input is “${routeKey(g)}”`, ...p.launcher, `Open App → ${g.name}`] : [...p.launcher, `Open App → ${g.name}`];
    $('#nativeModeTitle').textContent = `${g.name} · ${p.label}`;
    $('#nativeModeBody').innerHTML = `
      <div class="native-section"><h4>A. iPBooster Play shortcut</h4><p>This runs <b>before</b> the game opens, so Low Power Mode / Focus state is already prepared when native Game Mode takes over.</p>${stepsHtml(launcher)}</div>
      <div class="native-section"><h4>B. Failsafe App automation — when ${esc(g.name)} opens</h4><p>Shortcuts → Automation → + → App → choose ${esc(g.name)} → Is Opened → Run Immediately. Add these actions:</p>${stepsHtml(p.opened)}</div>
      <div class="native-section"><h4>C. Cleanup automation — when ${esc(g.name)} closes</h4><p>Create another App automation using Is Closed → Run Immediately:</p>${stepsHtml(p.closed)}</div>
      <div class="native-section"><h4>Why this is the reliable design</h4><p>${esc(p.note)} Native Game Mode itself remains controlled by iOS and activates automatically for supported games. The App automation is a failsafe, so system prep still runs even if the game is launched outside iPBooster.</p></div>
      <div class="native-warning"><b>No local shell boost on stock iOS.</b> Run Shell Script is not available as a local privileged iPhone action. “Run Script over SSH” executes on another computer, and terminal apps on iPhone remain sandboxed, so they cannot change CPU/GPU scheduler, thermal limits, or another app’s FPS.</div>
      <div class="native-actions"><button class="secondary-button" data-native-open-shortcut>Open iPBooster Play</button><button class="secondary-button" data-native-open-app>Open Shortcuts</button><button class="secondary-button" data-native-copy="${esc(g.id)}">Copy Full Recipe</button><button class="primary-button" data-native-confirm="${esc(g.id)}">${confirmed ? '✓ Setup Confirmed' : 'I Finished Setup'}</button></div>
      <div class="native-links"><a href="https://routinehub.co/shortcut/18337/" target="_blank" rel="noopener noreferrer">Community reference: Ultimate Game Mode</a><a href="https://routinehub.co/shortcut/25900/" target="_blank" rel="noopener noreferrer">Community reference: CyberEngine Gaming Mode</a></div>
      <p class="perf-note">Community shortcuts are external references only. Review every action before adding them; iPBooster does not depend on them.</p>`;
    if (!$('#nativeModeDialog').open) $('#nativeModeDialog').showModal();
  }

  function recipeText(g) {
    const p = policy(g);
    const multiple = games().length > 1;
    const launcher = multiple ? [`If Shortcut Input is "${routeKey(g)}"`, ...p.launcher, `Open App -> ${g.name}`] : [...p.launcher, `Open App -> ${g.name}`];
    return [
      `iPBooster Native Gaming System - ${g.name} - ${p.label}`,
      '',
      'A. iPBooster Play',
      ...launcher.map((x, i) => `${i + 1}. ${x}`),
      '',
      `B. Automation: App ${g.name} Is Opened / Run Immediately`,
      ...p.opened.map((x, i) => `${i + 1}. ${x}`),
      '',
      `C. Automation: App ${g.name} Is Closed / Run Immediately`,
      ...p.closed.map((x, i) => `${i + 1}. ${x}`),
      '',
      'Native Game Mode: automatic by iOS for supported games.'
    ].join('\n');
  }

  function confirm(g) {
    const st = state();
    st.confirmed ||= {};
    st.confirmed[g.id] = { profile: g.profile || 'balanced', at: Date.now() };
    save(K.native, st);
    const perf = load(K.perf, { enabled: true, autoCheck: true, prep: {} });
    perf.prep ||= {};
    perf.prep[g.id] = { profile: g.profile || 'balanced', at: Date.now(), source: 'native-mode-setup' };
    save(K.perf, perf);
    card(); show(g);
  }

  function bind() {
    document.addEventListener('click', async e => {
      if (e.target.closest?.('[data-native-close]')) { $('#nativeModeDialog')?.close(); return; }
      const setup = e.target.closest?.('[data-native-setup]');
      if (setup) { e.preventDefault(); show(game(setup.dataset.nativeSetup)); return; }
      if (e.target.closest?.('[data-native-open-shortcut]')) {
        e.preventDefault();
        const name = router().universalShortcut || 'iPBooster Play';
        location.href = `shortcuts://open-shortcut?name=${enc(name)}`;
        return;
      }
      if (e.target.closest?.('[data-native-open-app]')) { e.preventDefault(); location.href = 'shortcuts://'; return; }
      const copy = e.target.closest?.('[data-native-copy]');
      if (copy) {
        e.preventDefault();
        const g = game(copy.dataset.nativeCopy);
        if (!g) return;
        try { await navigator.clipboard.writeText(recipeText(g)); } catch {}
        const toast = $('#toast'); if (toast) { toast.textContent = 'Native setup recipe copied.'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); }
        return;
      }
      const done = e.target.closest?.('[data-native-confirm]');
      if (done) { e.preventDefault(); const g = game(done.dataset.nativeConfirm); if (g) confirm(g); }
    }, true);
  }

  style(); ensureDialog(); injectCard(); card(); bind();
  const o = new MutationObserver(() => { clearTimeout(o.t); o.t = setTimeout(() => { injectCard(); card(); }, 250); });
  o.observe(document.body, { childList: true, subtree: false });
  addEventListener('pageshow', () => setTimeout(card, 700));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(card, 700); });
})();