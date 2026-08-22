# iPBooster Play Shortcut Template

This folder contains the source template for the universal **iPBooster Play** launcher.

## What the shortcut does

The shortcut receives one text value from iPBooster (preferably an App Store bundle identifier, otherwise the app name) and passes that value to **Open App**.

The browser launches it using Apple's documented URL form:

`shortcuts://run-shortcut?name=iPBooster%20Play&input=text&text=<url-encoded-target>`

The important detail is that spaces in the shortcut name are encoded as `%20`, not `+`.

## Why the source file is not one-tap installable on iPhone

Modern Apple Shortcuts requires shared `.shortcut` files to be cryptographically signed. Signing is performed by Apple's Shortcuts app/CLI and Apple receives a copy for validation. A Linux/web server cannot legitimately forge that signature.

The included `iPBooster Play.shortcut` is therefore **source**, not a falsely-labelled signed artifact.

## Sign on macOS

On a Mac signed into iCloud/Shortcuts:

```bash
cd shortcuts
shortcuts sign --mode anyone \
  --input "iPBooster Play.shortcut" \
  --output "iPBooster Play signed.shortcut"
open "iPBooster Play signed.shortcut"
```

After importing, you can share it from the Shortcuts app as an iCloud link. Apple documents both signed shortcut files and iCloud sharing.

## Existing iPhone shortcut

If `iPBooster Play` already exists on the iPhone, no file import is required. iPBooster v2.6 can open that shortcut directly and now encodes its name correctly.
