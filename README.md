# docs-term

A localhost web app that looks like a **blank Google Docs page** and is a **real Linux terminal** (PTY).

Chrome and menus clone the Docs editor. The white page is an [xterm.js](https://xtermjs.org/) session attached to a real shell via [node-pty](https://github.com/microsoft/node-pty) over WebSocket.

## Update (Artix / existing checkout)

```bash
git pull && npm install && npm start
```

Then **hard-refresh** the browser (cache-bust `app.js` / CSS). Run `npm install` whenever `package-lock.json` changes.

### npm 12+ and `node-pty` install scripts

If `npm install` skips native builds (npm 12+ may require approving lifecycle scripts), approve `node-pty` then reinstall:

```bash
npm install-scripts approve node-pty
npm install
```

(Older npm: plain `npm install` is enough once build tools are present.)

## Run

```bash
npm install
npm start
```

Open [http://127.0.0.1:3737](http://127.0.0.1:3737).

The server binds **localhost only**. It spawns a real interactive shell (`$SHELL`, else `bash`, else `sh`). Do not expose the port.

Override with `PORT`, `HOST`, `SHELL`, or `MAX_SESSIONS`.

## Requirements

- **Node.js 18+**
- **Python 3** (for `node-gyp` when compiling `node-pty`)
- **C++ build tools** for the `node-pty` native addon:
  - Debian/Ubuntu: `sudo apt install build-essential python3`
  - Fedora: `sudo dnf install gcc-c++ make python3`
  - Artix/Arch: `sudo pacman -S base-devel python`
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Windows: [Visual Studio Build Tools](https://github.com/Microsoft/nodejs-windows-build-tools) with the C++ workload

If `npm install` fails with `No module named 'gyp'`, a virtualenv Python is probably first on `PATH`. Point npm at the system interpreter:

```bash
export PYTHON=/usr/bin/python3
export npm_config_python=/usr/bin/python3
npm install
```


## Chat mode (Ollama free default)

Left **document tabs**: **Terminal** ↔ **Chat**.

- **Chat** shows bubble messages on the Docs page (short answers / English summarizing — not essays). Same student-voice system prompt as before.
- **Default provider: local [Ollama](https://ollama.com)** at `http://127.0.0.1:11434` (OpenAI-compatible `/v1/chat/completions`, with `/api/chat` fallback). No API key required.
- Env overrides: `OLLAMA_HOST`, `OLLAMA_MODEL` (default prefers `llama3.2` from `/api/tags` when present).
- Status UI: if Ollama is down, the tab shows a CTA (`ollama serve` / `ollama pull …`). **Check again** re-probes.
- **Optional xAI**: Tools → **xAI API key…**, or env `XAI_API_KEY`, or `~/.config/docs-term/xai-api-key` (mode `600`). Used when Ollama is unavailable or when you request the xAI provider.

```bash
# free local path
ollama serve
ollama pull llama3.2

# optional overrides
export OLLAMA_HOST=http://127.0.0.1:11434
export OLLAMA_MODEL=llama3.2

# optional cloud fallback
export XAI_API_KEY=xai-...
```

## Highlight+ (themes & black prompt bar)

Shell `PS1` often sets **cell background** with SGR (`\e[40m` … `47`, `48;…`, `100`–`107`). On the Docs-light white page, xterm paints those cells black → a black strip on the prompt.

Use the toolbar **Highlight** button (or **Format → Highlight color** / **View → Terminal appearance**):

| Item | Effect |
| --- | --- |
| **Docs light page** | White page, Docs-ish colors |
| **Classic dark** | Dark terminal theme |
| **Real terminal ANSI colors** | Classic 16-color VGA/xterm palette (fg) |
| **Solarized light / dark** | Solarized themes |
| **No cell backgrounds** | Toggle: rewrite SGR bg → `49` (default) **before** `term.write`; keeps fg colors; page stays white |

Prefs (theme, no-bg, dark chrome, page width/height/margins, layout-edit, pageless, follow-output, scrollback lines, smooth scroll, font size/family, zoom, ruler/chrome, panel open state) persist in `localStorage` (`docs-term-prefs`) and sync to `~/.config/docs-term/prefs.json`. Named sessions, bookmarks, comments, and SSH profiles **dual-write** to `localStorage` and `~/.config/docs-term/<name>.json` via `/api/config/:name` (localStorage first, then disk; load merges both by id / newest timestamp).


## New: paste suggestions, page layout, dark chrome

- **Multiline paste → suggestion mode** (default): queued lines with Confirm / Skip / Confirm all / Cancel; Confirm all walks remaining lines sequentially. Single-line paste is unchanged.
- **Page setup** (File / Tools → Page setup): **Edit** is a blue toggle button (no checkbox) that turns on drag mode for page edges and margin guides; numeric fields stay in sync; persisted. Pageless lives here too.
- **Scrolling** (File / Tools → Scrolling): follow PTY output, scrollback size, optional smooth scroll — separate from Page setup.
- **Dark mode**: Docs-like dark chrome for bars, menus, canvas, and side panels (orthogonal to terminal Highlight+ themes).

## New: pageless + scrolling

- **Pageless**: Docs-style continuous scroll — no forced letter page height / page breaks (`body.pageless`). Toggle in Page setup; persisted.
- **Scrolling**: File / Tools → Scrolling — follow PTY output (auto-stick to bottom unless you scroll up), scrollback history size (lines, default 5000), optional smooth scroll. Follow is wired into the live `term.write` / PTY path.
- **Single outer scrollbar**: xterm’s inner `.xterm-viewport` scrollbar is hidden; the Docs `.canvas` scroller is the only visible scrollbar. A `#scroll-proxy` sizes the outer scroll range to scrollback (page sticks while scrubbing); Follow PTY / scrollback prefs stay synced to that outer scroller.

## Features

| # | Feature | Where |
| --- | --- | --- |
| 2 | **Named sessions** | File → Named sessions… / Save session (`Ctrl/Cmd+S`); modal form saves name + optional cwd + scrollback to `localStorage` + `~/.config/docs-term/sessions.json` |
| 3 | **Comment side panel** | Insert → Comment / comment toolbar / header; View → Show comments |
| 4 | **Find & replace** | Edit → Find and replace (`Ctrl/Cmd+F`); find jumps in live buffer; replace downloads a transcript copy (cannot rewrite PTY history) |
| 5 | **Command bookmarks** | Star / Insert → Bookmarks / Tools → Command bookmarks…; Insert pastes into PTY |
| 6 | **Outline** | View → Show outline; auto list of recent commands; click to scroll |
| 8 | **SSH profile picker** | File → Open connection…; writes `ssh user@host` into the PTY; profiles local only (no secrets in git) |
| 10 | **Export PDF / .docx** | File → Export as PDF… / Export as .docx… (client-side) |
| 11 | **Smart paste / suggestion mode** | Multiline paste opens a Docs-like queue: **Confirm / Skip / Confirm all / Cancel**; each Confirm sends one line + newline via **bracketed paste**. Single-line paste stays immediate. |
| 12 | **Page setup / Scrolling** | File or Tools → **Page setup** (Edit blue toggle for drag edges/margins, width/margins, pageless) and **Scrolling** (follow output, scrollback, smooth scroll); prefs in `localStorage` + `~/.config/docs-term/prefs.json` |
| 13 | **Dark chrome** | View → Dark mode (also Highlight+ / Settings): full Google Docs–style dark UI (top bar, menus, canvas, side panels). Terminal themes + no-cell-bg still apply to the page surface. |
| 17 | **Keyboard cheat-sheet** | Help → Keyboard shortcuts (`Ctrl/Cmd+/`) |
| 20 | **Artix .desktop launcher** | `packaging/docs-term.desktop` → install with `scripts/install-desktop.sh` |

## Menus (working actions)

| Menu | Wired actions |
| --- | --- |
| **File** | New tab, New session, Open connection (SSH), Named sessions, Save session, Share, Download .txt, Export PDF/.docx, Rename, Chat mode, Page setup, Scrolling, Print, Close |
| **Edit** | Undo/Redo, Cut/Copy/Paste (smart), Select all, Find and replace, Bookmark last command |
| **View** | Ruler, chrome, Full screen, Zoom, font size, Outline, Comments, Terminal / Chat mode, Dark mode, Terminal appearance |
| **Insert** | New line, Clear screen, Form feed, Comment, Bookmarks |
| **Format** | Text / Size / Text color / Highlight, Clear formatting |
| **Tools / Help** | About, Shortcuts, Terminal appearance, Bookmarks, SSH profiles, xAI API key (optional), Page setup, Scrolling |

Unavailable Docs chrome items remain disabled or show a snackbar.

## Artix / desktop launcher

```bash
# Install user .desktop (opens browser; start script brings server up if needed)
./scripts/install-desktop.sh
# → ~/.local/share/applications/docs-term.desktop
```

Source files:

- `packaging/docs-term.desktop` — launcher template (`xdg-open http://127.0.0.1:3737`)
- `scripts/start-docs-term.sh` — start server if `/health` is down, then open browser
- `scripts/install-desktop.sh` — copy into `~/.local/share/applications` and point Exec at the start script

## Stack

- `express` static UI on port **3737** + JSON config API under `~/.config/docs-term` + Chat proxy (`/api/chat` → Ollama, optional xAI)
- `ws` WebSocket at `/pty`
- `node-pty` per-connection shell
- `@xterm/xterm` + `@xterm/addon-fit` in the page body

Works in **Chrome and Firefox** (standard WebSocket, canvas, `ResizeObserver`, bracketed paste).

## Layout

```
server.js                 HTTP + WebSocket PTY + /api/config
public/index.html         Docs chrome + panels/modals
public/styles.css
public/app.js             xterm + menus + features + SGR bg filter
public/chat.js            Chat tab (Ollama default + optional xAI)
public/vendor/            copied from node_modules on npm install
packaging/docs-term.desktop
scripts/start-docs-term.sh
scripts/install-desktop.sh
scripts/copy-vendor.js
```
