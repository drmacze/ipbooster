# iPBooster v2

iPBooster is a mobile-first **iOS/iPadOS 26+ gaming control PWA**. It is intentionally designed around capabilities that a web app and Apple Shortcuts can actually use, rather than fake RAM/CPU/FPS booster controls.

## v2 highlights

- **Gaming Readiness** score based on launcher setup state (iOS/PWA state, bridge, fresh network test, configured game shortcuts, official artwork). It is **not** a CPU/GPU benchmark.
- **Official App Store game search** for Indonesia through Apple’s Search API, including current game icons and metadata.
- **Per-game Apple Shortcut launchers**. Game launch now uses `shortcuts://run-shortcut` without an `x-success` callback so a launch Shortcut can finish by opening the game without forcing the browser back to the foreground.
- **Device Status bridge** continues to use `shortcuts://x-callback-url/run-shortcut` because that workflow intentionally needs a text result returned to iPBooster.
- **Real Network Lab** using repeated HTTP latency measurements and real download/upload transfers against Cloudflare Speed endpoints.
- **Launcher session estimates** saved locally. A session starts when Play is tapped and is finalized when iPBooster returns to the foreground. This is explicitly an estimate; the PWA cannot read another app’s process time.
- **Local backup export** as JSON.
- **Installable/offline PWA** with service-worker cache v3.
- Existing v1 `localStorage` game/network/bridge data is preserved and migrated forward.

## Why two different Shortcuts URLs?

For a game launch, iPBooster uses:

```text
shortcuts://run-shortcut?name=...
```

For Device Status, where iPBooster needs a result back, it uses:

```text
shortcuts://x-callback-url/run-shortcut?name=...&x-success=...
```

Apple documents both flows. The distinction matters: `x-success` is meant to return to a callback URL after the Shortcut finishes, while a game-launch Shortcut should normally end in **Open App → the game**.

## Recommended per-game Shortcut

Create one Shortcut per game, for example `Play Minecraft`:

1. Receive the text input from iPBooster.
2. Optionally parse the JSON input to inspect the selected `profile`.
3. Apply only settings that Apple exposes to Shortcuts (for example Focus, volume, or Low Power Mode).
4. Finish with **Open App → Minecraft**.

iOS remains responsible for Game Mode and CPU/GPU scheduling.

## Device Status Shortcut

Create a Shortcut named `iPBooster Device Status` (or change the name in the Bridge screen). Make its final text output JSON, for example:

```json
{"battery":87,"focus":"Gaming","wifi":"Home 5G"}
```

The exact values available depend on the actions exposed by the installed iOS version.

## Development

No build step is required.

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080` for desktop preview. The real Shortcuts launch/bridge flow must be tested on iPhone/iPad.

## Deployment

The repository includes a GitHub Pages workflow in `.github/workflows/pages.yml`. Configure repository **Settings → Pages → Source → GitHub Actions** if needed.

Live URL:

```text
https://drmacze.github.io/ipbooster/
```

## Important limitations

A PWA cannot honestly:

- force iOS Game Mode;
- overclock CPU/GPU;
- force 120 Hz on unsupported hardware;
- clear iOS RAM on demand;
- kill arbitrary background apps;
- display a system-wide FPS overlay over another game;
- read another app’s exact gameplay duration.

iPBooster avoids presenting those as real controls.
