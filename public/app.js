/* docs-term client: Docs chrome + xterm.js over WebSocket */
(function () {
  'use strict';

  const PREFS_KEY = 'docs-term-prefs';

  const COLORS = [
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
    '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
    '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
    '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
    '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
    '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
    '#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47',
    '#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130',
  ];

  const THEMES = {
    docs: {
      background: '#ffffff',
      foreground: '#202124',
      cursor: '#202124',
      cursorAccent: '#ffffff',
      selectionBackground: '#a8c7fa',
      selectionForeground: '#202124',
      black: '#202124',
      red: '#d93025',
      green: '#188038',
      yellow: '#e37400',
      blue: '#1a73e8',
      magenta: '#9334e6',
      cyan: '#007b83',
      white: '#e8eaed',
      brightBlack: '#5f6368',
      brightRed: '#ea4335',
      brightGreen: '#34a853',
      brightYellow: '#fbbc04',
      brightBlue: '#4285f4',
      brightMagenta: '#a142f4',
      brightCyan: '#24c1e0',
      brightWhite: '#ffffff',
    },
    classic: {
      background: '#0d0d0d',
      foreground: '#e8eaed',
      cursor: '#e8eaed',
      cursorAccent: '#0d0d0d',
      selectionBackground: '#3c4043',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#ffffff',
    },
    /* Classic VGA / xterm 16-color palette for authentic ANSI fg */
    ansi: {
      background: '#000000',
      foreground: '#c0c0c0',
      cursor: '#c0c0c0',
      cursorAccent: '#000000',
      selectionBackground: '#44475a',
      black: '#000000',
      red: '#cd0000',
      green: '#00cd00',
      yellow: '#cdcd00',
      blue: '#0000ee',
      magenta: '#cd00cd',
      cyan: '#00cdcd',
      white: '#e5e5e5',
      brightBlack: '#7f7f7f',
      brightRed: '#ff0000',
      brightGreen: '#00ff00',
      brightYellow: '#ffff00',
      brightBlue: '#5c5cff',
      brightMagenta: '#ff00ff',
      brightCyan: '#00ffff',
      brightWhite: '#ffffff',
    },
    'solarized-light': {
      background: '#fdf6e3',
      foreground: '#657b83',
      cursor: '#657b83',
      cursorAccent: '#fdf6e3',
      selectionBackground: '#eee8d5',
      black: '#073642',
      red: '#dc322f',
      green: '#859900',
      yellow: '#b58900',
      blue: '#268bd2',
      magenta: '#d33682',
      cyan: '#2aa198',
      white: '#eee8d5',
      brightBlack: '#002b36',
      brightRed: '#cb4b16',
      brightGreen: '#586e75',
      brightYellow: '#657b83',
      brightBlue: '#839496',
      brightMagenta: '#6c71c4',
      brightCyan: '#93a1a1',
      brightWhite: '#fdf6e3',
    },
    'solarized-dark': {
      background: '#002b36',
      foreground: '#839496',
      cursor: '#839496',
      cursorAccent: '#002b36',
      selectionBackground: '#073642',
      black: '#073642',
      red: '#dc322f',
      green: '#859900',
      yellow: '#b58900',
      blue: '#268bd2',
      magenta: '#d33682',
      cyan: '#2aa198',
      white: '#eee8d5',
      brightBlack: '#002b36',
      brightRed: '#cb4b16',
      brightGreen: '#586e75',
      brightYellow: '#657b83',
      brightBlue: '#839496',
      brightMagenta: '#6c71c4',
      brightCyan: '#93a1a1',
      brightWhite: '#fdf6e3',
    },
  };

  const FONT_STACKS = {
    'Courier New': '"Courier New", Courier, monospace',
    Menlo: 'Menlo, Monaco, "Courier New", monospace',
    Monaco: 'Monaco, Menlo, "Courier New", monospace',
    Consolas: 'Consolas, "Liberation Mono", monospace',
    'Ubuntu Mono': '"Ubuntu Mono", "DejaVu Sans Mono", monospace',
    'DejaVu Sans Mono': '"DejaVu Sans Mono", "Liberation Mono", monospace',
    'Liberation Mono': '"Liberation Mono", "DejaVu Sans Mono", monospace',
  };

  const FONT_NAMES = Object.keys(FONT_STACKS);

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  const prefs = loadPrefs();

  const state = {
    fontSize: Number(prefs.fontSize) || 14,
    fontFamily: FONT_STACKS[prefs.fontName] || FONT_STACKS['Courier New'],
    fontName: FONT_STACKS[prefs.fontName] ? prefs.fontName : 'Courier New',
    themeName: THEMES[prefs.themeName] ? prefs.themeName : 'docs',
    fg: prefs.fg || null,
    bold: !!prefs.bold,
    ruler: prefs.ruler !== false,
    chrome: prefs.chrome !== false,
    noCellBg: !!prefs.noCellBg,
    zoom: Number(prefs.zoom) || 100,
  };

  function savePrefs() {
    try {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({
          themeName: state.themeName,
          noCellBg: state.noCellBg,
          fontSize: state.fontSize,
          fontName: state.fontName,
          fg: state.fg,
          bold: state.bold,
          ruler: state.ruler,
          chrome: state.chrome,
          zoom: state.zoom,
        })
      );
    } catch (_) {
      /* ignore quota */
    }
  }

  /**
   * Rewrite SGR cell-background codes to default (49) before term.write.
   * Strips 40–47, 100–107, and 48;5;n / 48;2;r;g;b. Keeps fg and other attrs.
   */
  function stripCellBackgrounds(input) {
    let data = input;
    let asBytes = false;
    if (typeof data !== 'string') {
      if (data instanceof ArrayBuffer) data = new Uint8Array(data);
      if (data && data.buffer && typeof data.length === 'number') {
        asBytes = true;
        data = new TextDecoder('utf-8').decode(data);
      } else {
        return input;
      }
    }
    const out = data.replace(/\u001b\[([0-9;]*)m/g, (_m, params) => {
      if (!params) return '\u001b[m';
      const parts = params.split(';');
      const rewritten = [];
      for (let i = 0; i < parts.length; i++) {
        const token = parts[i];
        if (token === '') {
          rewritten.push('');
          continue;
        }
        const n = Number(token);
        if (n >= 40 && n <= 47) {
          rewritten.push('49');
        } else if (n >= 100 && n <= 107) {
          rewritten.push('49');
        } else if (n === 48) {
          rewritten.push('49');
          const mode = parts[i + 1];
          if (mode === '5') {
            i += 2;
          } else if (mode === '2') {
            i += 4;
          } else if (mode !== undefined) {
            i += 1;
          }
        } else {
          rewritten.push(token);
        }
      }
      return '\u001b[' + rewritten.join(';') + 'm';
    });
    if (asBytes) return new TextEncoder().encode(out);
    return out;
  }

  // Expose for smoke tests / debugging
  window.__docsTermStripBg = stripCellBackgrounds;

  function writeToTerm(data) {
    if (state.noCellBg) data = stripCellBackgrounds(data);
    term.write(data);
  }

  const TerminalCtor = window.Terminal;
  const FitAddonCtor = window.FitAddon && (window.FitAddon.FitAddon || window.FitAddon);
  if (!TerminalCtor || !FitAddonCtor) {
    document.body.innerHTML = '<p style="padding:24px;font-family:Arial">Failed to load xterm.js. Run npm install.</p>';
    return;
  }

  const baseTheme = THEMES[state.themeName] || THEMES.docs;
  const term = new TerminalCtor({
    cursorBlink: true,
    cursorStyle: state.themeName === 'docs' || state.themeName === 'solarized-light' ? 'bar' : 'block',
    fontSize: state.fontSize,
    fontFamily: state.fontFamily,
    fontWeight: state.bold ? 'bold' : 'normal',
    theme: baseTheme,
    allowProposedApi: true,
    scrollback: 5000,
    convertEol: false,
  });
  const fitAddon = new FitAddonCtor();
  term.loadAddon(fitAddon);
  term.open(document.getElementById('terminal'));

  let socket = null;
  let reconnectTimer = null;
  let findMatches = [];
  let findIndex = -1;

  function wsUrl() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return proto + '//' + location.host + '/pty';
  }

  function setConn(ok, text) {
    const pill = document.getElementById('conn-pill');
    if (!pill) return;
    if (ok) {
      pill.classList.remove('warn');
      pill.textContent = '';
    } else {
      pill.classList.add('warn');
      pill.textContent = text || 'Disconnected';
    }
  }

  function sendResize() {
    try {
      fitAddon.fit();
    } catch (_) {
      /* not attached yet */
    }
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    }
  }

  function connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
    socket = new WebSocket(wsUrl());
    socket.addEventListener('open', () => {
      setConn(true);
      sendResize();
      term.focus();
    });
    socket.addEventListener('message', (ev) => {
      const data = ev.data;
      if (typeof data === 'string' && data.charAt(0) === '{' && data.indexOf('"type":"exit"') !== -1) {
        try {
          const msg = JSON.parse(data);
          if (msg.type === 'exit') {
            writeToTerm('\r\n[process exited with code ' + msg.exitCode + ']\r\n');
            return;
          }
        } catch (_) {
          /* fall through */
        }
      }
      writeToTerm(typeof data === 'string' ? data : new Uint8Array(data));
    });
    socket.addEventListener('close', () => {
      setConn(false, 'Disconnected');
      if (reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 800);
    });
    socket.addEventListener('error', () => {
      setConn(false, 'Connection error');
    });
  }

  term.onData((data) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'input', data: data }));
    }
  });

  term.onResize(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    }
  });

  function syncThemeChecks() {
    document.querySelectorAll('[data-theme]').forEach((el) => {
      el.classList.toggle('check', el.getAttribute('data-theme') === state.themeName);
    });
    const noBg = document.querySelectorAll('[data-action="toggle-no-bg"]');
    noBg.forEach((el) => el.classList.toggle('check', state.noCellBg));
  }

  function applyTheme(name) {
    const t = THEMES[name] || THEMES.docs;
    state.themeName = THEMES[name] ? name : 'docs';
    const fg = state.fg || t.foreground;
    const theme = Object.assign({}, t, { foreground: fg, cursor: fg });
    term.options.theme = theme;
    term.options.cursorStyle =
      state.themeName === 'docs' || state.themeName === 'solarized-light' ? 'bar' : 'block';
    syncThemeChecks();
    const page = document.getElementById('page');
    if (page) page.style.background = t.background;
    savePrefs();
  }

  function applyFontSize(size) {
    size = Math.max(6, Math.min(72, Number(size) || 14));
    state.fontSize = size;
    term.options.fontSize = size;
    const input = document.getElementById('font-size');
    if (input) input.value = String(size);
    savePrefs();
    requestAnimationFrame(sendResize);
  }

  function applyFont(name) {
    state.fontName = FONT_STACKS[name] ? name : 'Courier New';
    state.fontFamily = FONT_STACKS[state.fontName];
    term.options.fontFamily = state.fontFamily;
    const sel = document.getElementById('font-select');
    if (sel) sel.value = state.fontName;
    savePrefs();
    requestAnimationFrame(sendResize);
  }

  function applyFg(color) {
    state.fg = color;
    const t = THEMES[state.themeName] || THEMES.docs;
    term.options.theme = Object.assign({}, t, { foreground: color, cursor: color });
    const sw = document.getElementById('color-swatch');
    if (sw) sw.style.background = color;
    savePrefs();
  }

  function applyZoom(pct) {
    pct = Number(pct) || 100;
    state.zoom = pct;
    const page = document.getElementById('page');
    const z = pct / 100;
    if (page) {
      if ('zoom' in page.style) {
        page.style.zoom = String(z);
        page.style.transform = '';
      } else {
        page.style.transform = z === 1 ? '' : 'scale(' + z + ')';
        page.style.transformOrigin = 'top center';
      }
    }
    const sel = document.getElementById('zoom-select');
    if (sel) {
      const opt = Array.from(sel.options).find((o) => Number(o.value) === pct);
      if (opt) sel.value = String(pct);
      else {
        // allow arbitrary from menu
        let found = false;
        for (let i = 0; i < sel.options.length; i++) {
          if (sel.options[i].value === String(pct)) {
            found = true;
            break;
          }
        }
        if (!found) {
          const o = document.createElement('option');
          o.value = String(pct);
          o.textContent = pct + '%';
          sel.appendChild(o);
        }
        sel.value = String(pct);
      }
    }
    savePrefs();
    requestAnimationFrame(sendResize);
  }

  function setNoCellBg(on) {
    state.noCellBg = !!on;
    syncThemeChecks();
    savePrefs();
    snack(state.noCellBg ? 'No cell backgrounds: on (SGR bg → default)' : 'No cell backgrounds: off');
  }

  function snack(text) {
    const el = document.getElementById('snackbar');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(snack._t);
    snack._t = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function getTranscript() {
    const buf = term.buffer.active;
    const lines = [];
    for (let i = 0; i < buf.length; i++) {
      const line = buf.getLine(i);
      if (line) lines.push(line.translateToString(true));
    }
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
    return lines.join('\n') + (lines.length ? '\n' : '');
  }

  function downloadTranscript() {
    const text = getTranscript();
    const title = (document.getElementById('doc-title').value || 'terminal').replace(/[^\w\- .]+/g, '_');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = title + '-transcript.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
    snack('Transcript downloaded');
  }

  function sendInput(data) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'input', data: data }));
    }
  }

  function selectAllBuffer() {
    if (typeof term.selectAll === 'function') {
      term.selectAll();
      term.focus();
      return;
    }
    sendInput('\x01');
  }

  function copySelection() {
    const sel = term.getSelection();
    if (!sel) {
      snack('Nothing selected');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(sel).then(() => snack('Copied')).catch(() => snack('Copy failed'));
    } else {
      snack('Clipboard unavailable');
    }
  }

  function pasteClipboard() {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard
        .readText()
        .then((t) => {
          if (t) sendInput(t);
        })
        .catch(() => snack('Clipboard paste was blocked by the browser.'));
    } else {
      snack('Clipboard paste unavailable');
    }
  }

  function cutSelection() {
    copySelection();
    // Terminal has no true cut of scrollback; send interrupt as Docs-ish fallback for line edit
    sendInput('\x15'); // Ctrl+U clear line in many shells
  }

  function toggleFullscreen() {
    const root = document.documentElement;
    if (!document.fullscreenElement) {
      const req = root.requestFullscreen || root.webkitRequestFullscreen;
      if (req) {
        Promise.resolve(req.call(root)).catch(() => snack('Fullscreen was blocked'));
      } else {
        snack('Fullscreen not supported');
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  function openFind() {
    hideMenus();
    const modal = document.getElementById('find-modal');
    modal.classList.add('show');
    const input = document.getElementById('find-input');
    input.focus();
    input.select();
  }

  function closeFind() {
    document.getElementById('find-modal').classList.remove('show');
    findMatches = [];
    findIndex = -1;
    term.clearSelection();
    const st = document.getElementById('find-status');
    if (st) st.textContent = '';
  }

  function collectFindMatches(q) {
    const needle = q.toLowerCase();
    const buf = term.buffer.active;
    const matches = [];
    if (!needle) return matches;
    for (let i = 0; i < buf.length; i++) {
      const line = buf.getLine(i);
      if (!line) continue;
      const text = line.translateToString(true);
      const lower = text.toLowerCase();
      let from = 0;
      while (from < lower.length) {
        const at = lower.indexOf(needle, from);
        if (at === -1) break;
        matches.push({ row: i, col: at, len: q.length });
        from = at + Math.max(1, q.length);
      }
    }
    return matches;
  }

  function jumpToMatch(idx) {
    if (!findMatches.length) return;
    findIndex = ((idx % findMatches.length) + findMatches.length) % findMatches.length;
    const m = findMatches[findIndex];
    const buf = term.buffer.active;
    // Convert buffer row to viewport-relative selection
    try {
      term.scrollToLine(Math.max(0, m.row - 2));
      term.select(m.col, m.row, m.len);
    } catch (_) {
      /* older xterm */
    }
    const st = document.getElementById('find-status');
    if (st) st.textContent = findIndex + 1 + ' of ' + findMatches.length;
  }

  function runFind(next) {
    const q = document.getElementById('find-input').value;
    if (!q) {
      findMatches = [];
      findIndex = -1;
      document.getElementById('find-status').textContent = '';
      return;
    }
    findMatches = collectFindMatches(q);
    if (!findMatches.length) {
      document.getElementById('find-status').textContent = 'No matches';
      term.clearSelection();
      return;
    }
    if (next === 'prev') jumpToMatch(findIndex <= 0 ? findMatches.length - 1 : findIndex - 1);
    else jumpToMatch(findIndex + 1);
  }

  function showAbout() {
    hideMenus();
    document.getElementById('about-modal').classList.add('show');
  }

  function showShortcuts() {
    hideMenus();
    document.getElementById('shortcuts-modal').classList.add('show');
  }

  /* ----- menus ----- */
  const layer = document.getElementById('menu-layer');
  let openMenu = null;
  let openSub = null;

  function hideMenus() {
    document.querySelectorAll('.dropdown.show, .submenu.show').forEach((el) => el.classList.remove('show'));
    document.querySelectorAll('.menu-btn.open').forEach((el) => el.classList.remove('open'));
    layer.classList.remove('show');
    openMenu = null;
    openSub = null;
  }

  function place(el, x, y) {
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.classList.add('show');
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      if (r.right > window.innerWidth - 8) el.style.left = Math.max(8, window.innerWidth - r.width - 8) + 'px';
      if (r.bottom > window.innerHeight - 8) el.style.top = Math.max(8, window.innerHeight - r.height - 8) + 'px';
    });
  }

  function showMenu(name, btn) {
    hideMenus();
    const menu = document.getElementById('menu-' + name);
    if (!menu) return;
    layer.classList.add('show');
    btn.classList.add('open');
    openMenu = name;
    const r = btn.getBoundingClientRect();
    place(menu, r.left, r.bottom + 2);
  }

  function showSub(name, fromBtn) {
    document.querySelectorAll('.submenu.show').forEach((el) => el.classList.remove('show'));
    const sub = document.getElementById('sub-' + name);
    if (!sub) return;
    openSub = name;
    layer.classList.add('show');
    const r = fromBtn.getBoundingClientRect();
    // Prefer to the right; if toolbar button, open below
    if (fromBtn.closest('.toolbar')) {
      place(sub, r.left, r.bottom + 2);
    } else {
      place(sub, r.right - 4, r.top);
    }
  }

  document.getElementById('menu-row').addEventListener('click', (e) => {
    const btn = e.target.closest('.menu-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const name = btn.getAttribute('data-menu');
    if (openMenu === name) hideMenus();
    else showMenu(name, btn);
  });

  document.getElementById('menu-row').addEventListener('mouseover', (e) => {
    const btn = e.target.closest('.menu-btn');
    if (!btn || !openMenu) return;
    const name = btn.getAttribute('data-menu');
    if (name !== openMenu) showMenu(name, btn);
  });

  layer.addEventListener('mousedown', (e) => {
    if (e.target === layer) hideMenus();
  });

  function handleAction(el) {
    if (el.classList.contains('disabled') || el.disabled) return;
    if (el.hasAttribute('data-nyi')) {
      snack("That action isn't available in the terminal.");
      hideMenus();
      return;
    }
    const sub = el.getAttribute('data-submenu');
    if (sub) {
      showSub(sub, el);
      return;
    }
    const action = el.getAttribute('data-action');
    const size = el.getAttribute('data-size');
    const theme = el.getAttribute('data-theme');
    const termCmd = el.getAttribute('data-term');
    const color = el.getAttribute('data-c');
    const zoom = el.getAttribute('data-zoom');

    if (size) applyFontSize(size);
    if (theme) applyTheme(theme);
    if (color) applyFg(color);
    if (zoom) applyZoom(zoom);
    if (termCmd) sendTermKey(termCmd);

    switch (action) {
      case 'font-inc':
        applyFontSize(state.fontSize + 1);
        break;
      case 'font-dec':
        applyFontSize(state.fontSize - 1);
        break;
      case 'bold':
        state.bold = !state.bold;
        term.options.fontWeight = state.bold ? 'bold' : 'normal';
        savePrefs();
        requestAnimationFrame(sendResize);
        break;
      case 'color-menu': {
        const btn = document.getElementById('color-btn');
        layer.classList.add('show');
        showSub('color', btn);
        return;
      }
      case 'highlight-menu': {
        const btn = document.getElementById('hl-btn');
        layer.classList.add('show');
        showSub('highlight', btn);
        return;
      }
      case 'toggle-no-bg':
        setNoCellBg(!state.noCellBg);
        // keep submenu open so user can see check
        syncThemeChecks();
        return;
      case 'reset-format':
        state.fg = null;
        state.bold = false;
        term.options.fontWeight = 'normal';
        applyTheme('docs');
        applyFontSize(14);
        applyFont('Courier New');
        applyFg(THEMES.docs.foreground);
        state.fg = null;
        setNoCellBg(false);
        break;
      case 'print':
        hideMenus();
        window.print();
        return;
      case 'new':
      case 'new-session':
        hideMenus();
        location.reload();
        return;
      case 'new-tab':
        hideMenus();
        window.open(location.href, '_blank');
        return;
      case 'download':
        hideMenus();
        downloadTranscript();
        return;
      case 'close':
        hideMenus();
        window.close();
        setTimeout(() => snack('Close the browser tab to exit.'), 200);
        return;
      case 'copy':
        copySelection();
        break;
      case 'paste':
        pasteClipboard();
        break;
      case 'cut':
        cutSelection();
        break;
      case 'select-all':
        selectAllBuffer();
        break;
      case 'find':
        openFind();
        return;
      case 'fullscreen':
        hideMenus();
        toggleFullscreen();
        return;
      case 'toggle-ruler':
        state.ruler = !state.ruler;
        document.getElementById('ruler').style.display = state.ruler ? '' : 'none';
        document.querySelectorAll('[data-action="toggle-ruler"]').forEach((n) =>
          n.classList.toggle('check', state.ruler)
        );
        savePrefs();
        requestAnimationFrame(sendResize);
        break;
      case 'toggle-chrome':
        state.chrome = !state.chrome;
        document.getElementById('chrome').classList.toggle('compact', !state.chrome);
        document.getElementById('menu-row').style.display = state.chrome ? '' : 'none';
        document.querySelectorAll('[data-action="toggle-chrome"]').forEach((n) =>
          n.classList.toggle('check', state.chrome)
        );
        savePrefs();
        requestAnimationFrame(sendResize);
        break;
      case 'insert-newline':
        sendInput('\r');
        break;
      case 'clear-screen':
        sendInput('clear\r');
        break;
      case 'form-feed':
        sendInput('\x0c');
        break;
      case 'help':
      case 'about':
        showAbout();
        return;
      case 'shortcuts':
        showShortcuts();
        return;
      case 'share':
        document.getElementById('share-url').value = location.href;
        document.getElementById('share-modal').classList.add('show');
        break;
    }
    if (!sub && action !== 'color-menu' && action !== 'highlight-menu' && action !== 'toggle-no-bg') {
      hideMenus();
    }
  }

  function sendTermKey(cmd) {
    if (cmd === 'copy') {
      copySelection();
      return;
    }
    if (cmd === 'paste') {
      pasteClipboard();
      return;
    }
    if (cmd === 'select-all') {
      selectAllBuffer();
      return;
    }
    if (cmd === 'cut') {
      cutSelection();
      return;
    }
    const map = {
      undo: '\x1f',
      redo: '\x1b[32~',
    };
    const seq = map[cmd];
    if (seq) sendInput(seq);
  }

  document.body.addEventListener('click', (e) => {
    const nyi = e.target.closest('[data-nyi]');
    if (nyi && !nyi.classList.contains('menu-btn')) {
      snack("That action isn't available in the terminal.");
      return;
    }
    const el = e.target.closest(
      '[data-action], [data-size], [data-theme], [data-term], [data-submenu], [data-c], [data-zoom]'
    );
    if (el && (el.closest('.dropdown, .submenu, .toolbar, .header-right') || el.hasAttribute('data-c'))) {
      handleAction(el);
    }
  });

  const colorGrid = document.getElementById('color-grid');
  COLORS.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'color-cell';
    b.style.background = c;
    b.setAttribute('data-c', c);
    b.title = c;
    colorGrid.appendChild(b);
  });

  document.getElementById('font-size').addEventListener('change', (e) => applyFontSize(e.target.value));
  document.getElementById('font-select').addEventListener('change', (e) => applyFont(e.target.value));
  document.getElementById('zoom-select').addEventListener('change', (e) => applyZoom(e.target.value));

  const title = document.getElementById('doc-title');
  title.addEventListener('input', () => {
    const v = title.value.trim() || 'Untitled document';
    document.title = v + ' - Google Docs';
    const h = document.getElementById('share-title');
    if (h) h.textContent = 'Share “' + v + '”';
  });

  document.getElementById('star-btn').addEventListener('click', (e) => {
    e.currentTarget.classList.toggle('starred');
  });

  const shareModal = document.getElementById('share-modal');
  document.getElementById('share-btn').addEventListener('click', () => {
    document.getElementById('share-url').value = location.href;
    shareModal.classList.add('show');
  });
  document.getElementById('share-done').addEventListener('click', () => shareModal.classList.remove('show'));
  shareModal.addEventListener('click', (e) => {
    if (e.target === shareModal) shareModal.classList.remove('show');
  });
  document.getElementById('share-copy').addEventListener('click', () => {
    const val = document.getElementById('share-url').value;
    if (navigator.clipboard) navigator.clipboard.writeText(val).then(() => snack('Link copied'));
    else snack('Copy: ' + val);
  });

  document.getElementById('find-close').addEventListener('click', closeFind);
  document.getElementById('find-next').addEventListener('click', () => runFind('next'));
  document.getElementById('find-prev').addEventListener('click', () => runFind('prev'));
  document.getElementById('find-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runFind(e.shiftKey ? 'prev' : 'next');
    } else if (e.key === 'Escape') {
      closeFind();
    }
  });
  document.getElementById('find-modal').addEventListener('click', (e) => {
    if (e.target.id === 'find-modal') closeFind();
  });

  document.getElementById('about-done').addEventListener('click', () =>
    document.getElementById('about-modal').classList.remove('show')
  );
  document.getElementById('about-modal').addEventListener('click', (e) => {
    if (e.target.id === 'about-modal') document.getElementById('about-modal').classList.remove('show');
  });
  document.getElementById('shortcuts-done').addEventListener('click', () =>
    document.getElementById('shortcuts-modal').classList.remove('show')
  );
  document.getElementById('shortcuts-modal').addEventListener('click', (e) => {
    if (e.target.id === 'shortcuts-modal') document.getElementById('shortcuts-modal').classList.remove('show');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideMenus();
      shareModal.classList.remove('show');
      closeFind();
      document.getElementById('about-modal').classList.remove('show');
      document.getElementById('shortcuts-modal').classList.remove('show');
      return;
    }
    const meta = e.ctrlKey || e.metaKey;
    const inTitle = e.target === title;
    const inFind = e.target && e.target.id === 'find-input';
    if (meta && e.shiftKey && (e.key === '.' || e.key === '>')) {
      e.preventDefault();
      applyFontSize(state.fontSize + 1);
    } else if (meta && e.shiftKey && (e.key === ',' || e.key === '<')) {
      e.preventDefault();
      applyFontSize(state.fontSize - 1);
    } else if (meta && (e.key === 'b' || e.key === 'B') && !inTitle && !inFind) {
      e.preventDefault();
      state.bold = !state.bold;
      term.options.fontWeight = state.bold ? 'bold' : 'normal';
      savePrefs();
      requestAnimationFrame(sendResize);
    } else if (meta && (e.key === 'f' || e.key === 'F') && !inTitle) {
      e.preventDefault();
      openFind();
    } else if (meta && (e.key === 'p' || e.key === 'P') && !inTitle) {
      e.preventDefault();
      window.print();
    } else if (meta && (e.key === 'n' || e.key === 'N') && !inTitle) {
      e.preventDefault();
      window.open(location.href, '_blank');
    } else if (meta && (e.key === '/' || e.key === '?')) {
      e.preventDefault();
      showShortcuts();
    }
  });

  window.addEventListener('resize', () => sendResize());
  if (window.ResizeObserver) {
    new ResizeObserver(() => sendResize()).observe(document.getElementById('terminal'));
  }

  // Restore prefs into UI
  document.getElementById('font-select').value = state.fontName;
  document.getElementById('font-size').value = String(state.fontSize);
  if (!state.ruler) document.getElementById('ruler').style.display = 'none';
  if (!state.chrome) {
    document.getElementById('chrome').classList.add('compact');
    document.getElementById('menu-row').style.display = 'none';
  }
  document.querySelectorAll('[data-action="toggle-ruler"]').forEach((n) => n.classList.toggle('check', state.ruler));
  document.querySelectorAll('[data-action="toggle-chrome"]').forEach((n) => n.classList.toggle('check', state.chrome));

  applyTheme(state.themeName);
  if (state.fg) applyFg(state.fg);
  else {
    const sw = document.getElementById('color-swatch');
    if (sw) sw.style.background = (THEMES[state.themeName] || THEMES.docs).foreground;
  }
  applyZoom(state.zoom);
  syncThemeChecks();

  setTimeout(() => {
    sendResize();
    connect();
    term.focus();
  }, 30);
  document.getElementById('canvas').addEventListener('mousedown', () => term.focus());
})();
