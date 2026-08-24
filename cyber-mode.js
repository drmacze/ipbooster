(() => {
  'use strict';

  const COMMUNITY_URL = 'https://www.icloud.com/shortcuts/58e97ffb70624989a216cbc1a3e70e97';
  const COMMUNITY_ID = '58e97ffb70624989a216cbc1a3e70e97';
  const K = {
    cfg: 'ipbooster.cyber.v1',
    games: 'ipbooster.games.v1',
    router: 'ipbooster.smartplay.v4',
    quick: 'ipbooster.quicknet.v3'
  };
  const DEFAULT = {
    enabled: false,
    shortcutName: 'iPBooster Cyber',
    autoClean: true,
    modifiedConfirmed: false,
    sourceId: COMMUNITY_ID,
    version: 1
  };

  const $ = (s, r = document) => r.querySelector(s);
  const load = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const esc = v => String(v ?? '').replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
  const enc = v => encodeURIComponent(String(v ?? '')).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  const cfg = () => ({ ...DEFAULT, ...load(K.cfg, {}) });
  const games = () => { const v = load(K.games, []); return Array.isArray(v) ? v : []; };
  const router = () => load(K.router, {});
  const routeKey = game => router().targets?.[game?.id]?.routeKey?.trim() || String(game?.name || '').trim();

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
      'iPBooster Cyber — modification recipe',
      '',
      'Source base: community Cyber Game Mode',
      COMMUNITY_URL,
      '',
      '1. Install community shortcut, then DUPLICATE it.',
      '2. Rename the duplicate to: iPBooster Cyber',
      '3. Remove app picker / hard-coded game launch / cosmetic RAM cleaner steps that do not change iOS state.',
      '4. Shortcut Input format from iPBooster: GameKey|||Profile',
      '5. Split Text → Shortcut Input → separator: |||',
      '6. Get Item 1 from List → set variable GameKey',
      '7. Get Item 2 from List → set variable Profile',
      '8. Set Focus → Gaming → On',
      '9. If Profile is competitive → Set Low Power Mode Off',
      '10. Otherwise If Profile is battery → Set Low Power Mode On',
      '11. Otherwise (balanced) → Set Low Power Mode Off',
      '12. Run Shortcut → iPBooster Play → Input: GameKey',
      '',
      'iPBooster Play remains the app router (If GameKey → Open App).',
      'Native iOS Game Mode takes over automatically after a supported game opens.',
      'Do not add shell/SSH “boost” commands: they cannot change the iPhone CPU/GPU scheduler on stock iOS.'
    ].join('\n');
  }

  function renderDialog() {
    const c = cfg();
    const body = $('#cyberModeBody');
    if (!body) return;
    body.innerHTML = `
      <div class="cyber-section"><h4>1. Install the community base</h4><p>Gunakan shortcut Cyber Game Mode yang kamu kirim sebagai donor/base. Setelah terpasang, duplicate supaya versi komunitas tetap utuh.</p><div class="cyber-actions"><a class="primary-button" href="${COMMUNITY_URL}" target="_blank" rel="noopener noreferrer">Install Cyber Base</a><button class="secondary-button" data-cyber-open-app>Open Shortcuts</button></div></div>
      <div class="cyber-section"><h4>2. Convert it to iPBooster Cyber</h4><p>Versi mod menerima input otomatis dari web berupa <b>GameKey|||Profile</b>. Ia menyiapkan Focus/Low Power Mode, lalu meneruskan GameKey ke iPBooster Play.</p>${[
        'Duplicate shortcut komunitas → rename “iPBooster Cyber”',
        'Split Text Shortcut Input memakai pemisah |||',
        'Item 1 = GameKey · Item 2 = Profile',
        'Set Focus Gaming ON',
        'Competitive → Low Power Mode OFF',
        'Battery → Low Power Mode ON',
        'Balanced → Low Power Mode OFF',
        'Run Shortcut “iPBooster Play” dengan input GameKey'
      ].map((x,i)=>`<div class="cyber-step"><b>${i+1}.</b> ${x}</div>`).join('')}</div>
      <label class="cyber-field">Nama shortcut hasil modifikasi<input id="cyberShortcutName" value="${esc(c.shortcutName)}" maxlength="100"></label>
      <label class="cyber-toggle"><span>Auto cache maintenance sebelum launch</span><input id="cyberAutoClean" type="checkbox" ${c.autoClean ? 'checked' : ''}></label>
      <p class="cyber-note">Cache maintenance hanya membersihkan cache/runtime iPBooster sendiri dan data preflight yang stale. iOS tidak memberi PWA/Shortcuts izin menghapus cache Minecraft, MLBB, CODM, atau aplikasi lain.</p>
      <div class="cyber-actions"><button class="secondary-button" data-cyber-copy>Copy Full Recipe</button><button class="secondary-button" data-cyber-open>Open iPBooster Cyber</button><button class="primary-button" data-cyber-confirm>${c.modifiedConfirmed ? '✓ Mod Confirmed' : 'I Finished the Mod'}</button><button class="secondary-button" data-cyber-disable>${c.enabled ? 'Disable Cyber Mode' : 'Keep Disabled'}</button></div>`;
  }

  function mountCard() {
    style(); ensureDialog();
    const automation = $('#ui26AutomationDashboard') || $('[data-view="bridge"] .page-intro');
    if (!automation || $('#cyberModeCard')) return;
    const root = document.createElement('section');
    root.id = 'cyberModeCard';
    root.className = 'cyber-card';
    (automation.id === 'ui26AutomationDashboard' ? automation : automation).insertAdjacentElement('afterend', root);
    refreshCard();
  }

  function refreshCard() {
    const root = $('#cyberModeCard');
    if (!root) return;
    const c = cfg();
    root.innerHTML = `
      <div class="cyber-head"><div><strong>Cyber Mode Engine</strong><small>Community base → modified into an automatic iPBooster pre-launch stage.</small></div><span class="cyber-badge">${c.enabled ? 'ACTIVE' : c.modifiedConfirmed ? 'READY' : 'SETUP'}</span></div>
      <div class="cyber-status"><div><span>Shortcut</span><strong>${esc(c.shortcutName)}</strong></div><div><span>Auto profile</span><strong>${c.modifiedConfirmed ? 'Game + Profile' : 'Not configured'}</strong></div><div><span>Cache</span><strong>${c.autoClean ? 'Smart clean' : 'Off'}</strong></div></div>
      <div class="cyber-actions"><button class="primary-button" data-cyber-setup>${c.modifiedConfirmed ? 'Cyber Mode Settings' : 'Setup Cyber Mode'}</button><a class="secondary-button" href="${COMMUNITY_URL}" target="_blank" rel="noopener noreferrer">Community Source</a></div>`;
  }

  function saveDialog(confirmMod = false) {
    const current = cfg();
    current.shortcutName = $('#cyberShortcutName')?.value.trim() || DEFAULT.shortcutName;
    current.autoClean = Boolean($('#cyberAutoClean')?.checked);
    if (confirmMod) {
      current.modifiedConfirmed = true;
      current.enabled = true;
      current.confirmedAt = Date.now();
    }
    save(K.cfg, current);
    refreshCard();
    return current;
  }

  function buildLaunchUrl(game, fallbackUrl = '') {
    const c = cfg();
    if (!c.enabled || !c.modifiedConfirmed || !c.shortcutName.trim()) return fallbackUrl;
    const payload = `${routeKey(game)}|||${game?.profile || 'balanced'}`;
    return `shortcuts://run-shortcut?name=${enc(c.shortcutName)}&input=text&text=${enc(payload)}`;
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
      try { navigator.serviceWorker.controller.postMessage({ type: 'TRIM_APP_CACHE' }, [channel.port2]); }
      catch { clearTimeout(timer); resolve(false); }
    });
  }

  async function preLaunchMaintenance() {
    const c = cfg();
    if (!c.autoClean) return false;
    trimStalePreflight();
    return workerTrim();
  }

  function bind() {
    document.addEventListener('click', async e => {
      if (e.target.closest?.('[data-cyber-close]')) { $('#cyberModeDialog')?.close(); return; }
      if (e.target.closest?.('[data-cyber-setup]')) { renderDialog(); $('#cyberModeDialog')?.showModal(); return; }
      if (e.target.closest?.('[data-cyber-open-app]')) { location.href = 'shortcuts://'; return; }
      if (e.target.closest?.('[data-cyber-open]')) {
        const c = saveDialog(false);
        location.href = `shortcuts://open-shortcut?name=${enc(c.shortcutName)}`;
        return;
      }
      if (e.target.closest?.('[data-cyber-copy]')) {
        saveDialog(false);
        try { await navigator.clipboard.writeText(recipeText()); toast('Cyber modification recipe copied.'); }
        catch { toast('Copy tidak tersedia. Recipe tetap terlihat di setup.'); }
        return;
      }
      if (e.target.closest?.('[data-cyber-confirm]')) {
        const c = saveDialog(true);
        renderDialog();
        toast(`${c.shortcutName} enabled as pre-launch engine.`);
        return;
      }
      if (e.target.closest?.('[data-cyber-disable]')) {
        const c = saveDialog(false);
        c.enabled = false;
        save(K.cfg, c);
        renderDialog(); refreshCard(); toast('Cyber Mode disabled.');
      }
    }, true);
  }

  window.iPBoosterCyber = {
    config: cfg,
    buildLaunchUrl,
    preLaunchMaintenance,
    communityUrl: COMMUNITY_URL,
    recipeText
  };

  style(); ensureDialog(); bind();
  setTimeout(mountCard, 500);
  const observer = new MutationObserver(() => { clearTimeout(observer.t); observer.t = setTimeout(mountCard, 220); });
  observer.observe(document.body, { childList: true, subtree: true });
  addEventListener('pageshow', () => setTimeout(() => { mountCard(); refreshCard(); }, 700));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(() => { mountCard(); refreshCard(); }, 700); });
})();
