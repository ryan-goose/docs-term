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

Prefs (theme, no-bg, font size/family, zoom, ruler/chrome) persist in `localStorage` (`docs-term-prefs`).

## Menus (working actions)

| Menu | Wired actions |
| --- | --- |
| **File** | New (tab), New terminal session (reload), Share, Download transcript, Print, Close |
| **Edit** | Undo/Redo (term keys), Cut/Copy/Paste, Select all, Find in scrollback |
| **View** | Show ruler, show/hide chrome, Full screen, Zoom, font size, Terminal appearance |
| **Insert** | New line, Clear screen, Form feed |
| **Format** | Text / Size / Text color / Highlight submenu, Clear formatting |
| **Tools / Help** | About, Keyboard shortcuts, Terminal appearance |

Toolbar size/color/bold and **Ctrl/Cmd+Shift+.** / **,** still change the PTY font metrics (fit + resize).

Unavailable Docs chrome items remain disabled or show a snackbar.

## Stack

- `express` static UI on port **3737**
- `ws` WebSocket at `/pty`
- `node-pty` per-connection shell
- `@xterm/xterm` + `@xterm/addon-fit` in the page body

Works in **Chrome and Firefox** (standard WebSocket, canvas, `ResizeObserver`).

## Layout

```
server.js              HTTP + WebSocket PTY
public/index.html      Docs chrome
public/styles.css
public/app.js          xterm + menus + SGR bg filter
public/vendor/         copied from node_modules on npm install
```
