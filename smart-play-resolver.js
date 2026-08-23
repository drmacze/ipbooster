(() => {
  'use strict';

  const GAMES_KEY = 'ipbooster.games.v1';
  const SMART_KEY = 'ipbooster.smartplay.v3';
  const PENDING_KEY = 'ipbooster.pending-session.v2';
  const DEFAULT_SHORTCUT = 'iPBooster Play';

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
    return encodeURIComponent(String(value)).replace(/[!'()*]/g, ch => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
  }

  function toast(message, ms = 4200) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), ms);
  }

  function looksLikeBundleId(value = '') {
    return /^[A-Za-z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+){2,}$/.test(String(value).trim());
  }

  function normalize(value = '') {
    return String(value).toLowerCase().replace(/[®™]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function jsonp(path, params) {
    return new Promise((resolve, reject) => {
      const callback = `ipboosterResolve_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement('script');
      const query = new URLSearchParams({ ...params, callback });
      let timer;
      const cleanup = () => {
        clearTimeout(timer);
        script.remove();
        try { delete window[callback]; } catch { window[callback] = undefined; }
      };
      window[callback] = data => { cleanup(); resolve(data); };
      script.onerror = () => { cleanup(); reject(new Error('Apple lookup failed')); };
      script.src = `https://itunes.apple.com/${path}?${query.toString()}`;
      script.async = true;
      timer = setTimeout(() => { cleanup(); reject(new Error('Apple lookup timed out')); }, 8500);
      document.head.appendChild(script);
    });
  }

  async function resolveBundleId(game) {
    const smart = load(SMART_KEY, {});
    const override = smart.targets?.[game.id]?.appName?.trim() || '';
    if (looksLikeBundleId(override)) return override;
    if (looksLikeBundleId(game.bundleId)) return game.bundleId.trim();

    let data;
    if (game.appStoreId) {
      data = await jsonp('lookup', {
        id: game.appStoreId,
        country: 'id',
        entity: 'software'
      });
    } else {
      data = await jsonp('search', {
        term: game.name,
        country: 'id',
        entity: 'software',
        media: 'software',
        limit: '8'
      });
    }

    const results = Array.isArray(data?.results) ? data.results : [];
    const wanted = normalize(game.name);
    const result = results.find(item => normalize(item.trackName) === wanted)
      || results.find(item => normalize(item.trackName).includes(wanted) || wanted.includes(normalize(item.trackName)))
      || results[0];

    const bundleId = result?.bundleId?.trim() || '';
    if (!looksLikeBundleId(bundleId)) return '';

    const library = load(GAMES_KEY, []);
    const index = library.findIndex(item => String(item.id) === String(game.id));
    if (index >= 0) {
      library[index] = {
        ...library[index],
        bundleId,
        appStoreId: String(result.trackId || library[index].appStoreId || ''),
        artworkUrl: result.artworkUrl512 || result.artworkUrl100 || library[index].artworkUrl || '',
        storeUrl: result.trackViewUrl || library[index].storeUrl || '',
        seller: result.sellerName || result.artistName || library[index].seller || ''
      };
      save(GAMES_KEY, library);
    }
    return bundleId;
  }

  function beginSession(game) {
    save(PENDING_KEY, {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      gameId: game.id,
      gameName: game.name,
      artworkUrl: game.artworkUrl || '',
      appStoreId: game.appStoreId || '',
      profile: game.profile || 'balanced',
      startedAt: Date.now()
    });
  }

  function runShortcut(name, text) {
    location.href = `shortcuts://run-shortcut?name=${enc(name)}&input=text&text=${enc(text)}`;
  }

  document.addEventListener('click', event => {
    const play = event.target.closest?.('[data-game-play]');
    if (!play) return;

    const smart = load(SMART_KEY, {});
    if (!smart.universalReady || !smart.universalShortcut?.trim()) return;

    const library = load(GAMES_KEY, []);
    const game = library.find(item => String(item.id) === String(play.dataset.gamePlay));
    if (!game) return;

    const deepLink = smart.targets?.[game.id]?.deepLink?.trim();
    if (deepLink) return; // Let the main Smart Play engine handle explicit deep links.

    event.preventDefault();
    event.stopImmediatePropagation();

    (async () => {
      try {
        toast('Resolving official app target…', 2200);
        const bundleId = await resolveBundleId(game);
        if (!bundleId) {
          toast('Bundle ID resmi tidak ditemukan. Cari ulang game dari App Store di tab Games.', 5200);
          return;
        }
        beginSession({ ...game, bundleId });
        const shortcutName = smart.universalShortcut.trim() || DEFAULT_SHORTCUT;
        runShortcut(shortcutName, bundleId);
      } catch (error) {
        console.error('Smart Play resolver:', error);
        toast('Gagal menyiapkan target app. Cek koneksi lalu coba Play lagi.', 5000);
      }
    })();
  }, true);

  // Hide the unsigned source-download button. On iOS it opens as plist text and
  // cannot be imported as a trusted shortcut without Apple signing.
  const style = document.createElement('style');
  style.textContent = '.smart-template-link{display:none!important}';
  document.head.appendChild(style);
})();