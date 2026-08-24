# iPBooster Cyber Mode

Community donor shortcut:

- https://www.icloud.com/shortcuts/58e97ffb70624989a216cbc1a3e70e97

## Architecture

`iPBooster PWA -> iPBooster Cyber -> iPBooster Play -> Game`

The community shortcut is used as a donor/base. Duplicate it before modifying it so the original remains intact.

### Input sent by the PWA

`GameKey|||Profile`

Examples:

- `Minecraft|||competitive`
- `Mobile Legends: Bang Bang|||competitive`
- `Minecraft|||battery`

### Recommended iPBooster Cyber flow

1. Receive Shortcut Input.
2. Split Text using `|||`.
3. Item 1 -> `GameKey`.
4. Item 2 -> `Profile`.
5. Set Gaming Focus ON.
6. If Profile = `competitive`, set Low Power Mode OFF.
7. Otherwise if Profile = `battery`, set Low Power Mode ON.
8. Otherwise (`balanced`), set Low Power Mode OFF.
9. Run Shortcut `iPBooster Play` using `GameKey` as input.
10. `iPBooster Play` remains the app router and opens the selected game.

Native iOS Game Mode is still controlled by iOS and takes over after a supported game opens.

## What to remove from a donor shortcut

Remove or avoid steps that claim to do work stock iOS does not permit, such as fake RAM cleaning, CPU/GPU overclocking, thermal-policy edits, FPS unlocking, or local privileged shell tweaks.

`Run Script over SSH` runs on another machine and does not change the iPhone scheduler. Third-party terminal apps remain sandboxed and cannot tune another app's CPU/GPU or clear another app's private cache.

## Cache maintenance

iPBooster can safely maintain only its own PWA storage:

- delete obsolete `ipbooster-*` Cache Storage namespaces;
- trim non-core runtime entries from the current PWA cache;
- remove stale quick-network preflight data;
- preserve library, Router, profile, template status, and session history in localStorage.

It cannot delete Minecraft, Mobile Legends, Call of Duty, Safari, or other apps' private caches because iOS app sandboxing does not expose those containers to a PWA or normal Shortcut.

## Automation failsafe

For each game, keep the native App Automation setup as a failsafe:

### App opened

- Gaming Focus ON
- Competitive/Balanced: Low Power Mode OFF
- Battery Saver: Low Power Mode ON

### App closed

- Gaming Focus OFF
- optionally enable Low Power Mode when battery is low

This keeps the system preparation active even when the game is launched directly from the Home Screen rather than through iPBooster.
