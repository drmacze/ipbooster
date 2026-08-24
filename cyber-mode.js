(() => {
  'use strict';

  const COMMUNITY_URL = 'https://www.icloud.com/shortcuts/58e97ffb70624989a216cbc1a3e70e97';
  const COMMUNITY_ID = '58e97ffb70624989a216cbc1a3e70e97';
  const RESULT_TEMPLATE_URL = './shortcuts/ipbooster-cyber-result.html';
  const RESULT_PREVIEW_URL = './shortcuts/ipbooster-cyber-result-preview.html';
  const K = {
    cfg: 'ipbooster.cyber.v1',
    games: 'ipbooster.games.v1',
    router: 'ipbooster.smartplay.v4',
    quick: 'ipbooster.quicknet.v3',
    full: 'ipbooster.network.v1',
    pending: 'ipbooster.pending-session.v2'
  };
  const DEFAULT = {
    enabled: false,
    shortcutName: 'iPBooster Cyber',
    autoClean: true,
    modifiedConfirmed: false,
    sourceId: COMMUNITY_ID,
    version: 2
  };

  const $ = (s, r = document) => r.querySelector(s);
  const load = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const esc = v => String(v ?? '').replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
  const enc = v => encodeURIComponent(String(v ?? '')).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  const cfg = () => ({ ...DEFAULT, ...load(K.cfg, {}) });
  const games = () => { const v = load(K.games, []); return Array.isArray(v) ? v : []; };
  const game = id => games().find(g => String(g.id) === String(id));
  const router = () => load(K.router, {});
  const routeKey = g => router().targets?.[g?.id]?.routeKey?.trim() || String(g?.name || '').trim();
  const profileLabel = p => ({ competitive:'Competitive', balanced:'Balanced', battery:'Battery Saver' })[p] || 'Balanced';
  const powerTarget = p => p === 'battery' ? 'LPM On' : 'LPM Off';

  function latestNet() {
    const q = load(K.quick, null);
    const full = load(K.full, []);
    const f = Array.isArray(full) ? full[0] : null;
    if (q && (!f || Number(q.at) >= Number(f.at))) return q;
    return f || null;
  }

  function networkQuality(n) {
    const l = Number(n?.latency), j = Number(n?.jitter);
    if (!Number.isFinite(l) || !Number.isFinite(j)) return { label:'Not tested', cls:'warn' };
    if (l <= 35 && j <= 8) return { label:'Excellent', cls:'good' };
    if (l <= 65 && j <= 15) return { label:'Good', cls:'good' };
    if (l <= 110 && j <= 28) return { label:'Playable', cls:'warn' };
    return { label:'Unstable', cls:'warn' };
  }

  function toast(message, ms = 2800) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), ms);
  }

  function style() {
    if ($('#cyberModeStyle')) return;
    const s = document.createElement('style');
    s.id = 'cyberModeStyle';
    s.textContent = `
      .cyber-card{margin:12px 0;padding:15px;border-radius:22px;background:linear-gradient(145deg,rgba(26,94,255,.12),rgba(255,255,255,.035));border:1px solid rgba(65,145,255,.20)}
      .cyber-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.cyber-head strong{font-size:14px}.cyber-head small{display:block;color:var(--secondary,var(--muted));font-size:9px;line-height:1.45;margin-top:4px}.cyber-badge{padding:6px 9px;border-radius:999px;font-size:8px;font-weight:850;background:rgba(10,132,255,.15);color:#8dc6ff;white-space:nowrap}
      .cyber-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.cyber-actions button,.cyber-actions a{margin:0;text-decoration:none;display:flex;align-items:center;justify-content:center}
      .cyber-status{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:11px}.cyber-status div{padding:9px;border-radius:13px;background:rgba(255,255,255,.045)}.cyber-status span{display:block;color:var(--tertiary,var(--muted));font-size:8px}.cyber-status strong{display:block;font-size:10px;margin-top:3px}
      .cyber-section{padding:12px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);margin:10px 0}.cyber-section h4{margin:0 0 6px;font-size:12px}.cyber-section p{margin:0;color:var(--secondary,var(--muted));font-size:10px;line-height:1.5}.cyber-step{margin-top:7px;padding:10px;border-radius:12px;background:rgba(0,0,0,.20);font-size:10px;line-height:1.5}.cyber-step b{color:#79baff}
      .cyber-toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px;border-radius:15px;background:rgba(255,255,255,.04);margin-top:8px}.cyber-toggle span{font-size:10px}.cyber-toggle input{width:22px;height:22px}.cyber-field{display:block;font-size:10px;font-weight:700;margin-top:10px}.cyber-field input{margin-top:6px}
      .cyber-note{font-size:9px;color:var(--secondary,var(--muted));line-height:1.5;margin:9px 0 0}.cyber-good{color:#76dd8e}.cyber-warn{color:#ffd76a}
      @media(max-width:430px){.cyber-actions,.cyber-status{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function ensureDialog() {
    if ($('#cyberModeDialog')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <dialog id="cyberModeDialog" class="modal">
        <div class="modal-card glass strong-glass">
          <div class="modal-head"><div><p class="eyebrow">CYBER MODE · iPBOOSTER</p><h2>Automatic Game Prep</h2></div><button class="close-button" data-cyber-close>×</button></div>
          <div id="cyberModeBody"></div>
        </div>
      </dialog>`);
  }

  function recipeText() {
    return [
      'iPBooster Cyber v2 — modification recipe', '',
      'Source base: community Cyber Game Mode', COMMUNITY_URL, '',
      '1. Install the community shortcut, then DUPLICATE it.',
      '2. Rename the duplicate to: iPBooster Cyber',
      '3. Remove hard-coded app picker and cosmetic RAM/graphics claims that do not change iOS state.',
      '4. Shortcut Input format: GameKey|||ProfileKey|||ProfileLabel|||Latency|||Jitter|||Cache|||Focus|||Power|||NetworkQuality|||NetworkClass|||Time',
      '5. Split Text → Shortcut Input → separator: |||',
      '6. Item 1 = GameKey; 2 = ProfileKey; 3 = ProfileLabel; 4 = Latency; 5 = Jitter; 6 = Cache; 7 = Focus; 8 = Power; 9 = NetworkQuality; 10 = NetworkClass; 11 = Time.',
      '7. Set Focus → Gaming → On.',
      '8. If ProfileKey is competitive → Set Low Power Mode Off.',
      '9. Otherwise If ProfileKey is battery → Set Low Power Mode On.',
      '10. Otherwise → Set Low Power Mode Off.',
      '11. Replace the old CyberEngine HTML block with the iPBooster Result UI template.',
      '12. Replace {{GAME}}, {{PROFILE_LABEL}}, {{LATENCY}}, {{JITTER}}, {{CACHE}}, {{FOCUS}}, {{POWER}}, {{NETWORK_QUALITY}}, {{NETWORK_CLASS}}, and {{TIME}} with the variables above.',
      '13. Use Make Rich Text from HTML / Quick Look only if you want the status screen. Remove Quick Look for the fastest fully automatic launch.',
      '14. Run Shortcut → iPBooster Play → Input: GameKey.', '',
      'iPBooster Play stays the app router. Native iOS Game Mode takes over after the supported game opens.'
    ].join('\n');
  }

  async function copyResultHtml() {
    const response = await fetch(`${RESULT_TEMPLATE_URL}?t=${Date.now()}`, { cache:'no-store' });
    if (!response.ok) throw new Error(`HTML ${response.status}`);
    const html = await response.text();
    await navigator.clipboard.writeText(html);
    return html.length;
  }

  function renderDialog() {
    const c = cfg();
    const body = $('#cyberModeBody');
    if (!body) return;
    body.innerHTML = `
      <div class="cyber-section"><h4>1. Install the community base</h4><p>Gunakan Cyber Game Mode yang kamu kirim sebagai donor. Duplicate supaya versi original tetap aman.</p><div class="cyber-actions"><a class="primary-button" href="${COMMUNITY_URL}" target="_blank" rel="noopener noreferrer">Install Cyber Base</a><button class="secondary-button" data-cyber-open-app>Open Shortcuts</button></div></div>
      <div class="cyber-section"><h4>2. Convert to iPBooster Cyber v2</h4><p>Input dari web sekarang berisi game, profile, latency, jitter, cache, Focus, Power, dan network quality. Shortcut tidak perlu menebak data.</p>${[
        'Duplicate → rename “iPBooster Cyber”',
        'Split Shortcut Input dengan pemisah |||',
        'Item 1 = GameKey · Item 2 = ProfileKey',
        'Set Focus Gaming ON',
        'Competitive/Balanced → Low Power Mode OFF',
        'Battery Saver → Low Power Mode ON',
        'Run “iPBooster Play” dengan input GameKey'
      ].map((x,i)=>`<div class="cyber-step"><b>${i+1}.</b> ${x}</div>`).join('')}</div>
      <div class="cyber-section"><h4>3. Replace the old CyberEngine HTML</h4><p>HTML putih/ungu pada screenshot kamu adalah template lama dari donor. Ganti seluruh blok <b>&lt;!DOCTYPE html&gt;...</b> dengan Result UI26 iPBooster di bawah.</p><div class="cyber-actions"><a class="secondary-button" href="${RESULT_PREVIEW_URL}" target="_blank" rel="noopener noreferrer">Preview Result UI</a><button class="primary-button" data-cyber-copy-html>Copy Result HTML</button></div>${[
        'Paste HTML baru ke action Text yang sebelumnya berisi HTML CyberEngine.',
        'Sesudah Text, gunakan Replace Text untuk mengganti placeholder {{GAME}}, {{PROFILE_LABEL}}, {{LATENCY}}, {{JITTER}}, {{CACHE}}, {{FOCUS}}, {{POWER}}, {{NETWORK_QUALITY}}, {{NETWORK_CLASS}}, {{TIME}}.',
        'Hasil akhir masuk ke Make Rich Text from HTML / Quick Look.',
        'Jika ingin launch benar-benar tanpa berhenti, hapus Quick Look dan langsung Run iPBooster Play.'
      ].map((x,i)=>`<div class="cyber-step"><b>${i+1}.</b> ${x}</div>`).join('')}</div>
      <label class="cyber-field">Nama shortcut hasil modifikasi<input id="cyberShortcutName" value="${esc(c.shortcutName)}" maxlength="100"></label>
      <label class="cyber-toggle"><span>Auto cache maintenance sebelum launch</span><input id="cyberAutoClean" type="checkbox" ${c.autoClean ? 'checked' : ''}></label>
      <p class="cyber-note">Cache maintenance hanya membersihkan cache/runtime iPBooster dan preflight stale. Cache game lain tetap dilindungi sandbox iOS.</p>
      <div class="cyber-actions"><button class="secondary-button" data-cyber-copy>Copy Full Recipe</button><button class="secondary-button" data-cyber-open>Open iPBooster Cyber</button><button class="primary-button" data-cyber-confirm>${c.modifiedConfirmed ? '✓ Mod Confirmed' : 'I Finished the Mod'}</button><button class="secondary-button" data-cyber-disable>${c.enabled ? 'Disable Cyber Mode' : 'Keep Disabled'}</button></div>`;
  }

  function mountCard() {
    style(); ensureDialog();
    const automation = $('#ui26AutomationDashboard') || $('[data-view="bridge"] .page-intro');
    if (!automation || $('#cyberModeCard')) return;
    const root = document.createElement('section');
    root.id = 'cyberModeCard';
    root.className = 'cyber-card';
    automation.insertAdjacentElement('afterend', root);
    refreshCard();
  }

  function refreshCard() {
    const root = $('#cyberModeCard');
    if (!root) return;
    const c = cfg();
    root.innerHTML = `
      <div class="cyber-head"><div><strong>Cyber Mode Engine</strong><small>Community base → automatic iPBooster pre-launch + dynamic Result UI.</small></div><span class="cyber-badge">${c.enabled ? 'ACTIVE' : c.modifiedConfirmed ? 'READY' : 'SETUP'}</span></div>
      <div class="cyber-status"><div><span>Shortcut</span><strong>${esc(c.shortcutName)}</strong></div><div><span>Dynamic result</span><strong>UI26 v2</strong></div><div><span>Cache</span><strong>${c.autoClean ? 'Smart clean' : 'Off'}</strong></div></div>
      <div class="cyber-actions"><button class="primary-button" data-cyber-setup>${c.modifiedConfirmed ? 'Cyber Mode Settings' : 'Setup Cyber Mode'}</button><a class="secondary-button" href="${RESULT_PREVIEW_URL}" target="_blank" rel="noopener noreferrer">Preview Result UI</a></div>`;
  }

  function saveDialog(confirmMod = false) {
    const current = cfg();
    current.shortcutName = $('#cyberShortcutName')?.value.trim() || DEFAULT.shortcutName;
    current.autoClean = Boolean($('#cyberAutoClean')?.checked);
    current.version = 2;
    if (confirmMod) {
      current.modifiedConfirmed = true;
      current.enabled = true;
      current.confirmedAt = Date.now();
    }
    save(K.cfg, current);
    refreshCard();
    return current;
  }

  function buildPayload(g, cacheStatus = 'Ready') {
    const n = latestNet();
    const p = g?.profile || 'balanced';
    const q = networkQuality(n);
    const values = [
      routeKey(g), p, profileLabel(p),
      Number.isFinite(Number(n?.latency)) ? Number(n.latency) : '—',
      Number.isFinite(Number(n?.jitter)) ? Number(n.jitter) : '—',
      cacheStatus, 'Gaming On', powerTarget(p), q.label, q.cls,
      new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
    ];
    return values.join('|||');
  }

  function buildLaunchUrl(g, fallbackUrl = '', cacheStatus = 'Ready') {
    const c = cfg();
    if (!c.enabled || !c.modifiedConfirmed || !c.shortcutName.trim()) return fallbackUrl;
    return `shortcuts://run-shortcut?name=${enc(c.shortcutName)}&input=text&text=${enc(buildPayload(g, cacheStatus))}`;
  }

  function beginSession(g) {
    save(K.pending, {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      gameId: g.id, gameName: g.name, artworkUrl: g.artworkUrl || '', appStoreId: g.appStoreId || '',
      profile: g.profile || 'balanced', startedAt: Date.now(),
      cyberMode: { enabled:true, shortcut:cfg().shortcutName, sourceId:COMMUNITY_ID, version:2 }
    });
  }

  function trimStalePreflight() {
    try {
      const q = load(K.quick, null);
      if (q?.at && Date.now() - Number(q.at) > 6 * 60 * 60 * 1000) localStorage.removeItem(K.quick);
    } catch {}
  }

  function workerTrim() {
    return new Promise(resolve => {
      if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) { resolve(false); return; }
      const channel = new MessageChannel();
      const timer = setTimeout(() => resolve(false), 900);
      channel.port1.onmessage = e => { clearTimeout(timer); resolve(Boolean(e.data?.ok)); };
      try { navigator.serviceWorker.controller.postMessage({ type:'TRIM_APP_CACHE' }, [channel.port2]); }
      catch { clearTimeout(timer); resolve(false); }
    });
  }

  async function preLaunchMaintenance() {
    const c = cfg();
    if (!c.autoClean) return false;
    trimStalePreflight();
    return workerTrim();
  }

  async function launchCyber(g) {
    if (!g) return false;
    const c = cfg();
    if (!c.enabled || !c.modifiedConfirmed) return false;
    beginSession(g);
    const cleaned = await Promise.race([preLaunchMaintenance(), new Promise(resolve => setTimeout(() => resolve(false), 950))]);
    const r = router();
    const fallback = `shortcuts://run-shortcut?name=${enc(r.universalShortcut || 'iPBooster Play')}&input=text&text=${enc(routeKey(g))}`;
    location.href = buildLaunchUrl(g, fallback, c.autoClean ? (cleaned ? 'Clean' : 'Checked') : 'Off');
    return true;
  }

  function bind() {
    document.addEventListener('click', async e => {
      const perfLaunch = e.target.closest?.('[data-perf-launch]');
      if (perfLaunch && cfg().enabled && cfg().modifiedConfirmed) {
        const g = game(perfLaunch.dataset.perfLaunch);
        if (g) {
          e.preventDefault(); e.stopImmediatePropagation(); $('#perfDialog')?.close();
          toast(cfg().autoClean ? 'Preparing Cyber Mode + cache maintenance…' : 'Preparing Cyber Mode…', 1800);
          await launchCyber(g); return;
        }
      }

      if (e.target.closest?.('[data-cyber-close]')) { $('#cyberModeDialog')?.close(); return; }
      if (e.target.closest?.('[data-cyber-setup]')) { renderDialog(); $('#cyberModeDialog')?.showModal(); return; }
      if (e.target.closest?.('[data-cyber-open-app]')) { location.href = 'shortcuts://'; return; }
      if (e.target.closest?.('[data-cyber-open]')) {
        const c = saveDialog(false); location.href = `shortcuts://open-shortcut?name=${enc(c.shortcutName)}`; return;
      }
      if (e.target.closest?.('[data-cyber-copy-html]')) {
        saveDialog(false);
        try { const size = await copyResultHtml(); toast(`Result HTML copied (${Math.round(size/1024)} KB).`); }
        catch { toast('HTML belum bisa dicopy. Buka Preview lalu coba lagi.'); }
        return;
      }
      if (e.target.closest?.('[data-cyber-copy]')) {
        saveDialog(false);
        try { await navigator.clipboard.writeText(recipeText()); toast('Cyber v2 recipe copied.'); }
        catch { toast('Copy tidak tersedia. Recipe tetap terlihat di setup.'); }
        return;
      }
      if (e.target.closest?.('[data-cyber-confirm]')) {
        const c = saveDialog(true); renderDialog(); toast(`${c.shortcutName} v2 enabled.`); return;
      }
      if (e.target.closest?.('[data-cyber-disable]')) {
        const c = saveDialog(false); c.enabled = false; save(K.cfg, c); renderDialog(); refreshCard(); toast('Cyber Mode disabled.');
      }
    }, true);
  }

  window.iPBoosterCyber = {
    config:cfg, buildLaunchUrl, buildPayload, preLaunchMaintenance, launchCyber,
    communityUrl:COMMUNITY_URL, resultTemplateUrl:RESULT_TEMPLATE_URL,
    resultPreviewUrl:RESULT_PREVIEW_URL, recipeText
  };

  style(); ensureDialog(); bind();
  setTimeout(mountCard, 500);
  const observer = new MutationObserver(() => { clearTimeout(observer.t); observer.t = setTimeout(mountCard, 220); });
  observer.observe(document.body, { childList:true, subtree:true });
  addEventListener('pageshow', () => setTimeout(() => { mountCard(); refreshCard(); }, 700));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(() => { mountCard(); refreshCard(); }, 700); });
})();