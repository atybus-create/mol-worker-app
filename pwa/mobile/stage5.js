(() => {
  'use strict';
  const api = window.MOLApi;
  if (!api) return;

  document.querySelector('.section-block.notices')?.setAttribute('hidden', '');

  const style = document.createElement('style');
  style.textContent = `
    .v3-comm-screen{padding:4px 0 20px}
    .v3-comm-screen-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:16px}
    .v3-comm-screen-head h2{margin:5px 0 4px;font-size:30px}.v3-comm-screen-head p{margin:0}.v3-comm-screen-head small{display:block;color:var(--mol-text-muted);line-height:1.45}
    .v3-comm-screen-count{min-width:46px;min-height:46px;display:grid;place-items:center;border-radius:14px;border:1px solid rgba(18,200,255,.28);background:rgba(18,200,255,.08);color:var(--mol-cyan);font-size:18px;font-weight:900}
    .v3-comm-summary{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}.v3-comm-summary article{padding:14px}.v3-comm-summary small,.v3-comm-summary strong{display:block}.v3-comm-summary small{color:var(--mol-text-muted);font-size:11px}.v3-comm-summary strong{margin-top:5px;font-size:22px}.v3-comm-summary article:first-child strong{color:var(--mol-yellow)}
    .v3-comm-filters{display:flex;gap:8px;overflow-x:auto;padding:2px 0 8px;scrollbar-width:none}.v3-comm-filters::-webkit-scrollbar{display:none}.v3-comm-filter{flex:0 0 auto;border:1px solid var(--mol-border);border-radius:999px;background:rgba(255,255,255,.035);color:var(--mol-text-muted);padding:9px 12px;font:700 12px system-ui;cursor:pointer}.v3-comm-filter.is-active{border-color:rgba(18,200,255,.55);background:rgba(18,200,255,.11);color:var(--mol-cyan)}
    .v3-comm-screen-list{display:grid;gap:10px;margin-top:6px}.v3-msg{padding:12px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.04)}
    .v3-msg[data-open="true"]{border-color:rgba(255,188,64,.55)}
    .v3-msg[data-pending="true"]{box-shadow:inset 3px 0 0 rgba(255,188,64,.8)}
    .v3-msg h3{font-size:14px;margin:0 0 5px}.v3-msg p{margin:0 0 8px;font-size:13px;line-height:1.4}.v3-msg small{opacity:.72}.v3-msg button{margin-top:9px;width:100%}
    .v3-comm-empty{opacity:.7;font-size:13px;line-height:1.5}
    .v3-msg-meta{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:7px}.v3-msg-type{font-size:11px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:var(--mol-cyan)}.v3-msg-status{font-size:10px;font-weight:800;padding:4px 7px;border-radius:999px;background:rgba(255,255,255,.06);color:var(--mol-text-muted)}.v3-msg-status.is-pending{background:rgba(255,188,64,.12);color:var(--mol-yellow)}.v3-msg-status.is-ok{background:rgba(34,210,162,.1);color:var(--mol-green)}
    @media(max-width:390px){.v3-comm-screen-head h2{font-size:26px}}
  `;
  document.head.append(style);

  const TYPE = {
    NO_PROCESS: 'Brak procesu',
    NO_ACTIVITY: 'Brak aktywności',
    WRONG_PROCESS: 'Niezgodny proces',
    WORK_OUTSIDE_APP: 'Praca poza aplikacją',
    ATTENDANCE_CORRECTION: 'Korekta czasu pracy',
    FORGOTTEN_STOP: 'Brak STOP',
    MANUAL: 'Komunikat lidera'
  };

  const panel = document.querySelector('[data-panel="messages"]');
  if (!panel) return;
  panel.classList.add('v3-comm-screen');
  panel.innerHTML = '<div class="v3-comm-screen-head"><div><p class="mol-kicker">Komunikaty</p><h2>Skrzynka komunikatów</h2><small>Alerty automatyczne i wiadomości od lidera. Potwierdź te, które wymagają reakcji.</small></div><div class="v3-comm-screen-count" data-v3comm-screen-count>0</div></div><div class="v3-comm-summary"><article class="mol-card"><small>Do potwierdzenia</small><strong data-v3comm-pending>0</strong></article><article class="mol-card"><small>Aktywne alerty</small><strong data-v3comm-active>0</strong></article></div><div class="v3-comm-filters" role="tablist" aria-label="Filtry komunikatów"><button type="button" class="v3-comm-filter is-active" data-v3comm-filter="ALL">Wszystkie</button><button type="button" class="v3-comm-filter" data-v3comm-filter="PENDING">Do potwierdzenia</button><button type="button" class="v3-comm-filter" data-v3comm-filter="ACTIVE">Aktywne</button><button type="button" class="v3-comm-filter" data-v3comm-filter="HISTORY">Historia</button></div><div class="v3-comm-screen-list" data-v3comm-screen-list><p class="v3-comm-empty">Ładowanie…</p></div>';

  const navButton = document.querySelector('.bottom-nav [data-nav="messages"]');
  navButton?.removeAttribute('disabled');
  const navBadge = navButton?.querySelector('.badge');
  const screenList = panel.querySelector('[data-v3comm-screen-list]');
  const screenCount = panel.querySelector('[data-v3comm-screen-count]');
  const pendingCount = panel.querySelector('[data-v3comm-pending]');
  const activeCount = panel.querySelector('[data-v3comm-active]');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const relevant = (m) => m.type === 'MANUAL' || m.cause_status === 'OPEN';
  const pending = (m) => m.ack_required === true && !m.ack_at && relevant(m);
  const activeAuto = (m) => m.type !== 'MANUAL' && m.cause_status === 'OPEN';
  const isHistory = (m) => !relevant(m) || !!m.ack_at;
  const statusText = (m) => m.cause_status === 'RESOLVED' && m.type !== 'MANUAL' ? 'Rozwiązany' : m.ack_at ? 'Potwierdzony' : m.shown_at ? 'Wyświetlony' : 'Nowy';
  const statusClass = (m) => pending(m) ? 'is-pending' : (m.ack_at || m.cause_status === 'RESOLVED' ? 'is-ok' : '');

  let browserId = '';
  try {
    browserId = localStorage.getItem('mol.v3.browser_id') || '';
    if (!browserId) {
      browserId = crypto.randomUUID();
      localStorage.setItem('mol.v3.browser_id', browserId);
    }
  } catch {
    browserId = crypto.randomUUID();
  }

  let stopped = false;
  let pollTimer = 0;
  let heartTimer = 0;
  let observer = null;
  let shownPending = new Set();
  let lastItems = [];
  let currentFilter = 'ALL';

  const visible = (node) => !!node && node.getClientRects().length > 0 && document.visibilityState === 'visible';

  async function heartbeat() {
    if (stopped || document.visibilityState === 'hidden') return;
    try {
      await api.write('mol-app-v3-comm-heartbeat', {request_id: api.requestId(), surface: 'mobile', browser_id: browserId});
    } catch (e) {
      if (e.status === 401) stopped = true;
    }
  }

  async function markShown(id, node) {
    if (!id || shownPending.has(id) || node?.dataset.shown === 'true' || !visible(node)) return;
    shownPending.add(id);
    try {
      await api.write('mol-app-v3-comm-shown', {request_id: api.requestId(), message_id: id});
      if (node) node.dataset.shown = 'true';
    } catch {} finally {
      shownPending.delete(id);
    }
  }

  function observeCards() {
    observer?.disconnect();
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) markShown(entry.target.dataset.messageId, entry.target);
      }
    }, {threshold: [0.5]});
    panel.querySelectorAll('.v3-msg[data-shown="false"]').forEach((node) => observer.observe(node));
  }

  function card(m) {
    const button = m.ack_required && !m.ack_at ? `<button class="mol-button mol-button--primary" type="button" data-comm-ack="${esc(m.message_id)}">Potwierdzam</button>` : '';
    return `<article class="v3-msg" data-message-id="${esc(m.message_id)}" data-shown="${!!m.shown_at}" data-open="${relevant(m)}" data-pending="${pending(m)}"><div class="v3-msg-meta"><span class="v3-msg-type">${esc(TYPE[m.type] || m.type)}</span><span class="v3-msg-status ${statusClass(m)}">${esc(statusText(m))}</span></div><p>${esc(m.content)}</p><small>${esc(new Date(m.sent_at).toLocaleString('pl-PL'))}</small>${button}</article>`;
  }

  function filtered(items) {
    if (currentFilter === 'PENDING') return items.filter(pending);
    if (currentFilter === 'ACTIVE') return items.filter(relevant);
    if (currentFilter === 'HISTORY') return items.filter(isHistory);
    return items;
  }

  function renderList(items) {
    const shownItems = filtered(items);
    screenList.innerHTML = shownItems.length ? shownItems.map((m) => card(m)).join('') : '<p class="v3-comm-empty">Brak komunikatów w tym widoku.</p>';
    observeCards();
  }

  function render(data) {
    const items = Array.isArray(data?.items) ? data.items : [];
    lastItems = items;
    const awaiting = items.filter(pending).length;
    const active = items.filter(activeAuto).length;
    screenCount.textContent = String(awaiting);
    pendingCount.textContent = String(awaiting);
    activeCount.textContent = String(active);
    if (navBadge) {
      navBadge.textContent = String(awaiting);
      navBadge.hidden = awaiting < 1;
    }
    renderList(items);
  }

  async function poll() {
    if (stopped || document.visibilityState === 'hidden') return;
    try {
      const data = await api.read('mol-app-v3-comm-list', {limit: 100});
      render(data);
    } catch (e) {
      if (e.status === 401) {
        stopped = true;
        return;
      }
      screenList.innerHTML = `<p class="v3-comm-empty">${esc(e.message || 'Błąd komunikacji')}</p>`;
    }
  }

  async function acknowledge(button) {
    if (!button) return;
    button.disabled = true;
    try {
      await api.write('mol-app-v3-comm-ack', {request_id: api.requestId(), message_id: button.dataset.commAck});
      await poll();
    } catch (error) {
      button.disabled = false;
      alert(error.message || 'Nie udało się potwierdzić komunikatu.');
    }
  }

  panel.addEventListener('click', (event) => {
    const ack = event.target.closest('[data-comm-ack]');
    if (ack) {
      acknowledge(ack);
      return;
    }
    const filter = event.target.closest('[data-v3comm-filter]');
    if (!filter) return;
    currentFilter = filter.dataset.v3commFilter || 'ALL';
    panel.querySelectorAll('[data-v3comm-filter]').forEach((button) => button.classList.toggle('is-active', button === filter));
    renderList(lastItems);
  });

  navButton?.addEventListener('click', () => {
    poll();
    queueMicrotask(observeCards);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      heartbeat();
      poll();
    } else {
      observer?.disconnect();
    }
  });

  heartbeat();
  poll();
  heartTimer = setInterval(heartbeat, 30000);
  pollTimer = setInterval(poll, 20000);
  window.addEventListener('pagehide', () => {
    clearInterval(heartTimer);
    clearInterval(pollTimer);
    observer?.disconnect();
  });
})();
