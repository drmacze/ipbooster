(() => {
  'use strict';

  const VERSION_URL = './version.json';
  const BUILD_KEY = 'ipbooster.pwa-build.v1';
  const DISMISS_KEY = 'ipbooster.pwa-update-dismissed.v1';
  const REFRESH_KEY = 'ipbooster.pwa-refreshing.v1';
  const CHECK_INTERVAL = 60 * 1000;

  let registration = null;
  let checking = false;
  let latestBuild = '';
  let lastCheck = 0;

  const $ = s => document.querySelector(s);

  function toast(message, ms = 2600) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), ms);
  }

  function ensureStyle() {
    if ($('#pwaUpdateStyle')) return;
    const style = document.createElement('style');
    style.id = 'pwaUpdateStyle';
    style.textContent = `
      .pwa-update-banner{position:fixed;left:max(14px,env(safe-area-inset-left));right:max(14px,env(safe-area-inset-right));bottom:calc(92px + env(safe-area-inset-bottom));z-index:9998;padding:13px;border-radius:19px;border:1px solid rgba(125,190,255,.24);background:rgba(13,18,25,.94);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);box-shadow:0 18px 55px rgba(0,0,0,.38);display:none;gap:12px;align-items:center}
      .pwa-update-banner.show{display:flex}.pwa-update-copy{min-width:0;flex:1}.pwa-update-copy strong{display:block;font-size:12px}.pwa-update-copy small{display:block;color:var(--muted);font-size:9px;line-height:1.45;margin-top:3px}.pwa-update-actions{display:flex;gap:7px}.pwa-update-actions button,.pwa-update-actions a{min-height:38px;margin:0;padding:0 12px;border-radius:12px;font-size:10px;white-space:nowrap;text-decoration:none;display:flex;align-items:center;justify-content:center}
      #pwaRefreshButton{flex:0 0 auto}#pwaRefreshButton.checking{animation:ipbSpin .8s linear infinite}@keyframes ipbSpin{to{transform:rotate(360deg)}}
      .pwa-refresh-fallback{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:calc(92px + env(safe-area-inset-bottom));z-index:9997}
      @media(max-width:430px){.pwa-update-banner{align-items:flex-start}.pwa-update-actions{flex-direction:column}.pwa-update-actions button,.pwa-update-actions a{min-width:82px}}
    `;
    document.head.appendChild(style);
  }

  function mountRefreshButton() {
    ensureStyle();
    let refresh = $('#pwaRefreshButton');
    if (!refresh) {
      refresh = document.createElement('button');
      refresh.id = 'pwaRefreshButton';
      refresh.type = 'button';
      refresh.className = 'icon-button glass';
      refresh.setAttribute('aria-label', 'Refresh iPBooster PWA');
      refresh.title = 'Refresh PWA / ambil versi terbaru';
      refresh.textContent = '↻';
      refresh.addEventListener('click', () => forceRefresh());
    }

    const install = $('#installButton');
    const header = install?.closest('.topbar');
    if (header) {
      refresh.classList.remove('pwa-refresh-fallback');
      if (refresh.parentElement !== header) header.insertBefore(refresh, install);
    } else if (!refresh.isConnected) {
      refresh.classList.add('pwa-refresh-fallback');
      document.body.appendChild(refresh);
    }
    return refresh;
  }

  function ensureUI() {
    ensureStyle();
    if (!$('#pwaUpdateBanner')) {
      const banner = document.createElement('section');
      banner.id = 'pwaUpdateBanner';
      banner.className = 'pwa-update-banner';
      banner.setAttribute('role', 'status');
      banner.innerHTML = `<div class="pwa-update-copy"><strong>Update iPBooster tersedia</strong><small id="pwaUpdateText">Versi terbaru siap dimuat tanpa install ulang PWA.</small></div><div class="pwa-update-actions"><a class="secondary-button" href="./refresh.html">Recovery</a><button type="button" class="secondary-button" id="pwaUpdateLater">Nanti</button><button type="button" class="primary-button" id="pwaUpdateNow">Refresh</button></div>`;
      document.body.appendChild(banner);
      $('#pwaUpdateNow').addEventListener('click', () => applyUpdate(latestBuild || `manual-${Date.now()}`));
      $('#pwaUpdateLater').addEventListener('click', () => {
        if (latestBuild) sessionStorage.setItem(DISMISS_KEY, latestBuild);
        banner.classList.remove('show');
      });
    }
    mountRefreshButton();
  }

  function showUpdate(build) {
    latestBuild = build;
    if (sessionStorage.getItem(DISMISS_KEY) === build) return;
    ensureUI();
    const text = $('#pwaUpdateText');
    if (text) text.textContent = 'Build baru terdeteksi. Game library dan konfigurasi tetap aman; hanya file aplikasi yang diperbarui.';
    $('#pwaUpdateBanner')?.classList.add('show');
  }

  async function getRegistration() {
    if (!('serviceWorker' in navigator)) return null;
    if (registration) return registration;
    try {
      registration = await navigator.serviceWorker.getRegistration('./') || await navigator.serviceWorker.ready;
    } catch {}
    return registration;
  }

  async function fetchBuild() {
    const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`version ${response.status}`);
    const data = await response.json();
    return String(data.build || data.version || '').trim();
  }

  async function checkForUpdate(manual = false) {
    if (checking || !navigator.onLine) {
      if (manual && !navigator.onLine) toast('Offline — update check membutuhkan internet.');
      return;
    }
    if (!manual && Date.now() - lastCheck < CHECK_INTERVAL) return;
    checking = true;
    lastCheck = Date.now();
    ensureUI();
    $('#pwaRefreshButton')?.classList.add('checking');
    try {
      const build = await fetchBuild();
      if (!build) throw new Error('empty build');
      const stored = localStorage.getItem(BUILD_KEY);
      const refreshing = sessionStorage.getItem(REFRESH_KEY);

      if (!stored) localStorage.setItem(BUILD_KEY, build);
      else if (refreshing === build) {
        localStorage.setItem(BUILD_KEY, build);
        sessionStorage.removeItem(REFRESH_KEY);
        $('#pwaUpdateBanner')?.classList.remove('show');
      } else if (stored !== build) showUpdate(build);
      else if (manual) toast('iPBooster sudah versi terbaru.');

      const reg = await getRegistration();
      await reg?.update?.();
      if (reg?.waiting && build !== stored) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } catch (error) {
      console.warn('PWA update check:', error);
      if (manual) toast('Belum bisa mengecek update. Gunakan Recovery bila cache masih lama.');
    } finally {
      checking = false;
      $('#pwaRefreshButton')?.classList.remove('checking');
    }
  }

  function requestWorkerRefresh(controller) {
    if (!controller) return Promise.resolve(false);
    return new Promise(resolve => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => resolve(false), 4500);
      channel.port1.onmessage = event => {
        clearTimeout(timeout);
        resolve(Boolean(event.data?.ok));
      };
      try {
        controller.postMessage({ type: 'REFRESH_APP_CACHE' }, [channel.port2]);
      } catch {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  }

  async function forceRefresh() {
    if (!navigator.onLine) {
      toast('Hubungkan internet dulu untuk refresh PWA.');
      return;
    }
    ensureUI();
    const button = $('#pwaRefreshButton');
    button?.classList.add('checking');
    try {
      let build = '';
      try { build = await fetchBuild(); } catch {}
      await applyUpdate(build || `manual-${Date.now()}`);
    } catch {
      location.href = './refresh.html';
    } finally {
      button?.classList.remove('checking');
    }
  }

  async function applyUpdate(build) {
    if (!navigator.onLine) {
      toast('Hubungkan internet dulu untuk refresh versi terbaru.');
      return;
    }
    ensureUI();
    const now = $('#pwaUpdateNow');
    if (now) { now.disabled = true; now.textContent = 'Updating…'; }
    const target = build || latestBuild || String(Date.now());
    sessionStorage.setItem(REFRESH_KEY, target);

    try {
      const reg = await getRegistration();
      if (!reg || !navigator.serviceWorker.controller) {
        location.href = './refresh.html';
        return;
      }
      await reg.update?.();
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      await requestWorkerRefresh(navigator.serviceWorker.controller);

      const url = new URL(location.href);
      url.searchParams.set('__ipb_refresh', target.slice(0, 12));
      location.replace(url.href);
    } catch (error) {
      console.warn('PWA refresh:', error);
      sessionStorage.removeItem(REFRESH_KEY);
      location.href = './refresh.html';
    }
  }

  function cleanRefreshParam() {
    const url = new URL(location.href);
    if (!url.searchParams.has('__ipb_refresh') && !url.searchParams.has('updated')) return;
    url.searchParams.delete('__ipb_refresh');
    url.searchParams.delete('updated');
    history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function bindWorkerLifecycle() {
    if (!('serviceWorker' in navigator)) return;
    let controllerReloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (controllerReloaded) return;
      const pending = sessionStorage.getItem(REFRESH_KEY);
      if (!pending) return;
      controllerReloaded = true;
      setTimeout(() => location.reload(), 140);
    });
  }

  ensureUI();
  cleanRefreshParam();
  bindWorkerLifecycle();
  setTimeout(() => checkForUpdate(false), 900);
  addEventListener('pageshow', () => { mountRefreshButton(); setTimeout(() => checkForUpdate(false), 700); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { mountRefreshButton(); setTimeout(() => checkForUpdate(false), 700); }
  });
  addEventListener('online', () => setTimeout(() => checkForUpdate(false), 500));
})();
