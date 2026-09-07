(() => {
  'use strict';

  const ROLE_CAPABILITIES = Object.freeze({
    WORKER: Object.freeze({ mobile: true, web: false, managerMobile: false, userAdmin: false, correctionsReview: false, reportsTeam: false }),
    LEADER: Object.freeze({ mobile: true, web: true, managerMobile: true, userAdmin: true, correctionsReview: true, reportsTeam: true, userCreateRoles: Object.freeze(['WORKER']) }),
    ADMIN: Object.freeze({ mobile: true, web: true, managerMobile: true, userAdmin: true, correctionsReview: true, reportsTeam: true, userCreateRoles: Object.freeze(['WORKER', 'LEADER', 'ADMIN']) })
  });

  const normalizeRole = (role) => String(role || '').trim().toUpperCase();
  const get = (role) => ROLE_CAPABILITIES[normalizeRole(role)] || null;

  window.MOLRoles = Object.freeze({
    all: ROLE_CAPABILITIES,
    get,
    normalizeRole,
    canUseMobile: (role) => Boolean(get(role)?.mobile),
    canUseWeb: (role) => Boolean(get(role)?.web),
    canUseManagerMobile: (role) => Boolean(get(role)?.managerMobile)
  });

  const isIndex = /\/(mobile|web)\/(?:index\.html)?$/.test(location.pathname);
  if (!isIndex) return;

  document.documentElement.classList.add('mol-live-pending');
  const pendingStyle = document.createElement('style');
  pendingStyle.id = 'molLivePendingStyle';
  pendingStyle.textContent = 'html.mol-live-pending body{visibility:hidden!important}';
  document.head.append(pendingStyle);

  const load = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Nie udało się załadować ${src}`));
    document.head.append(script);
  });

  (async () => {
    await load('../shared/api.js');
    await load('./live.js');
  })().catch((error) => {
    document.documentElement.classList.remove('mol-live-pending');
    pendingStyle.remove();
    const banner = document.createElement('div');
    banner.setAttribute('role', 'alert');
    banner.style.cssText = 'position:fixed;z-index:99999;left:12px;right:12px;top:12px;padding:12px 16px;border-radius:10px;background:#45151a;color:#fff;font:600 14px system-ui';
    banner.textContent = `Błąd uruchomienia integracji V2: ${error.message}`;
    document.body.prepend(banner);
  });
})();
