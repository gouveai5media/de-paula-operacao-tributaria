const MODULES_URL='https://qmcvzsxtnconqbioiktw.supabase.co';
const MODULES_KEY='sb_publishable_uH7Oz5_OdBRGsVkWczufPQ_vr4agAFE';
const modulesClient=window.supabase.createClient(MODULES_URL,MODULES_KEY,{auth:{storageKey:'portal-modules-auth',persistSession:false}});

let moduleUser=null;
let moduleProfile=null;
let moduleIsAdmin=false;
let systemAccesses=[];
let weeklyReports=[];
let weeklyExecutives=[];

const m$=id=>document.getElementById(id);
const m$$=sel=>[...document.querySelectorAll(sel)];
const mesc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
const mfmt=v=>v?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(v+'T12:00:00')):'';
const mnum=v=>Number(v||0);

function mToast(message,type=''){
  if(typeof toast==='function') return toast(message,type);
  const el=m$('toast'); if(!el)return;
  el.textContent=message;el.className='toast show'+(type?' '+type:'');
  setTimeout(()=>el.className='toast',2600);
}
function mEmpty(title,text){
  if(typeof showEmpty==='function')return showEmpty(title,text);
  return '<div class="empty-state"><strong>'+mesc(title)+'</strong><span>'+mesc(text)+'</span></div>';
}
function mondayOf(input){
  const d=input?new Date(input+'T12:00:00'):new Date();
  const day=d.getDay();
  const diff=day===0?-6:1-day;
  d.setDate(d.getDate()+diff);
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function currentMonday(){return mondayOf()}
function safeSystemUrl(url){
  try{
    const parsed=new URL(url);
    return ['http:','https:'].includes(parsed.protocol)?parsed.href:null;
  }catch{return null}
}

async function moduleIdentity(){
  const {data:{session}}=await modulesClient.auth.getSession();
  let liveSession=session;
  if(!liveSession){
    const mainRaw=Object.keys(localStorage).find(k=>k.includes('auth-token')&&k.includes('qmcvzsxtnconqbioiktw'));
    if(mainRaw){
      try{
        const parsed=JSON.parse(localStorage.getItem(mainRaw));
        const access=parsed?.access_token||parsed?.currentSession?.access_token;
        const refresh=parsed?.refresh_token||parsed?.currentSession?.refresh_token;
        if(access&&refresh){
          const res=await modulesClient.auth.setSession({access_token:access,refresh_token:refresh});
          liveSession=res.data.session;
        }
      }catch{}
    }
  }
  if(!liveSession){
    const {data:{session:mainSession}}=await window.supabase.createClient(MODULES_URL,MODULES_KEY).auth.getSession();
    liveSession=mainSession;
  }
  if(!liveSession)return false;
  moduleUser=liveSession.user;
  const {data:profile}=await modulesClient.from('profiles').select('*').eq('id',moduleUser.id).maybeSingle();
  moduleProfile=profile;
  moduleIsAdmin=(moduleUser.email||'').toLowerCase()==='admin@timeedu.com.br'||profile?.role==='admin';
  if(moduleIsAdmin)m$$('.exec-only').forEach(el=>el.classList.add('hidden'));
  else m$$('#view-systems .admin-only,#view-weekly .admin-only').forEach(el=>el.classList.add('hidden'));
  return true;
}

async function loadSystems(){
  const {data,error}=await modulesClient.rpc('list_system_accesses');
  if(error){console.error(error);mToast('Não foi possível carregar os acessos aos sistemas.','error');return}
  systemAccesses=data||[];
  renderSystems();
}
function renderSystems(){
  const target=m$('systemAccessList');if(!target)return;
  const list=systemAccesses.filter(x=>x.is_active||moduleIsAdmin);
  target.innerHTML=list.length?list.map(systemCard).join(''):mEmpty('Nenhum acesso cadastrado',moduleIsAdmin?'Cadastre o primeiro sistema utilizado pelo time.':'O Admin ainda não disponibilizou acessos.');
  m$$('[data-open-system]').forEach(b=>b.onclick=()=>{
    const item=systemAccesses.find(x=>x.id===b.dataset.openSystem);
    const url=item&&safeSystemUrl(item.url);
    if(url)window.open(url,'_blank','noopener');
    else mToast('Link inválido.','error');
  });
  m$$('[data-copy-user]').forEach(b=>b.onclick=()=>copyCredential(b.dataset.copyUser,'username'));
  m$$('[data-copy-pass]').forEach(b=>b.onclick=()=>copyCredential(b.dataset.copyPass,'password'));
  m$$('[data-reveal-pass]').forEach(b=>b.onclick=()=>togglePassword(b));
  m$$('[data-edit-system]').forEach(b=>b.onclick=()=>editSystemAccess(b.dataset.editSystem));
  m$$('[data-delete-system]').forEach(b=>b.onclick=()=>deleteSystemAccess(b.dataset.deleteSystem));
}
function systemCard(item){
  const hasCredentials=!!(item.username||item.password);
  const login=item.username?'<div class="credential-row"><span>Login</span><div class="credential-value">'+mesc(item.username)+'</div><div class="credential-actions"><button title="Copiar login" data-copy-user="'+item.id+'">Copiar</button></div></div>':'';
  const pass=item.password?'<div class="credential-row"><span>Senha</span><div class="credential-value masked" id="pass-'+item.id+'">••••••••••</div><div class="credential-actions"><button data-reveal-pass="'+item.id+'">Ver</button><button data-copy-pass="'+item.id+'">Copiar</button></div></div>':'';
  const creds=hasCredentials?'<div class="credential-box">'+login+pass+'</div>':'<div class="credential-box"><span class="muted">Acesso direto pelo link, sem credenciais cadastradas.</span></div>';
  const note=item.note?'<p class="system-card-note">'+mesc(item.note)+'</p>':'';
  const adminActions=moduleIsAdmin?'<button class="mini-btn" data-edit-system="'+item.id+'">Editar</button><button class="danger-btn mini-btn" data-delete-system="'+item.id+'">Excluir</button>':'';
  return '<article class="system-card"><div><div class="system-card-top"><div class="system-card-icon">↗</div>'+(moduleIsAdmin&&!item.is_active?'<span class="status-pill status-new">Oculto</span>':'')+'</div><h3>'+mesc(item.title)+'</h3><div class="system-url">'+mesc(item.url)+'</div>'+creds+note+'</div><div class="system-card-actions"><button class="primary" data-open-system="'+item.id+'">Acessar sistema</button>'+adminActions+'</div></article>';
}
async function copyCredential(id,field){
  const item=systemAccesses.find(x=>x.id===id);
  const value=item?.[field];
  if(!value)return;
  try{await navigator.clipboard.writeText(value);mToast(field==='password'?'Senha copiada.':'Login copiado.')}catch{mToast('Não foi possível copiar.','error')}
}
function togglePassword(button){
  const id=button.dataset.revealPass;
  const item=systemAccesses.find(x=>x.id===id);
  const el=m$('pass-'+id);
  if(!item||!el)return;
  const showing=button.dataset.showing==='1';
  if(showing){
    el.textContent='••••••••••';el.classList.add('masked');button.textContent='Ver';button.dataset.showing='0';
  }else{
    el.textContent=item.password;el.classList.remove('masked');button.textContent='Ocultar';button.dataset.showing='1';
  }
}
function resetSystemForm(){
  m$('systemAccessForm')?.reset();
  m$('systemAccessId').value='';
  m$('systemAccessActive').checked=true;
  m$('systemAccessModalTitle').textContent='Novo acesso';
  m$('systemPasswordHint').textContent='opcional';
}
function openSystemModal(){
  resetSystemForm();
  if(typeof openModal==='function')openModal('systemAccessModal');
  else m$('systemAccessModal').classList.add('open');
}
function closeSystemModal(){
  if(typeof closeModal==='function')closeModal('systemAccessModal');
  else m$('systemAccessModal').classList.remove('open');
}
function editSystemAccess(id){
  const item=systemAccesses.find(x=>x.id===id);if(!item)return;
  resetSystemForm();
  m$('systemAccessId').value=item.id;
  m$('systemAccessTitle').value=item.title||'';
  m$('systemAccessUrl').value=item.url||'';
  m$('systemAccessUsername').value=item.username||'';
  m$('systemAccessNote').value=item.note||'';
  m$('systemAccessActive').checked=!!item.is_active;
  m$('systemAccessPassword').placeholder='Deixe em branco para manter a senha atual';
  m$('systemPasswordHint').textContent=item.password?'já existe uma senha cadastrada':'sem senha atual';
  m$('systemAccessModalTitle').textContent='Editar acesso';
  if(typeof openModal==='function')openModal('systemAccessModal');else m$('systemAccessModal').classList.add('open');
}
async function saveSystemAccess(e){
  e.preventDefault();
  const btn=e.submitter;btn.disabled=true;
  const id=m$('systemAccessId').value||null;
  const passwordValue=m$('systemAccessPassword').value;
  const {error}=await modulesClient.rpc('save_system_access',{
    p_id:id,
    p_title:m$('systemAccessTitle').value.trim(),
    p_url:m$('systemAccessUrl').value.trim(),
    p_username:m$('systemAccessUsername').value.trim()||null,
    p_password:id&&!passwordValue?null:(passwordValue||null),
    p_note:m$('systemAccessNote').value.trim()||null,
    p_is_active:m$('systemAccessActive').checked,
    p_sort_order:0
  });
  btn.disabled=false;
  if(error){console.error(error);mToast('Não foi possível salvar o acesso.','error');return}
  closeSystemModal();resetSystemForm();mToast(id?'Acesso atualizado.':'Acesso cadastrado.');
  await loadSystems();
}
async function deleteSystemAccess(id){
  const item=systemAccesses.find(x=>x.id===id);
  if(!item||!confirm('Excluir o acesso "'+item.title+'"?'))return;
  const {error}=await modulesClient.rpc('delete_system_access',{p_id:id});
  if(error){mToast('Não foi possível excluir o acesso.','error');return}
  mToast('Acesso excluído.');await loadSystems();
}

async function loadWeekly(){
  let query=modulesClient.from('weekly_reports').select('*, profiles:profiles!weekly_reports_executive_id_fkey(name,email)').order('week_start',{ascending:false});
  const {data,error}=await query;
  if(error){console.error(error);mToast('Não foi possível carregar os relatórios semanais.','error');return}
  weeklyReports=data||[];
  if(moduleIsAdmin){
    const {data:execs}=await modulesClient.from('profiles').select('id,name,email,active').eq('role','executive').order('name');
    weeklyExecutives=execs||[];
    renderAdminWeekly();
  }else{
    renderExecutiveWeekly();
  }
}
function reportsForPeriod(){
  const exec=m$('weeklyExecutiveFilter')?.value||'';
  const period=m$('weeklyPeriodFilter')?.value||'all';
  let list=[...weeklyReports];
  if(exec)list=list.filter(r=>r.executive_id===exec);
  if(period==='all')return list;

  const today=new Date();
  const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  let start=null,end=null;

  if(period==='this_week'){
    start=new Date(currentMonday()+'T12:00:00');
    end=new Date(start);end.setDate(end.getDate()+6);
  }else if(period==='last_week'){
    end=new Date(currentMonday()+'T12:00:00');end.setDate(end.getDate()-1);
    start=new Date(end);start.setDate(start.getDate()-6);
  }else if(period==='this_month'){
    start=new Date(today.getFullYear(),today.getMonth(),1,12);
    end=new Date(today.getFullYear(),today.getMonth()+1,0,12);
  }else if(period==='last_month'){
    start=new Date(today.getFullYear(),today.getMonth()-1,1,12);
    end=new Date(today.getFullYear(),today.getMonth(),0,12);
  }else{
    const weeks=Number(period);
    start=new Date(currentMonday()+'T12:00:00');
    start.setDate(start.getDate()-((weeks-1)*7));
    end=new Date();
  }

  const from=iso(start),to=iso(end);
  return list.filter(r=>r.week_start>=from&&r.week_start<=to);
}
function totalOf(list,key){return list.reduce((sum,r)=>sum+mnum(r[key]),0)}
function renderExecutiveWeekly(){
  const mine=weeklyReports.filter(r=>r.executive_id===moduleUser.id).sort((a,b)=>b.week_start.localeCompare(a.week_start));
  m$('myWeeksCount').textContent=mine.length;
  m$('myScheduledTotal').textContent=totalOf(mine,'meetings_scheduled');
  m$('myHeldTotal').textContent=totalOf(mine,'meetings_held');
  m$('myMinutesTotal').textContent=totalOf(mine,'minutes_sent');
  m$('myContractsTotal').textContent=totalOf(mine,'contracts_closed');
  m$('myWeeklyHistory').innerHTML=mine.length?mine.map(reportHistoryRow).join(''):mEmpty('Seu histórico começa aqui','Preencha o primeiro relatório semanal.');
  setWeekForm(m$('weekStart')?.value||currentMonday());
}
function setWeekForm(date){
  if(!m$('weekStart'))return;
  const week=mondayOf(date);
  m$('weekStart').value=week;
  const report=weeklyReports.find(r=>r.executive_id===moduleUser.id&&r.week_start===week);
  m$('weekLabel').textContent='Semana de '+mfmt(week);
  m$('weeklyReportId').value=report?.id||'';
  m$('meetingsScheduled').value=report?.meetings_scheduled??0;
  m$('meetingsHeld').value=report?.meetings_held??0;
  m$('minutesSent').value=report?.minutes_sent??0;
  m$('contractsClosed').value=report?.contracts_closed??0;
  m$('scheduledCompanies').value=(report?.scheduled_companies||[]).join('\n');
  m$('weeklyNotes').value=report?.notes||'';
  m$('weekStatus').textContent=report?'Salvo':'Pendente';
  m$('weekStatus').className='status-pill '+(report?'status-done':'status-new');
}
function reportHistoryRow(r){
  const companies=(r.scheduled_companies||[]).filter(Boolean);
  return '<div class="week-report-row"><div><strong>Semana de '+mfmt(r.week_start)+'</strong><small>'+mesc(r.profiles?.name||'')+'</small></div><div><span class="report-number">'+mnum(r.meetings_scheduled)+'</span><small>agendadas</small></div><div><span class="report-number">'+mnum(r.meetings_held)+'</span><small>realizadas</small></div><div><span class="report-number">'+mnum(r.minutes_sent)+'</span><small>minutas</small></div><div><div class="company-tags">'+(companies.length?companies.map(c=>'<span class="company-tag">'+mesc(c)+'</span>').join(''):'<span class="muted">Sem empresas informadas</span>')+'</div>'+(r.notes?'<small>'+mesc(r.notes)+'</small>':'')+'</div></div>';
}
async function saveWeeklyReport(e){
  e.preventDefault();
  if(moduleIsAdmin)return;
  const btn=e.submitter;btn.disabled=true;
  const week=mondayOf(m$('weekStart').value);
  const companies=m$('scheduledCompanies').value.split('\n').map(x=>x.trim()).filter(Boolean);
  const payload={
    executive_id:moduleUser.id,
    week_start:week,
    meetings_scheduled:mnum(m$('meetingsScheduled').value),
    meetings_held:mnum(m$('meetingsHeld').value),
    minutes_sent:mnum(m$('minutesSent').value),
    contracts_closed:mnum(m$('contractsClosed').value),
    scheduled_companies:companies,
    notes:m$('weeklyNotes').value.trim()||null,
    updated_at:new Date().toISOString()
  };
  const {error}=await modulesClient.from('weekly_reports').upsert(payload,{onConflict:'executive_id,week_start'});
  btn.disabled=false;
  if(error){console.error(error);mToast('Não foi possível salvar o relatório.','error');return}
  mToast('Relatório semanal salvo.');
  await loadWeekly();
}
function renderAdminWeekly(){
  const select=m$('weeklyExecutiveFilter');
  const old=select.value;
  select.innerHTML='<option value="">Todos os executivos</option>'+weeklyExecutives.map(x=>'<option value="'+x.id+'">'+mesc(x.name||x.email)+'</option>').join('');
  if([...select.options].some(o=>o.value===old))select.value=old;
  const list=reportsForPeriod();
  m$('teamWeeks').textContent=list.length;
  m$('teamScheduled').textContent=totalOf(list,'meetings_scheduled');
  m$('teamHeld').textContent=totalOf(list,'meetings_held');
  m$('teamMinutes').textContent=totalOf(list,'minutes_sent');
  m$('teamContracts').textContent=totalOf(list,'contracts_closed');
  renderExecutiveBalances(list);
  m$('teamWeeklyHistory').innerHTML=list.length?list.map(reportHistoryRow).join(''):mEmpty('Nenhum relatório no período','Altere os filtros ou aguarde o envio dos executivos.');
}
function renderExecutiveBalances(list){
  const grouped=new Map();
  weeklyExecutives.forEach(x=>grouped.set(x.id,{exec:x,reports:[]}));
  list.forEach(r=>{
    if(!grouped.has(r.executive_id))grouped.set(r.executive_id,{exec:{id:r.executive_id,name:r.profiles?.name,email:r.profiles?.email},reports:[]});
    grouped.get(r.executive_id).reports.push(r);
  });
  let rows=[...grouped.values()];
  const selected=m$('weeklyExecutiveFilter')?.value;
  if(selected)rows=rows.filter(x=>x.exec.id===selected);
  rows.sort((a,b)=>(b.reports.length-a.reports.length)||String(a.exec.name||'').localeCompare(String(b.exec.name||'')));
  m$('weeklyExecutiveBalance').innerHTML=rows.length?rows.map(({exec,reports})=>'<article class="balance-card"><div class="balance-card-head"><div><strong>'+mesc(exec.name||exec.email||'Executivo')+'</strong><small>'+reports.length+' semanas reportadas</small></div><span class="status-pill '+(exec.active===false?'status-new':'status-done')+'">'+(exec.active===false?'Inativo':'Ativo')+'</span></div><div class="balance-metrics"><div><span>Agendadas</span><b>'+totalOf(reports,'meetings_scheduled')+'</b></div><div><span>Realizadas</span><b>'+totalOf(reports,'meetings_held')+'</b></div><div><span>Minutas</span><b>'+totalOf(reports,'minutes_sent')+'</b></div></div></article>').join(''):mEmpty('Sem executivos','Cadastre executivos para iniciar o acompanhamento.');
}

function bindModules(){
  m$$('[data-open-system-modal]').forEach(b=>b.onclick=openSystemModal);
  m$$('[data-close-system-modal]').forEach(b=>b.onclick=closeSystemModal);
  m$('systemAccessModal')?.addEventListener('click',e=>{if(e.target===m$('systemAccessModal'))closeSystemModal()});
  m$('systemAccessForm')?.addEventListener('submit',saveSystemAccess);
  m$('weeklyReportForm')?.addEventListener('submit',saveWeeklyReport);
  m$('weekStart')?.addEventListener('change',e=>setWeekForm(e.target.value));
  m$('weeklyExecutiveFilter')?.addEventListener('change',renderAdminWeekly);
  m$('weeklyPeriodFilter')?.addEventListener('change',renderAdminWeekly);
  m$$('[data-view="systems"]').forEach(b=>b.addEventListener('click',()=>{m$('viewTitle').textContent='Acessos aos sistemas';loadSystems()}));
  m$$('[data-view="weekly"]').forEach(b=>b.addEventListener('click',()=>{m$('viewTitle').textContent='Relatório semanal';loadWeekly()}));
  m$$('[data-view-link="systems"]').forEach(b=>b.addEventListener('click',()=>{m$('viewTitle').textContent='Acessos aos sistemas';loadSystems()}));
  m$$('[data-view-link="weekly"]').forEach(b=>b.addEventListener('click',()=>{m$('viewTitle').textContent='Relatório semanal';loadWeekly()}));
}

window.addEventListener('load',async()=>{
  const ok=await moduleIdentity();
  if(!ok)return;
  bindModules();
  m$('weekStart')&&(m$('weekStart').value=currentMonday());
  await Promise.all([loadSystems(),loadWeekly()]);
});