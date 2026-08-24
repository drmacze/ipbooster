(() => {
  'use strict';

  const TEMPLATE = {
    name: 'iPBooster Play',
    version: '1.0',
    url: 'https://www.icloud.com/shortcuts/480203c0db2f4fe1b0920ca4cf53900c',
    id: '480203c0db2f4fe1b0920ca4cf53900c'
  };
  const KEY = 'ipbooster.shortcut-template.v1';
  const $ = s => document.querySelector(s);
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = value => localStorage.setItem(KEY, JSON.stringify(value));

  function ensureStyle() {
    if ($('#officialShortcutTemplateStyle')) return;
    const style = document.createElement('style');
    style.id = 'officialShortcutTemplateStyle';
    style.textContent = `
      .shortcut-template-card{margin:14px 0;padding:15px;border-radius:18px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(145deg,rgba(60,130,255,.12),rgba(255,255,255,.035))}
      .shortcut-template-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      .shortcut-template-head h4{margin:2px 0 4px;font-size:13px}.shortcut-template-head p{margin:0;color:var(--muted);font-size:10px;line-height:1.5}
      .shortcut-template-badge{font-size:9px;font-weight:850;padding:6px 9px;border-radius:999px;background:rgba(115,180,255,.14);color:#9cc8ff;white-space:nowrap}
      .shortcut-template-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.shortcut-template-actions button,.shortcut-template-actions a{margin:0;min-height:44px;text-decoration:none;display:flex;align-items:center;justify-content:center}
      .shortcut-template-status{margin-top:9px;color:var(--muted);font-size:9px;line-height:1.45}
      @media(max-width:430px){.shortcut-template-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function templateMarkup() {
    const state = load();
    const installed = Boolean(state.installedAt);
    return `
      <section id="officialShortcutTemplateCard" class="shortcut-template-card">
        <div class="shortcut-template-head">
          <div><p class="eyebrow">APPLE ICLOUD TEMPLATE</p><h4>${TEMPLATE.name}</h4><p>Project launcher template shared through Apple iCloud Shortcuts. Version ${TEMPLATE.version}.</p></div>
          <span class="shortcut-template-badge">${installed ? 'Installed ✓' : 'One-tap install'}</span>
        </div>
        <div class="shortcut-template-actions">
          <a class="primary-button" href="${TEMPLATE.url}" target="_blank" rel="noopener noreferrer">Install iPBooster Play</a>
          <button type="button" class="secondary-button" data-template-installed>${installed ? 'Installed on this iPhone' : 'I Installed It'}</button>
        </div>
        <div class="shortcut-template-status">Template ID: ${TEMPLATE.id}. Installing this Shortcut does not automatically create the separate App → Opened/Closed automations used by Native Gaming System.</div>
      </section>`;
  }

  function injectDialog() {
    const body = $('#nativeModeBody');
    if (!body || $('#officialShortcutTemplateCard')) return;
    body.insertAdjacentHTML('afterbegin', templateMarkup());
  }

  function injectHome() {
    const nativeCard = $('#nativeModeCard');
    if (!nativeCard || $('#shortcutTemplateHomeButton')) return;
    const state = load();
    const button = document.createElement('button');
    button.id = 'shortcutTemplateHomeButton';
    button.type = 'button';
    button.className = 'secondary-button';
    button.style.marginTop = '10px';
    button.textContent = state.installedAt ? 'Template Installed ✓' : 'Install iPBooster Play Template';
    button.addEventListener('click', () => window.open(TEMPLATE.url, '_blank', 'noopener,noreferrer'));
    nativeCard.appendChild(button);
  }

  function refresh() {
    ensureStyle();
    injectDialog();
    injectHome();
  }

  document.addEventListener('click', event => {
    const done = event.target.closest?.('[data-template-installed]');
    if (!done) return;
    event.preventDefault();
    save({ installedAt: Date.now(), templateId: TEMPLATE.id, version: TEMPLATE.version });
    $('#officialShortcutTemplateCard')?.remove();
    $('#shortcutTemplateHomeButton')?.remove();
    refresh();
    const toast = $('#toast');
    if (toast) {
      toast.textContent = 'iPBooster Play template marked installed.';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2800);
    }
  }, true);

  refresh();
  const observer = new MutationObserver(() => {
    clearTimeout(observer.t);
    observer.t = setTimeout(refresh, 180);
  });
  observer.observe(document.body, { childList: true, subtree: false });
  addEventListener('pageshow', () => setTimeout(refresh, 500));
})();
