window.MOL_APP_CONFIG = Object.freeze({
  version: '0.7.19',
  apiBase: 'https://n8n.estyl.team/webhook',
  endpoints: {
    auth: 'mol-app-auth-login',
    attendance: 'mol-app-attendance',
    config: 'mol-app-config',
    workday: 'mol-app-workday-current',
    status: 'mol-app-live-metrics',
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
    statusMs: 30000,
    leaderMs: 300000
  }
});
