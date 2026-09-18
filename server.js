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

const CONFIG_DIR = path.join(os.homedir(), '.config', 'docs-term');
const ALLOWED_CONFIG = new Set([
  'sessions',
  'bookmarks',
  'comments',
  'ssh-profiles',
  'prefs',
]);

function ensureConfigDir() {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function configPath(name) {
  if (!ALLOWED_CONFIG.has(name)) return null;
  return path.join(CONFIG_DIR, name + '.json');
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '8mb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    if (/\.(html|js|css)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-store');
    }
  },
}));

app.get('/health', (_req, res) => {
  res.json({ ok: true, shell: SHELL, sessions, configDir: CONFIG_DIR, grokConfigured: Boolean(readXaiKey()) });
});

app.get('/api/config/:name', (req, res) => {
  const file = configPath(req.params.name);
  if (!file) {
    res.status(400).json({ error: 'Unknown config name' });
    return;
  }
  try {
    if (!fs.existsSync(file)) {
      res.json({ name: req.params.name, data: null });
      return;
    }
    const raw = fs.readFileSync(file, 'utf8');
    res.json({ name: req.params.name, data: JSON.parse(raw) });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.put('/api/config/:name', (req, res) => {
  const file = configPath(req.params.name);
  if (!file) {
    res.status(400).json({ error: 'Unknown config name' });
    return;
  }
  try {
    ensureConfigDir();
    const data = req.body && Object.prototype.hasOwnProperty.call(req.body, 'data')
      ? req.body.data
      : req.body;
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    res.json({ ok: true, name: req.params.name });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.delete('/api/config/:name', (req, res) => {
  const file = configPath(req.params.name);
  if (!file) {
    res.status(400).json({ error: 'Unknown config name' });
    return;
  }
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});


const XAI_KEY_FILE = path.join(CONFIG_DIR, 'xai-api-key');
const XAI_API_URL = process.env.XAI_API_URL || 'https://api.x.ai/v1/chat/completions';
const XAI_MODEL = process.env.XAI_MODEL || 'grok-2-latest';

const GROK_SYSTEM = `You are Grok helping a student inside a Docs-like terminal app.
Keep answers SHORT — a few sentences or a tight bullet list. Prefer summarizing and clarifying English over writing essays.
Sound like a sharp classmate/tutor, not a corporate AI: natural voice, no filler ("Certainly!", "As an AI…"), no padded conclusions.
If the ask is huge, give a crisp outline or the key points only and offer to go deeper on one part.`;

function readXaiKey() {
  if (process.env.XAI_API_KEY && String(process.env.XAI_API_KEY).trim()) {
    return String(process.env.XAI_API_KEY).trim();
  }
  try {
    ensureConfigDir();
    if (fs.existsSync(XAI_KEY_FILE)) {
      return fs.readFileSync(XAI_KEY_FILE, 'utf8').trim();
    }
  } catch (_) {}
  return '';
}

function maskKey(key) {
  if (!key) return null;
  if (key.length <= 8) return '********';
  return key.slice(0, 4) + '…' + key.slice(-4);
}

app.get('/api/grok/status', (_req, res) => {
  const key = readXaiKey();
  res.json({
    ok: true,
    configured: Boolean(key),
    keyHint: maskKey(key),
    model: XAI_MODEL,
    source: process.env.XAI_API_KEY ? 'env' : key ? 'file' : null,
  });
});

app.put('/api/grok/key', (req, res) => {
  const key = String((req.body && req.body.key) || '').trim();
  if (!key || key.length < 8) {
    res.status(400).json({ error: 'API key looks too short' });
    return;
  }
  try {
    ensureConfigDir();
    fs.writeFileSync(XAI_KEY_FILE, key + '\n', { mode: 0o600 });
    res.json({ ok: true, keyHint: maskKey(key) });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.delete('/api/grok/key', (_req, res) => {
  try {
    if (fs.existsSync(XAI_KEY_FILE)) fs.unlinkSync(XAI_KEY_FILE);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.post('/api/grok/chat', async (req, res) => {
  const key = readXaiKey();
  if (!key) {
    res.status(401).json({
      error: 'missing_key',
      message: 'Add an xAI API key (Tools → Grok API key…). Web SuperGrok login is not the API.',
    });
    return;
  }
  const messages = Array.isArray(req.body && req.body.messages) ? req.body.messages : [];
  const cleaned = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }))
    .slice(-24);
  if (!cleaned.length) {
    res.status(400).json({ error: 'No messages' });
    return;
  }
  const payload = {
    model: XAI_MODEL,
    messages: [{ role: 'system', content: GROK_SYSTEM }, ...cleaned],
    temperature: 0.7,
    max_tokens: 512,
  };
  try {
    const r = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + key,
      },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    if (!r.ok) {
      res.status(r.status).json({
        error: 'xai_error',
        message: (data && (data.error && data.error.message || data.message)) || text.slice(0, 400),
      });
      return;
    }
    const content =
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content;
    res.json({
      ok: true,
      content: content || '',
      model: data.model || XAI_MODEL,
    });
  } catch (err) {
    res.status(502).json({ error: 'proxy_failed', message: String(err && err.message ? err.message : err) });
  }
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
  console.log(`Config: ${CONFIG_DIR}`);
  console.log('Bind: localhost only. This is a real login shell — do not expose it.');
});
