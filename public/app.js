/* docs-term client: Docs chrome + xterm.js over WebSocket */
(function () {
  'use strict';

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

  const state = {
    fontSize: 14,
    fontFamily: FONT_STACKS['Courier New'],
    themeName: 'docs',
    fg: '#202124',
    bold: false,
    ruler: true,
    chrome: true,
  };

  const TerminalCtor = window.Terminal;
  const FitAddonCtor = window.FitAddon && (window.FitAddon.FitAddon || window.FitAddon);
  if (!TerminalCtor || !FitAddonCtor) {
    document.body.innerHTML = '<p style="padding:24px;font-family:Arial">Failed to load xterm.js. Run npm install.</p>';
    return;
  }

  const term = new TerminalCtor({
    cursorBlink: true,
    cursorStyle: 'bar',
    fontSize: state.fontSize,
    fontFamily: state.fontFamily,
    theme: THEMES.docs,
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
            term.write('\r\n[process exited with code ' + msg.exitCode + ']\r\n');
            return;
          }
        } catch (_) {
          /* fall through */
        }
      }
      term.write(typeof data === 'string' ? data : new Uint8Array(data));
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

  function applyTheme(name) {
    const t = THEMES[name] || THEMES.docs;
    state.themeName = THEMES[name] ? name : 'docs';
    const theme = Object.assign({}, t, { foreground: state.fg || t.foreground, cursor: state.fg || t.cursor });
    term.options.theme = theme;
    term.options.cursorStyle = state.themeName === 'docs' || state.themeName === 'solarized-light' ? 'bar' : 'block';
    document.querySelectorAll('[data-theme]').forEach((el) => {
      el.classList.toggle('check', el.getAttribute('data-theme') === state.themeName);
    });
    const page = document.getElementById('page');
    if (page) page.style.background = t.background;
  }

  function applyFontSize(size) {
    size = Math.max(6, Math.min(72, Number(size) || 14));
    state.fontSize = size;
    term.options.fontSize = size;
    const input = document.getElementById('font-size');
    if (input) input.value = String(size);
    requestAnimationFrame(sendResize);
  }

  function applyFont(name) {
    state.fontFamily = FONT_STACKS[name] || FONT_STACKS['Courier New'];
    term.options.fontFamily = state.fontFamily;
    requestAnimationFrame(sendResize);
  }

  function applyFg(color) {
    state.fg = color;
    const t = THEMES[state.themeName] || THEMES.docs;
    term.options.theme = Object.assign({}, t, { foreground: color, cursor: color });
    const sw = document.getElementById('color-swatch');
    if (sw) sw.style.background = color;
  }

  function snack(text) {
    const el = document.getElementById('snackbar');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(snack._t);
    snack._t = setTimeout(() => el.classList.remove('show'), 2400);
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
    const r = fromBtn.getBoundingClientRect();
    place(sub, r.right - 4, r.top);
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

    if (size) applyFontSize(size);
    if (theme) applyTheme(theme);
    if (color) applyFg(color);
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
        requestAnimationFrame(sendResize);
        break;
      case 'color-menu': {
        const btn = document.getElementById('color-btn');
        layer.classList.add('show');
        showSub('color', btn);
        return;
      }
      case 'theme-toggle':
        applyTheme(state.themeName === 'docs' ? 'classic' : 'docs');
        break;
      case 'reset-format':
        state.fg = THEMES.docs.foreground;
        state.bold = false;
        term.options.fontWeight = 'normal';
        applyTheme('docs');
        applyFontSize(14);
        document.getElementById('font-select').value = 'Courier New';
        applyFont('Courier New');
        applyFg('#202124');
        break;
      case 'print':
        hideMenus();
        window.print();
        return;
      case 'new':
        hideMenus();
        location.reload();
        return;
      case 'toggle-ruler':
        state.ruler = !state.ruler;
        document.getElementById('ruler').style.display = state.ruler ? '' : 'none';
        el.classList.toggle('check', state.ruler);
        requestAnimationFrame(sendResize);
        break;
      case 'toggle-chrome':
        state.chrome = !state.chrome;
        document.getElementById('chrome').classList.toggle('compact', !state.chrome);
        document.getElementById('menu-row').style.display = state.chrome ? '' : 'none';
        requestAnimationFrame(sendResize);
        break;
      case 'help':
        snack('A real Linux shell inside a Google Docs page. Format menu changes font size and color.');
        break;
      case 'shortcuts':
        snack('Ctrl+Shift+. / ,  font size   ·   Format > Text color   ·   View > Terminal appearance');
        break;
    }
    if (!sub && action !== 'color-menu') hideMenus();
  }

  function sendTermKey(cmd) {
    const map = {
      undo: '\x1f',
      redo: '\x1b[32~',
      cut: '\x18',
      copy: '\x03',
      paste: null,
      'select-all': '\x01',
    };
    if (cmd === 'copy') {
      const sel = term.getSelection();
      if (sel && navigator.clipboard) navigator.clipboard.writeText(sel);
      return;
    }
    if (cmd === 'paste') {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then((t) => {
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'input', data: t }));
          }
        }).catch(() => snack('Clipboard paste was blocked by the browser.'));
      }
      return;
    }
    const seq = map[cmd];
    if (seq && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'input', data: seq }));
    }
  }

  document.body.addEventListener('click', (e) => {
    const nyi = e.target.closest('[data-nyi]');
    if (nyi && !nyi.classList.contains('menu-btn')) {
      snack("That action isn't available in the terminal.");
      return;
    }
    const el = e.target.closest('[data-action], [data-size], [data-theme], [data-term], [data-submenu], [data-c]');
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
  document.getElementById('zoom-select').addEventListener('change', (e) => {
    const z = Number(e.target.value) / 100;
    const page = document.getElementById('page');
    if ('zoom' in page.style) {
      page.style.zoom = String(z);
      page.style.transform = '';
    } else {
      page.style.transform = z === 1 ? '' : 'scale(' + z + ')';
      page.style.transformOrigin = 'top center';
    }
    requestAnimationFrame(sendResize);
  });

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

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideMenus();
      shareModal.classList.remove('show');
      return;
    }
    const meta = e.ctrlKey || e.metaKey;
    if (meta && e.shiftKey && (e.key === '.' || e.key === '>')) {
      e.preventDefault();
      applyFontSize(state.fontSize + 1);
    } else if (meta && e.shiftKey && (e.key === ',' || e.key === '<')) {
      e.preventDefault();
      applyFontSize(state.fontSize - 1);
    } else if (meta && (e.key === 'b' || e.key === 'B')) {
      if (e.target === title) return;
      e.preventDefault();
      state.bold = !state.bold;
      term.options.fontWeight = state.bold ? 'bold' : 'normal';
      requestAnimationFrame(sendResize);
    }
  });

  window.addEventListener('resize', () => sendResize());
  if (window.ResizeObserver) {
    new ResizeObserver(() => sendResize()).observe(document.getElementById('terminal'));
  }

  applyFg('#202124');
  setTimeout(() => {
    sendResize();
    connect();
    term.focus();
  }, 30);
  document.getElementById('canvas').addEventListener('mousedown', () => term.focus());
})();
