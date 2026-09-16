# docs-term

A localhost web app that looks like a **blank Google Docs page** and is a **real Linux terminal** (PTY).

Chrome and menus clone the Docs editor. The white page is an [xterm.js](https://xtermjs.org/) session attached to a real shell via [node-pty](https://github.com/microsoft/node-pty) over WebSocket.

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
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Windows: [Visual Studio Build Tools](https://github.com/Microsoft/nodejs-windows-build-tools) with the C++ workload

If `npm install` fails with `No module named 'gyp'`, a virtualenv Python is probably first on `PATH`. Point npm at the system interpreter:

```bash
export PYTHON=/usr/bin/python3
export npm_config_python=/usr/bin/python3
npm install
```

## Menus (font size & color)

Docs chrome is wired so **Format** and the toolbar change the terminal, not a fake document:

| Control | What it does |
| --- | --- |
| **Format → Size** | 8–36 pt (also toolbar size box and `+/-`) |
| **Format → Text color** | Docs color grid (also toolbar **A** swatch) |
| **Format → Text → Increase/Decrease font size** | Same as toolbar `+/-` |
| **Format → Text → Bold** | Heavier terminal font |
| **Format → Terminal theme** | Docs light (default), classic dark, Solarized light/dark |
| **View → Terminal appearance** | Same themes |
| **Format → Clear formatting** | Reset size, color, weight, Docs-light theme |
| Toolbar highlight | Toggles Docs light ↔ classic dark |
| **Ctrl/Cmd + Shift + .** / **,** | Increase / decrease font size |

Changing size refits xterm and **resizes the PTY** (`cols`/`rows`).

Other File/Edit/Insert items are present for visual fidelity; unavailable actions show a Docs-style snackbar.

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
public/app.js          xterm + menus
public/vendor/         copied from node_modules on npm install
```
