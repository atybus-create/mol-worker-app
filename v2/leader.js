(() => {
  const el = id => document.getElementById(id);
  const BASE = 'https://n8n.estyl.team/webhook/';
  let token = '', role = '', generation = 0, selectedEmployee = '', busy = false;

  const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Warsaw', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Warsaw', year:'numeric', month:'2-digit', day:'2-digit'}).format(d); };
  const duration = seconds => { seconds = Math.max(0, Math.floor(Number(seconds) || 0)); return `${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds%3600/60)).padStart(2,'0')}`; };
  const percent = v => Number.isFinite(Number(v)) ? `${Math.round(Number(v) * 10) / 10}%` : '—';
  const when = v => v ? new Date(v).toLocaleString('pl-PL', {timeZone:'Europe/Warsaw', dateStyle:'short', timeStyle:'short'}) : '—';

  function setMessage(text, error=false) {
    const node = el('leaderStatus');
    node.textContent = text || '';
    node.dataset.state = error ? 'error' : 'ok';
  }

  async function request(path, {binary=false}={}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(BASE + path, {method:'GET', cache:'no-store', credentials:'omit', headers:{Authorization:`Bearer ${token}`}, signal:controller.signal});
      if (binary) {
        if (!response.ok) {
          let message = `HTTP ${response.status}`;
          try { const e = await response.json(); message = e.error?.message || message; } catch {}
          throw new Error(message);
        }
        return {blob:await response.blob(), disposition:response.headers.get('content-disposition') || ''};
      }
      let envelope;
      try { envelope = await response.json(); } catch { throw new Error('Backend nie zwrócił poprawnej odpowiedzi.'); }
      if (!response.ok || envelope.ok !== true) {
        const error = new Error(envelope.error?.message || 'Operacja nie została potwierdzona.');
        error.status = response.status; error.code = envelope.error?.code; throw error;
      }
      return envelope.data;
    } catch (error) {
      if (error.name === 'AbortError' || error instanceof TypeError) throw new Error('Brak potwierdzenia z serwera. Sprawdź połączenie i ponów.');
      throw error;
    } finally { clearTimeout(timer); }
  }

  function normLabel(norm) {
    const freshness = norm?.freshness || 'UNAVAILABLE';
    const value = percent(norm?.combined_percent);
    return `${value} · ${freshness}`;
  }

  function renderTeam(data) {
    const list = el('leaderTeamList');
    list.replaceChildren();
    const items = data?.items || [];
    for (const row of items) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'leader-row'; button.dataset.employeeId = row.employee.employee_id;
      const name = document.createElement('strong'); name.textContent = row.employee.display_name;
      const meta = document.createElement('span');
      const attendance = row.attendance?.state === 'OPEN' ? `W pracy od ${when(row.attendance.start_at)}` : row.attendance?.state === 'CLOSED' ? `Zakończono ${when(row.attendance.stop_at)}` : 'Dzień nierozpoczęty';
      const process = row.process?.state === 'ACTIVE' ? row.process.process_code : 'brak procesu';
      meta.textContent = `${attendance} · ${process} · norma ${normLabel(row.norm)}`;
      button.append(name, meta);
      button.addEventListener('click', () => selectEmployee(row.employee.employee_id, row.employee.display_name));
      list.append(button);
    }
    el('leaderTeamCount').textContent = `${items.length} aktywnych pracowników`;
  }

  async function refreshTeam(silent=false) {
    if (!token || busy) return;
    const gen = generation; busy = true;
    if (!silent) setMessage('Odczyt zespołu…');
    try {
      const data = await request('mol-app-v2-leader-team');
      if (gen !== generation) return;
      renderTeam(data); if (!silent) setMessage('Panel zespołu odświeżony.');
    } catch (e) { if (gen === generation) setMessage(e.message, true); }
    finally { if (gen === generation) busy = false; }
  }

  function selectEmployee(employeeId, displayName) {
    selectedEmployee = employeeId;
    el('leaderHistoryTitle').textContent = `Historia · ${displayName}`;
    el('leaderHistoryEmployee').textContent = employeeId;
    loadHistory();
  }

  function renderHistory(data) {
    const body = el('leaderHistoryBody'); body.replaceChildren();
    for (const row of data?.items || []) {
      const tr = document.createElement('tr');
      const cells = [row.work_date, row.attendance?.state || 'NOT_STARTED', when(row.attendance?.start_at), when(row.attendance?.stop_at), duration(row.presence_seconds), duration(row.process_seconds), normLabel(row.norm)];
      for (const value of cells) { const td=document.createElement('td'); td.textContent=String(value); tr.append(td); }
      body.append(tr);
    }
    el('leaderHistoryEmpty').hidden = (data?.items || []).length > 0;
  }

  async function loadHistory() {
    if (!selectedEmployee || !token) return;
    const gen = generation;
    try {
      setMessage('Odczyt historii…');
      const q = new URLSearchParams({employee_id:selectedEmployee,date_from:el('leaderDateFrom').value,date_to:el('leaderDateTo').value,limit:'100'});
      const data = await request(`mol-app-v2-employee-history?${q}`);
      if (gen !== generation) return; renderHistory(data); setMessage('Historia odświeżona.');
    } catch (e) { if (gen === generation) setMessage(e.message,true); }
  }

  function renderReport(data) {
    const body = el('leaderReportBody'); body.replaceChildren();
    for (const row of data?.items || []) {
      const tr=document.createElement('tr');
      const cells=[row.work_date,row.display_name,row.attendance_state,when(row.start_at),when(row.stop_at),duration(row.presence_seconds),percent(row.combined_percent),row.norm_freshness,row.norm_coverage];
      for(const value of cells){const td=document.createElement('td');td.textContent=String(value ?? '—');tr.append(td);} body.append(tr);
    }
    el('leaderReportCount').textContent = `${data?.count || 0} wierszy`;
  }

  async function loadReport() {
    if (!token) return;
    const gen=generation;
    try {
      setMessage('Buduję raport…');
      const q=new URLSearchParams({date_from:el('leaderReportFrom').value,date_to:el('leaderReportTo').value});
      const data=await request(`mol-app-v2-report-attendance?${q}`);
      if(gen!==generation)return;renderReport(data);setMessage('Raport gotowy.');
    } catch(e){if(gen===generation)setMessage(e.message,true);}
  }

  async function download(format) {
    if (!token) return;
    try {
      setMessage(`Tworzę eksport ${format.toUpperCase()}…`);
      const q=new URLSearchParams({date_from:el('leaderReportFrom').value,date_to:el('leaderReportTo').value,format});
      const result=await request(`mol-app-v2-report-export?${q}`,{binary:true});
      const match=/filename="?([^";]+)"?/i.exec(result.disposition); const name=match?.[1] || `mol_v2_report.${format}`;
      const url=URL.createObjectURL(result.blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
      setMessage(`Eksport ${format.toUpperCase()} gotowy.`);
    } catch(e){setMessage(e.message,true);}
  }

  el('leaderRefresh').addEventListener('click',()=>refreshTeam());
  el('leaderHistoryRefresh').addEventListener('click',loadHistory);
  el('leaderReportRun').addEventListener('click',loadReport);
  el('leaderExportCsv').addEventListener('click',()=>download('csv'));
  el('leaderExportXlsx').addEventListener('click',()=>download('xlsx'));

  window.molLeader = {
    hide(){ generation++; token=''; role=''; selectedEmployee=''; el('leaderPanel').hidden=true; el('leaderTeamList').replaceChildren(); el('leaderHistoryBody').replaceChildren(); el('leaderReportBody').replaceChildren(); setMessage(''); },
    activate(data,t){
      if (!['LEADER','ADMIN'].includes(data?.user?.role)) return this.hide();
      if (token===t && role===data.user.role) return;
      generation++; token=t; role=data.user.role; selectedEmployee='';
      const max=today(); for(const id of ['leaderDateTo','leaderReportTo']){el(id).value=max;el(id).max=max;} for(const id of ['leaderDateFrom','leaderReportFrom']){el(id).value=daysAgo(30);el(id).max=max;}
      el('leaderPanel').hidden=false; el('leaderHistoryTitle').textContent='Historia pracownika'; el('leaderHistoryEmployee').textContent='Wybierz osobę z listy.'; renderHistory({items:[]}); renderReport({items:[],count:0}); refreshTeam();
    }
  };
})();
