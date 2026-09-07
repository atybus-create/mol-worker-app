(() => {
  const el = id => document.getElementById(id);
  const BASE = 'https://n8n.estyl.team/webhook/';
  let token = '', role = '', actorEmployee = '', generation = 0, selectedEmployee = '', busy = false, userBusy = false, users = [], correctionBusy = false, corrections = [];

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

  function setUserMessage(text, error=false) {
    const node = el('leaderUserStatus');
    if (!node) return;
    node.textContent = text || '';
    node.dataset.state = error ? 'error' : 'ok';
  }

  function setCorrectionMessage(text, error=false) {
    const node = el('leaderCorrectionStatus');
    if (!node) return;
    node.textContent = text || '';
    node.dataset.state = error ? 'error' : 'ok';
  }

  async function request(path, {binary=false, method='GET', body=null}={}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const headers = {Authorization:`Bearer ${token}`};
      if (body) headers['Content-Type'] = 'application/json';
      const response = await fetch(BASE + path, {
        method,
        cache:'no-store',
        credentials:'omit',
        headers,
        body:body ? JSON.stringify(body) : undefined,
        signal:controller.signal,
      });
      if (binary) {
        if (!response.ok) {
          let message = `HTTP ${response.status}`;
          try { const e = await response.json(); message = e.error?.message || message; } catch {}
          const error = new Error(message); error.status = response.status; throw error;
        }
        return {blob:await response.blob(), disposition:response.headers.get('content-disposition') || ''};
      }
      let envelope;
      try { envelope = await response.json(); } catch { throw new Error('Backend nie zwrócił poprawnej odpowiedzi.'); }
      if (!response.ok || envelope.ok !== true) {
        const error = new Error(envelope.error?.message || 'Operacja nie została potwierdzona.');
        error.status = response.status; error.code = envelope.error?.code; error.retryable = envelope.error?.retryable; throw error;
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

  function ensureUserAdminPanel() {
    if (el('leaderUserAdmin')) return;
    const panel = document.createElement('section');
    panel.id = 'leaderUserAdmin';
    panel.className = 'leader-section';
    panel.setAttribute('aria-labelledby','leaderUserAdminTitle');
    panel.innerHTML = `
      <h3 id="leaderUserAdminTitle">Użytkownicy aplikacji</h3>
      <p class="scope-note">LEADER może dodawać konta WORKER, zmieniać ich aktywność i hasła oraz zmienić własne hasło. ADMIN może tworzyć wszystkie role, zmieniać aktywność innych kont i resetować hasła wszystkich użytkowników. Dezaktywacja konta natychmiast unieważnia jego aktywne sesje.</p>
      <p id="leaderUserStatus" class="scope-note" role="status" aria-live="polite"></p>
      <div class="leader-toolbar"><button id="leaderUsersRefresh" type="button">Odśwież użytkowników</button><span id="leaderUsersCount" class="scope-note"></span></div>
      <div id="leaderUsersList" class="leader-list"></div>
      <div class="leader-grid leader-user-grid">
        <form id="leaderCreateUserForm" class="leader-user-form">
          <h4>Dodaj użytkownika</h4>
          <label>Imię i nazwisko <input id="leaderNewDisplayName" maxlength="100" required></label>
          <label>Login <input id="leaderNewLogin" maxlength="64" autocapitalize="none" spellcheck="false" required></label>
          <label>Rola <select id="leaderNewRole"></select></label>
          <label>Hasło startowe <input id="leaderNewPassword" type="password" minlength="8" maxlength="128" autocomplete="new-password" required></label>
          <label>Powtórz hasło <input id="leaderNewPassword2" type="password" minlength="8" maxlength="128" autocomplete="new-password" required></label>
          <label>Moniti worker ID <input id="leaderNewMoniti" maxlength="100" placeholder="opcjonalnie"></label>
          <label>Operator ES <input id="leaderNewEs" maxlength="100" placeholder="opcjonalnie"></label>
          <button id="leaderCreateUser" type="submit">Dodaj użytkownika</button>
        </form>
        <form id="leaderResetPasswordForm" class="leader-user-form">
          <h4>Zmień hasło</h4>
          <label>Użytkownik <select id="leaderPasswordEmployee" required></select></label>
          <label>Nowe hasło <input id="leaderResetPassword" type="password" minlength="8" maxlength="128" autocomplete="new-password" required></label>
          <label>Powtórz nowe hasło <input id="leaderResetPassword2" type="password" minlength="8" maxlength="128" autocomplete="new-password" required></label>
          <p class="scope-note">Po zapisie dotychczasowe sesje tego użytkownika zostaną unieważnione.</p>
          <button id="leaderResetPasswordButton" type="submit">Zmień hasło</button>
        </form>
      </div>`;
    el('leaderPanel').append(panel);

    el('leaderUsersRefresh').addEventListener('click',()=>loadUsers());
    el('leaderCreateUserForm').addEventListener('submit',createUser);
    el('leaderResetPasswordForm').addEventListener('submit',resetPassword);
  }

  function setUserControlsDisabled(value) {
    for (const id of ['leaderUsersRefresh','leaderNewDisplayName','leaderNewLogin','leaderNewRole','leaderNewPassword','leaderNewPassword2','leaderNewMoniti','leaderNewEs','leaderCreateUser','leaderPasswordEmployee','leaderResetPassword','leaderResetPassword2','leaderResetPasswordButton']) {
      if (el(id)) el(id).disabled = value;
    }
    for (const button of document.querySelectorAll('#leaderUsersList .leader-user-active')) button.disabled = value;
  }

  function canManageActive(user) {
    if (user.employee_id === actorEmployee) return false;
    if (role === 'ADMIN') return true;
    return role === 'LEADER' && user.role === 'WORKER';
  }

  function renderUsers() {
    ensureUserAdminPanel();
    el('leaderUsersCount').textContent = `${users.length} kont`;
    const list=el('leaderUsersList'); list.replaceChildren();
    for(const user of users){
      const row=document.createElement('div'); row.className='leader-row leader-user-row';
      const content=document.createElement('div'); content.className='leader-user-content';
      const name=document.createElement('strong'); name.textContent=user.display_name;
      const meta=document.createElement('span'); meta.textContent=`${user.employee_id} · ${user.login} · ${user.role} · ${user.active?'aktywne':'nieaktywne'}${user.es_worker_id?` · ES ${user.es_worker_id}`:''}${user.moniti_worker_id?` · Moniti ${user.moniti_worker_id}`:''}`;
      content.append(name,meta); row.append(content);
      if(canManageActive(user)){
        const button=document.createElement('button');button.type='button';button.className='leader-user-active';button.dataset.employeeId=user.employee_id;button.textContent=user.active?'Dezaktywuj':'Aktywuj';button.disabled=userBusy;button.addEventListener('click',()=>setUserActive(user));row.append(button);
      }
      list.append(row);
    }
    const select=el('leaderPasswordEmployee'); select.replaceChildren();
    const allowed=users.filter(u=>u.can_reset_password);
    for(const user of allowed){const option=document.createElement('option');option.value=user.employee_id;option.textContent=`${user.display_name} (${user.employee_id} · ${user.role})`;select.append(option);}
    const roleSelect=el('leaderNewRole'); roleSelect.replaceChildren();
    const roles=role==='ADMIN'?['WORKER','LEADER','ADMIN']:['WORKER'];
    for(const value of roles){const option=document.createElement('option');option.value=value;option.textContent={WORKER:'Pracownik',LEADER:'Lider',ADMIN:'Administrator'}[value];roleSelect.append(option);}
    el('leaderResetPasswordButton').disabled=userBusy||allowed.length===0;
  }

  async function loadUsers(silent=false) {
    if(!token||userBusy)return;
    const gen=generation;userBusy=true;setUserControlsDisabled(true);if(!silent)setUserMessage('Odczyt kont użytkowników…');
    try{const data=await request('mol-app-v2-user-list');if(gen!==generation)return;users=data?.items||[];renderUsers();if(!silent)setUserMessage('Lista użytkowników odświeżona.');}
    catch(e){if(gen===generation)setUserMessage(e.message,true);}
    finally{if(gen===generation){userBusy=false;setUserControlsDisabled(false);if(el('leaderPasswordEmployee'))el('leaderResetPasswordButton').disabled=!users.some(u=>u.can_reset_password);}}
  }

  async function createUser(event) {
    event.preventDefault(); if(userBusy||!token)return;
    const p1=el('leaderNewPassword').value,p2=el('leaderNewPassword2').value;
    if(p1!==p2)return setUserMessage('Hasła nie są identyczne.',true);
    const body={request_id:crypto.randomUUID(),display_name:el('leaderNewDisplayName').value.trim(),login:el('leaderNewLogin').value.trim().toLowerCase(),role:el('leaderNewRole').value,initial_password:p1,moniti_worker_id:el('leaderNewMoniti').value.trim(),es_worker_id:el('leaderNewEs').value.trim()};
    userBusy=true;setUserControlsDisabled(true);setUserMessage('Dodawanie użytkownika…');
    try{const data=await request('mol-app-v2-user-create',{method:'POST',body});el('leaderCreateUserForm').reset();el('leaderNewPassword').value='';el('leaderNewPassword2').value='';setUserMessage(`Dodano konto ${data.display_name} (${data.employee_id}).`);await refreshTeam(true);users=[];}
    catch(e){setUserMessage(e.message,true);}
    finally{body.initial_password='';userBusy=false;setUserControlsDisabled(false);await loadUsers(true);}
  }

  async function resetPassword(event) {
    event.preventDefault();if(userBusy||!token)return;
    const p1=el('leaderResetPassword').value,p2=el('leaderResetPassword2').value,employee_id=el('leaderPasswordEmployee').value;
    if(!employee_id)return setUserMessage('Wybierz użytkownika.',true);
    if(p1!==p2)return setUserMessage('Hasła nie są identyczne.',true);
    const body={request_id:crypto.randomUUID(),employee_id,new_password:p1};
    userBusy=true;setUserControlsDisabled(true);setUserMessage('Zmiana hasła i unieważnianie sesji…');
    try{
      const data=await request('mol-app-v2-user-password-reset',{method:'POST',body});
      el('leaderResetPassword').value='';el('leaderResetPassword2').value='';
      if(data.self_session_revoked){setUserMessage('Hasło zmienione. Twoja sesja została unieważniona — za chwilę wrócisz do logowania.');try{sessionStorage.removeItem('mol.v2.session');}catch{}setTimeout(()=>location.reload(),1200);return;}
      setUserMessage(`Hasło użytkownika ${data.display_name} zostało zmienione. Aktywne sesje unieważniono.`);
    }catch(e){setUserMessage(e.message,true);}
    finally{body.new_password='';userBusy=false;setUserControlsDisabled(false);}
  }

  async function setUserActive(user) {
    if(userBusy||!token||!canManageActive(user))return;
    const desired=!user.active;
    if(!desired&&!confirm(`Dezaktywować konto ${user.display_name}? Aktywne sesje zostaną zakończone.`))return;
    const body={request_id:crypto.randomUUID(),employee_id:user.employee_id,active:desired};
    userBusy=true;setUserControlsDisabled(true);setUserMessage(desired?'Aktywowanie konta…':'Dezaktywowanie konta i kończenie sesji…');
    try{
      const data=await request('mol-app-v2-user-active',{method:'POST',body});
      setUserMessage(data.active?`Konto ${data.display_name} jest aktywne.`:`Konto ${data.display_name} zostało zdezaktywowane. Sesje zakończono.`);
      await loadUsersAfterMutation();
      await refreshTeam(true);
    }catch(e){setUserMessage(e.message,true);}
    finally{userBusy=false;setUserControlsDisabled(false);}
  }

  async function loadUsersAfterMutation() {
    const data=await request('mol-app-v2-user-list');
    users=data?.items||[];
    renderUsers();
  }

  function ensureCorrectionQueuePanel() {
    if(el('leaderCorrectionQueue'))return;
    const panel=document.createElement('section');
    panel.id='leaderCorrectionQueue';panel.className='leader-section';panel.setAttribute('aria-labelledby','leaderCorrectionTitle');
    panel.innerHTML=`
      <h3 id="leaderCorrectionTitle">Kolejka korekt czasu pracy</h3>
      <p class="scope-note">Korekty pochodzą z zakładki „Korekty” raportu V2. Akceptacja korzysta z istniejącego mechanizmu zatwierdzania i kontroli wersji. Odrzucona korekta wróci jako nowa, jeżeli jej treść w arkuszu zostanie zmieniona.</p>
      <p id="leaderCorrectionStatus" class="scope-note" role="status" aria-live="polite"></p>
      <div class="leader-toolbar"><button id="leaderCorrectionsRefresh" type="button">Odśwież kolejkę</button><span id="leaderCorrectionsCount" class="scope-note"></span></div>
      <div id="leaderCorrectionsList" class="leader-correction-list"></div>`;
    el('leaderPanel').append(panel);
    el('leaderCorrectionsRefresh').addEventListener('click',()=>loadCorrections());
  }

  function correctionStatusLabel(status){
    return ({PENDING:'oczekuje',CHANGED:'zmieniona po odrzuceniu',APPROVED:'zatwierdzona',REJECTED:'odrzucona',CONFLICT:'konflikt wersji',RETRY_PENDING:'oczekuje na dokończenie',SYSTEM_REJECTED:'odrzucona przez system'})[status]||status;
  }

  function setCorrectionControlsDisabled(value){
    if(el('leaderCorrectionsRefresh'))el('leaderCorrectionsRefresh').disabled=value;
    for(const button of document.querySelectorAll('#leaderCorrectionsList button'))button.disabled=value;
  }

  function renderCorrections(data={}){
    ensureCorrectionQueuePanel();
    corrections=data.items||[];
    const list=el('leaderCorrectionsList');list.replaceChildren();
    el('leaderCorrectionsCount').textContent=`${data.pending_count||0} do decyzji · ${corrections.length} łącznie`;
    if(!corrections.length){const empty=document.createElement('p');empty.className='scope-note';empty.textContent='Brak korekt w arkuszu.';list.append(empty);return;}
    for(const item of corrections){
      const card=document.createElement('article');card.className=`leader-correction leader-correction-${String(item.status||'').toLowerCase()}`;
      const title=document.createElement('strong');title.textContent=`${item.employee_id} · ${item.work_date}`;
      const status=document.createElement('span');status.className='leader-correction-status';status.textContent=correctionStatusLabel(item.status);
      const meta=document.createElement('p');meta.textContent=`Wersja ${item.expected_version} · START ${when(item.start_at)} · STOP ${item.stop_at?when(item.stop_at):'bez zmiany'}`;
      const reason=document.createElement('p');reason.className='scope-note';reason.textContent=`Powód: ${item.reason}`;
      const head=document.createElement('div');head.className='leader-correction-head';head.append(title,status);card.append(head,meta,reason);
      if(['PENDING','CHANGED'].includes(item.status)){
        const actions=document.createElement('div');actions.className='leader-correction-actions';
        const approve=document.createElement('button');approve.type='button';approve.textContent='Akceptuj';approve.addEventListener('click',()=>approveCorrection(item));
        const reject=document.createElement('button');reject.type='button';reject.textContent='Odrzuć';reject.addEventListener('click',()=>rejectCorrection(item));
        actions.append(approve,reject);card.append(actions);
      }
      list.append(card);
    }
  }

  async function loadCorrections(silent=false){
    if(!token||correctionBusy)return;
    const gen=generation;correctionBusy=true;setCorrectionControlsDisabled(true);if(!silent)setCorrectionMessage('Odczyt kolejki korekt…');
    try{const data=await request('mol-app-v2-corrections-queue');if(gen!==generation)return;renderCorrections(data);if(!silent)setCorrectionMessage('Kolejka korekt odświeżona.');}
    catch(e){if(gen===generation)setCorrectionMessage(e.message,true);}
    finally{if(gen===generation){correctionBusy=false;setCorrectionControlsDisabled(false);}}
  }

  async function approveCorrection(item){
    if(correctionBusy||!token)return;
    correctionBusy=true;setCorrectionControlsDisabled(true);setCorrectionMessage(`Sprawdzam korektę ${item.correction_id}…`);
    try{
      const preview=await request(`mol-app-v2-attendance-status?correction_id=${encodeURIComponent(item.correction_id)}`);
      if(preview?.proposal?.request_id!==item.correction_id||typeof preview.approved_hash!=='string'||!preview.approved_hash)throw new Error('Backend nie potwierdził treści korekty. Odśwież kolejkę.');
      await request('mol-app-v2-attendance-correct',{method:'POST',body:{request_id:preview.proposal.request_id,correction_id:preview.proposal.request_id,approved_hash:preview.approved_hash}});
      setCorrectionMessage(`Korekta ${item.correction_id} została zatwierdzona.`);
      await refreshTeam(true);
      const data=await request('mol-app-v2-corrections-queue');renderCorrections(data);
    }catch(e){setCorrectionMessage(e.message,true);}
    finally{correctionBusy=false;setCorrectionControlsDisabled(false);}
  }

  async function rejectCorrection(item){
    if(correctionBusy||!token)return;
    if(!confirm(`Odrzucić korektę ${item.employee_id} z dnia ${item.work_date}?`))return;
    correctionBusy=true;setCorrectionControlsDisabled(true);setCorrectionMessage('Zapisywanie odrzucenia…');
    try{
      await request('mol-app-v2-correction-reject',{method:'POST',body:{request_id:crypto.randomUUID(),correction_id:item.correction_id}});
      const data=await request('mol-app-v2-corrections-queue');renderCorrections(data);setCorrectionMessage(`Korekta ${item.correction_id} została odrzucona.`);
    }catch(e){setCorrectionMessage(e.message,true);}
    finally{correctionBusy=false;setCorrectionControlsDisabled(false);}
  }

  el('leaderRefresh').addEventListener('click',()=>refreshTeam());
  el('leaderHistoryRefresh').addEventListener('click',loadHistory);
  el('leaderReportRun').addEventListener('click',loadReport);
  el('leaderExportCsv').addEventListener('click',()=>download('csv'));
  el('leaderExportXlsx').addEventListener('click',()=>download('xlsx'));

  window.molLeader = {
    hide(){
      generation++; token=''; role=''; actorEmployee=''; selectedEmployee=''; users=[]; corrections=[]; busy=false; userBusy=false; correctionBusy=false;
      el('leaderPanel').hidden=true; el('leaderTeamList').replaceChildren(); el('leaderHistoryBody').replaceChildren(); el('leaderReportBody').replaceChildren();
      if(el('leaderUsersList'))el('leaderUsersList').replaceChildren();if(el('leaderCorrectionsList'))el('leaderCorrectionsList').replaceChildren();setMessage('');setUserMessage('');setCorrectionMessage('');
    },
    activate(data,t){
      if (!['LEADER','ADMIN'].includes(data?.user?.role)) return this.hide();
      if (token===t && role===data.user.role) return;
      generation++; token=t; role=data.user.role; actorEmployee=data.user.employee_id; selectedEmployee=''; users=[]; corrections=[];
      const max=today(); for(const id of ['leaderDateTo','leaderReportTo']){el(id).value=max;el(id).max=max;} for(const id of ['leaderDateFrom','leaderReportFrom']){el(id).value=daysAgo(30);el(id).max=max;}
      el('leaderPanel').hidden=false; el('leaderHistoryTitle').textContent='Historia pracownika'; el('leaderHistoryEmployee').textContent='Wybierz osobę z listy.'; renderHistory({items:[]}); renderReport({items:[],count:0});
      ensureUserAdminPanel();ensureCorrectionQueuePanel();refreshTeam();loadUsers();loadCorrections();
    }
  };
})();