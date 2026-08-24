# iPBooster Performance Engine v3.1

Performance Engine is the real pre-launch performance layer for iOS/iPadOS 26+. It does **not** fake CPU/GPU overclocking, RAM cleaning, thermal readings, or an FPS counter.

## What actually happens

1. iPBooster reads the selected game profile.
2. It checks the current launcher route and locally confirmed system-prep recipe.
3. It uses the latest real HTTP latency/jitter measurement, or performs a lightweight Cloudflare preflight when the measurement is stale.
4. If Device Bridge data is available, it can also surface battery, charging, Focus and Low Power Mode state. Unknown protected values stay marked as unknown.
5. The configured `iPBooster Play` Shortcut applies the iOS settings that Shortcuts is allowed to change.
6. The Shortcut opens the game.
7. Native iOS Game Mode remains responsible for game CPU/GPU priority, background-task reduction, and supported Bluetooth latency optimizations.

## Competitive profile

Recommended launch recipe:

```text
Set Focus → Gaming → On
Set Low Power Mode → Off
Open App → <game>
```

If the library has several games, put those actions inside the correct `If Shortcut Input is <route key>` branch.

Performance Engine uses a 5-minute network freshness window, 4 quick latency samples, and warns above 80 ms latency or 20 ms jitter.

## Balanced profile

```text
Set Focus → Gaming → On
Set Low Power Mode → Off (recommended)
Open App → <game>
```

Network freshness: 15 minutes. Quick samples: 3. Warning threshold: 120 ms / 30 ms jitter.

## Battery Saver profile

```text
Set Focus → Gaming → On
Set Low Power Mode → On
Open App → <game>
```

This profile prioritizes battery life rather than maximum frame-rate headroom. Network freshness: 30 minutes. Quick samples: 2. Warning threshold: 150 ms / 40 ms jitter.

## Optional restore automation

For a clean post-game state, create a Personal Automation:

```text
When <game> is closed
→ Set Focus → Gaming → Off
```

Apple Shortcuts supports App open/close triggers, so this restore path can run independently of the PWA.

## Stability score

The Performance readiness score is a launcher readiness score, not an FPS benchmark. It is based on real/known state such as:

- Router availability
- Confirmed Shortcut system-prep recipe matching the current game profile
- Fresh latency/jitter measurement
- Low Power Mode state when Device Bridge has supplied it
- Battery/charging state when Device Bridge has supplied it

Thermal state and another app's real-time FPS are not exposed to a PWA and therefore are never fabricated.

## Why Low Power Mode matters

Apple documents that Low Power Mode reduces power use and may make some tasks slower. On iPhones with ProMotion it also limits the display refresh rate to 60 fps. Competitive therefore targets Low Power Mode OFF.

## Native Game Mode

Apple documents that Game Mode gives the game highest-priority access to CPU/GPU, lowers background-task usage, and can improve frame-rate consistency and responsiveness. iPBooster does not attempt to replace or spoof it; the launch pipeline prepares the device, then hands off to native Game Mode after the supported game opens.
