/*! docs-term Chat mode — Ollama default + optional xAI */
(function () {
  'use strict';

  const state = {
    mode: 'terminal', // terminal | chat
    ready: false,
    busy: false,
    messages: [],
    ollama: null,
    xai: null,
    defaultProvider: null,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function snack(msg) {
    if (typeof window.docsTermSnack === 'function') window.docsTermSnack(msg);
    else console.log('[chat]', msg);
  }

  async function refreshStatus() {
    try {
      const r = await fetch('/api/chat/status');
      const data = await r.json();
      state.ollama = data.ollama || null;
      state.xai = data.xai || null;
      state.defaultProvider = data.defaultProvider || null;
      state.ready = !!(data.ready || (data.ollama && data.ollama.ready) || (data.xai && data.xai.configured));
    } catch (_) {
      state.ollama = null;
      state.xai = null;
      state.defaultProvider = null;
      state.ready = false;
    }
    syncStatusUi();
  }

  function syncStatusUi() {
    const banner = $('chat-status-banner');
    const hint = $('chat-status-hint');
    const send = $('chat-send');
    const input = $('chat-input');
    const ollama = state.ollama || {};
    const xai = state.xai || {};
    const reachable = !!ollama.reachable;
    const ollamaReady = !!ollama.ready;
    const needsPull = !!ollama.needsPull || (reachable && !(ollama.models && ollama.models.length) && !ollamaReady);
    const canChat = ollamaReady || !!xai.configured;

    if (banner) {
      banner.hidden = canChat;
      const title = banner.querySelector('[data-chat-banner-title]');
      const body = banner.querySelector('[data-chat-banner-body]');
      const cta = banner.querySelector('[data-chat-banner-cta]');
      if (!reachable) {
        if (title) title.textContent = 'Ollama not running';
        if (body) {
          body.innerHTML =
            'Chat defaults to <strong>free local Ollama</strong> at <code>' +
            (ollama.host || 'http://127.0.0.1:11434') +
            '</code>. In a terminal run:';
        }
        if (cta) {
          cta.innerHTML =
            '<code>ollama serve</code> &nbsp;then&nbsp; <code>' +
            (ollama.pullHint || 'ollama pull llama3.2') +
            '</code>';
        }
      } else if (needsPull) {
        if (title) title.textContent = 'Pull a model';
        if (body) body.textContent = 'Ollama is reachable, but no models are installed yet.';
        if (cta) cta.innerHTML = '<code>' + (ollama.pullHint || 'ollama pull llama3.2') + '</code>';
      } else {
        if (title) title.textContent = 'Chat unavailable';
        if (body) body.textContent = 'Start Ollama or add an optional xAI API key under Tools.';
        if (cta) cta.textContent = '';
      }
    }

    if (hint) {
      if (ollamaReady) {
        hint.textContent =
          'Ollama · ' +
          (ollama.model || 'model') +
          ' · short answers / English help' +
          (xai.configured ? ' · xAI optional' : '');
      } else if (xai.configured) {
        hint.textContent =
          'xAI · ' +
          (xai.model || 'grok') +
          ' (' +
          (xai.keyHint || 'saved') +
          ') · Ollama offline — optional cloud path';
      } else if (!reachable) {
        hint.textContent = 'Waiting for Ollama (`ollama serve`)… xAI optional via Tools.';
      } else if (needsPull) {
        hint.textContent = 'Ollama up — run `' + (ollama.pullHint || 'ollama pull llama3.2') + '`.';
      } else {
        hint.textContent = 'No chat provider ready.';
      }
    }

    if (send) send.disabled = !canChat || state.busy;
    if (input) input.disabled = !canChat || state.busy;
  }

  function setMode(mode) {
    const next = mode === 'chat' || mode === 'grok' ? 'chat' : 'terminal';
    state.mode = next;
    document.body.classList.toggle('mode-chat', state.mode === 'chat');
    document.body.classList.toggle('mode-grok', state.mode === 'chat'); // back-compat CSS
    document.body.classList.toggle('mode-terminal', state.mode === 'terminal');
    document.querySelectorAll('[data-doc-tab]').forEach((btn) => {
      const tab = btn.getAttribute('data-doc-tab');
      const on = tab === state.mode || (state.mode === 'chat' && tab === 'grok');
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    const term = $('terminal');
    const chat = $('chat-panel') || $('grok-panel');
    if (term) term.hidden = state.mode !== 'terminal';
    if (chat) chat.hidden = state.mode !== 'chat';
    try {
      localStorage.setItem('docs-term-mode', state.mode);
    } catch (_) {}
    if (state.mode === 'terminal' && typeof window.docsTermOnShowTerminal === 'function') {
      window.docsTermOnShowTerminal();
    }
    if (state.mode === 'chat') {
      refreshStatus();
      const input = $('chat-input');
      const ollamaReady = state.ollama && state.ollama.ready;
      const xaiOk = state.xai && state.xai.configured;
      if (input && (ollamaReady || xaiOk)) setTimeout(() => input.focus(), 50);
    }
  }

  function renderMessages() {
    const list = $('chat-messages');
    if (!list) return;
    list.innerHTML = '';
    if (!state.messages.length) {
      const empty = document.createElement('div');
      empty.className = 'chat-empty';
      empty.textContent = 'Ask for a short explanation or an English summary — keep it tight.';
      list.appendChild(empty);
      return;
    }
    state.messages.forEach((m) => {
      const row = document.createElement('div');
      row.className = 'chat-bubble ' + (m.role === 'user' ? 'chat-user' : 'chat-assistant');
      const who = document.createElement('div');
      who.className = 'chat-who';
      who.textContent = m.role === 'user' ? 'You' : 'Chat';
      const body = document.createElement('div');
      body.className = 'chat-text';
      body.textContent = m.content;
      row.appendChild(who);
      row.appendChild(body);
      list.appendChild(row);
    });
    list.scrollTop = list.scrollHeight;
  }

  async function sendChat() {
    const input = $('chat-input');
    if (!input || state.busy) return;
    const text = String(input.value || '').trim();
    if (!text) return;
    const ollamaReady = state.ollama && state.ollama.ready;
    const xaiOk = state.xai && state.xai.configured;
    if (!ollamaReady && !xaiOk) {
      snack('Start Ollama or add an xAI key under Tools');
      refreshStatus();
      return;
    }
    state.messages.push({ role: 'user', content: text });
    input.value = '';
    renderMessages();
    state.busy = true;
    syncStatusUi();
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: state.messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.status === 503 || data.error === 'no_provider' || data.error === 'ollama_unreachable') {
        state.ready = false;
        syncStatusUi();
        state.messages.push({
          role: 'assistant',
          content: data.message || 'Ollama is not ready. Run `ollama serve` and pull a model.',
        });
      } else if (r.status === 401 || data.error === 'missing_key') {
        state.messages.push({
          role: 'assistant',
          content:
            'Optional xAI key missing. Prefer free local Ollama, or add a key under Tools → xAI API key…',
        });
        openKeyModal();
      } else if (!r.ok) {
        state.messages.push({
          role: 'assistant',
          content: 'Couldn’t reach chat: ' + (data.message || data.error || r.status),
        });
      } else {
        const tag = data.provider === 'xai' ? 'xAI' : 'Ollama';
        state.messages.push({
          role: 'assistant',
          content: data.content || '(empty reply)',
          provider: data.provider,
        });
        if (data.model) {
          const hint = $('chat-status-hint');
          if (hint && data.provider === 'ollama') {
            /* keep status line; refresh next time */
          }
        }
        void tag;
      }
    } catch (err) {
      state.messages.push({
        role: 'assistant',
        content: 'Network error: ' + (err && err.message ? err.message : err),
      });
    }
    state.busy = false;
    syncStatusUi();
    renderMessages();
  }

  function openKeyModal() {
    const modal = $('chat-key-modal') || $('grok-key-modal');
    if (!modal) return;
    modal.classList.add('show');
    const field = $('chat-key-input') || $('grok-key-input');
    if (field) {
      field.value = '';
      setTimeout(() => field.focus(), 30);
    }
  }

  function closeKeyModal() {
    const modal = $('chat-key-modal') || $('grok-key-modal');
    if (modal) modal.classList.remove('show');
  }

  async function saveKey() {
    const field = $('chat-key-input') || $('grok-key-input');
    const key = field ? String(field.value || '').trim() : '';
    if (!key) {
      snack('Paste an xAI API key');
      return;
    }
    try {
      const r = await fetch('/api/chat/key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        snack(data.error || 'Could not save key');
        return;
      }
      await refreshStatus();
      closeKeyModal();
      snack('xAI API key saved (optional cloud provider)');
    } catch (err) {
      snack('Save failed');
    }
  }

  function wire() {
    document.querySelectorAll('[data-doc-tab]').forEach((btn) => {
      btn.addEventListener('click', () => setMode(btn.getAttribute('data-doc-tab')));
    });
    const send = $('chat-send');
    if (send) send.addEventListener('click', () => sendChat());
    const input = $('chat-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendChat();
        }
      });
    }
    const refreshBtn = $('chat-refresh-status');
    if (refreshBtn) refreshBtn.addEventListener('click', () => refreshStatus());
    const save = $('chat-key-save') || $('grok-key-save');
    if (save) save.addEventListener('click', () => saveKey());
    const cancel = $('chat-key-cancel') || $('grok-key-cancel');
    if (cancel) cancel.addEventListener('click', () => closeKeyModal());
    const modal = $('chat-key-modal') || $('grok-key-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeKeyModal();
      });
    }
    document.querySelectorAll('[data-action="chat-api-key"], [data-action="grok-api-key"]').forEach((el) => {
      el.addEventListener('click', () => {
        setMode('chat');
        openKeyModal();
      });
    });
    document.querySelectorAll('[data-action="mode-chat"], [data-action="mode-grok"]').forEach((el) => {
      el.addEventListener('click', () => setMode('chat'));
    });
    document.querySelectorAll('[data-action="mode-terminal"]').forEach((el) => {
      el.addEventListener('click', () => setMode('terminal'));
    });

    let saved = 'terminal';
    try {
      saved = localStorage.getItem('docs-term-mode') || 'terminal';
    } catch (_) {}
    if (saved === 'grok') saved = 'chat';
    setMode(saved);
    renderMessages();
    refreshStatus();
  }

  window.docsTermChat = { setMode, refreshStatus, openKeyModal };
  window.docsTermGrok = window.docsTermChat; // back-compat

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
