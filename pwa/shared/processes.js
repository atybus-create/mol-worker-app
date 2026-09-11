(() => {
  const CATALOG = Object.freeze([
    Object.freeze({ code: 'PAKOWANIE', name: 'Pakowanie', normUnitsPerHour: 70 }),
    Object.freeze({ code: 'KOMPLETACJA', name: 'Kompletacja', normUnitsPerHour: 210 }),
    Object.freeze({ code: 'DYZUR', name: 'Dyżur', normUnitsPerHour: null }),
    Object.freeze({ code: 'ZWROTY', name: 'Zwroty', normUnitsPerHour: null }),
    Object.freeze({ code: 'BIURO', name: 'Biuro', normUnitsPerHour: null }),
    Object.freeze({ code: 'PORZADKI_KARTONY', name: 'Porządki – kartony', normUnitsPerHour: null }),
    Object.freeze({ code: 'PRZYGOTOWANIE_STANOWISKA', name: 'Przygotowanie stanowiska', normUnitsPerHour: null }),
    Object.freeze({ code: 'MAGAZYN', name: 'Magazyn', normUnitsPerHour: null }),
    Object.freeze({ code: 'PRZERWA', name: 'Przerwa', normUnitsPerHour: null }),
    Object.freeze({ code: 'INNE', name: 'Inne', normUnitsPerHour: null })
  ]);

  const ALL_CODES = Object.freeze(CATALOG.map((item) => item.code));
  const WORKER_CODES = Object.freeze(ALL_CODES.filter((code) => code !== 'BIURO'));
  const ROLE_ALLOWED = Object.freeze({
    WORKER: WORKER_CODES,
    LEADER: ALL_CODES,
    ADMIN: ALL_CODES
  });

  const normalizeRole = (role) => String(role || '').trim().toUpperCase();
  const allowedCodesFor = (role) => ROLE_ALLOWED[normalizeRole(role)] || WORKER_CODES;
  const allowedFor = (role) => {
    const allowed = new Set(allowedCodesFor(role));
    return CATALOG.filter((item) => allowed.has(item.code));
  };
  const byCode = (code) => CATALOG.find((item) => item.code === String(code || '').trim().toUpperCase()) || null;
  const canUse = (role, code) => allowedCodesFor(role).includes(String(code || '').trim().toUpperCase());

  window.MOLProcesses = Object.freeze({
    catalog: CATALOG,
    allowedCodesFor,
    allowedFor,
    byCode,
    canUse
  });
})();
