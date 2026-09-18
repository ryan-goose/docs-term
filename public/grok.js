/*! docs-term Grok mode — bubble chat + xAI key gate */
(function () {
  'use strict';

  const state = {
    mode: 'terminal', // terminal | grok
    configured: false,
    keyHint: null,
    busy: false,
    messages: [],
  };

  function $(id) {
    return document.getElementById(id);
  }

  function snack(msg) {
    if (typeof window.docsTermSnack === 'function') window.docsTermSnack(msg);
    else console.log('[grok]', msg);
  }

  async function refreshStatus() {
    try {
      const r = await fetch('/api/grok/status');
      const data = await r.json();
      state.configured = !!data.configured;
      state.keyHint = data.keyHint || null;
    } catch (_) {
      state.configured = false;
      state.keyHint = null;
    }
    syncKeyUi();
  }

  function syncKeyUi() {
    const banner = $('grok-key-banner');
    const hint = $('grok-key-hint');
    const send = $('grok-send');
    const input = $('grok-input');
    if (banner) banner.hidden = state.configured;
    if (hint) {
      hint.textContent = state.configured
        ? 'Key: ' + (state.keyHint || 'saved') + ' · short answers / English help'
        : 'No xAI API key — chat disabled until you add one.';
    }
    if (send) send.disabled = !state.configured || state.busy;
    if (input) input.disabled = !state.configured || state.busy;
  }

  function setMode(mode) {
    state.mode = mode === 'grok' ? 'grok' : 'terminal';
    document.body.classList.toggle('mode-grok', state.mode === 'grok');
    document.body.classList.toggle('mode-terminal', state.mode === 'terminal');
    document.querySelectorAll('[data-doc-tab]').forEach((btn) => {
      const on = btn.getAttribute('data-doc-tab') === state.mode;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    const term = $('terminal');
    const grok = $('grok-panel');
    if (term) term.hidden = state.mode !== 'terminal';
    if (grok) grok.hidden = state.mode !== 'grok';
    try {
      localStorage.setItem('docs-term-mode', state.mode);
    } catch (_) {}
    if (state.mode === 'terminal' && typeof window.docsTermOnShowTerminal === 'function') {
      window.docsTermOnShowTerminal();
    }
    if (state.mode === 'grok') {
      refreshStatus();
      const input = $('grok-input');
      if (input && state.configured) setTimeout(() => input.focus(), 50);
    }
  }

  function renderMessages() {
    const list = $('grok-messages');
    if (!list) return;
    list.innerHTML = '';
    if (!state.messages.length) {
      const empty = document.createElement('div');
      empty.className = 'grok-empty';
      empty.textContent = 'Ask for a short explanation or an English summary — keep it tight.';
      list.appendChild(empty);
      return;
    }
    state.messages.forEach((m) => {
      const row = document.createElement('div');
      row.className = 'grok-bubble ' + (m.role === 'user' ? 'grok-user' : 'grok-assistant');
      const who = document.createElement('div');
      who.className = 'grok-who';
      who.textContent = m.role === 'user' ? 'You' : 'Grok';
      const body = document.createElement('div');
      body.className = 'grok-text';
      body.textContent = m.content;
      row.appendChild(who);
      row.appendChild(body);
      list.appendChild(row);
    });
    list.scrollTop = list.scrollHeight;
  }

  async function sendChat() {
    const input = $('grok-input');
    if (!input || state.busy) return;
    const text = String(input.value || '').trim();
    if (!text) return;
    if (!state.configured) {
      openKeyModal();
      return;
    }
    state.messages.push({ role: 'user', content: text });
    input.value = '';
    renderMessages();
    state.busy = true;
    syncKeyUi();
    try {
      const r = await fetch('/api/grok/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: state.messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.status === 401 || data.error === 'missing_key') {
        state.configured = false;
        syncKeyUi();
        openKeyModal();
        state.messages.push({
          role: 'assistant',
          content: 'Need an xAI API key first (Tools → Grok API key…). SuperGrok web login is not the same as the API.',
        });
      } else if (!r.ok) {
        state.messages.push({
          role: 'assistant',
          content: 'Couldn’t reach xAI: ' + (data.message || data.error || r.status),
        });
      } else {
        state.messages.push({
          role: 'assistant',
          content: data.content || '(empty reply)',
        });
      }
    } catch (err) {
      state.messages.push({
        role: 'assistant',
        content: 'Network error: ' + (err && err.message ? err.message : err),
      });
    }
    state.busy = false;
    syncKeyUi();
    renderMessages();
  }

  function openKeyModal() {
    const modal = $('grok-key-modal');
    if (!modal) return;
    modal.classList.add('show');
    const field = $('grok-key-input');
    if (field) {
      field.value = '';
      setTimeout(() => field.focus(), 30);
    }
  }

  function closeKeyModal() {
    const modal = $('grok-key-modal');
    if (modal) modal.classList.remove('show');
  }

  async function saveKey() {
    const field = $('grok-key-input');
    const key = field ? String(field.value || '').trim() : '';
    if (!key) {
      snack('Paste an xAI API key');
      return;
    }
    try {
      const r = await fetch('/api/grok/key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        snack(data.error || 'Could not save key');
        return;
      }
      state.configured = true;
      state.keyHint = data.keyHint || null;
      syncKeyUi();
      closeKeyModal();
      snack('xAI API key saved locally');
    } catch (err) {
      snack('Save failed');
    }
  }

  function wire() {
    document.querySelectorAll('[data-doc-tab]').forEach((btn) => {
      btn.addEventListener('click', () => setMode(btn.getAttribute('data-doc-tab')));
    });
    const send = $('grok-send');
    if (send) send.addEventListener('click', () => sendChat());
    const input = $('grok-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendChat();
        }
      });
    }
    const openKey = $('grok-open-key');
    if (openKey) openKey.addEventListener('click', () => openKeyModal());
    const save = $('grok-key-save');
    if (save) save.addEventListener('click', () => saveKey());
    const cancel = $('grok-key-cancel');
    if (cancel) cancel.addEventListener('click', () => closeKeyModal());
    const modal = $('grok-key-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target.id === 'grok-key-modal') closeKeyModal();
      });
    }
    document.querySelectorAll('[data-action="grok-api-key"]').forEach((el) => {
      el.addEventListener('click', () => {
        setMode('grok');
        openKeyModal();
      });
    });
    document.querySelectorAll('[data-action="mode-grok"]').forEach((el) => {
      el.addEventListener('click', () => setMode('grok'));
    });
    document.querySelectorAll('[data-action="mode-terminal"]').forEach((el) => {
      el.addEventListener('click', () => setMode('terminal'));
    });

    let saved = 'terminal';
    try {
      saved = localStorage.getItem('docs-term-mode') || 'terminal';
    } catch (_) {}
    setMode(saved);
    renderMessages();
    refreshStatus();
  }

  window.docsTermGrok = { setMode, refreshStatus, openKeyModal };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
