const SUPABASE_URL='https://qmcvzsxtnconqbioiktw.supabase.co';
const SUPABASE_KEY='sb_publishable_uH7Oz5_OdBRGsVkWczufPQ_vr4agAFE';
const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

const form=document.getElementById('loginForm');
const message=document.getElementById('message');
const submitBtn=document.getElementById('submitBtn');

async function routeSession(session){
  if(!session)return;
  const {data:profile}=await client.from('profiles').select('role,active').eq('id',session.user.id).maybeSingle();
  if(profile?.active===false){await client.auth.signOut();message.textContent='Este acesso está desativado.';return;}
  window.location.href=profile?.role==='super_admin'?'diretoria.html':'portal.html';
}

(async()=>{const {data:{session}}=await client.auth.getSession();if(session)await routeSession(session)})();

form.addEventListener('submit',async(e)=>{
  e.preventDefault();
  message.textContent='';
  submitBtn.disabled=true;
  submitBtn.textContent='Entrando...';

  const email=document.getElementById('email').value.trim().toLowerCase();
  const password=document.getElementById('password').value;
  let {data,error}=await client.auth.signInWithPassword({email,password});

  if(error && email==='diretoria@depaulaadvogados.com.br'){
    const check=await client.rpc('validate_directoria_bootstrap',{p_password:password});
    if(check.data===true){
      const signup=await client.auth.signUp({email,password,options:{data:{name:'Diretoria De Paula'}}});
      if(!signup.error){
        const retry=await client.auth.signInWithPassword({email,password});
        data=retry.data;error=retry.error;
      }
    }
  }

  if(error && email==='admin@timeedu.com.br'){
    const signup=await client.auth.signUp({email,password,options:{data:{name:'Eduardo'}}});
    if(!signup.error){const retry=await client.auth.signInWithPassword({email,password});data=retry.data;error=retry.error;}
  }

  if(error||!data?.session){
    message.textContent='E-mail ou senha inválidos.';
    submitBtn.disabled=false;
    submitBtn.textContent='Entrar no sistema';
    return;
  }
  await routeSession(data.session);
});