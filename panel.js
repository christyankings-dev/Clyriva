
/* Clyriva v1.2 · gestão de clientes e cofre criptografado separado. */
(()=>{'use strict';
const KEY='carteira-meu-escritorio-v1'; // Compatibilidade: preserva os clientes cadastrados na versão Carteira.
const VAULT_KEY='clyriva-cofre-v1';
const KDF_ITERATIONS=600000;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=()=>globalThis.crypto?.randomUUID?.() || 'id'+Date.now()+Math.random().toString(36).slice(2);
const localToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const today=localToday();const currentMonth=today.slice(0,7);
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
const {brl, doc:cleanDocument, isCnpj, validCnpj} = window.ClyrivaCore;
const fmtCnpj=x=>{const c=cleanDocument(x);return isCnpj(c)?`${c.slice(0,2)}.${c.slice(2,5)}.${c.slice(5,8)}/${c.slice(8,12)}-${c.slice(12)}`:String(x??'')};
const yes=x=>x===true||['S','SIM','1','TRUE'].includes(String(x??'').trim().toUpperCase());
const isoDate=x=>{const v=String(x||'');if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;if(/^\d{2}\/\d{2}\/\d{4}$/.test(v)){const [d,m,y]=v.split('/');return `${y}-${m}-${d}`}return ''};
let cnpjLookupTimer, cnpjController, cnpjLookupSeq=0, cnpjFetchedValue='';
let filledRegistry = new Map();
const registryKeys=['name','tradeName','segment','activityCode','registryStatus','legalNature','companySize','openingDate','zipCode','address','city','uf','phone','email'];
const proxyBase = document.querySelector('meta[name="clyriva-cnpj-proxy"]')?.content;
const CNPJ_SOURCES = [
  {name:'BrasilAPI', path:'brasilapi', base:'https://brasilapi.com.br/api/cnpj/v1/'},
  {name:'CNPJ.ws', path:'cnpjws', base:'https://publica.cnpj.ws/cnpj/'}
];
function cancelCnpjLookup() {
  clearTimeout(cnpjLookupTimer);cnpjController?.abort();cnpjController=null;cnpjLookupSeq++;
  const button=$('#lookup-cnpj');if(button){button.disabled=false;button.textContent='Buscar CNPJ';}
  cnpjFetchedValue='';
}
function lookupStatus(text,kind='info') {
  const target=$('#cnpj-lookup-status');if(target){target.textContent=text;target.dataset.kind=kind;}
}
function documentChanged(input) {
  const c=cleanDocument(input.value), form=input.form;
  cancelCnpjLookup();
  if (form.dataset.lookupDoc !== c) {
    for(const [key,previous] of filledRegistry){
      const el=form.elements.namedItem(key);
      if(el && el.value===previous) el.value=key==='regime'?'Outro':'';
    }
    filledRegistry.clear();
    form.elements.cnpjLookupAt.value='';form.elements.cnpjLookupSource.value='';
    const foot=form.querySelector('.cnpj-source');if(foot)foot.textContent='Documento alterado. Consulte o CNPJ para atualizar a origem dos dados.';
  }
  if(!isCnpj(c)) return lookupStatus(c.length===11?'CPF informado. O preenchimento é manual.':'');
  if(!validCnpj(c)) return lookupStatus('CNPJ inválido. Confira os dígitos verificadores.','warn');
  lookupStatus('CNPJ válido. Consultando em instantes…');
  cnpjLookupTimer=setTimeout(()=>lookupCnpj(),450);
}
function normalizeCnpjResult(raw,source,requested) {
  const ws=source==='CNPJ.ws', est=ws?raw?.estabelecimento:raw;
  if(!est || cleanDocument(est.cnpj)!==requested || typeof raw.razao_social!=='string' || !raw.razao_social.trim()) throw Error('Resposta sem identificação correspondente ao CNPJ consultado.');
  const text=v=>typeof v==='string'||typeof v==='number'?String(v).trim():'';
  const email=text(est.email);
  return {
    name:raw.razao_social.trim(),tradeName:text(est.nome_fantasia),
    segment:text(ws?est.atividade_principal?.descricao:raw.cnae_fiscal_descricao),
    activityCode:text(ws?est.atividade_principal?.id:raw.cnae_fiscal),
    registryStatus:text(ws?est.situacao_cadastral:raw.descricao_situacao_cadastral),
    legalNature:text(ws?raw.natureza_juridica?.descricao:raw.natureza_juridica),
    companySize:text(ws?raw.porte?.descricao:raw.porte||raw.descricao_porte),
    openingDate:isoDate(est.data_inicio_atividade),zipCode:text(est.cep).replace(/\D/g,''),
    address:[est.descricao_tipo_de_logradouro||est.tipo_logradouro,est.logradouro,est.numero,est.complemento,est.bairro].map(text).filter(Boolean).join(', '),
    city:text(ws?est.cidade?.nome:raw.municipio),uf:text(ws?est.estado?.sigla:raw.uf),
    phone:ws?[est.ddd1,est.telefone1].map(text).filter(Boolean).join(' '):text(raw.ddd_telefone1),
    email:/^[^\s@;]+@[^\s@;]+\.[^\s@;]+$/.test(email)?email:'',
    regime:yes(ws?raw.simples?.mei:raw.opcao_pelo_mei)?'MEI':yes(ws?raw.simples?.simples:raw.opcao_pelo_simples)?'Simples Nacional':''
  };
}
function describeLookup(failures, c) {
  if(failures.every(x=>x.code===404)) return 'CNPJ não encontrado nas fontes consultadas.';
  if(failures.some(x=>x.code===429)) return 'Limite de consultas atingido. Aguarde antes de tentar novamente.';
  if(/[A-Z]/.test(c) && failures.some(x=>[400,422].includes(x.code))) return 'Uma das fontes ainda não aceita este CNPJ alfanumérico.';
  if(failures.some(x=>x.code===403)) return 'A fonte bloqueou a consulta.';
  return 'Consulta indisponível. '+failures.map(x=>x.name+' ('+x.reason+')').join(' · ')+'.';
}
async function lookupCnpj(force=false) {
  const form=$('#edit-form');if(!form || form.dataset.type!=='client') return;
  const input=form.elements.document, c=cleanDocument(input.value);
  if(!validCnpj(c)) return lookupStatus('Informe um CNPJ válido de 14 caracteres. CPF é preenchido manualmente.','warn');
  if(!force && c===cnpjFetchedValue) return;
  cancelCnpjLookup();
  const seq=cnpjLookupSeq, failures=[];
  const live=()=>seq===cnpjLookupSeq && form.isConnected && cleanDocument(input.value)===c;
  const button=$('#lookup-cnpj');button.disabled=true;button.textContent='Consultando…';
  const original=new Map([...registryKeys,'regime'].map(k=>[k,form.elements[k].value]));
  try {
    for(const source of CNPJ_SOURCES) {
      if(!live())return;
      lookupStatus('Consultando '+source.name+'…');
      const controller=new AbortController();cnpjController=controller;
      const timer=setTimeout(()=>controller.abort(),proxyBase?11500:8500);
      try {
        const url=proxyBase?proxyBase+source.path+'/'+c:source.base+c;
        const authHeaders={Accept:'application/json'};
        if(proxyBase){const token=await bridge?.token?.(window);if(!token)throw Error('Sessão expirada. Faça login novamente.');authHeaders.Authorization='Bearer '+token;}
        const response=await fetch(url,{headers:authHeaders,signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
        if(!response.ok) throw Object.assign(Error('HTTP '+response.status),{code:response.status});
        const raw=await response.json(), info=normalizeCnpjResult(raw,source.name,c);
        if(!live()) return;
        for(const key of [...registryKeys,'regime']) {
          const el=form.elements[key];
          const previous=original.get(key);
          if(!info[key] || el.value!==previous)continue;
          // Contatos, regime e textos informados pelo usuário têm precedência.
          if(previous && !(key==='regime'&&previous==='Outro') && filledRegistry.get(key)!==previous &&
             (!force || ['email','phone','segment','regime'].includes(key)))continue;
          el.value=info[key];filledRegistry.set(key,el.value);
        }
        form.dataset.lookupDoc=c;
        form.elements.cnpjLookupSource.value=source.name;
        const upstreamDate=response.headers.get('X-Clyriva-Consulted-At');
        form.elements.cnpjLookupAt.value=upstreamDate && !isNaN(Date.parse(upstreamDate))?upstreamDate:new Date().toISOString();
        input.value=fmtCnpj(c);cnpjFetchedValue=c;
        form.querySelector('#cnpj-extra').open=true;
        form.querySelector('.cnpj-source').textContent='Fonte: '+source.name+' · '+new Date(form.elements.cnpjLookupAt.value).toLocaleString('pt-BR');
        const duplicate=data.clients.some(x=>x.id!==form.dataset.edit && cleanDocument(x.document)===c);
        lookupStatus('Dados encontrados pela '+source.name+'. '+(duplicate?'CNPJ já cadastrado.':'Revise os campos antes de salvar.'),duplicate?'warn':'good');
        return;
      }catch(e){
        if(!live())return;
        failures.push({name:source.name,code:e.code,reason:e.name==='AbortError'?'tempo esgotado':e instanceof TypeError?'rede ou CORS':e.message});
      }finally{clearTimeout(timer);}
    }
    if(live())lookupStatus(describeLookup(failures,c)+' O cadastro manual está disponível.'+(!proxyBase?' Para usar a consulta pelo servidor, inicie o Clyriva pelo arquivo INICIAR-WINDOWS.cmd ou servidor.py.':''),'bad');
  }finally{
    if(live()){cnpjController=null;button.disabled=false;button.textContent='Buscar CNPJ';}
  }
}

const cnpjField=value=>`<div class="field wide"><label for="f-document">CPF / CNPJ (opcional)</label><div class="cnpj-lookup-row"><input id="f-document" name="document" value="${esc(value)}" placeholder="00.000.000/0000-00" autocomplete="off" maxlength="20"><button class="btn cnpj-search-btn" type="button" id="lookup-cnpj" data-action="lookup-cnpj">Buscar CNPJ</button></div><small class="help">Digite os 14 caracteres ou clique em “Buscar CNPJ”. Se a BrasilAPI falhar, o Clyriva tenta CNPJ.ws. Para CPF, preencha manualmente.</small><p id="cnpj-lookup-status" role="status" aria-live="polite" data-kind="info"></p></div>`;
const registryFields=item=>`<details class="cnpj-extra wide" id="cnpj-extra"><summary>Dados cadastrais públicos (opcionais)</summary><div class="cnpj-extra-grid">${[
field('Nome fantasia','tradeName',item?.tradeName||''),field('CNAE principal','activityCode',item?.activityCode||''),field('Situação na Receita','registryStatus',item?.registryStatus||''),field('Natureza jurídica','legalNature',item?.legalNature||''),field('Porte','companySize',item?.companySize||''),field('Data de abertura','openingDate',item?.openingDate||'',{type:'date'}),field('Endereço','address',item?.address||'',{wide:true}),field('Cidade','city',item?.city||''),field('UF','uf',item?.uf||''),field('CEP','zipCode',item?.zipCode||'')].join('')}<input type="hidden" name="cnpjLookupAt" value="${esc(item?.cnpjLookupAt||'')}"><input type="hidden" name="cnpjLookupSource" value="${esc(item?.cnpjLookupSource||'')}"></div><p class="cnpj-source">Fonte: ${esc(item?.cnpjLookupSource||'BrasilAPI / CNPJ.ws')} / dados cadastrais públicos. Última consulta: ${esc(item?.cnpjLookupAt?new Date(item.cnpjLookupAt).toLocaleString('pt-BR'):'não realizada')}. As informações podem estar desatualizadas.</p></details>`;

const {dateLabel:fmtDate, monthLabel:mon} = window.ClyrivaCore;
const ymOffset=(m,off)=>{const [y,mm]=m.split('-').map(Number);const d=new Date(y,mm-1+off,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`};
const shortMonths=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const isoMonth=ym=>shortMonths[Number(ym.slice(5,7))-1]||ym;
const core = window.ClyrivaCore;
const local = document.body.dataset.mode === 'local';
let data = core.empty(), encrypted = null, busy = false, initialized = false;
let expectedLocal = null, expectedLegacyVault = null, bridge = null;
const readVaultBlob = () => encrypted;
function unpackLocal() {
  expectedLocal = localStorage.getItem(KEY);
  const raw = expectedLocal === null ? core.empty() : JSON.parse(expectedLocal);
  const next = core.workspace(raw);
  expectedLegacyVault = localStorage.getItem(VAULT_KEY);
  const cipher = Object.hasOwn(raw,'cofreCriptografado') ? raw.cofreCriptografado : JSON.parse(expectedLegacyVault || 'null');
  encrypted = core.vault(cipher);
  data = next;
}
async function persist(nextData, nextVault) {
  if (!initialized) throw Error('O painel ainda não carregou os dados.');
  if (!local) {
    await bridge.commit(window, nextData, nextVault);
    encrypted = nextVault;
    return;
  }
  const write = () => {
    if (localStorage.getItem(KEY) !== expectedLocal ||
        localStorage.getItem(VAULT_KEY) !== expectedLegacyVault) throw Error('A carteira mudou em outra aba. Reabra a página para carregar a versão mais recente.');
    const serialized = JSON.stringify({...nextData, cofreCriptografado:nextVault});
    localStorage.setItem(KEY, serialized);
    expectedLocal = serialized;
    encrypted = nextVault;
    // O cofre legado só é removido depois da escrita atômica do novo envelope.
    if (expectedLegacyVault !== null) {
      try {localStorage.removeItem(VAULT_KEY); expectedLegacyVault = null;} catch {}
    }
  };
  if (navigator.locks) await navigator.locks.request('clyriva-local-v1', write);
  else write();
}
function setBusy(value) {
  busy = value;
  document.body.setAttribute('aria-busy', String(value));
  for (const el of document.querySelectorAll('.shell, #modal-root')) el.inert = value;
}
window.addEventListener('beforeunload', event => {
  if (busy) {event.preventDefault(); event.returnValue = '';}
});
function showStorageError(err) {
  const host = $('#panel-status');host.hidden = false;host.replaceChildren();
  const message = document.createElement('p');
  message.textContent = 'Não foi possível abrir a carteira. '+(err.message||'Armazenamento indisponível.');
  host.append(message);
  if (local) {
    const button = document.createElement('button');button.className='btn';button.textContent='Exportar conteúdo original para recuperação';
    button.onclick=()=>{try {
      download('clyriva-recuperacao.json',JSON.stringify({workspaceOriginal:localStorage.getItem(KEY),cofreOriginal:localStorage.getItem(VAULT_KEY)},null,2),'application/json');
    } catch {toast('O navegador bloqueou o acesso aos dados.',true);}};
    host.append(button);
  } else {
    const link=document.createElement('a'); link.href='index.html';link.target='_top';link.textContent='Abrir o login';host.append(link);
  }
  document.querySelector('.shell').hidden = true;
}
async function mutate(action, msg='Informações salvas.', options={}) {
  if (busy || !initialized) return false;
  setBusy(true);
  const previous=structuredClone(data), previousState={...state};
  try {
    action();
    const blob=Object.hasOwn(options,'vault') ? options.vault : encrypted;
    await persist(data,blob);
    if(Object.hasOwn(options,'vault')) forgetVault();
  } catch(err) {
    data=previous;Object.assign(state,previousState);indexesDirty=true;render();
    toast('Alteração não salva. '+(err.message||'Verifique a conexão ou o espaço disponível.'),true);
    return false;
  } finally {setBusy(false);}
  indexesDirty=true;render();toast(msg);return true;
}

const empty=core.empty;
const rotina=window.ClyrivaRotina;
let demoSession=false;
let agendaView=rotina.agendaView();
const state={page:'dashboard',month:currentMonth,client:'all',query:'',status:'all',priority:'all',detail:null,vaultClient:'all'};
const names={dashboard:'Visão geral',clients:'Meus clientes',service:'Atendimentos',vault:'Cofre de acessos',invoices:'Notas fiscais',cash:'Financeiro dos clientes',fees:'Meus honorários',taxes:'Guias e tributos',tasks:'Obrigações e pendências',reports:'Relatórios',settings:'Dados e backup',detail:'Ficha do cliente'};
const clients=()=>data.clients.filter(c=>state.client==='all'||c.id===state.client);
let indexesDirty=true;
let clientsById=new Map(), linkedReceipts=new Map(), feeIndex=new Map();
const client=id=>clientsById.get(id);
const clientName=id=>client(id)?.name||'Cliente removido';
const scope=x=>state.client==='all'||x.clientId===state.client;
const sum=core.sum;
const invoices=()=>data.invoices.filter(x=>scope(x)&&x.competence===state.month);
const cash=()=>data.cash.filter(x=>scope(x)&&String(x.date||'').slice(0,7)===state.month);
const tasks=()=>data.tasks.filter(x=>scope(x)&&x.competence===state.month);
const taxes=()=>data.taxes.filter(x=>scope(x)&&x.competence===state.month);
const feeRecord=(cid,m)=>feeIndex.get(JSON.stringify([cid,m]));
const feeExpected=(cid,m)=>feeRecord(cid,m)?.expected??(client(cid)?.status==='active'&&(!client(cid)?.start||client(cid).start.slice(0,7)<=m)?n(client(cid)?.monthlyFee):0);
const feePaid=(cid,m)=>n(feeRecord(cid,m)?.paid);
const issued=x=>x.status==='issued';
const invoiceNet=(x)=>n(x.value);
const paidToInvoice=iid=>(linkedReceipts.get(iid)||0)/100;
const openInvoice=x=>Math.max(0,core.cents(invoiceNet(x))-core.cents(paidToInvoice(x.id)))/100;
const activeClients=()=>clients().filter(c=>c.status==='active');
const priorityOrder={critical:0,high:1,medium:2,low:3};
const priorityName=p=>({critical:'Crítica',high:'Alta',medium:'Média',low:'Baixa'})[p]||'Média';
const priorityBadge=p=>`<span class="priority-pill p-${['critical','high','medium','low'].includes(p)?p:'medium'}">● ${priorityName(p)}</span>`;
const priorityVal=p=>Object.hasOwn(priorityOrder,p)?p:'medium';

function toast(message,bad=false){const t=document.createElement('div');t.className='toast'+(bad?' bad':'');t.textContent=message;$('#toast-root').append(t);setTimeout(()=>t.remove(),3900)}
const badge=(label,tone='muted')=>`<span class="mini-badge ${tone}">${esc(label)}</span>`;
const statusInvoice=s=>s==='issued'?badge('Emitida','good'):s==='canceled'?badge('Cancelada','bad'):badge('A emitir','warn');
const statusTask=s=>s==='done'?badge('Concluída','good'):s==='progress'?badge('Em andamento','info'):badge('Pendente','warn');
const feeStatus=(cid,m)=>{const expected=feeExpected(cid,m),paid=feePaid(cid,m);return expected<=0?badge('Sem cobrança','muted'):paid>=expected-0.005?badge('Recebido','good'):paid>0?badge('Parcial','warn'):badge('A receber','bad')};
const action=(label,type,entity='',klass='small')=>`<button class="btn ${klass}" data-action="${type}" data-id="${esc(entity)}">${label}</button>`;
const pageHead=(label,title,desc,buttons='')=>`<div class="page-head"><div><div class="eyebrow">${label}</div><h1>${title}</h1><p>${desc}</p></div>${buttons?`<div class="actions">${buttons}</div>`:''}</div>`;
const blank=(symbol,title,desc,buttons='')=>`<div class="empty"><div class="empty-icon">${symbol}</div><h3>${title}</h3><p>${desc}</p>${buttons}</div>`;
const panel=(title,subtitle,inside,buttons='')=>`<section class="panel"><div class="panel-head"><div><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div>${buttons}</div>${inside}</section>`;
const table=(cols,rows)=>`<div class="table-wrap"><table class="table"><thead><tr>${cols.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
const kpi=(title,value,foot,icon)=>`<article class="kpi"><div class="kpi-head"><span class="kpi-title">${title}</span><span class="kpi-icon">${icon}</span></div><div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></article>`;
const companyOptions=(selected,all=true)=>`${all?'<option value="all">Todos os clientes</option>':''}${data.clients.map(c=>`<option value="${esc(c.id)}" ${c.id===selected?'selected':''}>${esc(c.name)}</option>`).join('')}`;
const matchQuery=x=>!state.query||String(x).toLocaleLowerCase('pt-BR').includes(state.query.toLocaleLowerCase('pt-BR'));
const headerActions=(label,what)=>`<button class="btn primary" data-action="new-${what}">+ ${label}</button>`;
// Cofre local: AES-GCM autenticado, chave derivada via PBKDF2 (senha-mestra nunca persistida).
let vaultData=null,vaultCryptoKey=null,vaultSelectedClient='all',vaultIdleTimer=null;
let vaultDeadline=0;
function expireVault(){
  if(!vaultData||busy||Date.now()<vaultDeadline)return;
  forgetVault();closeModal();render();toast('Cofre bloqueado após 10 minutos de inatividade.');
}
function touchVault(){
  if(!vaultData||busy)return;
  if(vaultDeadline&&Date.now()>=vaultDeadline){expireVault();return;}
  clearTimeout(vaultIdleTimer);vaultDeadline=Date.now()+600000;
  vaultIdleTimer=setTimeout(expireVault,600000);
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)expireVault();});
function lockOnExit(){
  if(initialized && vaultData){forgetVault();closeModal();render();}
}
window.addEventListener('pagehide',lockOnExit);
window.addEventListener('pageshow',e=>{if(e.persisted)lockOnExit();});
document.addEventListener('pointerdown',touchVault);document.addEventListener('keydown',touchVault);
const bytesToB64=bytes=>btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''));
const b64ToBytes=s=>Uint8Array.from(atob(s),ch=>ch.charCodeAt(0));
const storeVaultBlob=blob=>persist(data,core.vault(blob));
const vaultExists=()=>Boolean(readVaultBlob());
const vaultAvailable=()=>Boolean(globalThis.crypto?.subtle&&globalThis.crypto?.getRandomValues);
async function deriveVaultKey(pass,salt,iterations=KDF_ITERATIONS){
  const raw=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},raw,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function encryptVault(payload,key,salt,iterations=KDF_ITERATIONS){
 const iv=crypto.getRandomValues(new Uint8Array(12));const input=new TextEncoder().encode(JSON.stringify(payload));
 const enc=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,input);
 return {version:1,alg:'AES-GCM',kdf:'PBKDF2-SHA256',iterations,salt:bytesToB64(salt),iv:bytesToB64(iv),cipher:bytesToB64(new Uint8Array(enc))};
}
async function persistVault(){
  if(!vaultCryptoKey||!vaultData)return false;
  const prior=readVaultBlob();if(!prior)return false;
  try{const fresh=await encryptVault(vaultData,vaultCryptoKey,b64ToBytes(prior.salt),prior.iterations);await storeVaultBlob(fresh);return true}
  catch(e){toast('Cofre não salvo. '+e.message,true);return false}
}
function forgetVault(){clearTimeout(vaultIdleTimer);vaultDeadline=0;vaultData=null;vaultCryptoKey=null;vaultSelectedClient='all'}
function vaultLock(){forgetVault();$('#modal-root').innerHTML='';render();toast('Cofre bloqueado.');}
async function vaultSetup(form){
 const pass=form.elements.master.value,confirm=form.elements.confirm.value;
 if(!vaultAvailable())return toast('Este navegador não suporta criptografia segura neste contexto. Abra o arquivo no Chrome ou Edge atualizado.',true);
 if(vaultExists())return toast('Já existe um cofre. Desbloqueie-o.',true);
 if(pass.length<12)return toast('A senha-mestra precisa ter ao menos 12 caracteres.',true);
 if(pass!==confirm)return toast('A confirmação da senha-mestra é diferente.',true);
 const btn=form.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Criando cofre…';
 try{const salt=crypto.getRandomValues(new Uint8Array(16));const key=await deriveVaultKey(pass,salt);const payload={version:1,access:[]};const stored=await encryptVault(payload,key,salt);await storeVaultBlob(stored);vaultCryptoKey=key;vaultData=payload;touchVault();render();toast('Cofre criado e desbloqueado. Guarde a senha-mestra: ela não pode ser recuperada.')}
 catch(e){toast('Cofre não salvo. '+e.message,true);btn.disabled=false;btn.textContent='Criar cofre'}
}
async function vaultUnlock(form){
 const blob=readVaultBlob();if(!blob)return toast('Cofre indisponível ou com estrutura inválida.',true);
 if(!vaultAvailable())return toast('Web Crypto indisponível neste navegador.',true);
 const btn=form.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Desbloqueando…';
 try{const salt=b64ToBytes(blob.salt);const key=await deriveVaultKey(form.elements.master.value,salt,blob.iterations);const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64ToBytes(blob.iv)},key,b64ToBytes(blob.cipher));const obj=JSON.parse(new TextDecoder().decode(plain));if(obj.version!==1 || !Array.isArray(obj.access) || obj.access.some(a=>!a || typeof a.id!=='string' || typeof a.clientId!=='string' || typeof a.label!=='string') || new Set(obj.access.map(a=>a.id)).size!==obj.access.length)throw Error('Formato inválido');vaultData=obj;vaultCryptoKey=key;touchVault();render();toast('Cofre desbloqueado.')}
 catch{toast('Senha-mestra incorreta ou dados do cofre corrompidos.',true);btn.disabled=false;btn.textContent='Desbloquear'}
}
async function vaultChangeMaster(form){
 if(!vaultData||!vaultCryptoKey)return toast('Desbloqueie o cofre.',true);
 const p=form.elements.master.value,c=form.elements.confirm.value;
 if(p.length<12)return toast('Use pelo menos 12 caracteres na nova senha.',true);
 if(p!==c)return toast('A confirmação não corresponde à nova senha.',true);
 try{const salt=crypto.getRandomValues(new Uint8Array(16));const k=await deriveVaultKey(p,salt);const blob=await encryptVault(vaultData,k,salt);await storeVaultBlob(blob);vaultCryptoKey=k;closeModal();touchVault();render();toast('Senha-mestra atualizada. Use a nova senha para desbloquear.')}
 catch(e){toast('Senha-mestra não alterada. '+e.message,true)}
}
function vaultPage(){
 const head=pageHead('ACESSOS PARTICULARES','Cofre de acessos','Logins, senhas e dados de portais vinculados a cada cliente. Protegidos pela sua senha-mestra.');
 if(!vaultAvailable())return head+`<div class="notice danger">Criptografia não disponível neste contexto. Utilize um navegador atualizado em ambiente seguro. Não digite senhas aqui.</div>`;
 if(!vaultExists())return head+`<div class="vault-hero"><div class="vault-illustration">♙</div><h2>Configure seu cofre privado</h2><p>Crie uma senha-mestra de 12 caracteres ou mais. Ela protege os acessos de seus clientes e não é armazenada pelo sistema.</p><form id="vault-setup-form" class="vault-unlock-form"><label>Senha-mestra<input type="password" name="master" autocomplete="new-password" minlength="12" required placeholder="Crie sua senha-mestra"></label><label>Confirmar senha-mestra<input type="password" name="confirm" autocomplete="new-password" minlength="12" required placeholder="Repita a senha-mestra"></label><button class="btn primary" type="submit">Criar cofre protegido</button></form><p class="caption">Atenção: se esquecer a senha-mestra, não há recuperação dos acessos. Faça backup JSON e guarde-o em local seguro.</p></div>`;
 if(!vaultData)return head+`<div class="vault-hero"><div class="vault-illustration">♙</div><h2>Cofre bloqueado</h2><p>Somente a senha-mestra permite descriptografar os acessos. Ela não é transmitida para servidores.</p><form id="vault-unlock-form" class="vault-unlock-form"><label>Senha-mestra<input type="password" name="master" autocomplete="current-password" required autofocus placeholder="Digite sua senha-mestra"></label><button class="btn primary" type="submit">Desbloquear cofre</button></form><p class="caption">Sem recuperação de senha-mestra. Não coloque credenciais no campo de anotações públicas do cliente.</p></div>`;
 const matches=vaultData.access.filter(a=>vaultSelectedClient==='all'||a.clientId===vaultSelectedClient).sort((a,b)=>clientName(a.clientId).localeCompare(clientName(b.clientId))||a.label.localeCompare(b.label));
 return head+`<div class="vault-toolbar"><span class="vault-ok">● Cofre desbloqueado · ${vaultData.access.length} acesso(s) criptografado(s)</span><div class="toolbar-group"><select class="select" id="vault-client-filter">${companyOptions(vaultSelectedClient,true)}</select>${action('Adicionar acesso','vault-new','','small primary')}${action('Bloquear','vault-lock','','small')}</div></div>`+
 `<section class="panel vault-records">${matches.length?table(['Cliente / Serviço','E-mail ou login','Endereço','Ações'],matches.map(a=>`<tr><td><strong>${esc(clientName(a.clientId))}</strong><small>${esc(a.label)}</small></td><td>${esc(a.username||'—')}</td><td>${a.site?`<span class="muted-link">${esc(a.site)}</span>`:'—'}</td><td class="vault-action-cell">${action('Ver / editar','vault-edit',a.id,'small')}${action('Excluir','vault-delete',a.id,'small danger')}</td></tr>`).join('')):blank('♙','Nenhum acesso cadastrado','Cadastre o primeiro login e senha para um dos seus clientes.',action('Adicionar acesso','vault-new','','small primary'))}</section>`+
 `<section class="panel vault-help"><div class="panel-body"><strong>Proteção dos acessos</strong><p>As senhas são criptografadas com AES-GCM antes de serem salvas. A edição local guarda o cofre neste navegador. No painel online, somente o conteúdo cifrado é sincronizado. A senha-mestra permanece apenas na memória enquanto o cofre está desbloqueado. Ele é bloqueado ao fechar ou recarregar a página ou após 10 minutos de inatividade.</p><p>O backup JSON inclui o cofre criptografado; seus outros dados (nome, e-mails de contato, faturamento, observações) não são criptografados. Guarde o backup em local protegido.</p><button class="btn" data-action="vault-change">Alterar senha-mestra</button></div></section>`;
}
function vaultEntryModal(editId=''){
 if(!vaultData)return toast('Desbloqueie o cofre antes de continuar.',true);
 if(!data.clients.length)return toast('Cadastre um cliente antes de guardar acessos.',true);
 const a=vaultData.access.find(x=>x.id===editId);const cid=a?.clientId||(vaultSelectedClient!=='all'?vaultSelectedClient:data.clients[0].id);
 $('#modal-root').innerHTML=`<div class="modal-backdrop" id="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><h2 id="modal-title">${a?'Editar acesso':'Novo acesso protegido'}</h2><p>E-mail/login, senha, portal e notas serão guardados no cofre criptografado.</p></div><button class="modal-close" type="button" data-action="close-modal">×</button></div><form id="vault-entry-form" data-edit="${esc(a?.id||'')}"><div class="modal-fields">${field('Cliente','clientId',cid,{options:clientOpts(cid),required:true,wide:true})}${field('Serviço / Portal','label',a?.label||'',{required:true,placeholder:'Ex.: Portal NFS-e, e-CAC, Conta Google'})}${field('E-mail / usuário de login','username',a?.username||'',{placeholder:'login@empresa.com'})}${field('Endereço do portal (URL)','site',a?.site||'',{wide:true,placeholder:'https://...'})}<div class="field wide"><label for="vault-password">Senha do portal</label><div class="secret-input"><input id="vault-password" type="password" name="password" value="${esc(a?.password||'')}" autocomplete="off" spellcheck="false" placeholder="Senha guardada no cofre"><button type="button" class="btn" data-action="vault-toggle">Mostrar</button></div></div>${field('Observações do acesso (protegidas)','notes',a?.notes||'',{area:true,wide:true})}</div><div class="modal-foot"><button type="button" class="btn" data-action="close-modal">Cancelar</button><button type="submit" class="btn primary">Salvar no cofre</button></div></form></div></div>`;
 $('#vault-entry-form [name=label]')?.focus();
}
async function vaultEntrySave(form){
 if(!vaultData)return;
 const v=Object.fromEntries(new FormData(form).entries());if(!client(v.clientId))return toast('Selecione um cliente válido.',true);
 if(!v.label.trim())return toast('Informe o portal ou serviço.',true);
 const old=vaultData.access.find(x=>x.id===form.dataset.edit);const item={...v,label:v.label.trim(),id:old?.id||id()};
 const previous=JSON.stringify(vaultData);if(old)Object.assign(old,item);else vaultData.access.push(item);
 if(!(await persistVault())){vaultData=JSON.parse(previous);return}
 closeModal();touchVault();render();toast('Acesso salvo no cofre criptografado.');
}
async function vaultDelete(accessId){
 if(!vaultData)return;const item=vaultData.access.find(x=>x.id===accessId);if(!item)return;
 if(!window.confirm(`Excluir permanentemente o acesso ${item.label} de ${clientName(item.clientId)}?`))return;
 const prev=JSON.stringify(vaultData);vaultData.access=vaultData.access.filter(x=>x.id!==accessId);
 if(!(await persistVault())){vaultData=JSON.parse(prev);return}render();toast('Acesso excluído.');
}
function vaultChangeModal(){
 if(!vaultData)return;
 $('#modal-root').innerHTML=`<div class="modal-backdrop" id="modal-backdrop"><div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h2>Alterar senha-mestra</h2><p>O cofre será criptografado novamente com a nova senha.</p></div><button class="modal-close" type="button" data-action="close-modal">×</button></div><form id="vault-change-form"><div class="modal-fields">${field('Nova senha-mestra','master','',{type:'password',required:true,wide:true})}${field('Confirme a nova senha-mestra','confirm','',{type:'password',required:true,wide:true})}</div><div class="modal-foot"><button type="button" class="btn" data-action="close-modal">Cancelar</button><button type="submit" class="btn primary">Atualizar senha-mestra</button></div></form></div></div>`;
}

let clientOptionsDirty=true;
function updateNav(){document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('on',el.dataset.page===state.page));$('#breadcrumb').textContent=names[state.page];$('#month').value=state.month;if(clientOptionsDirty){$('#client-filter').innerHTML=companyOptions(state.client,true);clientOptionsDirty=false;}$('#client-filter').value=state.client}
function go(page){closeModal();state.page=page;state.query='';state.status='all';state.priority='all';state.detail=null;$('#side').classList.remove('open');$('#scrim')?.remove();render();window.scrollTo(0,0)}
function render(){
  rotina.closeSummary();
  if(indexesDirty){indexesDirty=false;clientOptionsDirty=true;
  clientsById=new Map(data.clients.map(c=>[c.id,c]));
  feeIndex=new Map(data.fees.map(f=>[JSON.stringify([f.clientId,f.competence]),f]));
  const invoiceOwners=new Map(data.invoices.map(i=>[i.id,i.clientId]));
  linkedReceipts=new Map();
  for(const r of data.cash)if(r.kind==='receipt' && r.invoiceId && invoiceOwners.get(r.invoiceId)===r.clientId){
    linkedReceipts.set(r.invoiceId,(linkedReceipts.get(r.invoiceId)||0)+core.cents(r.value));
  }
  }
  updateNav();const routes={dashboard:dashboardPage,clients:clientsPage,service:servicePage,vault:vaultPage,invoices:invoicesPage,cash:cashPage,fees:feesPage,taxes:taxesPage,tasks:tasksPage,reports:reportsPage,settings:settingsPage,detail:detailPage};$('#page').innerHTML=(routes[state.page]||dashboardPage)();
  const agenda=$('#agenda-vencimentos');
  if(agenda)rotina.mountAgenda(agenda,{
    taxes:data.taxes.filter(scope), tasks:data.tasks.filter(scope), companyName:clientName,
    onAction(type,id){
      if(busy)return;
      if(type==='tax')openModal('tax',id,{status:'paid'});
      else handleAction('complete-task',{dataset:{id}});
    }
  },agendaView);
}
function openClientSummary(id) {
  const c=client(id);if(!c)return;
  const inMonth=x=>x.clientId===id && x.competence===state.month;
  const info={
    client:{name:c.name,tradeName:c.tradeName},
    invoices:data.invoices.filter(inMonth).map(x=>({status:x.status,competence:x.competence,value:x.value,paid:paidToInvoice(x.id)})),
    taxes:data.taxes.filter(inMonth).map(x=>({kind:x.kind,value:x.value,status:x.status,competence:x.competence,dueDate:x.dueDate})),
    tasks:data.tasks.filter(inMonth).map(x=>({title:x.title,status:x.status,competence:x.competence,dueDate:x.dueDate}))
  };
  rotina.showSummary(info,state.month,{demo:demoSession});
}
function totals(){const inv=invoices().filter(issued),faturamento=sum(inv,x=>x.value),rc=cash().filter(x=>x.kind==='receipt'),cp=cash().filter(x=>x.kind==='expense'),open=sum(inv,openInvoice),pending=tasks().filter(t=>t.status!=='done');const expected=sum(clients(),c=>feeExpected(c.id,state.month));const paid=sum(clients(),c=>feePaid(c.id,state.month));return {invs:inv,faturamento,rc,cp,received:sum(rc,x=>x.value),spent:sum(cp,x=>x.value),open,pending,expected,paid}}
function chartMonths(){const months=Array.from({length:6},(_,i)=>ymOffset(state.month,i-5));const vals=months.map(m=>sum(data.invoices.filter(x=>scope(x)&&x.competence===m&&issued(x)),x=>x.value));const mx=Math.max(1,...vals);return `<div class="chart"><div class="chart-grid"><span></span><span></span><span></span><span></span></div>${months.map((m,i)=>`<div class="chart-col"><div class="chart-bar" style="height:${Math.max(1,vals[i]/mx*100)}%"><span class="bar-tip">${brl(vals[i])}</span></div><label>${isoMonth(m)}</label></div>`).join('')}</div><div class="chart-legend"><span class="legend-dot"></span> Valor das NFs emitidas, por competência</div>`}

function portfolioFocus(){
 const upcomingCutoff=(()=>{const d=new Date(today+'T12:00:00');d.setDate(d.getDate()+7);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})();
 const filteredTasks=data.tasks.filter(scope),filteredTaxes=data.taxes.filter(scope);
 const late=[...filteredTasks.filter(t=>t.status!=='done'&&t.dueDate<today),...filteredTaxes.filter(t=>t.status!=='paid'&&t.dueDate<today)];
 const soon=[...filteredTasks.filter(t=>t.status!=='done'&&t.dueDate>=today&&t.dueDate<=upcomingCutoff),...filteredTaxes.filter(t=>t.status!=='paid'&&t.dueDate>=today&&t.dueDate<=upcomingCutoff)];
 const service=filteredTasks.filter(t=>t.category==='Atendimento'&&t.status!=='done');
 return `<section class="portfolio-focus" aria-label="Prioridades da carteira"><div class="focus-heading"><div><h2>O que merece sua atenção</h2><p>Visão de toda a carteira, mesmo fora da competência selecionada.</p></div><button class="btn small" data-action="go-service">Abrir atendimentos</button></div>
 <div class="focus-metrics"><button class="focus-metric urgent" data-action="go-tasks"><span class="count">${late.length}</span><span class="meta"><strong>Vencimentos atrasados</strong>Guias e tarefas ainda abertas</span></button>
 <button class="focus-metric today" data-action="go-tasks"><span class="count">${soon.length}</span><span class="meta"><strong>Próximos 7 dias</strong>Prazos da carteira inteira</span></button>
 <button class="focus-metric" data-action="go-service"><span class="count">${service.length}</span><span class="meta"><strong>Atendimentos abertos</strong>Pedidos aguardando retorno</span></button></div>
 <div class="focus-bottom"><p>${late.length?'Priorize os vencimentos em atraso antes de iniciar novas rotinas.':'Nenhum vencimento atrasado cadastrado. Continue acompanhando as próximas entregas.'}</p><button class="btn plain" data-action="new-service">+ Registrar solicitação</button></div></section>`;
}
function servicePage(){
 const list=data.tasks.filter(t=>scope(t)&&t.category==='Atendimento'&&matchQuery([t.title,t.notes,clientName(t.clientId),t.competence].join(' '))&&(state.status==='all'||t.status===state.status))
   .sort((a,b)=> (a.status==='done'?1:0)-(b.status==='done'?1:0)||String(b.dueDate||'').localeCompare(String(a.dueDate||'')));
 const total=data.tasks.filter(t=>scope(t)&&t.category==='Atendimento');
 const unfinished=total.filter(t=>t.status!=='done');
 const overdue=unfinished.filter(t=>t.dueDate<today);
 const done=total.filter(t=>t.status==='done');
 return pageHead('RELACIONAMENTO COM CLIENTES','Atendimentos','Registre o que cada cliente pediu, organize retornos e mantenha um histórico das entregas.',`<button class="btn primary" data-action="new-service">+ Nova solicitação</button>`)+
 `<div class="attention-inline"><strong>Atendimento direto:</strong> seus clientes não acessam o Clyriva. Aqui você registra solicitações e envia as informações pelo canal de sua preferência. Os dados ficam na sua carteira privada.</div>`+
 `<div class="service-board"><article class="service-card"><div class="service-label">Solicitações em aberto</div><div class="service-number">${unfinished.length}</div>${badge('Aguardando acompanhamento',unfinished.length?'warn':'good')}</article><article class="service-card"><div class="service-label">Retornos atrasados</div><div class="service-number">${overdue.length}</div>${badge('Com prazo vencido',overdue.length?'bad':'good')}</article><article class="service-card"><div class="service-label">Atendimentos concluídos</div><div class="service-number">${done.length}</div>${badge('Histórico preservado','good')}</article></div>`+
 `<div class="toolbar"><div class="toolbar-group"><label class="search"><span>⌕</span><input id="search" placeholder="Pesquisar cliente ou solicitação..." value="${esc(state.query)}"></label><select id="status-filter" class="select"><option value="all" ${state.status==='all'?'selected':''}>Todas as situações</option><option value="pending" ${state.status==='pending'?'selected':''}>Pendente</option><option value="progress" ${state.status==='progress'?'selected':''}>Em andamento</option><option value="done" ${state.status==='done'?'selected':''}>Concluído</option></select></div><span class="caption">${list.length} registro(s) encontrado(s), em qualquer mês</span></div>`+
 `<section class="panel">${list.length?table(['Cliente','Solicitação / resposta','Prazo','Situação','Ações'],list.map(t=>`<tr><td><strong>${esc(clientName(t.clientId))}</strong><small>${mon(t.competence)}</small></td><td><strong>${esc(t.title)}</strong><small>${esc(t.notes||'Sem observações')}</small></td><td class="nobr">${fmtDate(t.dueDate)}${t.dueDate<today&&t.status!=='done'?'<small style="color:#b3394b">Atrasado</small>':''}</td><td>${statusTask(t.status)}</td><td><div class="table-actions">${action('Copiar resumo','copy-service',t.id)}${t.status!=='done'?action('Concluir','complete-task',t.id):''}${action('Editar','edit-task',t.id)}</div></td></tr>`).join('')):blank('✓','Nenhum atendimento encontrado','Registre uma solicitação do cliente e acompanhe o retorno.',`<button class="btn primary" data-action="new-service">Criar atendimento</button>`)}</section>`;
}
async function copyService(id){
 const t=data.tasks.find(x=>x.id===id&&x.category==='Atendimento');if(!t)return toast('Solicitação não localizada.',true);
 const text=`Clyriva · Registro de atendimento\nCliente: ${clientName(t.clientId)}\nAssunto: ${t.title}\nPrazo: ${fmtDate(t.dueDate)}\nSituação: ${t.status==='done'?'Concluído':t.status==='progress'?'Em andamento':'Pendente'}${t.notes?'\nObservações: '+t.notes:''}`;
 try{await navigator.clipboard.writeText(text);toast('Resumo copiado. Revise antes de enviar ao cliente.')}catch{toast('Não foi possível copiar. Verifique a permissão da área de transferência.',true)}
}
async function copyClientBrief(id){
 const c=client(id);if(!c)return toast('Cliente não encontrado.',true);
 const pending=data.tasks.filter(t=>t.clientId===id&&t.status!=='done');
 const tax=data.taxes.filter(t=>t.clientId===id&&t.status!=='paid');
 const text=`Resumo gerencial · ${c.name}\nCompetência: ${mon(state.month)}\nRegime: ${c.regime||'Não informado'}\nHonorários recebidos: ${brl(feePaid(id,state.month))}\nHonorários previstos: ${brl(feeExpected(id,state.month))}\nPendências abertas: ${pending.length}\nGuias em aberto: ${tax.length}\n\nInformações de controle interno, sujeitas à conferência antes do envio.`;
 try{await navigator.clipboard.writeText(text);toast('Resumo copiado. Confira os dados antes de compartilhar.')}catch{toast('Não foi possível copiar o resumo.',true)}
}
function dashboardPage(){const t=totals(),cli=activeClients(),latest=invoices().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,5),pending=t.pending.slice().sort((a,b)=>String(a.dueDate||'').localeCompare(String(b.dueDate||''))).slice(0,5);return pageHead('PAINEL DE CONTROLE','Sua gestão, em perspectiva','Acompanhe clientes, faturamento fiscal, pagamentos e obrigações em um só lugar.',headerActions('Novo cliente','client')+headerActions('Nova nota fiscal','invoice')+(state.client==='all'?'':action('Resumo do mês','resumo-cliente',state.client)))+
`<section class="kpis">${kpi('Clientes ativos',cli.length,'Na sua carteira atual','♧')}${kpi('Faturamento fiscal',brl(t.faturamento),`${t.invs.length} nota(s) emitida(s) em ${mon(state.month)}`,'▧')}${kpi('Recebido pelos clientes',brl(t.received),'Entradas financeiras lançadas no mês','↙')}${kpi('Meus honorários',brl(t.paid),`de ${brl(t.expected)} previstos`,'◈')}</section>`+
`${!data.clients.length?`<div class="summary-strip"><div><strong>Comece cadastrando seu primeiro cliente</strong><p>Depois registre as notas, recebimentos, despesas e obrigações para formar seus indicadores.</p></div>${headerActions('Cadastrar cliente','client')}</div>`:''}`+
`${portfolioFocus()}`+
`${data.clients.length?'<section id="agenda-vencimentos"></section>':''}`+
`<div class="priority-overview"><strong>Carteira prioritária</strong><span>${cli.filter(c=>['critical','high'].includes(priorityVal(c.priority))).length} cliente(s) em prioridade crítica ou alta</span><button class="btn small" data-action="go-clients">Organizar clientes →</button></div>`+
`<div class="grid-main">${panel('Evolução do faturamento','NFs emitidas nos últimos 6 meses',`<div class="panel-body">${chartMonths()}</div>`,`<button class="btn plain" data-action="go-reports">Ver relatórios ↗</button>`)}${panel('Próximas pendências',`${t.pending.length} atividades abertas em ${mon(state.month)}`,pending.length?`<div class="mini-list">${pending.map(x=>`<div class="mini-row"><div class="first"><div class="mini-icon">☐</div><div><strong title="${esc(x.title)}">${esc(x.title)}</strong><small>${esc(clientName(x.clientId))} · ${fmtDate(x.dueDate)}</small></div></div>${x.status!=='done'&&x.dueDate<today?badge('Atrasada','bad'):statusTask(x.status)}</div>`).join('')}</div>`:blank('✓','Tudo em dia por aqui','Nenhuma obrigação pendente cadastrada para o mês.'),`<button class="btn plain" data-action="go-tasks">Ver tarefas ↗</button>`)}</div>`+
`<div class="grid-main">${panel('Notas fiscais recentes','Visão por competência',latest.length?table(['Cliente / Nota','Emissão','Valor','Situação'],latest.map(x=>`<tr><td><strong>${esc(clientName(x.clientId))}</strong><small>NF ${esc(x.number||'Sem número')}</small></td><td class="nobr">${fmtDate(x.date)}</td><td class="money">${brl(x.value)}</td><td>${statusInvoice(x.status)}</td></tr>`).join('')):blank('▧','Nenhuma NF cadastrada','Registre uma nota fiscal para acompanhar o faturamento.'))}${panel('Indicadores financeiros',`Movimentação em ${mon(state.month)}`,`<div class="panel-body"><div class="detail-item"><span>NFs emitidas</span><strong>${brl(t.faturamento)}</strong></div><div class="detail-item"><span>Valor das NFs ainda em aberto*</span><strong>${brl(t.open)}</strong></div><div class="detail-item"><span>Entradas registradas</span><strong>${brl(t.received)}</strong></div><div class="detail-item"><span>Saídas registradas</span><strong>${brl(t.spent)}</strong></div><div class="detail-item"><span>Saldo de caixa do mês</span><strong>${brl(t.received-t.spent)}</strong></div><p class="caption mt18">* Valores em aberto consideram todos os recebimentos vinculados a cada NF, mesmo os ocorridos em outros meses.</p></div>`)}</div>`}
function clientsPage(){const filtered=clients().filter(c=>matchQuery([c.name,c.document,c.regime,c.segment,c.email,c.contactName].join(' '))&&(state.status==='all'||c.status===state.status)&&(state.priority==='all'||priorityVal(c.priority)===state.priority)).sort((a,b)=>priorityOrder[priorityVal(a.priority)]-priorityOrder[priorityVal(b.priority)]||a.name.localeCompare(b.name,'pt-BR'));return pageHead('CARTEIRA DE CLIENTES','Meus clientes','Cadastros, perfis, faturamento fiscal, honorários e situação de cada cliente.',headerActions('Adicionar cliente','client'))+
`<div class="toolbar"><div class="toolbar-group"><label class="search"><span>⌕</span><input id="search" placeholder="Buscar nome, CNPJ, setor..." value="${esc(state.query)}"></label><select id="status-filter" class="select"><option value="all" ${state.status==='all'?'selected':''}>Todos os status</option><option value="active" ${state.status==='active'?'selected':''}>Ativos</option><option value="inactive" ${state.status==='inactive'?'selected':''}>Inativos</option></select><select id="priority-filter" class="select"><option value="all" ${state.priority==='all'?'selected':''}>Todas as prioridades</option>${[['critical','Crítica'],['high','Alta'],['medium','Média'],['low','Baixa']].map(([v,l])=>`<option value="${v}" ${state.priority===v?'selected':''}>${l}</option>`).join('')}</select></div><span class="caption">${filtered.length} cliente(s) encontrado(s)</span></div>`+
(filtered.length?`<div class="client-grid">${filtered.map(c=>{const billed=sum(data.invoices.filter(x=>x.clientId===c.id&&x.competence===state.month&&issued(x)),x=>x.value);const p=feePaid(c.id,state.month);const ex=feeExpected(c.id,state.month);return `<article class="client-card"><div class="client-row"><div class="client-avatar">${esc(c.name.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase())}</div><div class="priority-badges">${priorityBadge(priorityVal(c.priority))}${badge(c.status==='active'?'Ativo':'Inativo',c.status==='active'?'good':'muted')}</div></div><h3 title="${esc(c.name)}">${esc(c.name)}</h3><p>${esc(c.regime||'Regime não informado')} · ${esc(c.segment||'Segmento não informado')}</p><div class="facts"><div><span>Faturamento fiscal · ${mon(state.month)}</span><strong>${brl(billed)}</strong></div><div><span>Honorários mensais</span><strong>${brl(ex)}</strong></div></div><div style="display:flex;justify-content:space-between;margin-top:12px;gap:10px"><span class="caption">Honorários recebidos: ${brl(p)}</span>${feeStatus(c.id,state.month)}</div><div class="card-actions">${action('Ver ficha','view-client',c.id,'small primary')}${action('Editar','edit-client',c.id,'small')}${action('Excluir','delete-client',c.id,'small danger')}</div></article>`}).join('')}</div>`:blank('♧','Nenhum cliente encontrado','Cadastre um novo cliente ou limpe os filtros.',headerActions('Novo cliente','client')))}
function invoicesPage(){const list=invoices().filter(x=>matchQuery([x.number,clientName(x.clientId),x.description].join(' '))&&(state.status==='all'||x.status===state.status)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));const issuedOnly=invoices().filter(issued);return pageHead('DOCUMENTOS FISCAIS','Notas fiscais','Controle o que foi emitido, cancelado e o que ainda precisa de emissão.',headerActions('Registrar NF','invoice'))+
`<div class="kpis">${kpi('NFs emitidas',issuedOnly.length,'No período selecionado','▧')}${kpi('Faturamento fiscal',brl(sum(issuedOnly,x=>x.value)),'Somente notas emitidas','↗')}${kpi('A emitir',invoices().filter(x=>x.status==='pending').length,'Notas planejadas ou pendentes','◷')}${kpi('Saldo aberto de NFs',brl(sum(issuedOnly,openInvoice)),'Após recebimentos vinculados','◈')}</div>`+
`<div class="toolbar"><div class="toolbar-group"><label class="search"><span>⌕</span><input id="search" placeholder="Buscar nota, cliente..." value="${esc(state.query)}"></label><select id="status-filter" class="select"><option value="all">Todos os status</option><option value="issued" ${state.status==='issued'?'selected':''}>Emitidas</option><option value="pending" ${state.status==='pending'?'selected':''}>A emitir</option><option value="canceled" ${state.status==='canceled'?'selected':''}>Canceladas</option></select></div></div>`+
`<section class="panel">${list.length?table(['Cliente / Documento','Emissão / Competência','Valor','Recebido','Em aberto','Situação','Ações'],list.map(x=>`<tr><td><strong>${esc(clientName(x.clientId))}</strong><small>NF ${esc(x.number||'Sem número')} · ${esc(x.description||'Sem descrição')}</small></td><td class="nobr">${fmtDate(x.date)}<small>${mon(x.competence)}</small></td><td class="money">${brl(x.value)}</td><td class="money good">${brl(paidToInvoice(x.id))}</td><td class="money">${x.status==='issued'?brl(openInvoice(x)):'—'}</td><td>${statusInvoice(x.status)}</td><td><div class="table-actions">${x.status==='issued'?action('Receber','new-receipt-for',x.id):''}${action('Editar','edit-invoice',x.id)}${action('Excluir','delete-invoice',x.id,'small danger')}</div></td></tr>`).join('')):blank('▧','Nenhuma nota nesta competência','Comece cadastrando uma NF emitida ou prevista.',headerActions('Registrar nota','invoice'))}</section>`+
`<p class="caption mt18">As notas são registros de controle: o site não emite NFS-e nem consulta automaticamente prefeituras ou o sistema nacional.</p>`}
function cashPage(){const list=cash().filter(x=>matchQuery([clientName(x.clientId),x.category,x.notes].join(' '))&&(state.status==='all'||x.kind===state.status)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));const entries=cash().filter(x=>x.kind==='receipt'),exits=cash().filter(x=>x.kind==='expense');return pageHead('FLUXO DE CAIXA','Financeiro dos clientes','Entradas e saídas informadas por cliente, independentemente de quando a nota foi emitida.',headerActions('Registrar movimentação','cash'))+
`<section class="kpis">${kpi('Recebimentos',brl(sum(entries,x=>x.value)),`${entries.length} entrada(s) no mês`,'↙')}${kpi('Despesas',brl(sum(exits,x=>x.value)),`${exits.length} saída(s) no mês`,'↗')}${kpi('Saldo de caixa',brl(sum(entries,x=>x.value)-sum(exits,x=>x.value)),'Entradas menos saídas','▤')}${kpi('NFs com saldo em aberto',invoices().filter(x=>issued(x)&&openInvoice(x)>.005).length,'Notas da competência selecionada','◷')}</section>`+
`<div class="toolbar"><div class="toolbar-group"><label class="search"><span>⌕</span><input id="search" placeholder="Buscar movimentações..." value="${esc(state.query)}"></label><select id="status-filter" class="select"><option value="all">Entradas e saídas</option><option value="receipt" ${state.status==='receipt'?'selected':''}>Recebimentos</option><option value="expense" ${state.status==='expense'?'selected':''}>Despesas</option></select></div></div>`+
`<section class="panel">${list.length?table(['Data','Cliente','Descrição','Nota vinculada','Tipo','Valor','Ações'],list.map(x=>{const inv=data.invoices.find(i=>i.id===x.invoiceId);return `<tr><td class="nobr">${fmtDate(x.date)}</td><td><strong>${esc(clientName(x.clientId))}</strong></td><td>${esc(x.category||'Não informada')}<small>${esc(x.notes||'')}</small></td><td>${inv?`NF ${esc(inv.number||'s/n')}`:'—'}</td><td>${x.kind==='receipt'?badge('Entrada','good'):badge('Saída','bad')}</td><td class="money ${x.kind==='receipt'?'good':'bad'}">${x.kind==='receipt'?'+':'−'} ${brl(x.value)}</td><td><div class="table-actions">${action('Editar','edit-cash',x.id)}${action('Excluir','delete-cash',x.id,'small danger')}</div></td></tr>`}).join('')):blank('⇄','Sem lançamentos no mês','Registre recebimentos e despesas para acompanhar o caixa.',headerActions('Novo lançamento','cash'))}</section>`+
`<p class="caption mt18">Faturamento (NF emitida) e recebimento (dinheiro recebido) são indicadores diferentes. O lançamento financeiro não altera o valor faturado e não duplica a NF.</p>`}
function feesPage(){const rows=clients().filter(c=>c.status==='active'||feeRecord(c.id,state.month));const expected=sum(rows,c=>feeExpected(c.id,state.month)),paid=sum(rows,c=>feePaid(c.id,state.month));return pageHead('GESTÃO FINANCEIRA','Meus honorários','Acompanhe quanto você deve cobrar e quanto cada cliente já pagou.',headerActions('Lançar honorários','fee'))+
`<section class="kpis">${kpi('Honorários previstos',brl(expected),'Cobranças desta competência','◈')}${kpi('Honorários recebidos',brl(paid),'Pagamentos informados','↙')}${kpi('Total a receber',brl(Math.max(0,expected-paid)),'Saldo de honorários pendente','◷')}${kpi('Clientes em atraso / aberto',rows.filter(c=>feeExpected(c.id,state.month)>feePaid(c.id,state.month)+.005).length,'Ainda sem quitação integral','♧')}</section>`+
`<div class="notice blue">Este painel controla <strong>seus honorários</strong>, que são separados do faturamento e das contas bancárias dos clientes. A situação é baseada nos valores lançados manualmente.</div>`+
`<section class="panel">${rows.length?table(['Cliente','Honorários previstos','Recebido','Saldo','Competência','Situação','Ações'],rows.map(c=>{const a=feeExpected(c.id,state.month),p=feePaid(c.id,state.month);return `<tr><td><strong>${esc(c.name)}</strong><small>${esc(c.regime||'Regime não informado')}</small></td><td class="money">${brl(a)}</td><td class="money good">${brl(p)}</td><td class="money ${a>p?'bad':''}">${brl(Math.max(0,a-p))}</td><td>${mon(state.month)}</td><td>${feeStatus(c.id,state.month)}</td><td>${action('Registrar','fee-for',c.id)}</td></tr>`}).join('')):blank('◈','Nenhuma cobrança cadastrada','Cadastre clientes e informe o valor mensal dos seus honorários.',headerActions('Cadastrar cliente','client'))}</section>`+
`<p class="caption mt18">O valor previsto usa os honorários atuais do cadastro, salvo quando você registra um valor específico para a competência. Para conservar o histórico, registre cada competência mensalmente.</p>`}
function taxesPage(){const list=taxes().filter(x=>matchQuery([x.kind,x.ref,clientName(x.clientId),x.notes].join(' '))&&(state.status==='all'||x.status===state.status)).sort((a,b)=>String(a.dueDate||'').localeCompare(String(b.dueDate||'')));const due=taxes().filter(x=>x.status!=='paid');return pageHead('TRIBUTOS E OBRIGAÇÕES','Guias e tributos','Acompanhe valores, vencimentos e pagamentos registrados manualmente.',headerActions('Cadastrar guia','tax'))+
`<section class="kpis">${kpi('Guias lançadas',taxes().length,'Nesta competência','▣')}${kpi('Valor total',brl(sum(taxes(),x=>x.value)),'Guias registradas','▤')}${kpi('Valor pago',brl(sum(taxes().filter(x=>x.status==='paid'),x=>x.value)),'Pagamentos confirmados manualmente','✓')}${kpi('Em aberto',brl(sum(due,x=>x.value)),`${due.filter(x=>x.dueDate<today).length} guia(s) vencida(s)`,'◷')}</section>`+
`<div class="notice blue">Registre os valores e vencimentos da guia oficial. Este módulo <strong>não calcula tributos, não gera DAS ou DARF e não verifica pagamentos automaticamente</strong>.</div>`+
`<div class="toolbar"><div class="toolbar-group"><label class="search"><span>⌕</span><input id="search" placeholder="Buscar guia ou cliente..." value="${esc(state.query)}"></label><select id="status-filter" class="select"><option value="all">Todos os status</option><option value="open" ${state.status==='open'?'selected':''}>Em aberto</option><option value="paid" ${state.status==='paid'?'selected':''}>Pago</option></select></div></div>`+
`<section class="panel">${list.length?table(['Cliente','Tipo / referência','Competência','Vencimento','Valor','Situação','Ações'],list.map(x=>`<tr><td><strong>${esc(clientName(x.clientId))}</strong></td><td><strong>${esc(x.kind)}</strong><small>${esc(x.ref||x.notes||'Sem referência')}</small></td><td>${mon(x.competence)}</td><td>${fmtDate(x.dueDate)}${x.status!=='paid'&&x.dueDate<today?'<small style="color:#bd4d58">Vencida</small>':''}</td><td class="money">${brl(x.value)}</td><td>${x.status==='paid'?badge('Pago','good'):badge('Em aberto','warn')}${x.paidAt?`<small>${fmtDate(x.paidAt)}</small>`:''}</td><td><div class="table-actions">${x.status!=='paid'?action('Registrar pagamento','pay-tax',x.id):''}${action('Editar','edit-tax',x.id)}${action('Excluir','delete-tax',x.id,'small danger')}</div></td></tr>`).join('')):blank('▣','Nenhuma guia cadastrada','Registre DAS, DARF, ISS e outros tributos conforme as guias emitidas.',headerActions('Cadastrar guia','tax'))}</section>`}
function tasksPage(){const all=tasks().filter(x=>matchQuery([x.title,clientName(x.clientId),x.notes,x.category].join(' '))&&(state.status==='all'||x.status===state.status));const open=tasks().filter(t=>t.status!=='done');const late=open.filter(t=>t.dueDate<today);return pageHead('AGENDA DE CONTROLE','Obrigações e pendências','Controle guias, documentos, entregas, retornos e tarefas de cada cliente.',headerActions('Criar tarefa','task'))+
`<section class="kpis">${kpi('Tarefas cadastradas',tasks().length,'Nesta competência','☑')}${kpi('Concluídas',tasks().filter(t=>t.status==='done').length,'Atividades finalizadas','✓')}${kpi('Em aberto',open.length,'Aguardando conclusão','◷')}${kpi('Atrasadas',late.length,'Prazo anterior à data de hoje','!')}</section>`+
`<div class="toolbar"><div class="toolbar-group"><label class="search"><span>⌕</span><input id="search" placeholder="Buscar tarefa ou cliente..." value="${esc(state.query)}"></label><select id="status-filter" class="select"><option value="all">Todos os status</option><option value="pending" ${state.status==='pending'?'selected':''}>Pendente</option><option value="progress" ${state.status==='progress'?'selected':''}>Em andamento</option><option value="done" ${state.status==='done'?'selected':''}>Concluída</option></select></div>${action('Repetir mês anterior','copy-tasks','','small')}</div>`+
`<section class="panel">${all.length?table(['Cliente','Atividade','Categoria','Prazo','Prioridade','Situação','Ações'],all.slice().sort((a,b)=>String(a.dueDate||'').localeCompare(String(b.dueDate||''))).map(x=>`<tr><td><strong>${esc(clientName(x.clientId))}</strong></td><td><strong>${esc(x.title)}</strong><small>${esc(x.notes||'')}</small></td><td>${esc(x.category||'Outro')}</td><td class="nobr">${fmtDate(x.dueDate)}${x.dueDate<today&&x.status!=='done'?`<small style="color:#c15b67">Em atraso</small>`:''}</td><td>${x.priority==='high'?badge('Alta','bad'):x.priority==='medium'?badge('Média','warn'):badge('Baixa','muted')}</td><td>${statusTask(x.status)}</td><td><div class="table-actions">${x.status!=='done'?action('Concluir','complete-task',x.id):''}${action('Editar','edit-task',x.id)}${action('Excluir','delete-task',x.id,'small danger')}</div></td></tr>`).join('')):blank('☑','Sem tarefas nesta competência','Cadastre guias, entregas, documentos e outras obrigações.',headerActions('Criar tarefa','task'))}</section>`+
`<p class="caption mt18">O botão “Repetir mês anterior” copia as tarefas do mês anterior para a competência atual, preservando o dia do vencimento quando possível. Confira prazos legais antes de utilizá-los.</p>`}
// Uma passagem por módulo. Tela e CSV compartilham os mesmos saldos em centavos.
function reportRows(){
  const rows=new Map(clients().map(c=>[c.id,{
    c, issued:0,billed:0,received:0,expenses:0,open:0,tasks:0,taxOpen:0,
    fee:feeExpected(c.id,state.month),paid:feePaid(c.id,state.month)
  }]));
  for(const i of invoices()){
    const r=rows.get(i.clientId);if(!r||!issued(i))continue;
    r.issued++;r.billed+=core.cents(i.value);r.open+=core.cents(openInvoice(i));
  }
  for(const x of cash()){
    const r=rows.get(x.clientId);if(!r)continue;
    if(x.kind==='receipt')r.received+=core.cents(x.value);
    if(x.kind==='expense')r.expenses+=core.cents(x.value);
  }
  for(const x of taxes()){const r=rows.get(x.clientId);if(r&&x.status!=='paid')r.taxOpen+=core.cents(x.value);}
  for(const x of tasks()){const r=rows.get(x.clientId);if(r&&x.status!=='done')r.tasks++;}
  const result=[...rows.values()];
  for(const r of result){for(const key of ['billed','received','expenses','open','taxOpen'])r[key]/=100;}
  return result.filter(r=>state.page!=='reports'||matchQuery([r.c.name,r.c.document].join(' ')));
}

function reportsPage(){const t=totals(),byClients=reportRows();return pageHead('INTELIGÊNCIA DA CARTEIRA','Relatórios por cliente','Compare o faturamento fiscal, entradas, despesas, honorários e pendências.',`<button class="btn" data-action="export-csv">↧ Exportar relatório CSV</button>`)+
`<div class="report-grid"><div class="report-item"><span>Faturamento fiscal consolidado</span><strong>${brl(t.faturamento)}</strong><small>Notas emitidas na competência</small></div><div class="report-item"><span>Recebimentos consolidados</span><strong>${brl(t.received)}</strong><small>Entradas lançadas no mês</small></div><div class="report-item"><span>Receita do meu escritório</span><strong>${brl(t.paid)}</strong><small>Honorários efetivamente registrados como pagos</small></div></div>`+
`<div class="toolbar"><label class="search"><span>⌕</span><input id="search" placeholder="Buscar cliente no relatório..." value="${esc(state.query)}"></label><span class="caption">Competência ${mon(state.month)} · ${byClients.length} cliente(s)</span></div>`+
`<section class="panel">${byClients.length?table(['Cliente','NFs','Faturamento','Entradas','Despesas','NFs em aberto','Honorários recebidos','Tributos em aberto','Pendências'],byClients.map(x=>`<tr><td><strong>${esc(x.c.name)}</strong><small>${esc(x.c.regime||'Não informado')}</small>${action('Resumo do mês','resumo-cliente',x.c.id)}</td><td>${x.issued}</td><td class="money">${brl(x.billed)}</td><td class="money good">${brl(x.received)}</td><td class="money bad">${brl(x.expenses)}</td><td class="money">${brl(x.open)}</td><td class="money">${brl(x.paid)} <small>de ${brl(x.fee)}</small></td><td class="money">${brl(x.taxOpen)}</td><td>${x.tasks?badge(`${x.tasks} em aberto`,'warn'):badge('Em dia','good')}</td></tr>`).join('')):blank('▥','Sem dados para este filtro','Cadastre clientes e informações do mês para gerar o relatório.')}</section>`+
`<div class="notice blue mt18"><strong>Importante:</strong> estes indicadores são gerenciais e dependem dos lançamentos feitos por você. Não equivalem, por si só, à escrituração contábil oficial, apuração tributária ou conciliação bancária.</div>`}
function detailPage(){const c=client(state.detail);if(!c)return pageHead('CLIENTE','Cliente não encontrado','Volte para a lista de clientes.',action('Ver clientes','go-clients'));const inv=data.invoices.filter(x=>x.clientId===c.id&&x.competence===state.month).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));const mov=data.cash.filter(x=>x.clientId===c.id&&String(x.date||'').slice(0,7)===state.month);const allTasks=data.tasks.filter(x=>x.clientId===c.id&&x.competence===state.month);const billed=sum(inv.filter(issued),x=>x.value),received=sum(mov.filter(x=>x.kind==='receipt'),x=>x.value),expenses=sum(mov.filter(x=>x.kind==='expense'),x=>x.value);return pageHead('FICHA INDIVIDUAL',esc(c.name),`${esc(c.regime||'Regime não informado')} · ${esc(c.segment||'Sem segmento')} · ${priorityBadge(priorityVal(c.priority))} · ${badge(c.status==='active'?'Cliente ativo':'Cliente inativo',c.status==='active'?'good':'muted')}`,action('← Clientes','go-clients')+action('Copiar resumo','copy-client-brief',c.id)+action('Resumo do mês','resumo-cliente',c.id)+action('Editar cadastro','edit-client',c.id,'small primary'))+
`<section class="kpis">${kpi('NFs emitidas',brl(billed),`${inv.filter(issued).length} documento(s) no mês`,'▧')}${kpi('Recebimentos',brl(received),'Caixa do mês','↙')}${kpi('Despesas',brl(expenses),'Saídas financeiras do mês','↗')}${kpi('Honorários pagos',brl(feePaid(c.id,state.month)),`de ${brl(feeExpected(c.id,state.month))} previstos`,'◈')}</section>`+
`<div class="details-grid">${panel('Informações do cliente','Dados de contato e acompanhamento',`<div class="panel-body"><div class="detail-item"><span>CPF / CNPJ</span><strong>${esc(c.document||'Não informado')}</strong></div>${c.cnpjLookupAt?`<div class="detail-item"><span>Nome fantasia</span><strong>${esc(c.tradeName||'—')}</strong></div><div class="detail-item"><span>Situação cadastral</span><strong>${esc(c.registryStatus||'—')}</strong></div><div class="detail-item"><span>CNAE principal</span><strong>${esc(c.activityCode||'—')} · ${esc(c.segment||'—')}</strong></div><div class="detail-item"><span>Endereço cadastral</span><strong>${esc([c.address,c.city,c.uf].filter(Boolean).join(' · ')||'—')}</strong></div><div class="detail-item"><span>Consulta pública</span><strong>${esc(new Date(c.cnpjLookupAt).toLocaleDateString('pt-BR'))}</strong></div>`:''}<div class="detail-item"><span>Prioridade</span><strong>${priorityBadge(priorityVal(c.priority))}</strong></div><div class="detail-item"><span>Contato responsável</span><strong>${esc(c.contactName||'Não informado')}</strong></div><div class="detail-item"><span>E-mail financeiro</span><strong>${esc(c.billingEmail||'Não informado')}</strong></div><div class="detail-item"><span>Regime tributário</span><strong>${esc(c.regime||'Não informado')}</strong></div><div class="detail-item"><span>Área / atividade</span><strong>${esc(c.segment||'Não informada')}</strong></div><div class="detail-item"><span>Telefone</span><strong>${esc(c.phone||'Não informado')}</strong></div><div class="detail-item"><span>E-mail</span><strong>${esc(c.email||'Não informado')}</strong></div><div class="detail-item"><span>Início do contrato</span><strong>${fmtDate(c.start)}</strong></div><div class="detail-item"><span>Honorários-base</span><strong>${brl(c.monthlyFee)}</strong></div></div>`)}${panel('Anotações e alertas','Observações internas do seu atendimento',`<div class="panel-body"><p class="message">${esc(c.notes||'Nenhuma anotação registrada para este cliente.')}</p><div class="mt18">${action('Editar anotações','edit-client',c.id,'small')}</div></div>`)}${panel('Acessos deste cliente','Senhas e logins guardados no cofre criptografado',`<div class="panel-body"><p>${vaultData?`${vaultData.access.filter(x=>x.clientId===c.id).length} acesso(s) salvo(s).`:'Desbloqueie seu cofre para visualizar ou cadastrar acessos.'}</p>${action(vaultData?'Gerenciar acessos':'Abrir cofre','vault-for',c.id,'small primary')}</div>`) }</div>`+
`<div class="grid-main">${panel('Notas fiscais',`Competência ${mon(state.month)}`,inv.length?table(['NF','Emissão','Valor','Situação'],inv.map(x=>`<tr><td><strong>${esc(x.number||'Sem número')}</strong><small>${esc(x.description||'')}</small></td><td>${fmtDate(x.date)}</td><td class="money">${brl(x.value)}</td><td>${statusInvoice(x.status)}</td></tr>`).join('')):blank('▧','Sem NFs','Nenhuma nota cadastrada no período.'),action('Nova NF','new-invoice-for',c.id))}${panel('Obrigações e pendências',`${allTasks.length} tarefa(s) cadastrada(s)`,allTasks.length?`<div class="mini-list">${allTasks.map(x=>`<div class="mini-row"><div><strong>${esc(x.title)}</strong><small>${fmtDate(x.dueDate)}</small></div>${statusTask(x.status)}</div>`).join('')}</div>`:blank('☑','Nenhuma tarefa','Não há pendências lançadas no período.'),action('Criar tarefa','new-task-for',c.id))}</div>`}
function backupReminder(){
 let last=null;try{last=localStorage.getItem('clyriva-last-backup')}catch{}
 const days=last?(Date.now()-Date.parse(last))/86400000:Infinity;
 return days>7?'<div class="notice warn"><strong>Backup recomendado.</strong> Não há exportação recente registrada neste navegador. Acesse Dados e backup e salve uma cópia em local seguro.</div>':'';
}
function settingsPage(){return pageHead('CONTROLE DOS SEUS DADOS','Dados e backup','Gerencie os cadastros, lançamentos e o cofre da sua carteira.')+
`${backupReminder()}<div class="notice danger"><strong>Sincronização online:</strong> após autenticar no Clyriva, os dados são enviados para seu banco Supabase. A proteção depende das políticas RLS e da configuração segura do provedor. O cofre usa criptografia própria, mas dados comuns não são criptografados no navegador antes do envio. Faça backup regularmente e confira o indicador de sincronização.</div>`+
`<div class="settings-grid">${panel('Backup e restauração','Leve seus dados a outro computador',`<div class="settings-block"><p>Exporte seus cadastros e, se configurado, seu cofre criptografado em um JSON. Para recuperar, importe o backup em uma cópia do sistema.</p><button class="btn primary" data-action="backup">↧ Fazer backup JSON</button><button class="btn" data-action="import">↥ Importar backup</button><p class="caption mt18">A importação substitui todos os dados da sua carteira atual. Backup inclui o cofre criptografado, sem senhas em texto aberto. Os demais dados do cadastro e do financeiro permanecem legíveis no arquivo. Guarde-o em local seguro.</p></div>`)}${panel('Proteção da carteira','Operações destrutivas bloqueadas',`<div class="settings-block"><p>O Clyriva não substitui a carteira por demonstrações nem permite apagar tudo com um único clique.</p><p>Os dados de demonstração e a exclusão integral foram desativados na versão online para proteger sua carteira.</p><p class="caption mt18">Antes de substituir seus dados, exporte um backup.</p></div>`)}${panel('Registros armazenados','Quantidades nesta instalação',`<div class="settings-block"><ul><li>${data.clients.length} cliente(s)</li><li>${data.invoices.length} nota(s) fiscal(is)</li><li>${data.cash.length} movimentação(ões) financeira(s)</li><li>${data.tasks.length} tarefa(s)</li><li>${data.fees.length} competência(s) de honorários</li><li>${data.taxes.length} guia(s) ou tributo(s)</li></ul><button class="btn" data-action="export-csv">↧ Relatório mensal CSV</button></div>`)}${panel('Escopo desta versão','O que está e o que não está integrado',`<div class="settings-block"><p>Já funciona: clientes, prioridade, e-mails de contato, notas fiscais manuais, faturamento fiscal, caixa, honorários, guias, obrigações, relatórios, backup e cofre criptografado de acessos.</p><p>Consulta CNPJ: o cadastro pode ser preenchido por meio da BrasilAPI, com CNPJ.ws como segunda fonte (requer internet; disponibilidade sujeita aos provedores). Não está integrado: emissão de NFS-e, consulta de DAS e tributos, consulta bancária, automação bancária e emissão fiscal direta.</p><p class="caption">Versão para organização pessoal. A configuração fiscal deve ser validada para cada cliente.</p></div>`)}</div>`}
const opt=(arr,val)=>arr.map(([v,label])=>`<option value="${esc(v)}" ${String(v)===String(val)?'selected':''}>${esc(label)}</option>`).join('');
const field=(label,name,value='',o={})=>`<div class="field ${o.wide?'wide':''}"><label for="f-${name}">${label}${o.required?' <em>*</em>':''}</label>${o.area?`<textarea id="f-${name}" name="${name}" rows="3" placeholder="${esc(o.placeholder||'')}" ${o.required?'required':''}>${esc(value)}</textarea>`:o.options?`<select id="f-${name}" name="${name}" ${o.required?'required':''}>${opt(o.options,value)}</select>`:`<input type="${o.type||'text'}" id="f-${name}" name="${name}" value="${esc(value)}" ${o.required?'required':''} ${o.type==='number'?'step="0.01" min="0"':''} ${o.placeholder?`placeholder="${esc(o.placeholder)}"`:''} ${o.max?`maxlength="${o.max}"`:''}>`}${o.help?`<small class="help">${o.help}</small>`:''}</div>`;
const clientOpts=(val,selectPlaceholder=false)=>[...(selectPlaceholder?[['','Selecione um cliente']]:[]),...data.clients.map(c=>[c.id,c.name])];
const invoiceOpts=(cid,val)=>[['','Sem nota vinculada'],...data.invoices.filter(i=>i.clientId===cid&&issued(i)).map(i=>[i.id,`NF ${i.number||'s/n'} · ${brl(i.value)} · ${mon(i.competence)}`])];
function openModal(type,editId=null,preset={}){cancelCnpjLookup();if(type!=='client'&&!data.clients.length){toast('Cadastre um cliente antes de adicionar outros dados.',true);type='client'}
const root=$('#modal-root');const item=({client:data.clients,invoice:data.invoices,cash:data.cash,task:data.tasks,fee:data.fees,tax:data.taxes}[type]||[]).find(x=>x.id===editId);let title='',description='',fields='',cid=preset.clientId||item?.clientId||(state.client==='all'?data.clients[0]?.id:state.client)||'';
if(type==='client'){filledRegistry.clear();title=item?'Editar cliente':'Novo cliente';description='Informações particulares para acompanhar sua carteira.';fields=[
field('Nome / Razão social','name',item?.name||'',{required:true,wide:true,placeholder:'Ex.: Clínica Horizonte'}),cnpjField(item?.document||''),field('Regime / natureza','regime',item?.regime||'Outro',{options:[['MEI','MEI'],['Simples Nacional','Simples Nacional'],['Lucro Presumido','Lucro Presumido'],['Lucro Real','Lucro Real'],['Pessoa Física','Pessoa física'],['Outro','Outro / a definir']]}),field('Atividade / segmento','segment',item?.segment||'',{placeholder:'Ex.: Serviços de saúde'}),field('Prioridade do cliente','priority',priorityVal(item?.priority),{options:[['critical','Crítica · requer atenção imediata'],['high','Alta · acompanhamento frequente'],['medium','Média · rotina normal'],['low','Baixa · rotina simples']]}),field('Nome do responsável / contato','contactName',item?.contactName||''),field('E-mail financeiro','billingEmail',item?.billingEmail||'',{type:'email'}),field('Honorários mensais (R$)','monthlyFee',item?.monthlyFee??0,{type:'number',required:true}),field('Telefone','phone',item?.phone||'',{type:'tel'}),field('E-mail','email',item?.email||'',{type:'email'}),field('Início do atendimento','start',item?.start||today,{type:'date'}),field('Situação','status',item?.status||'active',{options:[['active','Ativo'],['inactive','Inativo']]}),field('Anotações internas','notes',item?.notes||'',{area:true,wide:true,placeholder:'Demandas recorrentes, observações e próximos passos...'}),registryFields(item)].join('')}
if(type==='invoice'){title=item?'Editar nota fiscal':'Registrar nota fiscal';description='Controle manual de notas emitidas, previstas e canceladas.';fields=[
field('Cliente','clientId',cid,{options:clientOpts(cid),required:true,wide:true}),field('Número da NF','number',item?.number||'',{placeholder:'Ex.: 000017',required:false}),field('Data de emissão / prevista','date',item?.date||today,{type:'date',required:true}),field('Competência','competence',item?.competence||state.month,{type:'month',required:true}),field('Valor da nota (R$)','value',item?.value??0,{type:'number',required:true}),field('Situação','status',item?.status||'issued',{options:[['issued','Emitida'],['pending','A emitir'],['canceled','Cancelada']]}),field('Descrição do serviço / operação','description',item?.description||'',{wide:true,placeholder:'Ex.: Prestação de serviços - competência mensal'})].join('')}
if(type==='cash'){title=item?'Editar lançamento':'Nova movimentação financeira';description='Lance entradas e saídas no caixa do cliente.';let linkedInv=item?.invoiceId||preset.invoiceId||'';if(linkedInv){const chosen=data.invoices.find(i=>i.id===linkedInv);if(chosen)cid=chosen.clientId}fields=[
field('Cliente','clientId',cid,{options:clientOpts(cid),required:true,wide:true}),field('Tipo','kind',item?.kind||'receipt',{options:[['receipt','Recebimento / entrada'],['expense','Despesa / saída']],required:true}),field('Data da movimentação','date',item?.date||today,{type:'date',required:true}),field('Valor (R$)','value',item?.value??(linkedInv?openInvoice(data.invoices.find(i=>i.id===linkedInv)||{}):0),{type:'number',required:true}),field('Categoria','category',item?.category||(linkedInv?'Recebimento de nota fiscal':''),{placeholder:'Ex.: Serviços / Aluguel / Fornecedor',required:true}),field('NF vinculada (opcional)','invoiceId',linkedInv,{options:invoiceOpts(cid,linkedInv),wide:true,help:'Vincule um recebimento à NF correspondente para abater o saldo em aberto.'}),field('Observações','notes',item?.notes||'',{area:true,wide:true})].join('')}
if(type==='task'){title=item?'Editar tarefa':'Nova obrigação / pendência';description='Agenda particular por cliente e competência.';fields=[
field('Cliente','clientId',cid,{options:clientOpts(cid),required:true,wide:true}),field('Título da tarefa','title',item?.title||'',{wide:true,required:true,placeholder:'Ex.: Verificar DAS, receber extratos, emitir NF'}),field('Categoria','category',item?.category||preset.category||'Fiscal',{options:[['Fiscal','Fiscal'],['Documental','Documental'],['Financeira','Financeira'],['Atendimento','Atendimento'],['Contábil','Contábil'],['Outros','Outros']]}),field('Competência','competence',item?.competence||state.month,{type:'month',required:true}),field('Data limite','dueDate',item?.dueDate||today,{type:'date',required:true}),field('Prioridade','priority',item?.priority||'medium',{options:[['high','Alta'],['medium','Média'],['low','Baixa']]}),field('Situação','status',item?.status||'pending',{options:[['pending','Pendente'],['progress','Em andamento'],['done','Concluída']]}),field('Observações','notes',item?.notes||'',{area:true,wide:true})].join('')}
if(type==='tax'){title=item?'Editar guia ou tributo':'Registrar guia ou tributo';description='Registre os dados da guia oficial. Sem cálculo tributário automático.';fields=[
field('Cliente','clientId',cid,{options:clientOpts(cid),required:true,wide:true}),field('Tributo ou guia','kind',item?.kind||'DAS',{options:[['DAS','DAS (MEI / Simples)'],['DARF','DARF'],['ISS','ISS'],['INSS','INSS'],['FGTS','FGTS'],['Outro','Outro']]}),field('Competência','competence',item?.competence||state.month,{type:'month',required:true}),field('Vencimento','dueDate',item?.dueDate||today,{type:'date',required:true}),field('Valor da guia (R$)','value',item?.value??0,{type:'number',required:true}),field('Status','status',preset.status||item?.status||'open',{options:[['open','Em aberto'],['paid','Pago']]}),field('Data do pagamento','paidAt',item?.paidAt||(preset.status==='paid'?localToday():''),{type:'date'}),field('Número / identificação da guia','ref',item?.ref||'',{placeholder:'Opcional'}),field('Observações','notes',item?.notes||'',{wide:true,area:true})].join('')}
if(type==='fee'){const old=feeRecord(cid,state.month),r=item||old;title='Registrar meus honorários';description='Uma cobrança por cliente e competência; altere os valores pagos conforme o recebimento.';fields=[
field('Cliente','clientId',cid,{options:clientOpts(cid),required:true,wide:true}),field('Competência','competence',r?.competence||state.month,{type:'month',required:true}),field('Valor devido (R$)','expected',r?.expected??n(client(cid)?.monthlyFee),{type:'number',required:true}),field('Valor recebido (R$)','paid',r?.paid??0,{type:'number',required:true}),field('Data do recebimento','paidAt',r?.paidAt||'',{type:'date',help:'Deixe vazio quando ainda não houver pagamento.'}),field('Observações sobre a cobrança','notes',r?.notes||'',{wide:true,area:true})].join('')}
root.innerHTML=`<div class="modal-backdrop" id="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><h2 id="modal-title">${title}</h2><p>${description}</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Fechar">×</button></div><form id="edit-form" data-type="${type}" data-edit="${esc(editId||'')}"><div class="modal-fields">${fields}</div><div class="modal-foot"><button type="button" class="btn" data-action="close-modal">Cancelar</button><button class="btn primary" type="submit">${item?'Salvar alterações':'Salvar registro'}</button></div></form></div></div>`;
if(type==='client'){
  const form=$('#edit-form');form.dataset.lookupDoc=cleanDocument(item?.document||'');
  if(item?.cnpjLookupSource){
    const oldKeys=['name','tradeName','activityCode','registryStatus','legalNature','companySize','openingDate','zipCode','address','city','uf'];
    const snapshot=item.cnpjLookupValues || Object.fromEntries(oldKeys.map(k=>[k,item[k]]));
    for(const key of [...registryKeys,'regime'])if(snapshot[key]&&snapshot[key]===form.elements[key].value)filledRegistry.set(key,snapshot[key]);
  }
}
if(type==='cash')$('#edit-form').elements.invoiceId.disabled=$('#edit-form').elements.kind.value==='expense';
const first=$('#modal-root input:not([type=hidden]),#modal-root select');if(first)first.focus();
}
function closeModal(){cancelCnpjLookup();$('#modal-root').innerHTML=''}
async function formSubmit(f){const type=f.dataset.type,edit=f.dataset.edit,fd=new FormData(f),v=Object.fromEntries(fd.entries());const item=edit?({client:data.clients,invoice:data.invoices,cash:data.cash,task:data.tasks,fee:data.fees,tax:data.taxes}[type]||[]).find(x=>x.id===edit):null;
if(!Object.hasOwn(v,'clientId')&&type!=='client')return toast('Selecione um cliente.',true);
if(type==='client'){v.name=v.name.trim();if(!v.name)return toast('Informe o nome do cliente.',true);const cleaned=cleanDocument(v.document), changed=cleaned!==cleanDocument(item?.document);
if(cleaned && changed){
  if(!/^\d{11}$/.test(cleaned)&&!validCnpj(cleaned))return toast('Informe um CPF de 11 dígitos ou um CNPJ válido.',true);
  if(data.clients.some(c=>c.id!==item?.id && cleanDocument(c.document)===cleaned))return toast('Já existe um cliente com este CPF/CNPJ.',true);
}
if(validCnpj(cleaned))v.document=fmtCnpj(cleaned);
v.cnpjLookupValues=Object.fromEntries([...filledRegistry].filter(([key,value])=>v[key]===value));
v.monthlyFee=n(v.monthlyFee);v.priority=priorityVal(v.priority);const record={...v,id:item?.id||id()};const ok=await mutate(()=>{if(item)Object.assign(item,record);else data.clients.push(record)},'Cliente salvo.');if(ok)closeModal();return}
if(!client(v.clientId))return toast('Selecione um cliente válido.',true);
if(type==='invoice'){v.value=n(v.value);if(v.value<0)return toast('O valor não pode ser negativo.',true);if(item && item.clientId!==v.clientId && data.cash.some(r=>r.invoiceId===item.id))return toast('Desvincule os recebimentos antes de mudar o cliente da NF.',true);if(item&&v.status!=='issued'&&paidToInvoice(item.id)>0)return toast('Esta NF tem recebimentos vinculados. Desvincule-os antes de alterar a situação.',true);if(item&&v.value+0.005<paidToInvoice(item.id))return toast('O valor da NF não pode ser menor que os recebimentos vinculados.',true);const record={...v,id:item?.id||id()};const ok=await mutate(()=>{if(item)Object.assign(item,record);else data.invoices.push(record)},'Nota fiscal salva.');if(ok)closeModal();return}
if(type==='cash'){v.invoiceId=v.invoiceId||'';v.category=v.category.trim();if(!v.category)return toast('Informe a categoria da movimentação.',true);v.value=n(v.value);if(v.value<=0)return toast('Informe um valor maior que zero.',true);if(v.invoiceId){const inv=data.invoices.find(x=>x.id===v.invoiceId);if(!inv||inv.clientId!==v.clientId||!issued(inv)||v.kind!=='receipt')return toast('Vincule somente recebimentos a NFs emitidas do mesmo cliente.',true);const prior=paidToInvoice(inv.id)-(item?.invoiceId===inv.id&&item?.kind==='receipt'?n(item.value):0);if(prior+v.value>n(inv.value)+.005)return toast(`Este recebimento supera o saldo da NF. Disponível: ${brl(inv.value-prior)}.`,true)}const record={...v,id:item?.id||id()};const ok=await mutate(()=>{if(item)Object.assign(item,record);else data.cash.push(record)},'Movimentação salva.');if(ok)closeModal();return}
if(type==='task'){v.title=v.title.trim();if(!v.title)return toast('Informe um título para a tarefa.',true);const record={...v,id:item?.id||id()};const ok=await mutate(()=>{if(item)Object.assign(item,record);else data.tasks.push(record)},'Tarefa salva.');if(ok)closeModal();return}
if(type==='tax'){v.value=n(v.value);if(v.status==='paid'&&!v.paidAt)return toast('Informe a data do pagamento da guia.',true);if(v.status==='open')v.paidAt='';const record={...v,id:item?.id||id()};const ok=await mutate(()=>{if(item)Object.assign(item,record);else data.taxes.push(record)},'Guia salva.');if(ok)closeModal();return}
if(type==='fee'){v.expected=n(v.expected);v.paid=n(v.paid);if(v.paid>v.expected+.005)return toast('O recebimento não pode ultrapassar o valor devido.',true);if(v.paid>0&&!v.paidAt)return toast('Informe a data do recebimento.',true);if(v.paid===0)v.paidAt='';const existing=feeRecord(v.clientId,v.competence);const record={...v,id:existing?.id||id()};const ok=await mutate(()=>{if(existing)Object.assign(existing,record);else data.fees.push(record)},'Honorários registrados.');if(ok)closeModal();return}
}
function confirmDel(type,target){const tableName={client:'clients',invoice:'invoices',cash:'cash',task:'tasks',tax:'taxes'}[type];const x=data[tableName]?.find(r=>r.id===target);if(!x)return;let text='Excluir este registro?';if(type==='client')text=`Excluir ${x.name} e TODAS as suas notas, finanças, guias, obrigações e honorários? Acessos criptografados, se existirem, ficarão no cofre como 'Cliente removido' até que você os exclua. Essa operação é permanente.`;if(type==='invoice'&&data.cash.some(r=>r.invoiceId===x.id))text='Excluir a NF? Os recebimentos vinculados serão preservados, mas ficarão desvinculados da NF.';if(!window.confirm(text))return;mutate(()=>{data[tableName]=data[tableName].filter(r=>r.id!==target);if(type==='client'){data.invoices=data.invoices.filter(r=>r.clientId!==target);data.cash=data.cash.filter(r=>r.clientId!==target);data.tasks=data.tasks.filter(r=>r.clientId!==target);data.fees=data.fees.filter(r=>r.clientId!==target);data.taxes=data.taxes.filter(r=>r.clientId!==target);if(state.client===target)state.client='all';if(vaultSelectedClient===target)vaultSelectedClient='all';if(state.page==='detail'&&state.detail===target)state.page='clients'}if(type==='invoice')data.cash.filter(r=>r.invoiceId===target).forEach(r=>r.invoiceId='')},'Registro excluído.')}
function copyTasks(){const prev=ymOffset(state.month,-1);const from=data.tasks.filter(t=>t.competence===prev&&scope(t));if(!from.length)return toast('Nenhuma tarefa no mês anterior para copiar.',true);const copies=from.filter(t=>!data.tasks.some(x=>x.clientId===t.clientId&&x.competence===state.month&&x.title===t.title&&x.category===t.category)).map(t=>{const desired=Number(t.dueDate?.slice(8,10))||10;const [y,m]=state.month.split('-').map(Number);const day=Math.min(desired,new Date(y,m,0).getDate());return {...t,id:id(),competence:state.month,dueDate:`${state.month}-${String(day).padStart(2,'0')}`,status:'pending'}});if(!copies.length)return toast('As tarefas do mês anterior já existem nesta competência.',true);mutate(()=>data.tasks.push(...copies),`${copies.length} tarefa(s) copiada(s). Confira os vencimentos.`)}
function download(filename,content,mime){const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function csvCell(v){const str=String(v??'');const safe=/^[\s]*[=+@\-]/.test(str)?"'"+str:str;return '"'+safe.replace(/"/g,'""')+'"'}
function exportCsv(){const arr=reportRows().map(r=>[r.c.name,r.c.document,r.c.regime,r.issued,r.billed,r.received,r.expenses,r.open,r.fee,r.paid,r.taxOpen,r.tasks]);const head=['Cliente','CPF/CNPJ','Regime','Notas emitidas','Faturamento de NFs','Entradas','Despesas','NF em aberto','Honorários previstos','Honorários recebidos','Tributos em aberto','Tarefas abertas'];const csv='\uFEFF'+[head,...arr].map(row=>row.map(csvCell).join(';')).join('\r\n');download(`clyriva-relatorio-${state.month}.csv`,csv,'text/csv;charset=utf-8');toast('Relatório CSV exportado.')}
function makeDemo(){const m=state.month;const c=[['Clínica Horizonte','Simples Nacional','Saúde',420],['Estúdio Aurora','MEI','Design e serviços',170],['Alfa Soluções','Simples Nacional','Consultoria',330],['Oficina Estrela','MEI','Serviços automotivos',145],['Viva Pilates','Simples Nacional','Bem-estar',260]].map(([name,regime,segment,monthlyFee],j)=>({id:id(),name,regime,segment,monthlyFee,priority:['critical','high','medium','low','medium'][j],contactName:'',billingEmail:'',document:'',phone:'',email:'',notes:'Cliente fictício utilizado apenas para demonstração.',start:ymOffset(m,-3)+'-01',status:'active'}));const d=empty();d.clients=c;const values=[8100,4700,13500,3400,7900];for(let k=-5;k<=0;k++){const mo=ymOffset(m,k);c.forEach((cl,j)=>{const value=values[j]+(k+5)*((j%2?110:250))+((j*k*73+1000)%720);const invoice={id:id(),clientId:cl.id,competence:mo,number:`DEMO-${Math.abs(k)*10+j+1}`,date:`${mo}-10`,value,status:'issued',description:'Serviços prestados (exemplo fictício)'};d.invoices.push(invoice);if(k<0||j!==2)d.cash.push({id:id(),clientId:cl.id,kind:'receipt',date:`${mo}-19`,value,category:'Recebimento de serviços',invoiceId:invoice.id,notes:'Dado fictício'});d.cash.push({id:id(),clientId:cl.id,kind:'expense',date:`${mo}-23`,value:Math.round(value*(.18+(j%3)*.11)*100)/100,category:j%2?'Custos operacionais':'Despesas administrativas',invoiceId:'',notes:'Dado fictício'});d.fees.push({id:id(),clientId:cl.id,competence:mo,expected:cl.monthlyFee,paid:k<0?cl.monthlyFee:j===3?0:cl.monthlyFee,paidAt:k<0||j!==3?`${mo}-12`:'',notes:''})})}
c.forEach((cl,j)=>d.taxes.push({id:id(),clientId:cl.id,kind:cl.regime==='MEI'?'DAS':'DAS',competence:m,dueDate:`${m}-20`,value:cl.regime==='MEI'?95:310+j*67,status:j===1?'open':'paid',paidAt:j===1?'':`${m}-15`,ref:'GUIA-DEMONSTRATIVA',notes:'Valor e vencimento fictícios; não utilize para recolhimento.'}));
const titles=['Conferir notas emitidas','Validar documentos mensais','Revisar DAS / tributos aplicáveis','Retornar pendências ao cliente','Conferir recebimentos'];c.forEach((cl,j)=>d.tasks.push({id:id(),clientId:cl.id,title:titles[j],category:j===2?'Fiscal':'Atendimento',competence:m,dueDate:`${m}-${String(12+j*3).padStart(2,'0')}`,priority:j===2?'high':'medium',status:j%3===0?'done':'pending',notes:'Tarefa de demonstração; confirme as obrigações reais do cliente.'}));return d}
function backup(){download(`clyriva-backup-${localToday()}.json`,JSON.stringify({...data,cofreCriptografado:readVaultBlob(),exportedAt:new Date().toISOString()},null,2),'application/json;charset=utf-8');try{localStorage.setItem('clyriva-last-backup',new Date().toISOString())}catch{}toast('Backup exportado. Guarde o arquivo em local seguro; os dados da carteira não são criptografados neste formato.');}
async function replaceAll(next,blob,msg) {
  await mutate(()=>{data=next;state.client='all';state.detail=null;state.page='dashboard';},msg,{vault:blob});
}
function setDemo(){
  if((Object.keys(data).some(k=>Array.isArray(data[k])&&data[k].length)||encrypted) &&
     !confirm('Substituir a carteira e o cofre pelos registros fictícios? Exporte um backup antes.'))return;
  return replaceAll(makeDemo(),null,'Demonstração carregada. Os dados são fictícios.');
}
async function importJson(file){
  if(!file)return;
  try {
    const raw=JSON.parse(await file.text()), next=core.workspace(raw), blob=raw.cofreCriptografado == null?encrypted:core.vault(raw.cofreCriptografado);
    core.checkLinks(next);
    if(!confirm('Substituir todos os registros desta carteira pelo backup? '+(blob?'O cofre do arquivo será restaurado.':'Este backup não contém cofre. Seu cofre atual será preservado.')))return;
    await replaceAll(next,blob,'Backup restaurado.');
  }catch(e){toast('Importação interrompida. '+e.message,true);}
}
function clearData(){
  if(confirm('Apagar todos os registros desta carteira? Exporte um backup antes.') &&
     confirm('Confirmar a exclusão dos registros e do cofre criptografado?'))
    return replaceAll(empty(),null,'Carteira apagada.');
}
async function vaultOperation(action){
  if(busy)return;
  setBusy(true);clearTimeout(vaultIdleTimer);vaultDeadline=0;
  try{await action();}finally{setBusy(false);touchVault();}
}
function handleAction(a,target){if(busy)return;if(a==='resumo-cliente')return openClientSummary(target.dataset.id);if(a==='vault-new')return vaultEntryModal();if(a==='vault-lock')return vaultLock();if(a==='vault-change')return vaultChangeModal();if(a==='vault-toggle'){const el=$('#vault-password');if(el){el.type=el.type==='password'?'text':'password';target.textContent=el.type==='password'?'Mostrar':'Ocultar'}return}if(a==='vault-edit')return vaultEntryModal(target.dataset.id);if(a==='vault-delete')return vaultOperation(()=>vaultDelete(target.dataset.id));if(a==='vault-for'){vaultSelectedClient=target.dataset.id;return go('vault')}if(a==='lookup-cnpj')return lookupCnpj(true);if(a==='new-service')return openModal('task',null,{category:'Atendimento'});const rid=target.dataset.id;if(a==='copy-service')return copyService(rid);if(a==='copy-client-brief')return copyClientBrief(rid);if(a.startsWith('go-'))return go(a.slice(3));if(a==='close-modal')return closeModal();if(a.startsWith('new-')){const s=a.slice(4);if(s==='receipt-for')return openModal('cash',null,{invoiceId:rid});if(s==='invoice-for'||s==='task-for')return openModal(s.replace('-for',''),null,{clientId:rid});return openModal(s)}if(a.startsWith('edit-'))return openModal(a.slice(5),rid);if(a.startsWith('delete-'))return confirmDel(a.slice(7),rid);if(a==='view-client'){state.detail=rid;state.page='detail';render();window.scrollTo(0,0);return}if(a==='fee-for')return openModal('fee',null,{clientId:rid});if(a==='pay-tax'){return openModal('tax',rid,{status:'paid'})}if(a==='complete-task'){return mutate(()=>{const t=data.tasks.find(x=>x.id===rid);if(t)t.status='done'},'Tarefa concluída.')}if(a==='copy-tasks')return copyTasks();if(a==='export-csv')return exportCsv();if(a==='backup')return backup();if(a==='import')return $('#import-file').click();if(a==='demo'||a==='clear')return toast('Operação desativada por segurança.',true)}
document.addEventListener('click',e=>{const actionEl=e.target.closest('[data-action]');if(actionEl){e.preventDefault();handleAction(actionEl.dataset.action,actionEl);return}const nav=e.target.closest('[data-page]');if(nav){e.preventDefault();go(nav.dataset.page);return}if(e.target.id==='modal-backdrop')closeModal()});
document.addEventListener('submit',e=>{
 const form=e.target;
 const vaultForms={'vault-setup-form':vaultSetup,'vault-unlock-form':vaultUnlock,'vault-entry-form':vaultEntrySave,'vault-change-form':vaultChangeMaster};
 if(form.id==='edit-form'){e.preventDefault();formSubmit(form);}
 else if(Object.hasOwn(vaultForms,form.id)){e.preventDefault();vaultOperation(()=>vaultForms[form.id](form));}
});
document.addEventListener('input',e=>{if(e.target.id==='f-document')documentChanged(e.target);});
document.addEventListener('change',e=>{if(e.target.id==='vault-client-filter'){vaultSelectedClient=e.target.value;render()}if(e.target.id==='month'){state.month=e.target.value||currentMonth;render()}if(e.target.id==='client-filter'){agendaView=rotina.agendaView();state.client=e.target.value;if(state.page==='detail'){state.detail=state.client;if(state.client==='all')state.page='clients'}render()}if(e.target.id==='status-filter'){state.status=e.target.value;render()}if(e.target.id==='priority-filter'){state.priority=e.target.value;render()}if(e.target.id==='f-kind' && e.target.form?.dataset.type==='cash'){const sel=e.target.form.elements.invoiceId;sel.disabled=e.target.value==='expense';if(sel.disabled)sel.value='';}if(e.target.id==='f-clientId'&&e.target.form?.dataset.type==='cash'){const sel=e.target.form.querySelector('[name="invoiceId"]');if(sel)sel.innerHTML=opt(invoiceOpts(e.target.value,''),'')}if(e.target.id==='f-clientId'&&e.target.form?.dataset.type==='fee'){const m=e.target.form.querySelector('[name="competence"]')?.value||state.month;const r=feeRecord(e.target.value,m);e.target.form.querySelector('[name="expected"]').value=r?.expected??n(client(e.target.value)?.monthlyFee);e.target.form.querySelector('[name="paid"]').value=r?.paid??0;e.target.form.querySelector('[name="paidAt"]').value=r?.paidAt||'';e.target.form.querySelector('[name="notes"]').value=r?.notes||''}if(e.target.id==='f-competence'&&e.target.form?.dataset.type==='fee'){const cid=e.target.form.querySelector('[name="clientId"]').value;const r=feeRecord(cid,e.target.value);e.target.form.querySelector('[name="expected"]').value=r?.expected??n(client(cid)?.monthlyFee);e.target.form.querySelector('[name="paid"]').value=r?.paid??0;e.target.form.querySelector('[name="paidAt"]').value=r?.paidAt||'';e.target.form.querySelector('[name="notes"]').value=r?.notes||''}});
document.addEventListener('keydown',e=>{if(e.target.id==='global-search'&&e.key==='Enter'){e.preventDefault();state.client='all';state.page='clients';state.query=e.target.value.trim();state.status='all';state.priority='all';render();const box=$('#search');box?.focus();}});
document.addEventListener('input',e=>{if(e.target.id==='search'){const pos=e.target.selectionStart??e.target.value.length;state.query=e.target.value;render();const box=$('#search');if(box){box.focus();box.setSelectionRange(pos,pos)}}});
document.addEventListener('keydown',e=>{
  if(busy)return;
  if(e.key==='Escape')closeModal();
  const dialog=$('#modal-root [role=dialog]');if(!dialog||e.key!=='Tab')return;
  const fields=[...dialog.querySelectorAll('button,input,select,textarea,summary')].filter(x=>!x.disabled&&x.getClientRects().length);
  if(!fields.length)return;
  if(e.shiftKey&&document.activeElement===fields[0]){e.preventDefault();fields.at(-1).focus();}
  if(!e.shiftKey&&document.activeElement===fields.at(-1)){e.preventDefault();fields[0].focus();}
});
$('#hamb').addEventListener('click',()=>{const isOpen=$('#side').classList.toggle('open');if(isOpen){const cover=document.createElement('div');cover.id='scrim';cover.className='scrim show';cover.onclick=()=>{$('#side').classList.remove('open');cover.remove()};document.body.append(cover)}else $('#scrim')?.remove()});
$('#import-file').addEventListener('change',e=>{const file=e.target.files[0];importJson(file);e.target.value=''});
function start(){
  try {
    if(local){if(window!==window.top)throw Error('Abra a edição local em sua própria aba.');unpackLocal();}
    else{
      if(window===window.parent)throw Error('O painel administrativo deve ser aberto pelo login.');
      bridge=window.parent.ClyrivaPanelHost;
      const initial=bridge?.open(window);
      if(!initial)throw Error('Sessão administrativa indisponível.');
      data=core.workspace(initial.data);encrypted=core.vault(initial.vault);demoSession=initial.demo===true;
    }
    initialized=true;document.body.classList.add('clyriva-initialized');$('#panel-status').hidden=true;
    render();
  }catch(e){showStorageError(e);}
}
start();
})();
