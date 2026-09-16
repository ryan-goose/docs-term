'use strict';

const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');
const pty = require('node-pty');

const vendorDir = path.join(__dirname, 'public', 'vendor');
if (!fs.existsSync(path.join(vendorDir, 'xterm.js'))) {
  require('./scripts/copy-vendor.js');
}

const PORT = Number(process.env.PORT) || 3737;
const HOST = process.env.HOST || '127.0.0.1';
const MAX_SESSIONS = Number(process.env.MAX_SESSIONS) || 16;
const SHELL =
  process.env.SHELL && fs.existsSync(process.env.SHELL)
    ? process.env.SHELL
    : fs.existsSync('/bin/bash')
      ? '/bin/bash'
      : '/bin/sh';

const app = express();
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => {
  res.json({ ok: true, shell: SHELL, sessions });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/pty' });

let sessions = 0;

function spawnShell(cols, rows) {
  const env = {
    ...process.env,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    LANG: process.env.LANG || 'en_US.UTF-8',
  };
  // Avoid leaking the box venv python into interactive shells.
  if (env.PATH) {
    env.PATH = env.PATH.split(path.delimiter)
      .filter((p) => !p.includes('.venv'))
      .join(path.delimiter);
  }
  return pty.spawn(SHELL, ['-i'], {
    name: 'xterm-256color',
    cols: cols || 80,
    rows: rows || 24,
    cwd: process.env.HOME || os.homedir() || process.cwd(),
    env,
  });
}

wss.on('connection', (ws) => {
  if (sessions >= MAX_SESSIONS) {
    ws.close(1013, 'Too many sessions');
    return;
  }
  sessions += 1;
  let term;
  try {
    term = spawnShell(80, 24);
  } catch (err) {
    sessions -= 1;
    ws.close(1011, 'Failed to spawn shell');
    console.error('PTY spawn failed:', err);
    return;
  }

  const send = (data) => {
    if (ws.readyState === ws.OPEN) ws.send(data);
  };

  term.onData(send);
  term.onExit(({ exitCode }) => {
    send(JSON.stringify({ type: 'exit', exitCode }));
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  });

  ws.on('message', (raw) => {
    const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
    let msg;
    try {
      msg = JSON.parse(text);
    } catch {
      term.write(text);
      return;
    }
    if (msg.type === 'input' && typeof msg.data === 'string') {
      term.write(msg.data);
    } else if (msg.type === 'resize') {
      const cols = Math.max(2, Number(msg.cols) || 80);
      const rows = Math.max(1, Number(msg.rows) || 24);
      try {
        term.resize(cols, rows);
      } catch {
        /* ignore */
      }
    }
  });

  let closed = false;
  const cleanup = () => {
    if (closed) return;
    closed = true;
    sessions = Math.max(0, sessions - 1);
    try {
      term.kill();
    } catch {
      /* ignore */
    }
  };
  ws.on('close', cleanup);
  ws.on('error', cleanup);
});

server.listen(PORT, HOST, () => {
  console.log(`docs-term running at http://${HOST}:${PORT}`);
  console.log(`Shell: ${SHELL}`);
  console.log('Bind: localhost only. This is a real login shell — do not expose it.');
});
