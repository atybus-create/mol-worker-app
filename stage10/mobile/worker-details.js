(() => {
  'use strict';
  const shell = document.querySelector('.worker-shell');
  if (!shell) return;
  const css = document.createElement('link'); css.rel='stylesheet'; css.href='./worker-details.css'; document.head.append(css);
  const role = window.MOLRoles.normalizeRole(new URLSearchParams(location.search).get('role') || 'WORKER');
  const allowed = window.MOLProcesses.allowedFor(role);
  const tools = window.MOLWarehouseTools?.items || [];
  const process = document.querySelector('[data-panel="process"]');
  const messages = document.querySelector('[data-panel="messages"]');
  const profile = document.querySelector('[data-panel="profile"]');

  if (process) process.innerHTML = `
    <div class="worker-detail-head"><div><p class="mol-kicker">Praca operacyjna</p><h2>Proces</h2></div><span class="mol-chip mol-chip--info">LIVE</span></div>
    <section class="mol-card process-current"><small>Aktualny proces</small><strong data-current-process-name>Ładowanie…</strong><small>Kod: <span data-current-process-code>—</span></small><span class="mol-chip mol-chip--info" data-process-active-state>—</span></section>
    <div class="section-title"><h2>Wybierz proces</h2><span>Zmiana zostanie potwierdzona przez backend</span></div>
    <div class="process-grid">${allowed.map((item) => `<button class="mol-button process-option" type="button" data-process-code="${item.code}" disabled><strong>${item.name}</strong><small>${item.code}${item.normUnitsPerHour ? ` · norma ${item.normUnitsPerHour}/h` : ''}</small></button>`).join('')}</div>
    <section class="warehouse-tools" data-warehouse-tools hidden><div class="warehouse-tools-head"><div><p class="mol-kicker">MAGAZYN</p><h3>Opcjonalne narzędzia magazynowe</h3></div></div><p class="warehouse-tools-note">Narzędzia nie sterują procesem. Proces MAGAZYN jest zapisywany osobno w backendzie V2.</p><div class="warehouse-tool-grid">${tools.map((tool) => `<a class="mol-card warehouse-tool-card" href="${tool.url}" target="_blank" rel="noopener noreferrer"><span class="warehouse-tool-icon">${tool.icon}</span><span class="warehouse-tool-copy"><strong>${tool.title}</strong><small>${tool.description}</small></span><span class="warehouse-tool-arrow">→</span></a>`).join('')}</div></section>
    <button class="mol-button mol-button--danger manager-create-user" type="button" data-process-logout disabled>WYLOGUJ Z PROCESU</button>`;

  if (messages) messages.innerHTML = `
    <div class="worker-detail-head"><div><p class="mol-kicker">Komunikacja</p><h2>Komunikaty</h2></div><span class="mol-chip mol-chip--info">— nowe</span></div>
    <div class="message-list"><article class="mol-card" style="padding:16px"><small>Ładowanie komunikatów z backendu V2…</small></article></div>
    <section class="mol-card message-detail" data-message-detail hidden><h3>Komunikat</h3><p></p><button class="mol-button mol-button--primary" type="button" data-message-ack disabled>Potwierdź odbiór</button></section>`;

  if (profile) profile.innerHTML = `
    <div class="worker-detail-head"><div><p class="mol-kicker">Konto i historia</p><h2>Profil</h2></div><span class="mol-chip mol-chip--success">Sesja V2</span></div>
    <div class="profile-grid">
      <section class="mol-card profile-card"><h3>Stan połączenia</h3><div class="connection-state"><span>Backend V2</span><b>ŁADOWANIE</b></div><div class="profile-row"><span>Ostatnia synchronizacja</span><strong>—</strong></div></section>
      <section class="mol-card profile-card"><h3>Dzisiejsza historia</h3><div class="profile-row"><span>Dane</span><strong>Ładowanie…</strong></div></section>
      <section class="mol-card profile-card"><h3>Korekta czasu pracy</h3><form class="correction-form" data-demo-correction data-worker-correction><label>START<input name="start_at" type="datetime-local" disabled></label><label>STOP<input name="stop_at" type="datetime-local" disabled></label><label>Powód<textarea name="reason" rows="3" minlength="3" maxlength="500" placeholder="Opisz powód korekty" disabled></textarea></label><button class="mol-button" type="submit" disabled>Wyślij korektę</button></form></section>
      <button class="mol-button mol-button--danger" type="button" data-live-logout>Wyloguj</button>
    </div>`;
})();
