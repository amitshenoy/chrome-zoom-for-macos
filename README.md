# Chrome zoom for MacOS

Replicates the Windows **Ctrl + Scroll** zoom in Chrome for macOS users.

Hold your chosen hotkey and scroll — the page zooms using Chrome's own
built-in zoom, so the percentage in Chrome's menu matches and per-site zoom
memory works exactly as usual.

## Install (unpacked, for testing)

1. Unzip `chrome-zoom-for-macos-v1.0.0.zip` (or use this folder directly).
2. In Chrome, open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the folder containing `manifest.json`.
5. Open any website, hold **Control** and scroll.

## Usage

| Action | Result |
|---|---|
| Hold hotkey + scroll up | Zoom in one level |
| Hold hotkey + scroll down | Zoom out one level |
| Click the toolbar icon | See current zoom %, step +/−, reset to 100%, change settings |

### Choosing your hotkey

Click the toolbar icon (or right-click it → **Options**) and pick:

- **Control** — the Windows behaviour (default)
- **Option (⌥)**
- **Command (⌘)**

Only that one modifier should be held — holding a second modifier at the
same time won't trigger zoom, so it never clashes with other shortcuts.
You can also turn scroll zoom off entirely from the same place.

## Sensitivity — same as Cmd+, by design

Chrome's Cmd+ doesn't zoom continuously; it steps through fixed levels:
25 · 33 · 50 · 67 · 75 · 80 · 90 · **100** · 110 · 125 · 150 · 175 · 200 ·
250 · 300 · 400 · 500 (%).

This extension steps through exactly that list, one level per scroll step:

- **One mouse notch = one step.** Wheel deltas accumulate to a ~48px
  threshold first (a notch is ~100px), so partial/trackpad input is
  normalised instead of firing per raw event.
- **A flick can't zoom deep.** After each step there's a 140 ms cooldown
  where further scroll input is swallowed. Trackpad momentum and mouse
  free-spin die in that window instead of stacking steps. Even spinning
  as fast as you can tops out at ~7 levels/second, and one flick = one step.
- **No slow build-up.** The accumulated scroll resets after 100 ms of
  quiet, so separate small ticks never combine into a surprise zoom.

## Limitations (Chrome platform rules, not bugs)

- No extension can run on `chrome://` pages, the built-in New Tab content,
  or the Chrome Web Store — scroll zoom can't work there. All regular
  websites work.
- If you choose **Control**, trackpad pinch gestures will also step zoom
  (Chrome reports pinch as Control+scroll) — same as Windows behaviour.
- PDFs: works in Chrome's PDF viewer pages where content scripts run;
  the toolbar popup +/− buttons always work on the active tab regardless.

## Files

```
manifest.json   MV3 manifest
background.js   Service worker — applies one zoom level per step (tabs API), second rate-limit guard
content.js      Wheel listener — hotkey check, threshold + cooldown + decay
shared.js       Zoom levels & step maths (single source of truth)
popup.*         Toolbar popup: zoom %, +/−/reset, enable toggle, hotkey picker
options.*       Full settings page with sensitivity explanation
icons/          16/32/48/128 icons
tests/          Node tests for the stepping/throttle logic (npm test)
```

## Tests

```
npm test   # 7 tests: Chrome level list, Cmd+ stepping, clamping,
           # threshold < one notch, cooldown bound, flick = 1 step
```

## Privacy

This extension collects nothing — no analytics, no network requests at
all. See [PRIVACY.md](PRIVACY.md) for the full statement and a
permission-by-permission explanation.

## License

Copyright (c) 2026 Amit Shenoy. All rights reserved. See
[LICENSE](LICENSE). Installing and using the published extension via the
Chrome Web Store is free; no rights to the source code are granted.

## Publishing note

To ship on the Chrome Web Store: zip the runtime files (everything except
`tests/` and `package.json`), upload at the Chrome Web Store Developer
Dashboard under the name **"Chrome zoom for MacOS"**. The `tabs` +
`storage` + `<all_urls>` host permissions need a short justification there:
host access is required to listen for scroll events on pages; zoom itself
uses only the tabs zoom API, and nothing is collected or sent anywhere —
the extension has no network code at all.
