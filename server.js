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

app.get('/health', async (_req, res) => {
  const ollama = await probeOllama();
  res.json({
    ok: true,
    shell: SHELL,
    sessions,
    configDir: CONFIG_DIR,
    ollama: { reachable: ollama.ok, model: ollama.model, host: OLLAMA_HOST },
    xaiConfigured: Boolean(readXaiKey()),
  });
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

const OLLAMA_HOST = String(process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/$/, '');
const OLLAMA_MODEL_ENV = process.env.OLLAMA_MODEL ? String(process.env.OLLAMA_MODEL).trim() : '';
const DEFAULT_OLLAMA_MODEL = 'llama3.2';

const CHAT_SYSTEM = `You are a helpful tutor inside a Docs-like terminal app.
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

function pickOllamaModel(models) {
  const names = Array.isArray(models) ? models : [];
  if (OLLAMA_MODEL_ENV) return OLLAMA_MODEL_ENV;
  const exact = names.find((n) => n === DEFAULT_OLLAMA_MODEL || n.startsWith(DEFAULT_OLLAMA_MODEL + ':'));
  if (exact) return exact;
  const soft = names.find((n) => String(n).toLowerCase().includes('llama3.2'));
  if (soft) return soft;
  if (names.length) return names[0];
  return DEFAULT_OLLAMA_MODEL;
}

async function probeOllama() {
  try {
    const r = await fetch(OLLAMA_HOST + '/api/tags', {
      signal: AbortSignal.timeout(2500),
    });
    if (!r.ok) {
      return { ok: false, models: [], model: OLLAMA_MODEL_ENV || DEFAULT_OLLAMA_MODEL, error: 'http_' + r.status };
    }
    const data = await r.json();
    const models = (data && Array.isArray(data.models) ? data.models : [])
      .map((m) => (m && (m.name || m.model)) || null)
      .filter(Boolean);
    const model = pickOllamaModel(models);
    return { ok: true, models, model };
  } catch (err) {
    return {
      ok: false,
      models: [],
      model: OLLAMA_MODEL_ENV || DEFAULT_OLLAMA_MODEL,
      error: String(err && err.message ? err.message : err),
    };
  }
}

function cleanChatMessages(body) {
  const messages = Array.isArray(body && body.messages) ? body.messages : [];
  return messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }))
    .slice(-24);
}

async function chatViaOllama(cleaned, model) {
  const payload = {
    model: model || DEFAULT_OLLAMA_MODEL,
    messages: [{ role: 'system', content: CHAT_SYSTEM }, ...cleaned],
    temperature: 0.7,
    max_tokens: 512,
    stream: false,
  };
  // Prefer OpenAI-compatible endpoint; fall back to native /api/chat.
  let r = await fetch(OLLAMA_HOST + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  });
  let text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (r.status === 404) {
    const nativePayload = {
      model: payload.model,
      messages: payload.messages,
      stream: false,
      options: { temperature: 0.7, num_predict: 512 },
    };
    r = await fetch(OLLAMA_HOST + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nativePayload),
      signal: AbortSignal.timeout(120000),
    });
    text = await r.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!r.ok) {
    const message =
      (data && ((data.error && data.error.message) || data.error || data.message)) || text.slice(0, 400);
    const err = new Error(String(message));
    err.status = r.status;
    err.code = 'ollama_error';
    throw err;
  }
  let content =
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content;
  if (!content && data && data.message && typeof data.message.content === 'string') {
    content = data.message.content;
  }
  return { content: content || '', model: (data && data.model) || payload.model, provider: 'ollama' };
}

async function chatViaXai(cleaned, key) {
  const payload = {
    model: XAI_MODEL,
    messages: [{ role: 'system', content: CHAT_SYSTEM }, ...cleaned],
    temperature: 0.7,
    max_tokens: 512,
  };
  const r = await fetch(XAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!r.ok) {
    const message =
      (data && ((data.error && data.error.message) || data.message)) || text.slice(0, 400);
    const err = new Error(String(message));
    err.status = r.status;
    err.code = 'xai_error';
    throw err;
  }
  const content =
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content;
  return { content: content || '', model: (data && data.model) || XAI_MODEL, provider: 'xai' };
}

async function chatStatusPayload() {
  const ollama = await probeOllama();
  const key = readXaiKey();
  const models = ollama.models || [];
  const ollamaReady = Boolean(ollama.ok && (models.length > 0 || OLLAMA_MODEL_ENV));
  const defaultProvider = ollamaReady ? 'ollama' : key ? 'xai' : null;
  return {
    ok: true,
    configured: Boolean(ollamaReady || key),
    ready: Boolean(ollamaReady || key),
    defaultProvider,
    ollama: {
      reachable: ollama.ok,
      ready: ollamaReady,
      host: OLLAMA_HOST,
      model: ollama.model,
      models,
      needsPull: Boolean(ollama.ok && !models.length && !OLLAMA_MODEL_ENV),
      error: ollama.error || null,
      pullHint: 'ollama pull ' + (ollama.model || DEFAULT_OLLAMA_MODEL),
      serveHint: 'ollama serve',
    },
    xai: {
      configured: Boolean(key),
      keyHint: maskKey(key),
      model: XAI_MODEL,
      source: process.env.XAI_API_KEY ? 'env' : key ? 'file' : null,
    },
    // Back-compat fields for older UI
    keyHint: maskKey(key),
    model: ollama.ok ? ollama.model : XAI_MODEL,
  };
}

app.get('/api/chat/status', async (_req, res) => {
  try {
    res.json(await chatStatusPayload());
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});
// Back-compat alias
app.get('/api/grok/status', async (_req, res) => {
  try {
    res.json(await chatStatusPayload());
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

function saveXaiKeyHandler(req, res) {
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
}

function deleteXaiKeyHandler(_req, res) {
  try {
    if (fs.existsSync(XAI_KEY_FILE)) fs.unlinkSync(XAI_KEY_FILE);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
}

app.put('/api/chat/key', saveXaiKeyHandler);
app.put('/api/grok/key', saveXaiKeyHandler);
app.delete('/api/chat/key', deleteXaiKeyHandler);
app.delete('/api/grok/key', deleteXaiKeyHandler);

async function chatHandler(req, res) {
  const cleaned = cleanChatMessages(req.body);
  if (!cleaned.length) {
    res.status(400).json({ error: 'No messages' });
    return;
  }
  const requested = String((req.body && req.body.provider) || '').toLowerCase();
  const ollama = await probeOllama();
  const key = readXaiKey();
  const models = ollama.models || [];
  const ollamaReady = Boolean(ollama.ok && (models.length > 0 || OLLAMA_MODEL_ENV));
  let provider = requested === 'xai' || requested === 'ollama' ? requested : null;
  if (!provider) provider = ollamaReady ? 'ollama' : key ? 'xai' : null;

  if (!provider) {
    const tip = ollama.ok
      ? 'Ollama is up but no models found. Run `' +
        'ollama pull ' +
        (OLLAMA_MODEL_ENV || DEFAULT_OLLAMA_MODEL) +
        '`.'
      : 'Ollama is not reachable at ' +
        OLLAMA_HOST +
        '. Start it with `ollama serve`, then `ollama pull ' +
        (OLLAMA_MODEL_ENV || DEFAULT_OLLAMA_MODEL) +
        '`.';
    res.status(503).json({
      error: 'no_provider',
      message: tip + ' Or add an optional xAI API key under Tools.',
      ollama: { host: OLLAMA_HOST, reachable: ollama.ok, needsPull: Boolean(ollama.ok && !models.length) },
    });
    return;
  }

  try {
    if (provider === 'ollama') {
      if (!ollama.ok) {
        res.status(503).json({
          error: 'ollama_unreachable',
          message:
            'Cannot reach Ollama at ' +
            OLLAMA_HOST +
            '. Run `ollama serve` and `ollama pull ' +
            (ollama.model || DEFAULT_OLLAMA_MODEL) +
            '`.',
        });
        return;
      }
      const result = await chatViaOllama(cleaned, ollama.model);
      res.json({ ok: true, ...result });
      return;
    }
    if (!key) {
      res.status(401).json({
        error: 'missing_key',
        message: 'Add an xAI API key (Tools → xAI API key…). Optional — Ollama is the free default.',
      });
      return;
    }
    const result = await chatViaXai(cleaned, key);
    res.json({ ok: true, ...result });
  } catch (err) {
    const status = Number(err && err.status) || 502;
    res.status(status).json({
      error: (err && err.code) || 'proxy_failed',
      message: String(err && err.message ? err.message : err),
    });
  }
}

app.post('/api/chat', chatHandler);
app.post('/api/grok/chat', chatHandler);


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
