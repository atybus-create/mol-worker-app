window.MOL_APP_CONFIG = Object.freeze({
  version: '0.7.8',
  apiBase: 'https://n8n.estyl.team/webhook',
  endpoints: {
    auth: 'mol-app-auth-login',
    config: 'mol-app-config',
    workday: 'mol-app-workday-current',
    process: 'mol-app-process',
    alerts: 'mol-app-alerts',
    reports: 'mol-app-reports',
    leader: 'mol-app-leader'
  },
  warehouse: {
    expiryApp: 'https://atybus-create.github.io/mol-magazyn-terminy-pwa/',
    batchReader: 'https://atybus-create.github.io/mol-magazyn-terminy-pwa/batch-reader/'
  },
  polling: {
    workdayMs: 60000,
    alertsMs: 30000,
    leaderMs: 60000
  }
});
