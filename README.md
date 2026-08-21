# FreeCopy

Unblock text selection and copying on any website. FreeCopy neutralizes
JavaScript-based copy/selection blockers, and optionally cleans up what you
copy — stripping boilerplate, invisible characters, and (optionally) all
formatting.

![status](https://img.shields.io/badge/manifest-v3-blue) ![license](https://img.shields.io/badge/license-MIT-green)

## Features

- 🔓 **Unblock selection & copy** — defeats sites that disable text
  selection, right-click, or the copy/cut events via JavaScript
- 🧹 **Clean Copy** — strips invisible Unicode characters, "read more"
  boilerplate, and excess blank lines from whatever you copy
- 📄 **Plain Text mode** — always copies as unformatted text, discarding
  HTML formatting
- 🌐 **Per-site control** — toggle FreeCopy on or off for individual sites,
  independent of the global setting
- ⌨️ **Keyboard shortcut** — `Ctrl+Shift+U` (`Cmd+Shift+U` on Mac) to toggle
  the current site instantly
- 🖱️ **Right-click "Copy Clean"** — clean-copy a selection straight from the
  context menu, without changing your global settings

## Install (from source)

FreeCopy isn't on the Chrome Web Store, so it's loaded as an unpacked
extension:

1. Download or clone this repository.
2. Open `chrome://extensions` (or `edge://extensions` on Edge).
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `FreeCopy` folder.
5. Pin the FreeCopy icon to your toolbar if you'd like (optional).

Works in any Chromium-based browser (Chrome, Edge, Brave, etc.) that
supports Manifest V3.

## Usage

1. Click the FreeCopy icon to open the popup.
2. Use the top toggle to turn FreeCopy on or off for the site you're
   currently on.
3. Use **Clean Copy** and **Plain Text mode** to control how copied text is
   processed — these are global preferences that apply across all sites.
4. Select text and copy as normal (`Ctrl+C` / right-click → Copy), or
   right-click a selection and choose **Copy Clean** to force a clean copy
   regardless of your current settings.

## How it works

- `content.js` runs at `document_start` on every page (before the page's own
  scripts), so it can register capturing-phase listeners on `contextmenu`,
  `selectstart`, `dragstart`, `copy`, and `cut` that intercept and stop a
  page's own blocking handlers before they run. It also clears any
  `on*`-property-based blockers (`document.oncopy = ...` etc.) and watches
  the DOM with a `MutationObserver` in case a page re-applies them later.
- When Clean Copy or Plain Text mode is on, the same `copy`/`cut` listener
  rewrites the clipboard contents via `ClipboardEvent.clipboardData`,
  falling back to `navigator.clipboard.writeText()` (and a hidden-textarea
  `execCommand('copy')` fallback for older contexts) when that's
  unavailable.
- `background.js` handles the context-menu entry and the keyboard shortcut,
  and relays the resulting state changes to the active tab.
- `popup/` is the toolbar UI for toggling settings; it reads and writes the
  same `chrome.storage.local` state that `content.js` and `background.js`
  use.

## Permissions

- `activeTab` — read the current tab's URL to show per-site status in the
  popup
- `storage` — persist your global and per-site preferences
- `clipboardWrite` — used only as a fallback path when the standard
  clipboard event API isn't available
- `contextMenus` — adds the "Copy Clean" right-click menu item
- `host_permissions: <all_urls>` — the content script needs to run on every
  page for the unblock feature to work regardless of which site you're on

FreeCopy does not send any data anywhere; everything happens locally in
your browser and in `chrome.storage.local`.

## Repo layout

```
FreeCopy/
├── manifest.json
├── background.js
├── content.js
├── content.css
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── icons/              # icons actually used by the extension
└── design/             # source/master icon artwork (not loaded by Chrome)
```

## Limitations

- Some sites re-render content in ways that briefly reintroduce a blocker
  before the `MutationObserver` catches it; this is generally sub-second but
  not instantaneous.
- Sites that block copying at the OS/rendering level (e.g. text baked into
  a canvas or image rather than real selectable text) can't be unblocked,
  since there's no text selection event to intercept.

## Contributing

Issues and pull requests are welcome. Please keep changes minimal and
focused, and test manually against a few sites with different blocking
techniques before submitting, since there's no automated test suite.

## License

MIT — see [LICENSE](LICENSE).
