# iPBooster

**iPBooster** is a mobile-first PWA built specifically for **iOS/iPadOS 26+**. It is a gaming control launcher that deliberately avoids fake “RAM cleaner / CPU booster / force 120 FPS” claims.

## What actually works

- **Installable PWA** with standalone Home Screen layout, safe-area support, offline shell and an iOS-inspired glass UI.
- **Game launcher** where each game maps to a real Apple Shortcut created by the user.
- **Apple Shortcuts x-callback bridge** using `shortcuts://x-callback-url/run-shortcut`, including callback handling and JSON result parsing.
- **Real network diagnostics**: HTTP latency, jitter, download and upload throughput using actual traffic against Cloudflare Speed endpoints. Upload gracefully reports unavailable if the route/browser blocks it.
- **Local history and settings** via `localStorage`; no account and no tracking backend required.
- **iOS 26+ compatibility messaging** with standalone/PWA detection.

## Important truth about Game Mode

Apple Game Mode is controlled by iOS. For supported games it turns on automatically when the game runs full screen. A web app cannot honestly force-enable CPU/GPU Game Mode, clear iOS RAM, overclock hardware, or create a system-wide FPS overlay. iPBooster does not fake these controls.

The useful flow is:

1. Tap a game in iPBooster.
2. iPBooster runs the configured game Shortcut through Apple’s URL scheme.
3. That Shortcut can prepare settings Apple exposes to Shortcuts (for example Gaming Focus, Low Power Mode and volume) and then use **Open App** for that game.
4. iOS manages Game Mode for supported games.

## Recommended Shortcuts

### Device status bridge

Create a Shortcut named **`iPBooster Device Status`** (or change the name inside the Bridge page). Build it so its final output is JSON text, for example:

```json
{"battery":87,"focus":"Gaming","wifi":"Home 5G"}
```

iPBooster calls it using x-callback-url and parses the returned `result` parameter.

### Per-game launch shortcut

Create one Shortcut per game, such as **`Play Minecraft`**. In that Shortcut, add the system actions you want to run before the game and finish with **Open App → Minecraft**. Add the exact Shortcut name to the game inside iPBooster.

This per-game approach is intentional because iOS Shortcuts' **Open App** target is configured in the Shortcut itself rather than being an arbitrary web-app process launch API.

## Network test notes

The Network Lab measures real HTTP request timing and transfer throughput. It does **not** claim to be ICMP ping because Safari does not expose raw sockets to webpages. Results describe the route between the device and the test endpoint, not every route a game server may take.

## GitHub Pages deployment

A Pages workflow is included at `.github/workflows/pages.yml`.

1. In repository **Settings → Pages**, choose **GitHub Actions** as the source if it is not already selected.
2. Push/merge to `main`.
3. The workflow uploads the repository as a static Pages artifact and deploys it.

## Development

No build step is required. Serve the repository over HTTP/HTTPS so Service Worker features work:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` for desktop preview. Device functionality should be tested on an iPhone/iPad with iOS/iPadOS 26+ and the relevant Shortcuts installed.

## Architecture

- `index.html` — app shell and views
- `styles.css` — iOS-inspired responsive UI
- `app.js` — launcher state, Shortcuts bridge, diagnostics, PWA logic
- `sw.js` — offline app-shell caching
- `manifest.webmanifest` — Home Screen/PWA metadata
- `assets/` — app icons
- `.github/workflows/pages.yml` — GitHub Pages deployment
