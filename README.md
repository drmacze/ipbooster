# iPBooster v3

iPBooster is a mobile-first **iOS/iPadOS 26+ gaming control PWA** built around capabilities that Safari/PWA and Apple Shortcuts can actually use. It deliberately avoids fake RAM cleaners, CPU/GPU overclock buttons, fake FPS counters, or claims that a website can force iOS Game Mode.

## v3 highlights

- **Smart Play Router** — one `iPBooster Play` Shortcut can route the entire game library using `If Shortcut Input → Open App` branches.
- **Smart Launch preflight** — a real, lightweight HTTP latency/jitter check can run before launch when the current measurement is stale.
- **Profile-aware launch policy** — Competitive, Balanced, and Battery Saver are no longer only labels. They change the real web-side preflight freshness window, sample count, and warning thresholds.
- **Game Control detail page** — per-game readiness, official App Store artwork, profile, launch count, estimated play time, average session, router state, and network state.
- **Router & Profile Assistant** — generates the exact branch recipe needed for every game in the local library and clearly separates real web behavior from optional iOS Shortcut actions.
- **Favorites** — favorite games can be promoted to the v3 control center.
- **7-day activity analytics** — based only on local launcher-estimated sessions.
- **Post-game summary** — after returning to iPBooster, the latest estimated session can show duration and the pre-launch network snapshot.
- **Route verification** — a route is marked verified only after a completed launcher session is observed; this is not presented as installed-app detection.
- **Router-aware Gaming Readiness** — the main score now follows the v3 architecture instead of requiring one Shortcut per game.
- **Real Network Lab** — repeated HTTP latency measurements plus real download/upload transfers against Cloudflare Speed endpoints.
- **Official App Store metadata** — search, icon, publisher, App Store ID, and bundle metadata come from Apple catalog results rather than generated artwork.
- **Optional Device Bridge** — Shortcuts `x-callback-url` remains available only for extra iOS data that the PWA cannot read directly.
- **Offline/installable PWA** — service-worker cache `ipbooster-v10-v3-readiness` includes the v3 engine, observer guard, readiness layer, and styles.
- **Deployment quality gate** — GitHub Pages runs `node --check` on every JavaScript engine and validates the manifest before deployment.

## Smart Play Router

The working universal launch design on iOS 26 is a text router, not a dynamic `Open App` parameter.

`Open App` requires a real app selected in Shortcuts. Therefore the Shortcut should look like this:

```text
If Shortcut Input is "Minecraft"
    Open App → Minecraft
Otherwise
    If Shortcut Input is "Mobile Legends"
        Open App → Mobile Legends
    Otherwise
        If Shortcut Input is "Call of Duty"
            Open App → Call of Duty
        Otherwise
            Show Alert → "Game belum dipetakan"
```

iPBooster sends the route key as the Shortcut text input:

```text
shortcuts://run-shortcut?name=iPBooster%20Play&input=text&text=Minecraft
```

The app name in each **Open App** action is selected statically in Shortcuts. iPBooster never claims that arbitrary text can be converted into an iOS App object.

## What profiles really do

The web-side behavior is real and implemented in v3:

| Profile | Fresh network window | Quick samples | Warning threshold |
| --- | ---: | ---: | --- |
| Competitive | 5 min | 4 | >80 ms latency or >20 ms jitter |
| Balanced | 15 min | 3 | >120 ms latency or >30 ms jitter |
| Battery Saver | 30 min | 2 | >150 ms latency or >40 ms jitter |

The Router Assistant may also suggest optional Shortcut actions such as Gaming Focus or Low Power Mode. Those settings are **not** reported as applied unless the user actually adds the actions to the corresponding Shortcut branch.

## Launch flow

With Smart Play Router configured:

```text
iPBooster Play button
→ profile-aware freshness check
→ optional lightweight HTTP latency/jitter preflight
→ launch readiness/warning
→ iPBooster Play Shortcut
→ If Shortcut Input matches game route
→ Open App → selected game
→ iOS handles Game Mode natively
```

When a sufficiently long launcher session later returns to the PWA, v3 can record the local estimated duration and mark that game route as having completed a launch before.

## Session tracking

A session begins when iPBooster launches the route and is finalized when the PWA returns to the foreground. This is explicitly a **launcher estimate**. A web app cannot read the process lifetime or exact gameplay duration of another iOS app.

Session data remains local in `localStorage` unless the user explicitly exports a backup.

## Network measurements

The browser does not expose ICMP/raw sockets, so iPBooster measures real HTTP request latency instead of pretending to be an ICMP game-server ping.

- Quick preflight: tiny Cloudflare Speed HTTP requests, latency + jitter only.
- Full Network Lab: repeated latency samples plus real download/upload transfer tests.

## Device data

The PWA can expose browser-readable information such as iPhone/iPad class, detectable iOS version, screen/viewport information, touch points, exposed logical CPU threads, WebGPU/WebGL availability, service worker support, language, and timezone.

It cannot honestly enumerate installed apps, read arbitrary Wi-Fi SSIDs, inspect another app, or obtain every protected iOS system value. The optional Device Bridge exists for data that Shortcuts can explicitly provide.

## Development

No build step is required.

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080` for desktop preview. Custom Shortcuts URL handling must be tested on an iPhone/iPad.

## Deployment

The repository includes GitHub Pages deployment support. Before upload, the workflow checks JavaScript syntax, validates `manifest.webmanifest`, and verifies the core PWA files exist.

Live URL:

```text
https://drmacze.github.io/ipbooster/
```

The main HTML loads the observer guard and v3 engine before the Smart Play Router compatibility layer. The service worker keeps the same ordering for cached/offline navigation.

## Important limitations

A PWA cannot honestly:

- force iOS Game Mode;
- overclock CPU/GPU;
- force an unsupported refresh rate;
- clear iOS RAM on demand;
- kill arbitrary background apps;
- enumerate every installed application;
- display a system-wide FPS overlay over another game;
- read another app's exact gameplay duration;
- silently create or edit arbitrary Shortcuts on the user's device.

iPBooster treats these as platform boundaries rather than presenting fake controls.
