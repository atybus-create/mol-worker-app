(() => {
  'use strict';
  // Stage 8 WWW communication client. Polling stays off until configured by the server.
  const base='https://n8n.estyl.team/webhook/mol-app-v2-';
  const el=id=>document.getElementById(id);
  const routes={SEND:'leader-message',SHOWN:'message-shown',ACK:'message-ack'};
  const labels={MANUAL:'Wiadomość lidera',NO_PROCESS:'Brak procesu',NO_ACTIVITY:'Brak aktywności',WRONG_PROCESS:'Niewłaściwy proces',WORK_OUTSIDE_APP:'Praca bez START',ATTENDANCE_CORRECTION:'Korekta czasu',FORGOTTEN_STOP:'Przypomnienie STOP'};
  let token='',employee='',role='',generation=0,sequence=0,readBusy=false,writeBusy=false;
  let pending=null,items=new Map(),selected=null,historyCursor=null,changesCursor=null,syncRevision=null;
  let manualEnabled=false,pollSeconds=null,timer=null,lastRevision=0;
  const requests=new Set();
  const key=()=>`mol.v2.messages.pending.${employee}`;
  const manager=()=>['LEADER','ADMIN'].includes(role);
  const time=v=>v?new Date(v).toLocaleString('pl-PL',{timeZone:'Europe/Warsaw'}):'—';
  const say=message=>{el('commStatus').textContent=message;};
  function save(value){
    // New commands must be recoverable across a reload before any HTTP write.
    if(value)sessionStorage.setItem(key(),JSON.stringify(value));
    else {try{sessionStorage.removeItem(key());}catch{}}
    pending=value;
  }
  function validPending(p){return p&&['SEND','SHOWN','ACK'].includes(p.op)&&p.body&&typeof p.body.request_id==='string'&&/^[0-9a-f-]{36}$/i.test(p.body.request_id)&&p.employee_id===employee;}
  function controls(){
    const blocked=writeBusy||!!pending;
    el('commRefresh').disabled=readBusy||writeBusy;
    el('commOlder').disabled=readBusy||writeBusy;el('commOlder').hidden=!historyCursor;
    el('commRetry').hidden=!pending;el('commRetry').disabled=writeBusy;
    for(const id of ['commRecipient','commAllOpen','commContent','commAckRequired','commSend','commRecipientsRefresh'])el(id).disabled=blocked||!manager();
    el('commRecipient').disabled=blocked||!manager()||el('commAllOpen').checked;
    el('commSend').disabled=blocked||!manager()||!manualEnabled;
    el('commSender').hidden=!manager();
    el('commOpenAck').disabled=blocked;
    el('commOpenAck').hidden=!selected||!items.get(selected)?.ack_required||!!items.get(selected)?.ack_at;
    el('commPolling').textContent=pollSeconds?`Automatyczny odczyt zmian co ${pollSeconds} s, gdy karta jest widoczna.`:'Automatyczny odczyt nie został skonfigurowany. Użyj przycisku odświeżania.';
    el('commSendState').textContent=manualEnabled?'Wysyłka do osób z otwartym dniem pracy.':'Wysyłka jest wyłączona w konfiguracji backendu.';
  }
  function applySettings(data){
    manualEnabled=data.manual_send_enabled===true;
    pollSeconds=Number.isInteger(data.poll_seconds)&&data.poll_seconds>=5&&data.poll_seconds<=300?data.poll_seconds:null;
  }
  async function request(path,{body,query}={}){
    const controller=new AbortController();requests.add(controller);const auth=token;
    const timeout=setTimeout(()=>controller.abort(),45000);
    const suffix=query?'?'+new URLSearchParams(query):'';
    try{
      const res=await fetch(base+path+suffix,{method:body?'POST':'GET',cache:'no-store',credentials:'omit',
        headers:{Authorization:`Bearer ${auth}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal});
      let envelope;try{envelope=await res.json();}catch{throw new Error('Brak poprawnego potwierdzenia z serwera.');}
      if(!res.ok||envelope.ok!==true){const error=new Error(envelope.error?.message||'Nie potwierdzono operacji.');error.status=res.status;error.code=envelope.error?.code;throw error;}
      if(!envelope.data||typeof envelope.data!=='object')throw new Error('Nieprawidłowa odpowiedź komunikacji.');
      return envelope.data;
    }finally{clearTimeout(timeout);requests.delete(controller);}
  }
  function merge(deliveries){
    for(const data of deliveries){
      if(data.recipient_id!==employee||typeof data.message_id!=='string'||!Number.isSafeInteger(data.revision)||typeof data.content!=='string')continue;
      const old=items.get(data.message_id);if(!old||data.revision>=old.revision)items.set(data.message_id,data);
    }
  }
  function render(){
    const list=el('commList');list.replaceChildren();
    const sorted=[...items.values()].sort((a,b)=>b.created_revision-a.created_revision||b.message_id.localeCompare(a.message_id));
    for(const d of sorted){
      const li=document.createElement('li'),head=document.createElement('strong'),meta=document.createElement('p'),open=document.createElement('button');
      head.textContent=labels[d.type]||d.type;
      const status=d.ack_at?'Potwierdzona':d.shown_at?'Wyświetlona':'Nowa';
      meta.textContent=`${d.sender_id} · ${time(d.sent_at)} · ${status}${d.expired?' · po terminie ważności':''}`;
      open.type='button';open.textContent='Otwórz';open.dataset.messageId=d.message_id;
      open.addEventListener('click',()=>openMessage(d.message_id));
      li.append(head,meta,open);list.append(li);
    }
    const unread=sorted.filter(d=>!d.shown_at&&!d.expired).length;
    el('commCount').textContent=`Wczytano: ${sorted.length}. Nowe w pobranej historii: ${unread}.`;
    el('commEmpty').hidden=sorted.length>0;
    if(selected&&items.has(selected))renderDetail(items.get(selected));
    controls();
  }
  function renderDetail(d){
    el('commDetail').hidden=false;el('commDetailTitle').textContent=labels[d.type]||d.type;
    el('commDetailText').textContent=d.content;
    el('commDetailMeta').textContent=`Nadawca: ${d.sender_id}. Wysłano: ${time(d.sent_at)}. Wyświetlono: ${time(d.shown_at)}. Potwierdzono: ${time(d.ack_at)}.`;
    el('commCause').textContent=d.cause_status==='OPEN'?'Przyczyna alertu nadal trwa. Potwierdzenie wiadomości nie rozwiązuje przyczyny.':d.cause_status==='RESOLVED'?'Przyczyna alertu została rozwiązana.':'';
  }
  function schedule(){
    clearTimeout(timer);timer=null;
    if(token&&pollSeconds&&!document.hidden)timer=setTimeout(()=>refresh(),pollSeconds*1000);
  }
  async function refresh(older=false){
    if(!token||readBusy||writeBusy||older&&!historyCursor)return;
    const gen=generation,seq=++sequence;readBusy=true;clearTimeout(timer);controls();
    try{
      let query=older?{limit:'25',cursor:historyCursor}:syncRevision===null?{limit:'25'}:changesCursor?{limit:'25',cursor:changesCursor}:{limit:'25',since_revision:String(syncRevision)};
      // Continue bounded change pages; never claim caught up before the last one.
      let pages=0;
      do{
        const d=await request('messages',{query});
        if(gen!==generation||seq!==sequence)return;
        if(d.employee_id!==employee||!Array.isArray(d.items)||!Number.isSafeInteger(d.revision))throw new Error('Nieprawidłowy zakres odpowiedzi.');
        lastRevision=Math.max(lastRevision,d.revision);applySettings(d);
        if(d.stream==='history'){
          merge(d.items);historyCursor=d.next_cursor||null;
          if(syncRevision===null)syncRevision=d.snapshot_revision;
          render();break;
        }
        if(d.stream!=='changes')throw new Error('Nieprawidłowy rodzaj odpowiedzi.');
        merge(d.items.map(x=>x.delivery).filter(Boolean));changesCursor=d.next_cursor||null;
        if(!changesCursor&&Number.isSafeInteger(d.sync_revision))syncRevision=Math.max(syncRevision??0,d.sync_revision);
        render();query=changesCursor?{limit:'25',cursor:changesCursor}:null;
      }while(query&&++pages<4);
      say(changesCursor?'Pobrano część zmian. Kolejny odczyt pobierze dalsze wpisy.':pending?'Poprzednia operacja oczekuje na potwierdzenie. Użyj „Ponów zapis”.':'Stan wiadomości potwierdzony przez backend.');
    }catch(e){if(gen===generation)say('Nie udało się odczytać wiadomości. Zachowano ostatni widok. '+e.message);}
    finally{if(gen===generation){readBusy=false;controls();schedule();}}
  }
  async function recipients(){
    if(!token||!manager()||readBusy||writeBusy||pending)return;
    const gen=generation;readBusy=true;controls();
    try{
      const d=await request('leader-message-recipients');if(gen!==generation)return;
      const select=el('commRecipient'),chosen=select.value;select.replaceChildren();
      for(const p of d.items||[]){const option=document.createElement('option');option.value=p.employee_id;option.textContent=p.display_name;select.append(option);}
      if((d.items||[]).some(p=>p.employee_id===chosen))select.value=chosen;
      applySettings(d);say((d.items||[]).length?'Odczytano osoby z otwartym dniem pracy.':'Brak osób z otwartym dniem pracy.');
    }catch(e){if(gen===generation)say(e.message);}
    finally{if(gen===generation){readBusy=false;controls();}}
  }
  async function submit(op,body,retry=false){
    if(!token||writeBusy||pending&&!retry)return;
    const gen=generation;
    try{if(!retry)save({employee_id:employee,op,body});}catch{say('Nie można zabezpieczyć ponowienia w tej przeglądarce. Wiadomość nie została wysłana.');return;}
    writeBusy=true;controls();let result=null,failure='';
    try{
      result=await request(routes[op],{body});if(gen!==generation)return;
      save(null);
      if(op==='SEND'){el('commContent').value='';say(`Zapisano wiadomość dla ${result.recipient_count} osób.`);}
      else{
        const old=items.get(body.message_id);
        if(old)merge([{...old,shown_at:result.shown_at,ack_at:result.ack_at,
          delivery_status:result.ack_at?'ACKNOWLEDGED':result.shown_at?'DISPLAYED':'PENDING',revision:Math.max(old.revision,result.revision||0)}]);
        render();say(op==='ACK'?'Potwierdzenie zapisane.':'Wyświetlenie zapisane.');
      }
    }catch(e){
      if(gen!==generation)return;
      if(e.status>=400&&e.status<500&&e.code!=='COMM_BUSY')save(null);
      failure=e.message;
      say(failure+(pending?' Brak potwierdzenia. Ponów zapis tym samym identyfikatorem.':''));
    }finally{
      if(gen===generation){writeBusy=false;controls();if(!pending){await refresh();if(gen===generation){if(failure)say(failure);else if(op==='SEND'&&result)say(`Zapisano wiadomość dla ${result.recipient_count} osób.`);}}}
    }
  }
  function openMessage(id){
    const d=items.get(id);if(!d)return;selected=id;renderDetail(d);controls();
    if(!d.shown_at&&!document.hidden&&!pending&&!writeBusy)submit('SHOWN',{request_id:crypto.randomUUID(),message_id:id});
  }
  function hide(){
    generation++;sequence++;clearTimeout(timer);for(const c of requests)c.abort();requests.clear();
    token='';employee='';role='';readBusy=false;writeBusy=false;pending=null;items=new Map();selected=null;
    historyCursor=null;changesCursor=null;syncRevision=null;manualEnabled=false;pollSeconds=null;lastRevision=0;
    el('commPanel').hidden=true;el('commDetail').hidden=true;el('commList').replaceChildren();el('commRecipient').replaceChildren();
    for(const id of ['commStatus','commCount','commDetailText','commDetailMeta','commCause'])el(id).textContent='';
    el('commContent').value='';el('commAllOpen').checked=false;el('commAckRequired').checked=false;
  }
  async function activate(data,t){
    if(token===t&&employee===data.user.employee_id&&role===data.user.role)return;
    hide();token=t;employee=data.user.employee_id;role=data.user.role;
    try{const p=JSON.parse(sessionStorage.getItem(key())||'null');if(validPending(p))pending=p;}catch{}
    el('commPanel').hidden=false;const gen=generation;controls();
    await refresh();if(gen===generation&&manager())await recipients();
  }
  el('commRefresh').addEventListener('click',()=>refresh());
  el('commOlder').addEventListener('click',()=>refresh(true));
  el('commRecipientsRefresh').addEventListener('click',recipients);
  el('commAllOpen').addEventListener('change',controls);
  el('commRetry').addEventListener('click',()=>{if(pending)submit(pending.op,pending.body,true);});
  el('commDetailClose').addEventListener('click',()=>{selected=null;el('commDetail').hidden=true;});
  el('commOpenAck').addEventListener('click',()=>{if(selected&&!pending&&!writeBusy)submit('ACK',{request_id:crypto.randomUUID(),message_id:selected});});
  el('commSendForm').addEventListener('submit',event=>{
    event.preventDefault();if(!manager()||!manualEnabled||pending||writeBusy)return;
    const content=el('commContent').value.trim();if(!content){say('Wpisz treść wiadomości.');return;}
    const all=el('commAllOpen').checked,id=el('commRecipient').value;
    if(!all&&!id){say('Wybierz osobę z otwartym dniem pracy.');return;}
    submit('SEND',{request_id:crypto.randomUUID(),content,ack_required:el('commAckRequired').checked,...(all?{all_open:true}:{recipient_ids:[id]})});
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);timer=null;}else if(token)refresh();});
  window.addEventListener('online',()=>{if(token)refresh();});
  window.molMessages={hide,activate};
})();
