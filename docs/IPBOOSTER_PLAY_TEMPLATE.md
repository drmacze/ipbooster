# iPBooster Play — Apple iCloud Template

Current project template:

- Name: `iPBooster Play`
- Distribution: Apple iCloud Shortcuts
- Version: `1.0`
- iCloud ID: `480203c0db2f4fe1b0920ca4cf53900c`
- Install URL: `https://www.icloud.com/shortcuts/480203c0db2f4fe1b0920ca4cf53900c`

The same metadata is machine-readable in `shortcut-template.json`.

## Recommended Competitive launcher actions

For a one-game Minecraft setup:

1. Set Focus → Gaming → On
2. Set Low Power Mode → Off
3. Open App → Minecraft

For a multi-game router, wrap the per-game preparation and `Open App` action inside an `If Shortcut Input is <route key>` branch.

## Important distinction

Installing the iCloud Shortcut template only installs the launcher Shortcut. Native Gaming System can additionally use one-time Personal Automations:

- App → game → Is Opened → Run Immediately
- App → game → Is Closed → Run Immediately

Those Personal Automations are configured separately on-device because a website cannot silently create or modify them.

## Updating the template

When a new `iPBooster Play` version is shared from Shortcuts, update both:

- `shortcut-template.json`
- `official-shortcut-template.js`

Then bump the service-worker cache so installed PWAs receive the new installer URL.
