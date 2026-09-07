(() => {
  const waitForMessages = () => {
    const view = document.querySelector('[data-view="leader-messages"]');
    const recipients = [...(view?.querySelectorAll('[data-message-recipients] .message-recipient') || [])];
    const side = view?.querySelector('.leader-message-side');
    if (!view || !recipients.length || !side) {
      setTimeout(waitForMessages, 25);
      return;
    }

    recipients.forEach((label, index) => {
      const small = label.querySelector('small');
      if (!small || small.dataset.appActivityAdded) return;
      const active = index % 3 !== 2;
      small.insertAdjacentHTML('beforeend', ` · <strong class="${active ? 'team-app-active' : 'team-app-inactive'}">${active ? 'aplikacja aktywna' : 'brak aktywnej aplikacji'}</strong>`);
      small.dataset.appActivityAdded = 'true';
      label.dataset.appActiveDemo = active ? 'true' : 'false';
    });

    if (!side.querySelector('[data-message-history-card]')) {
      const card = document.createElement('section');
      card.className = 'mol-card';
      card.dataset.messageHistoryCard = 'true';
      card.innerHTML = `
        <p class="mol-kicker">Historia osoby</p>
        <h2>Komunikaty i status odbioru</h2>
        <label class="message-content-label">Pracownik
          <select data-message-history-employee>${recipients.map((label) => {
            const input = label.querySelector('input');
            const name = label.querySelector('b')?.textContent || input?.value || 'Pracownik';
            return `<option value="${input?.value || ''}">${name}</option>`;
          }).join('')}</select>
        </label>
        <div class="sent-message-list" data-message-history-list></div>
        <div class="report-selector-actions"><button type="button" data-message-history-prev>← Nowsze</button><button type="button" data-message-history-next>Starsze →</button></div>
        <p class="backend-gap-note">Docelowo historia jest pobierana stronicowanym endpointem komunikacji. Aktywność aplikacji musi pochodzić z backendu/device heartbeat, nie z heurystyki frontendu.</p>`;
      side.append(card);
    }

    const select = side.querySelector('[data-message-history-employee]');
    const list = side.querySelector('[data-message-history-list]');
    let page = 0;
    const demoPages = [
      [
        { title: 'Sprawdź strefę odkładczą A3', status: 'ACK · potwierdzony', time: 'dzisiaj 08:36' },
        { title: 'Po przerwie przejdź na pakowanie.', status: 'SHOWN · wyświetlony', time: 'dzisiaj 07:54' },
        { title: 'WRONG_PROCESS', status: 'RESOLVED · rozwiązany', time: '06.09 13:11' }
      ],
      [
        { title: 'Informacja zmianowa', status: 'ACK · potwierdzony', time: '05.09 06:05' },
        { title: 'NO_PROCESS', status: 'SHOWN · wyświetlony', time: '04.09 10:22' },
        { title: 'ATTENDANCE_CORRECTION', status: 'WAITING · oczekuje', time: '03.09 14:47' }
      ]
    ];

    const render = () => {
      const employee = select.options[select.selectedIndex]?.textContent || 'Pracownik';
      list.innerHTML = demoPages[page].map((item) => `<article><b>${item.title}</b><small>${employee} · ${item.status}</small><time>${item.time}</time></article>`).join('');
      side.querySelector('[data-message-history-prev]').disabled = page === 0;
      side.querySelector('[data-message-history-next]').disabled = page >= demoPages.length - 1;
      view.dataset.messageHistoryPagination = 'ready';
    };

    select.addEventListener('change', () => { page = 0; render(); });
    side.querySelector('[data-message-history-prev]').addEventListener('click', () => { page = Math.max(0, page - 1); render(); });
    side.querySelector('[data-message-history-next]').addEventListener('click', () => { page = Math.min(demoPages.length - 1, page + 1); render(); });

    recipients.forEach((label) => label.querySelector('input')?.addEventListener('change', () => {
      const checked = recipients.find((candidate) => candidate.querySelector('input')?.checked);
      if (!checked) return;
      select.value = checked.querySelector('input').value;
      page = 0;
      render();
    }));

    render();
  };

  waitForMessages();
})();
