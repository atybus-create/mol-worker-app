(() => {
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
})();
