(() => {
  'use strict';
  // A renderer only. Attendance owns the single worker-status request.
  const el = id => document.getElementById(id);
  const percent = value => value === null ? '\u2014' : value.toLocaleString('pl-PL', {maximumFractionDigits: 1}) + '%';
  const number = value => Number.isFinite(value) ? value.toLocaleString('pl-PL', {maximumFractionDigits: 2}) : '\u2014';
  const date = value => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('pl-PL', {timeZone: 'Europe/Warsaw'}) : '\u2014';
  const hours = value => number(Number.isFinite(value) ? value / 3600 : null);
  const messages = {
    ES_OPERATOR_NOT_CONFIGURED: 'Brak przypisania operatora ES.',
    ES_MAPPING_AMBIGUOUS: 'Operator ES jest przypisany do kilku kont.',
    ES_OPERATOR_NOT_FOUND: 'Raport ES nie zawiera tego operatora. Brak danych nie oznacza zera.',
    ES_NOT_OBSERVED: 'Brak pierwszego poprawnego odczytu ES.',
    ES_STALE: 'Odczyt ES jest nieaktualny.',
    SUMMARY_PENDING: 'Czas lub proces uleg\u0142 zmianie. Oczekiwanie na przeliczenie.',
    SUMMARY_STALE: 'Oczekiwanie na aktualne przeliczenie czasu procesu.',
    NORM_NOT_READY: 'Wynik nie zosta\u0142 jeszcze opublikowany.',
    NO_ELIGIBLE_PROCESS_TIME: 'Brak czasu Pakowania lub Kompletacji. Procent nie jest liczony.'
  };
  const ids = ['normDayLabel', 'normDayPercent', 'normDayDetails', 'normDayFreshness', 'normDayNote', 'normDayTime',
    'normMonthLabel', 'normMonthPercent', 'normMonthDetails', 'normMonthFreshness', 'normMonthNote', 'normMonthTime', 'normConnection'];
  let rendered = false;
  function validate(data) {
    if (!data || !Number.isSafeInteger(data.snapshot_version) || data.snapshot_version < 0 ||
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(data.month || '') || !Number.isSafeInteger(data.attendance_version) ||
        data.attendance_version !== (data.attendance?.version || 0)) return false;
    return ['norm', 'monthly_norm'].every(key => {
      const n = data[key];
      return n && ['FRESH', 'STALE', 'UNAVAILABLE'].includes(n.freshness) &&
        ['pak_percent', 'pick_percent', 'combined_percent'].every(k => Object.hasOwn(n, k) &&
          (n[k] === null || (Number.isFinite(n[k]) && n[k] >= 0))) && Number.isFinite(Date.parse(n.calculated_at));
    });
  }
  function renderNorm(prefix, n) {
    el(prefix + 'Percent').textContent = percent(n.combined_percent);
    el(prefix + 'Freshness').textContent = {FRESH: 'DANE AKTUALNE', STALE: 'OSTATNIE POTWIERDZONE DANE', UNAVAILABLE: 'BRAK WIARYGODNEGO WYNIKU'}[n.freshness];
    el(prefix + 'Freshness').dataset.freshness = n.freshness;
    el(prefix + 'Details').textContent = `PAK: ${number(n.eligible_pak)} / ${hours(n.pak_seconds)} h (${percent(n.pak_percent)}) \u00b7 PICK: ${number(n.eligible_pick)} / ${hours(n.pick_seconds)} h (${percent(n.pick_percent)})\nPoza norm\u0105: PAK ${number(n.outside_pak)} \u00b7 PICK ${number(n.outside_pick)}`;
    const notes = [];
    for (const code of new Set([n.source_error, n.reason].filter(Boolean))) notes.push(messages[code] || `Stan danych: ${code}.`);
    if (n.coverage === 'PARTIAL') notes.push('Dane obejmuj\u0105 tylko cz\u0119\u015b\u0107 dnia: pierwszy odczyt jest punktem startowym, nie produkcj\u0105.');
    if (n.coverage === 'GAPPED') notes.push('W danych jest luka lub reset licznika ES. Wynik wymaga sprawdzenia.');
    if (n.coverage === 'UNOBSERVED') notes.push('Nie potwierdzono jeszcze danych wykonania ES.');
    el(prefix + 'Note').textContent = notes.join(' ');
    el(prefix + 'Time').textContent = 'Obliczono: ' + date(n.calculated_at) + (n.es_last_good_at ? ' \u00b7 ES: ' + date(n.es_last_good_at) : '');
  }
  window.molNorms = {
    validate,
    reset() { rendered = false; for (const id of ids) el(id).textContent = ''; },
    render(data) {
      if (!validate(data)) throw new Error('Niepe\u0142ny snapshot norm. Zachowano poprzedni stan.');
      el('normDayLabel').textContent = 'Dzie\u0144 ' + data.work_date;
      el('normMonthLabel').textContent = 'Miesi\u0105c ' + data.month;
      renderNorm('normDay', data.norm); renderNorm('normMonth', data.monthly_norm);
      el('normConnection').textContent = 'Wsp\u00f3lny stan czasu, proces\u00f3w i norm \u00b7 rewizja ' + data.snapshot_version + '.';
      rendered = true;
    },
    disconnected(message) {
      el('normConnection').textContent = rendered ? message + ' Wy\u015bwietlono ostatni potwierdzony snapshot; brak danych nie jest zerem.' : message;
      if (rendered) for (const prefix of ['normDay', 'normMonth']) {
        el(prefix + 'Freshness').textContent = 'BRAK AKTUALNEGO POTWIERDZENIA';
        el(prefix + 'Freshness').dataset.freshness = 'STALE';
      }
    }
  };
})();
