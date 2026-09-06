import {readFileSync,writeFileSync} from 'node:fs';
const url=new URL('../../../docs/v2/openapi.json',import.meta.url);
const api=JSON.parse(readFileSync(url,'utf8'));
const ref=name=>({'$ref':`#/components/responses/${name}`});
const json=schema=>({required:true,content:{'application/json':{schema}}});
api.info.description='MOL App V2 API. Wszystkie zapisy są idempotentne po request_id. Etap 8 dodaje trwałą komunikację, SHOWN/ACK i przyrostową historię; automatyczne alerty pozostają sterowane konfiguracją.';
const messages=api.paths['/mol-app-v2-messages']?.get;
if(!messages)throw Error('OPENAPI_STAGE8_ANCHOR_MISSING_MESSAGES');
messages.description='Stronicowana historia własnych wiadomości. Bez cursor zwraca historię; since_revision zwraca zmiany po rewizji. Backend nigdy nie ujawnia wiadomości innego odbiorcy.';
messages.parameters=[
  {'$ref':'#/components/parameters/Cursor'},
  {'$ref':'#/components/parameters/Limit'},
  {name:'since_revision',in:'query',required:false,schema:{type:'integer',minimum:0},description:'Przyrostowe zmiany komunikacji po tej rewizji. Nie łączyć z cursor rozpoczynającym historię.'}
];
api.paths['/mol-app-v2-message-shown']={post:{tags:['Messages'],operationId:'showMessage',description:'Trwale oznacza własną wiadomość jako wyświetloną. Idempotentne po request_id; SHOWN nie rozwiązuje przyczyny alertu.',requestBody:json({'$ref':'#/components/schemas/MessageAckRequest'}),responses:{'200':ref('CommandOk'),'400':ref('Error'),'401':ref('Error'),'403':ref('Error'),'404':ref('Error'),'409':ref('Error'),'503':ref('Error')}}};
const ack=api.paths['/mol-app-v2-message-ack']?.post;if(!ack)throw Error('OPENAPI_STAGE8_ANCHOR_MISSING_ACK');
ack.description='Trwale potwierdza własną wiadomość. ACK nie zamyka i nie otwiera epizodu alertu.';
ack.responses={...ack.responses,'400':ref('Error'),'401':ref('Error'),'403':ref('Error'),'409':ref('Error'),'503':ref('Error')};
api.paths['/mol-app-v2-leader-message-recipients']={get:{tags:['Leader'],operationId:'leaderMessageRecipients',description:'Lista aktywnych pracowników z otwartym dniem pracy, do których LEADER/ADMIN może wysłać komunikat MANUAL. Zakres nie zależy od leader_id.',responses:{'200':ref('ListOk'),'401':ref('Error'),'403':ref('Error'),'503':ref('Error')}}};
const send=api.paths['/mol-app-v2-leader-message']?.post;if(!send)throw Error('OPENAPI_STAGE8_ANCHOR_MISSING_SEND');
send.description='Wysyła komunikat MANUAL do wybranych pracowników z otwartym dniem albo do wszystkich aktualnie OPEN. WORKER jest odrzucany przez backend. Lista odbiorców jest zamrażana w komendzie.';
send.responses={...send.responses,'400':ref('Error'),'401':ref('Error'),'409':ref('Error'),'422':ref('Error'),'503':ref('Error')};
api.components.schemas.LeaderMessageRequest={
  type:'object',additionalProperties:false,
  required:['request_id','content'],
  properties:{
    request_id:{'$ref':'#/components/schemas/RequestId'},
    recipient_ids:{type:'array',minItems:1,maxItems:100,uniqueItems:true,items:{type:'string',pattern:'^MOL[0-9]+$'}},
    all_open:{type:'boolean',default:false},
    content:{type:'string',minLength:1,maxLength:2000},
    ack_required:{type:'boolean',default:false},
    valid_until:{type:['string','null'],format:'date-time'}
  },
  oneOf:[{required:['recipient_ids'],not:{required:['all_open']}},{required:['all_open'],properties:{all_open:{const:true}},not:{required:['recipient_ids']}}]
};
const worker=api.components.schemas.WorkerStatus?.properties;if(!worker)throw Error('OPENAPI_STAGE8_ANCHOR_MISSING_WORKER_STATUS');
worker.unread_messages={type:'integer',minimum:0,description:'Dokładna liczba niewyświetlonych, niewygasłych wiadomości dla zalogowanego aktora w spójnym snapshotcie.'};
worker.messages_available={type:'boolean',description:'Czy istnieje co najmniej jedna wiadomość w historii aktora.'};
worker.communication_revision={type:'integer',minimum:0,description:'Najnowsza rewizja zmian komunikacji aktora; bierze udział w monotonicznym snapshot_version.'};
const required=new Set(api.components.schemas.WorkerStatus.required||[]);for(const k of ['unread_messages','messages_available','communication_revision'])required.add(k);api.components.schemas.WorkerStatus.required=[...required];
writeFileSync(url,JSON.stringify(api,null,2)+'\n');
console.log('Stage 8 OpenAPI communication contract synchronized.');
