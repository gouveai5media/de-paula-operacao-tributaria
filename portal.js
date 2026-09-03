const SUPABASE_URL='https://qmcvzsxtnconqbioiktw.supabase.co';
const SUPABASE_KEY='sb_publishable_uH7Oz5_OdBRGsVkWczufPQ_vr4agAFE';
const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

async function init(){
  const {data:{session}}=await client.auth.getSession();
  if(!session){window.location.href='login.html';return;}

  const user=session.user;
  document.getElementById('userName').textContent=user.user_metadata?.name||user.email;
  let isAdmin=(user.email||'').toLowerCase()==='admin@timeedu.com.br';

  const {data:profile}=await client.from('profiles').select('name,role,active').eq('id',user.id).maybeSingle();
  if(profile){
    if(profile.active===false){await client.auth.signOut();window.location.href='login.html';return;}
    if(profile.name) document.getElementById('userName').textContent=profile.name;
    if(profile.role==='admin') isAdmin=true;
  }

  document.getElementById('userRole').textContent=isAdmin?'Administrador':'Executivo';
  if(!isAdmin){
    document.querySelectorAll('.admin-only,#adminUsersLink,#adminCard').forEach(el=>el.classList.add('hidden'));
  }

  const {count:k}=await client.from('knowledge_items').select('*',{count:'exact',head:true});
  document.getElementById('knowledgeCount').textContent=k??0;
  const {count:t}=await client.from('tickets').select('*',{count:'exact',head:true});
  document.getElementById('ticketCount').textContent=t??0;
  if(isAdmin){
    const {count:e}=await client.from('profiles').select('*',{count:'exact',head:true}).eq('role','executive').eq('active',true);
    document.getElementById('execCount').textContent=e??0;
  }
}
document.getElementById('logout').addEventListener('click',async()=>{await client.auth.signOut();window.location.href='login.html';});
init();