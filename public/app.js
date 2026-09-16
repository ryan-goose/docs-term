/* docs-term client: Docs chrome + xterm.js over WebSocket */
(function () {
  'use strict';

  const PREFS_KEY = 'docs-term-prefs';
  const LS = {
    sessions: 'docs-term-sessions',
    bookmarks: 'docs-term-bookmarks',
    comments: 'docs-term-comments',
    ssh: 'docs-term-ssh-profiles',
  };

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
    outlineOpen: !!prefs.outlineOpen,
    commentsOpen: !!prefs.commentsOpen,
    sessionId: prefs.sessionId || null,
    cwd: prefs.cwd || '',
  };

  let sessions = [];
  let bookmarks = [];
  let comments = [];
  let sshProfiles = [];
  let lastCommand = '';
  let inputLineBuf = '';
  let pendingPaste = null;
  let findMatches = [];
  let findIndex = -1;
  let outlineTimer = null;

  function uid() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

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
          outlineOpen: state.outlineOpen,
          commentsOpen: state.commentsOpen,
          sessionId: state.sessionId,
          cwd: state.cwd,
        })
      );
    } catch (_) {}
  }

  function lsGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function lsSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  async function configGet(name) {
    try {
      const res = await fetch('/api/config/' + name);
      if (!res.ok) return null;
      const body = await res.json();
      return body.data;
    } catch (_) {
      return null;
    }
  }

  async function configPut(name, data) {
    try {
      await fetch('/api/config/' + name, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: data }),
      });
    } catch (_) {}
  }

  async function loadStore(name, lsKey, fallback) {
    const local = lsGet(lsKey, fallback);
    const remote = await configGet(name);
    if (remote == null) return local || fallback;
    if (Array.isArray(remote) && Array.isArray(local)) {
      return remote.length >= local.length ? remote : local;
    }
    return remote;
  }

  async function persistStore(name, lsKey, data) {
    lsSet(lsKey, data);
    await configPut(name, data);
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
    } catch (_) {}
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
        } catch (_) {}
      }
      writeToTerm(typeof data === 'string' ? data : new Uint8Array(data));
      refreshOutlineSoon();
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

  function sendInput(data) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'input', data: data }));
    }
  }

  function trackTypedInput(data) {
    for (let i = 0; i < data.length; i++) {
      const ch = data.charAt(i);
      const code = data.charCodeAt(i);
      if (ch === '\r' || ch === '\n') {
        const cmd = inputLineBuf.trim();
        if (cmd) {
          lastCommand = cmd;
          const m = cmd.match(/^cd\s+(.+)$/);
          if (m) {
            let p = m[1].trim().replace(/^['"]|['"]$/g, '');
            if (p === '~') p = '';
            state.cwd = p;
            savePrefs();
          }
          refreshOutlineSoon();
        }
        inputLineBuf = '';
      } else if (code === 127 || code === 8) {
        inputLineBuf = inputLineBuf.slice(0, -1);
      } else if (code === 21) {
        inputLineBuf = '';
      } else if (code === 23) {
        inputLineBuf = inputLineBuf.replace(/\S*\s*$/, '');
      } else if (code >= 32) {
        inputLineBuf += ch;
      }
    }
  }

  term.onData((data) => {
    trackTypedInput(data);
    sendInput(data);
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
    document.querySelectorAll('[data-action="toggle-no-bg"]').forEach((el) =>
      el.classList.toggle('check', state.noCellBg)
    );
    document.querySelectorAll('[data-action="toggle-outline"]').forEach((el) =>
      el.classList.toggle('check', state.outlineOpen)
    );
    document.querySelectorAll('[data-action="toggle-comments"]').forEach((el) =>
      el.classList.toggle('check', state.commentsOpen)
    );
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

  function getTranscriptLines() {
    const buf = term.buffer.active;
    const lines = [];
    for (let i = 0; i < buf.length; i++) {
      const line = buf.getLine(i);
      lines.push({ row: i, text: line ? line.translateToString(true) : '' });
    }
    return lines;
  }

  function docTitle() {
    return (document.getElementById('doc-title').value || 'Untitled document').trim() || 'Untitled document';
  }

  function safeFilename(name) {
    return name.replace(/[^\w\- .]+/g, '_');
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  }

  function downloadTranscript() {
    const text = getTranscript();
    downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), safeFilename(docTitle()) + '-transcript.txt');
    snack('Transcript downloaded');
  }

  /* ----- Smart paste (bracketed + multiline confirm) ----- */
  function bracketedPaste(text) {
    return '\x1b[200~' + text + '\x1b[201~';
  }

  function isMultilinePaste(text) {
    return /[\r\n]/.test(text) && text.replace(/\r\n/g, '\n').split('\n').length > 1;
  }

  function doPaste(text) {
    if (!text) return;
    sendInput(bracketedPaste(text));
    trackTypedInput(text.endsWith('\n') || text.endsWith('\r') ? text : text);
  }

  function smartPaste(text) {
    if (!text) return;
    if (isMultilinePaste(text)) {
      pendingPaste = text;
      const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      document.getElementById('paste-lines').textContent = String(lines.length);
      const preview = document.getElementById('paste-preview');
      preview.textContent = lines.slice(0, 40).join('\n') + (lines.length > 40 ? '\n…' : '');
      hideMenus();
      document.getElementById('paste-modal').classList.add('show');
      return;
    }
    doPaste(text);
  }

  function pasteClipboard() {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard
        .readText()
        .then((t) => smartPaste(t))
        .catch(() => snack('Clipboard paste was blocked by the browser.'));
    } else {
      snack('Clipboard paste unavailable');
    }
  }

  // Intercept native paste on the xterm textarea
  setTimeout(() => {
    const ta = term.textarea;
    if (!ta) return;
    ta.addEventListener(
      'paste',
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        smartPaste(text);
      },
      true
    );
  }, 0);

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

  function cutSelection() {
    copySelection();
    sendInput('\x15');
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
  /* ----- Find & replace ----- */
  function openFind() {
    hideMenus();
    document.getElementById("find-modal").classList.add("show");
    const input = document.getElementById("find-input");
    input.focus();
    input.select();
  }

  function closeFind() {
    document.getElementById("find-modal").classList.remove("show");
    findMatches = [];
    findIndex = -1;
    term.clearSelection();
    const st = document.getElementById("find-status");
    if (st) st.textContent = "";
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
    try {
      term.scrollToLine(Math.max(0, m.row - 2));
      term.select(m.col, m.row, m.len);
    } catch (_) {}
    const st = document.getElementById("find-status");
    if (st) st.textContent = findIndex + 1 + " of " + findMatches.length + " (live buffer)";
  }

  function runFind(next) {
    const q = document.getElementById("find-input").value;
    if (!q) {
      findMatches = [];
      findIndex = -1;
      document.getElementById("find-status").textContent = "";
      return;
    }
    findMatches = collectFindMatches(q);
    if (!findMatches.length) {
      document.getElementById("find-status").textContent = "No matches";
      term.clearSelection();
      return;
    }
    if (next === "prev") jumpToMatch(findIndex <= 0 ? findMatches.length - 1 : findIndex - 1);
    else jumpToMatch(findIndex + 1);
  }

  function replaceInTranscript(all) {
    const find = document.getElementById("find-input").value;
    const repl = document.getElementById("replace-input").value;
    if (!find) {
      snack("Enter text to find");
      return;
    }
    let text = getTranscript();
    function countOcc(hay, needle) {
      if (!needle) return 0;
      let n = 0, from = 0;
      while (true) {
        const at = hay.indexOf(needle, from);
        if (at === -1) break;
        n++;
        from = at + needle.length;
      }
      return n;
    }
    function replaceOcc(hay, needle, replacement, doAll) {
      if (!needle) return hay;
      if (!doAll) {
        const at = hay.indexOf(needle);
        if (at === -1) return hay;
        return hay.slice(0, at) + replacement + hay.slice(at + needle.length);
      }
      return hay.split(needle).join(replacement);
    }
    const before = countOcc(text, find);
    if (!before) {
      document.getElementById("find-status").textContent = "No matches in transcript copy";
      return;
    }
    text = replaceOcc(text, find, repl, all);
    const afterCount = all ? before : 1;
    downloadBlob(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
      safeFilename(docTitle()) + "-replaced.txt"
    );
    document.getElementById("find-status").textContent =
      "Replaced " + afterCount + " in transcript copy (downloaded). Live PTY history unchanged.";
    snack("Replaced transcript downloaded");
  }

  function showAbout() {
    hideMenus();
    document.getElementById("about-modal").classList.add("show");
  }

  function showShortcuts() {
    hideMenus();
    document.getElementById("shortcuts-modal").classList.add("show");
  }

  /* ----- Named sessions ----- */
  async function saveCurrentSession(promptName) {
    let name = docTitle();
    if (promptName) {
      const entered = window.prompt('Session name', name);
      if (entered == null) return;
      name = entered.trim() || name;
      document.getElementById('doc-title').value = name;
      document.title = name + ' - Google Docs';
    }
    const cwd =
      state.cwd ||
      (window.prompt('Working directory to restore (optional)', state.cwd || '') || '');
    state.cwd = cwd;
    const scrollback = getTranscript();
    const existing = state.sessionId ? sessions.find((s) => s.id === state.sessionId) : null;
    const entry = {
      id: existing ? existing.id : uid(),
      name: name,
      cwd: cwd,
      scrollback: scrollback,
      savedAt: new Date().toISOString(),
    };
    state.sessionId = entry.id;
    sessions = sessions.filter((s) => s.id !== entry.id);
    sessions.unshift(entry);
    if (sessions.length > 40) sessions = sessions.slice(0, 40);
    await persistStore('sessions', LS.sessions, sessions);
    savePrefs();
    snack('Session saved: ' + name);
    renderSessionsList();
  }

  async function restoreSession(id) {
    const s = sessions.find((x) => x.id === id);
    if (!s) return;
    state.sessionId = s.id;
    state.cwd = s.cwd || '';
    document.getElementById('doc-title').value = s.name || 'Untitled document';
    document.title = (s.name || 'Untitled document') + ' - Google Docs';
    term.reset();
    const text = s.scrollback || '';
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    writeToTerm(normalized.replace(/\n/g, '\r\n'));
    writeToTerm('\r\n\x1b[90m[restored session — live shell below]\x1b[0m\r\n');
    if (s.cwd) {
      const quoted = "'" + String(s.cwd).replace(/'/g, "'\\''") + "'";
      sendInput('cd ' + quoted + '\r');
    }
    savePrefs();
    hideModal('sessions-modal');
    snack('Restored: ' + s.name);
    refreshOutlineSoon();
    term.focus();
  }

  async function deleteSession(id) {
    sessions = sessions.filter((s) => s.id !== id);
    if (state.sessionId === id) state.sessionId = null;
    await persistStore('sessions', LS.sessions, sessions);
    savePrefs();
    renderSessionsList();
  }

  function renderSessionsList() {
    const list = document.getElementById('sessions-list');
    if (!list) return;
    list.innerHTML = '';
    if (!sessions.length) {
      list.innerHTML = '<p class="side-hint">No saved sessions yet.</p>';
      return;
    }
    sessions.forEach((s) => {
      const row = document.createElement('div');
      row.className = 'list-row';
      const when = s.savedAt ? new Date(s.savedAt).toLocaleString() : '';
      row.innerHTML =
        '<div class="grow"><div class="title"></div><div class="sub"></div></div>' +
        '<div class="row-actions">' +
        '<button type="button" data-restore="">Restore</button>' +
        '<button type="button" class="danger" data-del="">Delete</button>' +
        '</div>';
      row.querySelector('.title').textContent = s.name;
      row.querySelector('.sub').textContent =
        (s.cwd ? s.cwd + ' · ' : '') + when + ' · ' + ((s.scrollback || '').length) + ' chars';
      row.querySelector('[data-restore]').addEventListener('click', () => restoreSession(s.id));
      row.querySelector('[data-del]').addEventListener('click', () => deleteSession(s.id));
      list.appendChild(row);
    });
  }

  function openSessionsModal() {
    hideMenus();
    renderSessionsList();
    document.getElementById('sessions-modal').classList.add('show');
  }

  function renameSession() {
    const entered = window.prompt('Rename document / session', docTitle());
    if (entered == null) return;
    const name = entered.trim() || 'Untitled document';
    document.getElementById('doc-title').value = name;
    document.title = name + ' - Google Docs';
    snack('Renamed');
  }

  /* ----- Command bookmarks ----- */
  async function addBookmark(cmd) {
    cmd = (cmd || lastCommand || '').trim();
    if (!cmd) {
      cmd = window.prompt('Command to bookmark', '') || '';
      cmd = cmd.trim();
    }
    if (!cmd) return;
    if (bookmarks.some((b) => b.command === cmd)) {
      snack('Already bookmarked');
      return;
    }
    bookmarks.unshift({ id: uid(), command: cmd, createdAt: new Date().toISOString() });
    if (bookmarks.length > 100) bookmarks = bookmarks.slice(0, 100);
    await persistStore('bookmarks', LS.bookmarks, bookmarks);
    renderBookmarksUI();
    snack('Bookmarked');
  }

  async function deleteBookmark(id) {
    bookmarks = bookmarks.filter((b) => b.id !== id);
    await persistStore('bookmarks', LS.bookmarks, bookmarks);
    renderBookmarksUI();
  }

  function insertBookmark(cmd) {
    hideMenus();
    hideModal('bookmarks-modal');
    sendInput(cmd);
    term.focus();
    snack('Inserted bookmark');
  }

  function renderBookmarksUI() {
    const menuHost = document.getElementById('bookmarks-menu-items');
    const empty = document.getElementById('bookmarks-empty');
    if (menuHost) {
      menuHost.innerHTML = '';
      bookmarks.slice(0, 12).forEach((b) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mi';
        btn.innerHTML = '<span class="label"></span>';
        btn.querySelector('.label').textContent = b.command;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          insertBookmark(b.command);
        });
        menuHost.appendChild(btn);
      });
      if (empty) empty.style.display = bookmarks.length ? 'none' : '';
    }
    const list = document.getElementById('bookmarks-list');
    if (!list) return;
    list.innerHTML = '';
    if (!bookmarks.length) {
      list.innerHTML = '<p class="side-hint">No bookmarks yet.</p>';
      return;
    }
    bookmarks.forEach((b) => {
      const row = document.createElement('div');
      row.className = 'list-row';
      row.innerHTML =
        '<div class="grow"><div class="title"></div></div>' +
        '<div class="row-actions">' +
        '<button type="button" data-ins="">Insert</button>' +
        '<button type="button" class="danger" data-del="">Delete</button>' +
        '</div>';
      row.querySelector('.title').textContent = b.command;
      row.querySelector('[data-ins]').addEventListener('click', () => insertBookmark(b.command));
      row.querySelector('[data-del]').addEventListener('click', () => deleteBookmark(b.id));
      list.appendChild(row);
    });
  }

  function openBookmarksModal() {
    hideMenus();
    renderBookmarksUI();
    document.getElementById('bookmark-cmd').value = lastCommand || '';
    document.getElementById('bookmarks-modal').classList.add('show');
  }

  /* ----- Comments side panel ----- */
  function setCommentsOpen(on) {
    state.commentsOpen = !!on;
    const panel = document.getElementById('comments-panel');
    if (panel) panel.hidden = !state.commentsOpen;
    syncThemeChecks();
    savePrefs();
    requestAnimationFrame(sendResize);
  }

  function openCommentModal() {
    hideMenus();
    setCommentsOpen(true);
    const sel = term.getSelection();
    const lines = getTranscriptLines();
    let anchor = sel ? sel.split('\n')[0].trim() : '';
    if (!anchor) {
      const y = term.buffer.active.baseY + term.buffer.active.cursorY;
      const hit = lines.find((l) => l.row === y) || lines[lines.length - 1];
      anchor = hit ? hit.text.trim() : '';
    }
    document.getElementById('comment-anchor').value = (anchor || '').slice(0, 200);
    document.getElementById('comment-body').value = '';
    document.getElementById('comment-modal').classList.add('show');
    document.getElementById('comment-body').focus();
  }

  async function saveComment() {
    const anchor = document.getElementById('comment-anchor').value.trim();
    const body = document.getElementById('comment-body').value.trim();
    if (!body) {
      snack('Comment is empty');
      return;
    }
    let row = -1;
    if (anchor) {
      const lines = getTranscriptLines();
      const hit = lines.find((l) => l.text.indexOf(anchor) !== -1);
      if (hit) row = hit.row;
    }
    comments.unshift({
      id: uid(),
      anchor: anchor,
      body: body,
      row: row,
      createdAt: new Date().toISOString(),
    });
    await persistStore('comments', LS.comments, comments);
    hideModal('comment-modal');
    renderComments();
    snack('Comment added');
  }

  async function deleteComment(id) {
    comments = comments.filter((c) => c.id !== id);
    await persistStore('comments', LS.comments, comments);
    renderComments();
  }

  function jumpToComment(c) {
    if (c.row >= 0) {
      try {
        term.scrollToLine(Math.max(0, c.row - 2));
        const line = term.buffer.active.getLine(c.row);
        const text = line ? line.translateToString(true) : '';
        const col = c.anchor ? Math.max(0, text.indexOf(c.anchor)) : 0;
        term.select(col, c.row, Math.min((c.anchor || text).length || 1, 80));
      } catch (_) {}
    } else if (c.anchor) {
      findMatches = collectFindMatches(c.anchor);
      if (findMatches.length) jumpToMatch(0);
    }
    term.focus();
  }

  function renderComments() {
    const list = document.getElementById('comments-list');
    if (!list) return;
    list.innerHTML = '';
    if (!comments.length) {
      list.innerHTML = '<p class="side-hint">No comments yet. Add sticky notes on commands or lines.</p>';
      return;
    }
    comments.forEach((c) => {
      const card = document.createElement('div');
      card.className = 'comment-card';
      card.innerHTML =
        '<div class="anchor"></div><div class="body"></div><div class="row">' +
        '<button type="button" data-jump="">Jump</button>' +
        '<button type="button" data-del="">Delete</button></div>';
      card.querySelector('.anchor').textContent = c.anchor || '(no anchor)';
      card.querySelector('.body').textContent = c.body;
      card.querySelector('[data-jump]').addEventListener('click', () => jumpToComment(c));
      card.querySelector('[data-del]').addEventListener('click', () => deleteComment(c.id));
      list.appendChild(card);
    });
  }

  /* ----- Outline from last N commands ----- */
  function setOutlineOpen(on) {
    state.outlineOpen = !!on;
    const panel = document.getElementById('outline-panel');
    if (panel) panel.hidden = !state.outlineOpen;
    syncThemeChecks();
    savePrefs();
    if (state.outlineOpen) renderOutline();
    requestAnimationFrame(sendResize);
  }

  function refreshOutlineSoon() {
    if (!state.outlineOpen) return;
    clearTimeout(outlineTimer);
    outlineTimer = setTimeout(renderOutline, 400);
  }

  function extractOutline(maxN) {
    maxN = maxN || 40;
    const lines = getTranscriptLines();
    const items = [];
    const re = /^.*[$#%>]\s+(\S.*)$/;
    for (let i = 0; i < lines.length; i++) {
      const text = lines[i].text.replace(/\s+$/, '');
      if (!text.trim()) continue;
      let cmd = null;
      const m = text.match(re);
      if (m) cmd = m[1].trim();
      else if (/^\s*(sudo\s+)?(cd|ls|git|npm|node|python|pip|curl|ssh|docker|kubectl|make|cat|vim|nano|rg|grep|find|systemctl)\b/.test(text) && text.length < 200) {
        cmd = text.trim();
      }
      if (cmd && cmd.length > 0 && cmd.length < 180) {
        items.push({ row: lines[i].row, command: cmd });
      }
    }
    // Prefer unique trailing commands
    const out = [];
    const seen = new Set();
    for (let i = items.length - 1; i >= 0; i--) {
      const key = items[i].command;
      if (seen.has(key)) continue;
      seen.add(key);
      out.unshift(items[i]);
      if (out.length >= maxN) break;
    }
    return out;
  }

  function renderOutline() {
    const list = document.getElementById('outline-list');
    if (!list) return;
    const items = extractOutline(40);
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = '<p class="side-hint">No commands detected yet.</p>';
      return;
    }
    items.forEach((it) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'side-item';
      btn.innerHTML = '<div class="cmd"></div><span class="meta"></span>';
      btn.querySelector('.cmd').textContent = it.command;
      btn.querySelector('.meta').textContent = 'line ' + (it.row + 1);
      btn.addEventListener('click', () => {
        try {
          term.scrollToLine(Math.max(0, it.row - 2));
          term.select(0, it.row, Math.min(it.command.length + 20, 120));
        } catch (_) {}
        term.focus();
      });
      list.appendChild(btn);
    });
  }

  /* ----- SSH profile picker ----- */
  function openSshModal() {
    hideMenus();
    renderSshList();
    document.getElementById('ssh-modal').classList.add('show');
  }

  function renderSshList() {
    const list = document.getElementById('ssh-list');
    if (!list) return;
    list.innerHTML = '';
    if (!sshProfiles.length) {
      list.innerHTML = '<p class="side-hint">No saved hosts yet.</p>';
      return;
    }
    sshProfiles.forEach((p) => {
      const row = document.createElement('div');
      row.className = 'list-row';
      row.innerHTML =
        '<div class="grow"><div class="title"></div><div class="sub"></div></div>' +
        '<div class="row-actions">' +
        '<button type="button" data-go="">Connect</button>' +
        '<button type="button" class="danger" data-del="">Delete</button>' +
        '</div>';
      row.querySelector('.title').textContent = p.label || p.user + '@' + p.host;
      row.querySelector('.sub').textContent = p.user + '@' + p.host + (p.port && Number(p.port) !== 22 ? ':' + p.port : '');
      row.querySelector('[data-go]').addEventListener('click', () => connectSsh(p));
      row.querySelector('[data-del]').addEventListener('click', () => deleteSsh(p.id));
      list.appendChild(row);
    });
  }

  async function saveSshFromForm() {
    const label = document.getElementById('ssh-label').value.trim();
    const user = document.getElementById('ssh-user').value.trim();
    const host = document.getElementById('ssh-host').value.trim();
    const port = Number(document.getElementById('ssh-port').value) || 22;
    if (!user || !host) {
      snack('User and host are required');
      return null;
    }
    const entry = {
      id: uid(),
      label: label || user + '@' + host,
      user: user,
      host: host,
      port: port,
    };
    sshProfiles = sshProfiles.filter(
      (p) => !(p.user === entry.user && p.host === entry.host && Number(p.port) === Number(entry.port))
    );
    sshProfiles.unshift(entry);
    await persistStore('ssh-profiles', LS.ssh, sshProfiles);
    renderSshList();
    snack('Profile saved (local only)');
    return entry;
  }

  async function deleteSsh(id) {
    sshProfiles = sshProfiles.filter((p) => p.id !== id);
    await persistStore('ssh-profiles', LS.ssh, sshProfiles);
    renderSshList();
  }

  function connectSsh(profile) {
    if (!profile) return;
    let cmd = 'ssh ';
    if (profile.port && Number(profile.port) !== 22) {
      cmd += '-p ' + Number(profile.port) + ' ';
    }
    cmd += profile.user + '@' + profile.host;
    hideModal('ssh-modal');
    hideMenus();
    sendInput(cmd + '\r');
    snack('Connecting: ' + cmd);
    term.focus();
  }

  /* ----- Export PDF / docx ----- */
  function exportPdf() {
    hideMenus();
    const text = getTranscript();
    const w = window.open('', '_blank');
    if (!w) {
      snack('Pop-up blocked — allow pop-ups to export PDF');
      return;
    }
    const title = docTitle();
    w.document.write(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' +
        title.replace(/</g, '') +
        '</title><style>body{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11pt;white-space:pre-wrap;margin:24px;color:#202124}h1{font-family:Arial,sans-serif;font-size:16pt;font-weight:400}</style></head><body><h1>' +
        title.replace(/</g, '&lt;') +
        ' — transcript</h1><pre id="t"></pre><script>document.getElementById("t").textContent = ' +
        JSON.stringify(text) +
        ';setTimeout(function(){window.print()},200)<\\/script></body></html>'
    );
    w.document.close();
    snack('Print dialog → Save as PDF');
  }

  function crc32(buf) {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
    return ~c >>> 0;
  }

  function u16(n) {
    const b = new Uint8Array(2);
    b[0] = n & 255;
    b[1] = (n >>> 8) & 255;
    return b;
  }
  function u32(n) {
    const b = new Uint8Array(4);
    b[0] = n & 255;
    b[1] = (n >>> 8) & 255;
    b[2] = (n >>> 16) & 255;
    b[3] = (n >>> 24) & 255;
    return b;
  }

  function concatBytes(chunks) {
    let len = 0;
    chunks.forEach((c) => (len += c.length));
    const out = new Uint8Array(len);
    let o = 0;
    chunks.forEach((c) => {
      out.set(c, o);
      o += c.length;
    });
    return out;
  }

  function zipStore(files) {
    const enc = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    files.forEach((f) => {
      const name = enc.encode(f.name);
      const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      const crc = crc32(data);
      const local = concatBytes([
        u32(0x04034b50),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(name.length),
        u16(0),
        name,
        data,
      ]);
      localParts.push(local);
      const central = concatBytes([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name,
      ]);
      centralParts.push(central);
      offset += local.length;
    });
    const central = concatBytes(centralParts);
    const end = concatBytes([
      u32(0x06054b50),
      u16(0),
      u16(0),
      u16(files.length),
      u16(files.length),
      u32(central.length),
      u32(offset),
      u16(0),
    ]);
    return concatBytes(localParts.concat([central, end]));
  }

  function xmlEscape(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function exportDocx() {
    hideMenus();
    const text = getTranscript();
    const paras = text.split(/\n/).map((line) => {
      if (!line) return '<w:p><w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="20"/></w:rPr></w:pPr></w:p>';
      return (
        '<w:p><w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">' +
        xmlEscape(line) +
        '</w:t></w:r></w:p>'
      );
    });
    const documentXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' +
      '<w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>' +
      xmlEscape(docTitle() + ' — transcript') +
      '</w:t></w:r></w:p>' +
      paras.join('') +
      '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>' +
      '</w:body></w:document>';
    const contentTypes =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>';
    const rels =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>';
    const zip = zipStore([
      { name: '[Content_Types].xml', data: contentTypes },
      { name: '_rels/.rels', data: rels },
      { name: 'word/document.xml', data: documentXml },
    ]);
    downloadBlob(new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), safeFilename(docTitle()) + '-transcript.docx');
    snack('Exported .docx');
  }

  function hideModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
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
    if (name === 'bookmarks') renderBookmarksUI();
    const r = fromBtn.getBoundingClientRect();
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
      case 'export-pdf':
        exportPdf();
        return;
      case 'export-docx':
        exportDocx();
        return;
      case 'open-connection':
        openSshModal();
        return;
      case 'manage-sessions':
        openSessionsModal();
        return;
      case 'save-session':
        hideMenus();
        saveCurrentSession(true);
        return;
      case 'rename-session':
        hideMenus();
        renameSession();
        return;
      case 'toggle-outline':
        setOutlineOpen(!state.outlineOpen);
        break;
      case 'toggle-comments':
        setCommentsOpen(!state.commentsOpen);
        break;
      case 'add-comment':
        openCommentModal();
        return;
      case 'bookmark-command':
        hideMenus();
        addBookmark(lastCommand);
        return;
      case 'manage-bookmarks':
        openBookmarksModal();
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
    if (el && (el.closest('.dropdown, .submenu, .toolbar, .header-right, .side-panel') || el.hasAttribute('data-c'))) {
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
    if (e.currentTarget.classList.contains('starred')) addBookmark(lastCommand);
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
  document.getElementById('replace-one').addEventListener('click', () => replaceInTranscript(false));
  document.getElementById('replace-all').addEventListener('click', () => replaceInTranscript(true));
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

  document.getElementById('about-done').addEventListener('click', () => hideModal('about-modal'));
  document.getElementById('about-modal').addEventListener('click', (e) => {
    if (e.target.id === 'about-modal') hideModal('about-modal');
  });
  document.getElementById('shortcuts-done').addEventListener('click', () => hideModal('shortcuts-modal'));
  document.getElementById('shortcuts-modal').addEventListener('click', (e) => {
    if (e.target.id === 'shortcuts-modal') hideModal('shortcuts-modal');
  });

  document.getElementById('paste-cancel').addEventListener('click', () => {
    pendingPaste = null;
    hideModal('paste-modal');
  });
  document.getElementById('paste-confirm').addEventListener('click', () => {
    const t = pendingPaste;
    pendingPaste = null;
    hideModal('paste-modal');
    if (t) doPaste(t);
  });
  document.getElementById('paste-modal').addEventListener('click', (e) => {
    if (e.target.id === 'paste-modal') {
      pendingPaste = null;
      hideModal('paste-modal');
    }
  });

  document.getElementById('sessions-done').addEventListener('click', () => hideModal('sessions-modal'));
  document.getElementById('sessions-save').addEventListener('click', () => saveCurrentSession(true));
  document.getElementById('sessions-modal').addEventListener('click', (e) => {
    if (e.target.id === 'sessions-modal') hideModal('sessions-modal');
  });

  document.getElementById('ssh-done').addEventListener('click', () => hideModal('ssh-modal'));
  document.getElementById('ssh-save').addEventListener('click', () => saveSshFromForm());
  document.getElementById('ssh-connect').addEventListener('click', async () => {
    const p = await saveSshFromForm();
    if (p) connectSsh(p);
  });
  document.getElementById('ssh-modal').addEventListener('click', (e) => {
    if (e.target.id === 'ssh-modal') hideModal('ssh-modal');
  });

  document.getElementById('bookmarks-done').addEventListener('click', () => hideModal('bookmarks-modal'));
  document.getElementById('bookmark-add').addEventListener('click', () => {
    addBookmark(document.getElementById('bookmark-cmd').value);
    document.getElementById('bookmark-cmd').value = '';
  });
  document.getElementById('bookmarks-modal').addEventListener('click', (e) => {
    if (e.target.id === 'bookmarks-modal') hideModal('bookmarks-modal');
  });

  document.getElementById('comment-cancel').addEventListener('click', () => hideModal('comment-modal'));
  document.getElementById('comment-save').addEventListener('click', () => saveComment());
  document.getElementById('comment-modal').addEventListener('click', (e) => {
    if (e.target.id === 'comment-modal') hideModal('comment-modal');
  });

  function closeAllModals() {
    hideMenus();
    [
      'share-modal',
      'find-modal',
      'about-modal',
      'shortcuts-modal',
      'paste-modal',
      'sessions-modal',
      'ssh-modal',
      'bookmarks-modal',
      'comment-modal',
    ].forEach(hideModal);
    pendingPaste = null;
    closeFind();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
      return;
    }
    const meta = e.ctrlKey || e.metaKey;
    const inTitle = e.target === title;
    const inField =
      e.target &&
      (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') &&
      e.target !== term.textarea;
    if (meta && e.shiftKey && (e.key === '.' || e.key === '>')) {
      e.preventDefault();
      applyFontSize(state.fontSize + 1);
    } else if (meta && e.shiftKey && (e.key === ',' || e.key === '<')) {
      e.preventDefault();
      applyFontSize(state.fontSize - 1);
    } else if (meta && (e.key === 'b' || e.key === 'B') && !inTitle && !inField) {
      e.preventDefault();
      state.bold = !state.bold;
      term.options.fontWeight = state.bold ? 'bold' : 'normal';
      savePrefs();
      requestAnimationFrame(sendResize);
    } else if (meta && (e.key === 'f' || e.key === 'F') && !inTitle) {
      e.preventDefault();
      openFind();
    } else if (meta && (e.key === 'p' || e.key === 'P') && !inTitle && !inField) {
      e.preventDefault();
      window.print();
    } else if (meta && (e.key === 'n' || e.key === 'N') && !inTitle && !inField) {
      e.preventDefault();
      window.open(location.href, '_blank');
    } else if (meta && (e.key === 's' || e.key === 'S') && !inField) {
      e.preventDefault();
      saveCurrentSession(true);
    } else if (meta && e.altKey && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault();
      openCommentModal();
    } else if (meta && e.altKey && (e.key === 'o' || e.key === 'O')) {
      e.preventDefault();
      setOutlineOpen(!state.outlineOpen);
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
  setOutlineOpen(state.outlineOpen);
  setCommentsOpen(state.commentsOpen);
  syncThemeChecks();

  (async function bootStores() {
    sessions = (await loadStore('sessions', LS.sessions, [])) || [];
    bookmarks = (await loadStore('bookmarks', LS.bookmarks, [])) || [];
    comments = (await loadStore('comments', LS.comments, [])) || [];
    sshProfiles = (await loadStore('ssh-profiles', LS.ssh, [])) || [];
    if (!Array.isArray(sessions)) sessions = [];
    if (!Array.isArray(bookmarks)) bookmarks = [];
    if (!Array.isArray(comments)) comments = [];
    if (!Array.isArray(sshProfiles)) sshProfiles = [];
    renderBookmarksUI();
    renderComments();
    renderOutline();
  })();

  setTimeout(() => {
    sendResize();
    connect();
    term.focus();
  }, 30);
  document.getElementById('canvas').addEventListener('mousedown', () => term.focus());
})();
