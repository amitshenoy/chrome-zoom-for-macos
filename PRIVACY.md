# Privacy — Chrome zoom for MacOS

Short version: **this extension collects nothing.**

- No analytics, no tracking, no crash reporting.
- No network requests of any kind — the code contains no fetch/XHR calls
  and no remote servers exist.
- The only thing stored is your own settings (hotkey choice and the
  on/off toggle), kept in Chrome's `chrome.storage.sync` so they follow
  your Chrome profile. They never leave your browser except through
  Chrome's own sync, under your Google account.
- Zoom is applied with Chrome's built-in `chrome.tabs` zoom API. Page
  content is never read, copied, or transmitted; the content script only
  listens for wheel events to detect the hotkey + scroll gesture.

Permissions, and why each exists:

| Permission | Why |
|---|---|
| `tabs` | Required to read and set the current tab's zoom level via Chrome's zoom API. |
| `storage` | Saves your hotkey choice and enable/disable toggle. |
| Host access (`<all_urls>`) | The scroll listener has to run on the pages you visit to detect hotkey + scroll. It reads nothing else from the page. |
