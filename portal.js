const SUPABASE_URL='https://qmcvzsxtnconqbioiktw.supabase.co';
const SUPABASE_KEY='sb_publishable_uH7Oz5_OdBRGsVkWczufPQ_vr4agAFE';
const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let currentUser=null,isAdmin=false,currentCategory='';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)}
function categoryLabel(v){return ({email:'E-mail comercial',document:'Documento',capability:'Atestado de capacidade',contract:'Modelo de contrato',commission:'Tabela de comissão',objection:'Principal objeção',video:'Vídeo sobre operação'})[v]||v}

async function init(){
 const {data:{session}}=await client.auth.getSession();
 if(!session){location.href='login.html';return}
 currentUser=session.user;
 const {data:profile}=await client.from('profiles').select('*').eq('id',currentUser.id).maybeSingle();
 if(profile?.active===false){await client.auth.signOut();location.href='login.html';return}
 isAdmin=(currentUser.email||'').toLowerCase()==='admin@timeedu.com.br'||profile?.role==='admin';
 $('userName').textContent=profile?.name||currentUser.user_metadata?.name||currentUser.email;
 $('userRole').textContent=isAdmin?'Administrador':'Executivo';
 if(!isAdmin) document.querySelectorAll('.admin-only').forEach(x=>x.classList.add('hidden'));
 await Promise.all([loadKnowledge(),loadTickets(),isAdmin?loadExecutives():Promise.resolve()]);
}

async function loadKnowledge(){
 let q=client.from('knowledge_items').select('*').order('created_at',{ascending:false});
 if(currentCategory) q=q.eq('category',currentCategory);
 const {data,error}=await q;
 if(error){toast('Erro ao carregar materiais');return}
 const term=($('searchKnowledge')?.value||'').toLowerCase();
 const list=(data||[]).filter(x=>!term||[x.title,x.body,x.note].join(' ').toLowerCase().includes(term));
 $('knowledgeCount').textContent=list.length;
 $('knowledgeList').innerHTML=list.length?list.map(item=>renderKnowledge(item)).join(''):'<div class="item"><p>Nenhum material encontrado.</p></div>';
 document.querySelectorAll('[data-download]').forEach(btn=>btn.onclick=()=>downloadFile(btn.dataset.download));
 document.querySelectorAll('[data-delete-knowledge]').forEach(btn=>btn.onclick=()=>deleteKnowledge(btn.dataset.deleteKnowledge,btn.dataset.file||''));
}

function renderKnowledge(item){
 let extra='';
 if(item.category==='video') extra='<span class="meta">EM BREVE</span>';
 if(item.file_path) extra+=`<button class="secondary" data-download="${esc(item.file_path)}">Baixar arquivo</button>`;
 const adminActions=isAdmin?`<button class="danger" data-delete-knowledge="${item.id}" data-file="${esc(item.file_path||'')}">Excluir</button>`:'';
 return `<article class="item"><div class="item-head"><div><span class="meta">${esc(categoryLabel(item.category))}</span><h3>${esc(item.title)}</h3></div><div class="actions">${extra}${adminActions}</div></div>${item.body?`<p>${esc(item.body)}</p>`:''}${item.note?`<p><strong>Obs.:</strong> ${esc(item.note)}</p>`:''}</article>`;
}

async function downloadFile(path){
 const {data,error}=await client.storage.from('portal-files').createSignedUrl(path,60);
 if(error){toast('Não foi possível abrir o arquivo');return}
 window.open(data.signedUrl,'_blank');
}

async function deleteKnowledge(id,path){
 if(!confirm('Excluir este material?')) return;
 if(path) await client.storage.from('portal-files').remove([path]);
 const {error}=await client.from('knowledge_items').delete().eq('id',id);
 if(error) return toast('Erro ao excluir');
 toast('Material excluído');loadKnowledge();
}

async function loadTickets(){
 const {data,error}=await client.from('tickets').select('*, profiles:executive_id(name,email)').order('created_at',{ascending:false});
 if(error){toast('Erro ao carregar chamados');return}
 $('ticketCount').textContent=(data||[]).length;
 $('ticketList').innerHTML=(data||[]).length?(data||[]).map(t=>`<article class="item"><div class="item-head"><div><span class="meta">${esc(t.status)}</span><h3>${esc(t.subject)}</h3></div>${isAdmin?`<select data-ticket-status="${t.id}"><option value="new" ${t.status==='new'?'selected':''}>Novo</option><option value="in_progress" ${t.status==='in_progress'?'selected':''}>Em andamento</option><option value="done" ${t.status==='done'?'selected':''}>Concluído</option></select>`:''}</div><p>${esc(t.description)}</p>${isAdmin&&t.profiles?`<p><strong>Executivo:</strong> ${esc(t.profiles.name||t.profiles.email)}</p>`:''}</article>`).join(''):'<div class="item"><p>Nenhum chamado.</p></div>';
 document.querySelectorAll('[data-ticket-status]').forEach(el=>el.onchange=()=>updateTicket(el.dataset.ticketStatus,el.value));
}

async function updateTicket(id,status){
 const {error}=await client.from('tickets').update({status,updated_at:new Date().toISOString()}).eq('id',id);
 if(error)return toast('Erro ao atualizar chamado');toast('Chamado atualizado');loadTickets();
}

async function loadExecutives(){
 const {data,error}=await client.from('profiles').select('*').eq('role','executive').order('created_at',{ascending:false});
 if(error){toast('Erro ao carregar executivos');return}
 $('execCount').textContent=(data||[]).filter(x=>x.active).length;
 $('executiveList').innerHTML=(data||[]).length?(data||[]).map(x=>`<article class="item"><div class="item-head"><div><h3>${esc(x.name||'Sem nome')}</h3><p>${esc(x.email)}</p></div><div class="actions"><button class="secondary" data-toggle-user="${x.id}" data-active="${x.active?'1':'0'}">${x.active?'Desativar':'Ativar'}</button><button class="danger" data-delete-user="${x.id}">Excluir</button></div></div></article>`).join(''):'<div class="item"><p>Nenhum executivo cadastrado.</p></div>';
 document.querySelectorAll('[data-toggle-user]').forEach(b=>b.onclick=()=>adminUserAction('toggle',{user_id:b.dataset.toggleUser,active:b.dataset.active!=='1'}));
 document.querySelectorAll('[data-delete-user]').forEach(b=>b.onclick=()=>{if(confirm('Excluir este executivo e seu acesso?'))adminUserAction('delete',{user_id:b.dataset.deleteUser})});
}

async function adminUserAction(action,payload){
 const {data:{session}}=await client.auth.getSession();
 const res=await fetch(SUPABASE_URL+'/functions/v1/admin-users',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':SUPABASE_KEY},body:JSON.stringify({action,...payload})});
 const out=await res.json();
 if(!res.ok)return toast(out.error||'Erro na operação');
 toast('Operação concluída');loadExecutives();
}

$('executiveForm')?.addEventListener('submit',async e=>{
 e.preventDefault();
 const btn=e.submitter;btn.disabled=true;
 await adminUserAction('create',{name:$('execName').value.trim(),email:$('execEmail').value.trim(),password:$('execPassword').value});
 e.target.reset();btn.disabled=false;
});

$('knowledgeForm')?.addEventListener('submit',async e=>{
 e.preventDefault();
 const btn=e.submitter;btn.disabled=true;
 const file=$('knowledgeFile').files[0];
 let filePath=null,fileName=null,fileType=null;
 if(file){
   fileName=file.name;fileType=file.type;
   filePath=Date.now()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
   const up=await client.storage.from('portal-files').upload(filePath,file,{upsert:false});
   if(up.error){btn.disabled=false;return toast('Erro no upload do arquivo')}
 }
 const {error}=await client.from('knowledge_items').insert({
   category:$('knowledgeCategory').value,title:$('knowledgeTitle').value.trim(),body:$('knowledgeBody').value.trim()||null,note:$('knowledgeNote').value.trim()||null,file_path:filePath,file_name:fileName,file_type:fileType,is_published:$('knowledgePublished').checked,created_by:currentUser.id
 });
 if(error){if(filePath)await client.storage.from('portal-files').remove([filePath]);btn.disabled=false;return toast('Erro ao salvar material')}
 e.target.reset();$('knowledgePublished').checked=true;btn.disabled=false;toast('Material publicado');loadKnowledge();
});

$('ticketForm')?.addEventListener('submit',async e=>{
 e.preventDefault();
 const {error}=await client.from('tickets').insert({executive_id:currentUser.id,subject:$('ticketSubject').value.trim(),description:$('ticketDescription').value.trim()});
 if(error)return toast('Erro ao abrir chamado');
 e.target.reset();toast('Chamado aberto');loadTickets();
});

$('searchKnowledge')?.addEventListener('input',loadKnowledge);
$('categoryTabs')?.addEventListener('click',e=>{if(e.target.matches('button')){currentCategory=e.target.dataset.category||'';loadKnowledge()}});
$('logout').addEventListener('click',async()=>{await client.auth.signOut();location.href='login.html'});
init();