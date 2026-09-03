const SUPABASE_URL='https://qmcvzsxtnconqbioiktw.supabase.co';
const SUPABASE_KEY='sb_publishable_uH7Oz5_OdBRGsVkWczufPQ_vr4agAFE';
const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

let currentUser=null;
let currentProfile=null;
let isAdmin=false;
let knowledgeItems=[];
let tickets=[];
let executives=[];
let currentCategory='';
let ticketFilter='';

const $=id=>document.getElementById(id);
const $$=sel=>[...document.querySelectorAll(sel)];
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
const categoryLabel=v=>({email:'E-mail comercial',document:'Documento',capability:'Atestado de capacidade',contract:'Modelo de contrato',commission:'Tabela de comissão',objection:'Principal objeção',video:'Vídeo sobre a operação'})[v]||v;
const categoryIcon=v=>({email:'✉',document:'▤',capability:'✓',contract:'▣',commission:'%',objection:'?',video:'▶'})[v]||'◇';
const statusLabel=v=>({new:'Novo',in_progress:'Em andamento',done:'Concluído'})[v]||v;
const fmtDate=v=>v?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'';

function toast(message,type=''){
  const el=$('toast');
  el.textContent=message;
  el.className='toast show'+(type?' '+type:'');
  clearTimeout(window.__toastTimer);
  window.__toastTimer=setTimeout(()=>el.className='toast',2800);
}
function showEmpty(title,text){
  return `<div class="empty-state"><strong>${esc(title)}</strong><span>${esc(text)}</span></div>`;
}
function openModal(id){
  const modal=$(id);
  if(!modal)return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
}
function closeModal(modal){
  const el=typeof modal==='string'?$(modal):modal.closest?.('.modal')||modal;
  if(!el)return;
  el.classList.remove('open');
  el.setAttribute('aria-hidden','true');
}
function setView(view){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${view}`));
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const titles={dashboard:'Dashboard',knowledge:'Base de conhecimento',tickets:'Chamados',executives:'Executivos',manage:'Gerenciar conteúdos'};
  $('viewTitle').textContent=titles[view]||'Portal';
  if(innerWidth<901)$('.sidebar')?.classList.remove('open');
  history.replaceState(null,'','#'+view);
}
function greet(){
  const hour=new Date().getHours();
  return hour<12?'Bom dia':hour<18?'Boa tarde':'Boa noite';
}
async function ensureSession(){
  const {data:{session}}=await client.auth.getSession();
  if(!session){location.href='login.html';return null}
  currentUser=session.user;
  const {data:profile,error}=await client.from('profiles').select('*').eq('id',currentUser.id).maybeSingle();
  if(error) console.warn(error);
  currentProfile=profile;
  if(profile?.active===false){
    await client.auth.signOut();
    location.href='login.html';
    return null;
  }
  isAdmin=(currentUser.email||'').toLowerCase()==='admin@timeedu.com.br'||profile?.role==='admin';
  return session;
}
function applyIdentity(){
  const name=currentProfile?.name||currentUser?.user_metadata?.name||currentUser?.email||'Usuário';
  const role=isAdmin?'Administrador':'Executivo';
  $('userName').textContent=name;
  $('userRole').textContent=role;
  $('sideUserName').textContent=name;
  $('sideUserRole').textContent=role;
  $('userInitial').textContent=name.trim().charAt(0).toUpperCase()||'U';
  $('welcomeTitle').textContent=`${greet()}, ${name.split(' ')[0]}.`;
  $('welcomeText').textContent=isAdmin?'Gerencie acessos, conteúdos e demandas do time em um só lugar.':'Tudo que você precisa para conduzir a operação comercial está organizado aqui.';
  if(!isAdmin)$$('.admin-only').forEach(el=>el.classList.add('hidden'));
  $('ticketSubtitle').textContent=isAdmin?'Acompanhe as solicitações da equipe e sinalize o andamento de cada demanda.':'Abra uma solicitação para o Admin e acompanhe o andamento.';
}
async function loadAll(){
  await Promise.all([loadKnowledge(),loadTickets(),isAdmin?loadExecutives():Promise.resolve()]);
  renderDashboard();
}
async function loadKnowledge(){
  const {data,error}=await client.from('knowledge_items').select('*').order('created_at',{ascending:false});
  if(error){console.error(error);toast('Não foi possível carregar a base de conhecimento.','error');return}
  knowledgeItems=data||[];
  renderKnowledge();
  if(isAdmin)renderManage();
}
function filteredKnowledge(){
  const term=($('searchKnowledge')?.value||'').trim().toLowerCase();
  return knowledgeItems.filter(item=>{
    if(currentCategory&&item.category!==currentCategory)return false;
    if(!term)return true;
    return [item.title,item.body,item.note,item.file_name].some(v=>String(v||'').toLowerCase().includes(term));
  });
}
function renderKnowledge(){
  const list=filteredKnowledge();
  $('knowledgeCount').textContent=knowledgeItems.filter(x=>x.is_published||isAdmin).length;
  $('knowledgeList').innerHTML=list.length?list.map(item=>knowledgeCard(item)).join(''):showEmpty('Nenhum material encontrado','Tente outra busca ou categoria.');
  bindKnowledgeActions();
}
function knowledgeCard(item){
  const published=!isAdmin||item.is_published?'':'<span class="status-pill status-new">Rascunho</span>';
  const videoEmpty=item.category==='video'&&!item.body&&!item.file_path?'<p>Conteúdo em produção. Em breve.</p>':'';
  const body=item.body?`<p>${esc(item.body)}</p>`:videoEmpty;
  const note=item.note?`<p class="knowledge-note"><strong>Obs.:</strong> ${esc(item.note)}</p>`:'';
  let actions='';
  if(item.body&&(item.category==='email'||item.category==='objection'))actions+=`<button class="mini-btn" data-copy="${item.id}">Copiar ${item.category==='email'?'texto':'resposta'}</button>`;
  if(item.file_path)actions+=`<button class="mini-btn" data-download="${item.id}">Baixar ${esc(item.file_name||'arquivo')}</button>`;
  if(isAdmin)actions+=`<button class="mini-btn" data-edit-material="${item.id}">Editar</button>`;
  return `<article class="knowledge-card">
    <div>
      <div class="item-head"><span class="knowledge-type">${categoryIcon(item.category)} &nbsp; ${esc(categoryLabel(item.category))}</span>${published}</div>
      <h3>${esc(item.title)}</h3>${body}${note}
    </div>
    <div class="card-actions">${actions}</div>
  </article>`;
}
function bindKnowledgeActions(){
  $$('[data-copy]').forEach(b=>b.onclick=()=>copyKnowledge(b.dataset.copy));
  $$('[data-download]').forEach(b=>b.onclick=()=>downloadKnowledge(b.dataset.download));
  $$('[data-edit-material]').forEach(b=>b.onclick=()=>editMaterial(b.dataset.editMaterial));
}
async function copyKnowledge(id){
  const item=knowledgeItems.find(x=>x.id===id);
  if(!item?.body)return;
  try{await navigator.clipboard.writeText(item.body);toast('Conteúdo copiado.')}catch{toast('Não foi possível copiar automaticamente.','error')}
}
async function downloadKnowledge(id){
  const item=knowledgeItems.find(x=>x.id===id);
  if(!item?.file_path)return;
  const {data,error}=await client.storage.from('portal-files').createSignedUrl(item.file_path,90);
  if(error){toast('Não foi possível abrir o arquivo.','error');return}
  window.open(data.signedUrl,'_blank','noopener');
}
function renderManage(filter=''){
  if(!isAdmin)return;
  ['email','document','capability','contract','commission','objection'].forEach(cat=>{
    const el=$(`count-${cat}`);
    if(el)el.textContent=`${knowledgeItems.filter(x=>x.category===cat).length} itens`;
  });
  const list=filter?knowledgeItems.filter(x=>x.category===filter):knowledgeItems;
  $('manageList').innerHTML=list.length?list.map(item=>`<div class="table-row">
    <div><strong>${esc(item.title)}</strong><small>${esc(categoryLabel(item.category))}</small></div>
    <div><small>${item.file_name?esc(item.file_name):'Sem arquivo anexo'}</small></div>
    <div><span class="status-pill ${item.is_published?'status-done':'status-new'}">${item.is_published?'Publicado':'Rascunho'}</span></div>
    <div class="row-actions"><button class="mini-btn" data-edit-material="${item.id}">Editar</button><button class="danger-btn mini-btn" data-delete-material="${item.id}">Excluir</button></div>
  </div>`).join(''):showEmpty('Sem materiais','Cadastre o primeiro conteúdo desta categoria.');
  $$('[data-edit-material]').forEach(b=>b.onclick=()=>editMaterial(b.dataset.editMaterial));
  $$('[data-delete-material]').forEach(b=>b.onclick=()=>deleteMaterial(b.dataset.deleteMaterial));
}
function resetMaterialForm(){
  $('knowledgeForm').reset();
  $('knowledgeId').value='';
  $('knowledgePublished').checked=true;
  $('materialModalTitle').textContent='Novo material';
  $('currentFileLabel').textContent='PDF, DOCX, XLSX ou outro arquivo comercial';
}
function editMaterial(id){
  const item=knowledgeItems.find(x=>x.id===id);
  if(!item)return;
  resetMaterialForm();
  $('knowledgeId').value=item.id;
  $('knowledgeCategory').value=item.category;
  $('knowledgeTitle').value=item.title||'';
  $('knowledgeBody').value=item.body||'';
  $('knowledgeNote').value=item.note||'';
  $('knowledgePublished').checked=!!item.is_published;
  $('currentFileLabel').textContent=item.file_name?`Arquivo atual: ${item.file_name}. Escolha outro para substituir.`:'Sem arquivo atual.';
  $('materialModalTitle').textContent='Editar material';
  openModal('materialModal');
}
async function saveMaterial(e){
  e.preventDefault();
  const submit=e.submitter;
  submit.disabled=true;
  const id=$('knowledgeId').value;
  const existing=knowledgeItems.find(x=>x.id===id);
  const category=$('knowledgeCategory').value;
  const file=$('knowledgeFile').files[0];
  let filePath=existing?.file_path||null;
  let fileName=existing?.file_name||null;
  let fileType=existing?.file_type||null;
  let uploadedNew=false;

  if(file){
    const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    filePath=`${category}/${Date.now()}-${safe}`;
    fileName=file.name;
    fileType=file.type||null;
    const {error:uploadError}=await client.storage.from('portal-files').upload(filePath,file,{upsert:false});
    if(uploadError){submit.disabled=false;toast('Falha ao enviar o arquivo.','error');return}
    uploadedNew=true;
  }

  const payload={
    category,
    title:$('knowledgeTitle').value.trim(),
    body:$('knowledgeBody').value.trim()||null,
    note:$('knowledgeNote').value.trim()||null,
    file_path:filePath,
    file_name:fileName,
    file_type:fileType,
    is_published:$('knowledgePublished').checked,
    updated_at:new Date().toISOString()
  };
  let error;
  if(id){
    ({error}=await client.from('knowledge_items').update(payload).eq('id',id));
  }else{
    payload.created_by=currentUser.id;
    ({error}=await client.from('knowledge_items').insert(payload));
  }
  if(error){
    if(uploadedNew)await client.storage.from('portal-files').remove([filePath]);
    submit.disabled=false;
    toast('Não foi possível salvar o material.','error');
    return;
  }
  if(id&&uploadedNew&&existing?.file_path&&existing.file_path!==filePath)await client.storage.from('portal-files').remove([existing.file_path]);
  submit.disabled=false;
  closeModal('materialModal');
  resetMaterialForm();
  toast(id?'Material atualizado.':'Material publicado.');
  await loadKnowledge();
}
async function deleteMaterial(id){
  const item=knowledgeItems.find(x=>x.id===id);
  if(!item||!confirm(`Excluir "${item.title}"? Esta ação não pode ser desfeita.`))return;
  const {error}=await client.from('knowledge_items').delete().eq('id',id);
  if(error){toast('Não foi possível excluir o material.','error');return}
  if(item.file_path)await client.storage.from('portal-files').remove([item.file_path]);
  toast('Material excluído.');
  await loadKnowledge();
}

async function loadTickets(){
  let query=client.from('tickets').select('*, profiles:executive_id(name,email)').order('created_at',{ascending:false});
  const {data,error}=await query;
  if(error){console.error(error);toast('Não foi possível carregar os chamados.','error');return}
  tickets=data||[];
  renderTickets();
}
function renderTickets(){
  const open=tickets.filter(t=>t.status!=='done').length;
  $('ticketCount').textContent=open;
  $('navTicketBadge').textContent=open;
  const list=ticketFilter?tickets.filter(t=>t.status===ticketFilter):tickets;
  $('ticketList').innerHTML=list.length?list.map(ticketCard).join(''):showEmpty('Nenhum chamado','Não há solicitações neste filtro.');
  $$('[data-admin-ticket]').forEach(b=>b.onclick=()=>openAdminTicket(b.dataset.adminTicket));
  renderRecentTickets();
}
function ticketCard(t){
  const exec=t.profiles?.name||t.profiles?.email||'Executivo';
  const note=t.admin_note?`<div class="admin-note"><strong>Retorno do Admin:</strong> ${esc(t.admin_note)}</div>`:'';
  return `<article class="ticket-card">
    <div>
      <span class="status-pill status-${esc(t.status)}">${esc(statusLabel(t.status))}</span>
      <h3>${esc(t.subject)}</h3>
      <p>${esc(t.description)}</p>
      ${note}
      <div class="ticket-meta">${isAdmin?`<span>Solicitante: ${esc(exec)}</span>`:''}<span>Aberto em ${fmtDate(t.created_at)}</span><span>Atualizado em ${fmtDate(t.updated_at)}</span></div>
    </div>
    <div>${isAdmin?`<button class="secondary" data-admin-ticket="${t.id}">Atualizar</button>`:''}</div>
  </article>`;
}
function renderRecentTickets(){
  const list=tickets.slice(0,4);
  $('recentTickets').innerHTML=list.length?list.map(t=>`<div class="compact-item"><span class="status-pill status-${esc(t.status)}">${esc(statusLabel(t.status))}</span><strong>${esc(t.subject)}</strong><small>${fmtDate(t.created_at)}</small></div>`).join(''):showEmpty('Sem chamados recentes','As novas solicitações aparecerão aqui.');
}
async function createTicket(e){
  e.preventDefault();
  const submit=e.submitter;
  submit.disabled=true;
  const {error}=await client.from('tickets').insert({
    executive_id:currentUser.id,
    subject:$('ticketSubject').value.trim(),
    description:$('ticketDescription').value.trim()
  });
  submit.disabled=false;
  if(error){toast('Não foi possível abrir o chamado.','error');return}
  $('ticketForm').reset();
  closeModal('ticketModal');
  toast('Chamado aberto com sucesso.');
  await loadTickets();
}
function openAdminTicket(id){
  const t=tickets.find(x=>x.id===id);
  if(!t)return;
  $('adminTicketId').value=t.id;
  $('adminTicketTitle').textContent=t.subject;
  $('adminTicketStatus').value=t.status;
  $('adminTicketNote').value=t.admin_note||'';
  openModal('ticketAdminModal');
}
async function updateAdminTicket(e){
  e.preventDefault();
  const submit=e.submitter;
  submit.disabled=true;
  const {error}=await client.from('tickets').update({
    status:$('adminTicketStatus').value,
    admin_note:$('adminTicketNote').value.trim()||null,
    updated_at:new Date().toISOString()
  }).eq('id',$('adminTicketId').value);
  submit.disabled=false;
  if(error){toast('Não foi possível atualizar o chamado.','error');return}
  closeModal('ticketAdminModal');
  toast('Chamado atualizado.');
  await loadTickets();
}

async function loadExecutives(){
  const {data,error}=await client.from('profiles').select('*').eq('role','executive').order('created_at',{ascending:false});
  if(error){console.error(error);toast('Não foi possível carregar os executivos.','error');return}
  executives=data||[];
  renderExecutives();
}
function renderExecutives(){
  const term=($('searchExecutives')?.value||'').trim().toLowerCase();
  const list=executives.filter(x=>!term||[x.name,x.email].some(v=>String(v||'').toLowerCase().includes(term)));
  const active=executives.filter(x=>x.active).length;
  $('execCount').textContent=active;
  $('execSummary').textContent=`${active} ativos • ${executives.length-active} desativados`;
  $('executiveList').innerHTML=list.length?list.map(x=>`<div class="table-row">
    <div><strong>${esc(x.name||'Sem nome')}</strong><small>Cadastrado em ${fmtDate(x.created_at)}</small></div>
    <div><strong>${esc(x.email)}</strong><small>Acesso corporativo</small></div>
    <div><span class="status-pill ${x.active?'status-done':'status-new'}">${x.active?'Ativo':'Desativado'}</span></div>
    <div class="row-actions"><button class="mini-btn" data-edit-user="${x.id}">Editar</button><button class="mini-btn" data-toggle-user="${x.id}">${x.active?'Desativar':'Ativar'}</button><button class="danger-btn mini-btn" data-delete-user="${x.id}">Excluir</button></div>
  </div>`).join(''):showEmpty('Nenhum executivo','Cadastre o primeiro acesso do time comercial.');
  $$('[data-edit-user]').forEach(b=>b.onclick=()=>editExecutive(b.dataset.editUser));
  $$('[data-toggle-user]').forEach(b=>b.onclick=()=>toggleExecutive(b.dataset.toggleUser));
  $$('[data-delete-user]').forEach(b=>b.onclick=()=>deleteExecutive(b.dataset.deleteUser));
}
function resetExecutiveForm(){
  $('executiveForm').reset();
  $('execId').value='';
  $('executiveModalTitle').textContent='Cadastrar executivo';
  $('passwordHint').textContent='mínimo 8 caracteres';
  $('execPassword').required=true;
}
function editExecutive(id){
  const x=executives.find(v=>v.id===id);
  if(!x)return;
  resetExecutiveForm();
  $('execId').value=x.id;
  $('execName').value=x.name||'';
  $('execEmail').value=x.email||'';
  $('execPassword').required=false;
  $('execPassword').placeholder='Deixe em branco para manter a senha';
  $('passwordHint').textContent='preencha somente se quiser trocar a senha';
  $('executiveModalTitle').textContent='Editar executivo';
  openModal('executiveModal');
}
async function adminUserAction(action,payload){
  const {data:{session}}=await client.auth.getSession();
  const res=await fetch(SUPABASE_URL+'/functions/v1/admin-users',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':SUPABASE_KEY},
    body:JSON.stringify({action,...payload})
  });
  let out={};
  try{out=await res.json()}catch{}
  if(!res.ok)throw new Error(out.error||'Erro na operação');
  return out;
}
async function saveExecutive(e){
  e.preventDefault();
  const submit=e.submitter;
  submit.disabled=true;
  const id=$('execId').value;
  try{
    await adminUserAction(id?'update':'create',{
      ...(id?{user_id:id}:{}),
      name:$('execName').value.trim(),
      email:$('execEmail').value.trim().toLowerCase(),
      password:$('execPassword').value
    });
    closeModal('executiveModal');
    resetExecutiveForm();
    toast(id?'Executivo atualizado.':'Executivo cadastrado e acesso liberado.');
    await loadExecutives();
  }catch(err){toast(err.message,'error')}
  submit.disabled=false;
}
async function toggleExecutive(id){
  const x=executives.find(v=>v.id===id);
  if(!x)return;
  try{
    await adminUserAction('toggle',{user_id:id,active:!x.active});
    toast(x.active?'Acesso desativado.':'Acesso reativado.');
    await loadExecutives();
  }catch(err){toast(err.message,'error')}
}
async function deleteExecutive(id){
  const x=executives.find(v=>v.id===id);
  if(!x||!confirm(`Excluir o acesso de ${x.name||x.email}? Os chamados vinculados também poderão ser removidos.`))return;
  try{
    await adminUserAction('delete',{user_id:id});
    toast('Executivo excluído.');
    await Promise.all([loadExecutives(),loadTickets()]);
  }catch(err){toast(err.message,'error')}
}

function renderDashboard(){
  renderRecentTickets();
}
function bindUI(){
  $$('.nav-item').forEach(b=>b.onclick=()=>setView(b.dataset.view));
  $$('[data-view-link]').forEach(b=>b.onclick=()=>setView(b.dataset.viewLink));
  $$('[data-category-link]').forEach(b=>b.onclick=()=>{
    currentCategory=b.dataset.categoryLink;
    $$('#categoryTabs button').forEach(x=>x.classList.toggle('active',x.dataset.category===currentCategory));
    renderKnowledge();
    setView('knowledge');
  });
  $$('[data-open-modal]').forEach(b=>b.onclick=()=>{
    if(b.dataset.openModal==='materialModal')resetMaterialForm();
    if(b.dataset.openModal==='executiveModal')resetExecutiveForm();
    openModal(b.dataset.openModal);
  });
  $$('[data-close-modal]').forEach(b=>b.onclick=()=>closeModal(b));
  $$('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m)}));
  $('mobileMenu').onclick=()=>$('.sidebar').classList.toggle('open');
  $('refreshBtn').onclick=async()=>{toast('Atualizando dados...');await loadAll();toast('Portal atualizado.')};
  $('logout').onclick=async()=>{await client.auth.signOut();location.href='login.html'};
  $('searchKnowledge').addEventListener('input',renderKnowledge);
  $('categoryTabs').addEventListener('click',e=>{
    const b=e.target.closest('button[data-category]');
    if(!b)return;
    currentCategory=b.dataset.category||'';
    $$('#categoryTabs button').forEach(x=>x.classList.toggle('active',x===b));
    renderKnowledge();
  });
  $$('.filter-chip').forEach(b=>b.onclick=()=>{
    ticketFilter=b.dataset.ticketFilter||'';
    $$('.filter-chip').forEach(x=>x.classList.toggle('active',x===b));
    renderTickets();
  });
  $$('.manage-card').forEach(b=>b.onclick=()=>renderManage(b.dataset.manageCategory));
  $('searchExecutives')?.addEventListener('input',renderExecutives);
  $('knowledgeForm').addEventListener('submit',saveMaterial);
  $('ticketForm').addEventListener('submit',createTicket);
  $('ticketAdminForm').addEventListener('submit',updateAdminTicket);
  $('executiveForm').addEventListener('submit',saveExecutive);
}

async function init(){
  const session=await ensureSession();
  if(!session)return;
  applyIdentity();
  bindUI();
  const hash=location.hash.replace('#','');
  const allowed=['dashboard','knowledge','tickets','executives','manage'];
  if(allowed.includes(hash)&&(!['executives','manage'].includes(hash)||isAdmin))setView(hash);else setView('dashboard');
  await loadAll();
}
init();