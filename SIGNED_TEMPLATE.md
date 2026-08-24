# iPBooster signed Shortcut template workflow

iPBooster cannot generate a trusted `.shortcut` file inside a web page. Apple Shortcuts validates shared Shortcut files and iCloud-shared shortcuts. The reliable distribution flow is therefore:

1. Build the final `iPBooster Play` shortcut inside Apple Shortcuts on an iPhone/iPad/Mac.
2. Test it on-device.
3. In the shortcut editor choose Share → Copy iCloud Link, or Export File → Anyone.
4. Apple validates the shared shortcut.
5. Put the resulting iCloud link into iPBooster as the one-tap install template.

## Recommended architecture

### A. Launcher shortcut

For one game (Minecraft, Competitive):

```text
Set Focus → Gaming → On
Set Low Power Mode → Off
Open App → Minecraft
```

For multiple games:

```text
If Shortcut Input is "Minecraft"
    Set Focus → Gaming → On
    Set Low Power Mode → Off
    Open App → Minecraft
Otherwise
    If Shortcut Input is "Mobile Legends: Bang Bang"
        Set Focus → Gaming → On
        Set Low Power Mode → Off
        Open App → Mobile Legends: Bang Bang
    End If
End If
```

### B. App-open failsafe automation

Trigger: App → Minecraft → Is Opened → Run Immediately

```text
Set Focus → Gaming → On
Set Low Power Mode → Off
```

This makes the native system prep run even when the game is opened outside iPBooster.

### C. App-close cleanup automation

Trigger: App → Minecraft → Is Closed → Run Immediately

```text
Set Focus → Gaming → Off
Get Battery Level
If Battery Level <= 20
    Set Low Power Mode → On
End If
```

## Native Game Mode

Game Mode is not forced by iPBooster. On supported games it is activated by iOS after the game opens. iPBooster prepares controllable system state before handing off to the game.

## Shell commands

Stock iOS does not expose a privileged local `Run Shell Script` action that can alter another app's CPU/GPU scheduler, thermal limits, or FPS. `Run Script over SSH` runs on a remote host. Terminal apps on iOS remain sandboxed.

## Community signed Shortcut references

These are external community projects and are not dependencies of iPBooster. Review every action before installing:

- Ultimate Game Mode: https://routinehub.co/shortcut/18337/
- CyberEngine Gaming Mode: https://routinehub.co/shortcut/25900/

The preferred iPBooster template is a custom Apple-validated iCloud share built from the recipe above, because it matches the launcher's exact router keys and installed games.
