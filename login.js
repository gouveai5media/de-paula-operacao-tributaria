const SUPABASE_URL='https://qmcvzsxtnconqbioiktw.supabase.co';
const SUPABASE_KEY='sb_publishable_uH7Oz5_OdBRGsVkWczufPQ_vr4agAFE';
const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

const form=document.getElementById('loginForm');
const message=document.getElementById('message');
const submitBtn=document.getElementById('submitBtn');

(async()=>{
  const {data:{session}}=await client.auth.getSession();
  if(session) window.location.href='portal.html';
})();

form.addEventListener('submit',async(e)=>{
  e.preventDefault();
  message.textContent='';
  message.classList.remove('ok');
  submitBtn.disabled=true;
  submitBtn.textContent='Entrando...';

  const email=document.getElementById('email').value.trim().toLowerCase();
  const password=document.getElementById('password').value;

  let {data,error}=await client.auth.signInWithPassword({email,password});

  if(error && email==='admin@timeedu.com.br'){
    const signup=await client.auth.signUp({
      email,
      password,
      options:{data:{name:'Admin De Paula'}}
    });
    if(!signup.error && signup.data.session){
      window.location.href='portal.html';
      return;
    }
    if(!signup.error && !signup.data.session){
      message.textContent='Conta criada. O Supabase solicitou confirmação do e-mail antes do primeiro acesso.';
      submitBtn.disabled=false;
      submitBtn.textContent='Entrar no sistema';
      return;
    }
  }

  if(error){
    message.textContent='E-mail ou senha inválidos.';
    submitBtn.disabled=false;
    submitBtn.textContent='Entrar no sistema';
    return;
  }

  window.location.href='portal.html';
});