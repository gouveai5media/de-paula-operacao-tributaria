const QUIZ_URL='https://qmcvzsxtnconqbioiktw.supabase.co';
const QUIZ_KEY='sb_publishable_uH7Oz5_OdBRGsVkWczufPQ_vr4agAFE';
const quizClient=window.supabase.createClient(QUIZ_URL,QUIZ_KEY,{auth:{storageKey:'portal-quiz-auth',persistSession:false}});

let quizUser=null,quizIsAdmin=false,quizQuestions=[],quizSubmissions=[],quizAnswers=[],quizProfiles=[];
const q$=id=>document.getElementById(id);
const q$$=sel=>[...document.querySelectorAll(sel)];
const qesc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
const qavg=arr=>arr.length?arr.reduce((a,b)=>a+Number(b||0),0)/arr.length:0;
const qfmt=n=>Number(n||0).toFixed(1);
const qdate=v=>v?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(v)):'';
const qdateTime=v=>v?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'';
const sectionOrder=['prospecting','meeting','closing','operation','tax','post_sale'];

function qToast(message,type=''){
  if(typeof toast==='function')return toast(message,type);
  const el=q$('toast');if(!el)return;el.textContent=message;el.className='toast show'+(type?' '+type:'');setTimeout(()=>el.className='toast',2600);
}
function qEmpty(title,text){
  if(typeof showEmpty==='function')return showEmpty(title,text);
  return '<div class="empty-state"><strong>'+qesc(title)+'</strong><span>'+qesc(text)+'</span></div>';
}
async function quizIdentity(){
  let session=null;
  const direct=await quizClient.auth.getSession();session=direct.data.session;
  if(!session){
    const key=Object.keys(localStorage).find(k=>k.includes('auth-token')&&k.includes('qmcvzsxtnconqbioiktw'));
    if(key){
      try{
        const parsed=JSON.parse(localStorage.getItem(key));
        const access=parsed?.access_token||parsed?.currentSession?.access_token;
        const refresh=parsed?.refresh_token||parsed?.currentSession?.refresh_token;
        if(access&&refresh){
          const set=await quizClient.auth.setSession({access_token:access,refresh_token:refresh});
          session=set.data.session;
        }
      }catch{}
    }
  }
  if(!session){
    const temp=window.supabase.createClient(QUIZ_URL,QUIZ_KEY);
    session=(await temp.auth.getSession()).data.session;
  }
  if(!session)return false;
  quizUser=session.user;
  const {data:profile}=await quizClient.from('profiles').select('role,active').eq('id',quizUser.id).maybeSingle();
  quizIsAdmin=(quizUser.email||'').toLowerCase()==='admin@timeedu.com.br'||profile?.role==='admin';
  if(quizIsAdmin)q$$('#view-quiz .exec-only').forEach(el=>el.classList.add('hidden'));
  else q$$('#view-quiz .admin-only').forEach(el=>el.classList.add('hidden'));
  return true;
}
async function loadQuizData(){
  const [questionsRes,subRes,ansRes]=await Promise.all([
    quizClient.from('quiz_questions').select('*').eq('active',true).order('sort_order'),
    quizClient.from('quiz_submissions').select('*, profiles:profiles!quiz_submissions_executive_id_fkey(name,email,active)').order('submitted_at',{ascending:false}),
    quizClient.from('quiz_answers').select('submission_id,question_id,score')
  ]);
  if(questionsRes.error||subRes.error||ansRes.error){
    console.error(questionsRes.error||subRes.error||ansRes.error);
    qToast('Não foi possível carregar o quiz.','error');return;
  }
  quizQuestions=questionsRes.data||[];
  quizSubmissions=subRes.data||[];
  quizAnswers=ansRes.data||[];
  if(quizIsAdmin){
    const {data}=await quizClient.from('profiles').select('id,name,email,active').eq('role','executive').order('name');
    quizProfiles=data||[];
    renderQuizAdmin();
  }else renderQuizExecutive();
}
function answersForSubmission(id){return quizAnswers.filter(a=>a.submission_id===id)}
function scoreForSubmission(id){return qavg(answersForSubmission(id).map(a=>a.score))}
function sectionScores(id){
  const answers=answersForSubmission(id);
  const map={};
  sectionOrder.forEach(section=>{
    const ids=new Set(quizQuestions.filter(q=>q.section===section).map(q=>q.id));
    const scores=answers.filter(a=>ids.has(a.question_id)).map(a=>a.score);
    map[section]=qavg(scores);
  });
  return map;
}
function sectionLabel(section){return quizQuestions.find(q=>q.section===section)?.section_label||section}
function renderQuizExecutive(){
  const mine=quizSubmissions.filter(s=>s.executive_id===quizUser.id).sort((a,b)=>new Date(b.submitted_at)-new Date(a.submitted_at));
  const latest=mine[0];
  const previous=mine[1];
  const latestScore=latest?scoreForSubmission(latest.id):0;
  const growth=latest&&previous?latestScore-scoreForSubmission(previous.id):0;
  q$('quizExecutiveSummary').innerHTML=
    '<article class="stat-card"><span class="stat-icon">◈</span><div><small>Ciclo atual</small><strong>'+(latest?latest.cycle_number:'1')+'</strong><p>'+(latest?'Última avaliação enviada':'Primeira avaliação')+'</p></div></article>'+
    '<article class="stat-card"><span class="stat-icon">★</span><div><small>Minha média atual</small><strong>'+qfmt(latestScore)+'</strong><p>Escala de 0 a 5</p></div></article>'+
    '<article class="stat-card"><span class="stat-icon">↗</span><div><small>Evolução</small><strong>'+(growth>=0?'+':'')+qfmt(growth)+'</strong><p>Desde o ciclo anterior</p></div></article>';

  renderMyQuizHistory(mine);
  const locked=latest&&Date.now()<new Date(latest.submitted_at).getTime()+10*24*60*60*1000;
  if(locked){
    const next=new Date(new Date(latest.submitted_at).getTime()+10*24*60*60*1000);
    q$('quizForm').classList.add('hidden');
    q$('quizLockedState').classList.remove('hidden');
    q$('quizLockedState').innerHTML='<span class="eyebrow">PRÓXIMO CICLO</span><h2>Sua avaliação foi registrada.</h2><p>Uma nova atualização ficará disponível em <strong>'+qdateTime(next)+'</strong>. Até lá, use os materiais do portal e os treinamentos para evoluir nos pontos identificados.</p>';
  }else{
    q$('quizLockedState').classList.add('hidden');
    q$('quizForm').classList.remove('hidden');
    renderQuizQuestions();
  }
}
function renderQuizQuestions(){
  const grouped=sectionOrder.map(section=>({section,questions:quizQuestions.filter(q=>q.section===section)})).filter(g=>g.questions.length);
  q$('quizQuestions').innerHTML=grouped.map(g=>'<section class="panel quiz-section"><div class="quiz-section-head"><div><span class="eyebrow">BLOCO</span><h2>'+qesc(sectionLabel(g.section))+'</h2></div><span>'+g.questions.length+' competências</span></div><div>'+g.questions.map(questionHtml).join('')+'</div></section>').join('');
  q$$('.score-option input').forEach(input=>input.addEventListener('change',updateQuizProgress));
  updateQuizProgress();
}
function questionHtml(q){
  return '<div class="quiz-question"><div class="quiz-question-title"><span class="quiz-question-number">'+q.sort_order+'</span><p>'+qesc(q.prompt)+'</p></div><div class="score-options">'+[0,1,2,3,4,5].map(score=>'<label class="score-option"><input type="radio" name="q-'+q.id+'" value="'+score+'" data-question-id="'+q.id+'"><span>'+score+'</span></label>').join('')+'</div></div>';
}
function updateQuizProgress(){
  const answered=new Set(q$$('.score-option input:checked').map(x=>x.dataset.questionId)).size;
  q$('quizProgressText').textContent=answered+' de '+quizQuestions.length+' respondidas';
}
function renderMyQuizHistory(mine){
  q$('quizMyHistory').innerHTML=mine.length?'<div class="quiz-history-list">'+mine.map(s=>{
    const sections=sectionScores(s.id);
    return '<article class="quiz-history-card"><div class="quiz-history-top"><div><strong>Ciclo '+s.cycle_number+'</strong><small>Enviado em '+qdateTime(s.submitted_at)+'</small></div><div class="quiz-history-score">'+qfmt(scoreForSubmission(s.id))+'</div></div><div class="quiz-section-mini">'+sectionOrder.map(sec=>'<div><span>'+qesc(sectionLabel(sec))+'</span><b>'+qfmt(sections[sec])+'</b></div>').join('')+'</div></article>';
  }).join('')+'</div>':qEmpty('Nenhuma avaliação enviada','Seu primeiro ciclo aparecerá aqui após o envio.');
}
async function submitQuiz(e){
  e.preventDefault();
  const selected=q$$('.score-option input:checked');
  if(selected.length!==quizQuestions.length){qToast('Responda todas as competências antes de enviar.','error');return}
  if(!confirm('Enviar esta avaliação? As notas deste ciclo ficarão registradas no histórico.'))return;
  const btn=e.submitter;btn.disabled=true;
  const answers=selected.map(i=>({question_id:i.dataset.questionId,score:Number(i.value)}));
  const {error}=await quizClient.rpc('submit_knowledge_quiz',{
    p_answers:answers,
    p_training_need:q$('quizTrainingNeed').value.trim()||null,
    p_commercial_difficulty:q$('quizCommercialDifficulty').value.trim()||null,
    p_client_objection:q$('quizClientObjection').value.trim()||null,
    p_training_format:q$('quizTrainingFormat').value.trim()||null
  });
  btn.disabled=false;
  if(error){console.error(error);qToast(error.message?.includes('not available')?'O próximo ciclo ainda não foi liberado.':'Não foi possível enviar a avaliação.','error');return}
  q$('quizForm').reset();qToast('Avaliação enviada. O próximo ciclo será liberado em 10 dias.');
  await loadQuizData();
}
function latestPerExecutive(submissions){
  const map=new Map();
  submissions.forEach(s=>{if(!map.has(s.executive_id))map.set(s.executive_id,s)});
  return [...map.values()];
}
function selectedAdminSubmissions(){
  const exec=q$('quizExecutiveFilter')?.value||'';
  const cycle=q$('quizCycleFilter')?.value||'latest';
  let list=[...quizSubmissions];
  if(exec)list=list.filter(s=>s.executive_id===exec);
  if(cycle==='latest')list=latestPerExecutive(list);
  return list;
}
function renderQuizAdmin(){
  const select=q$('quizExecutiveFilter');
  const old=select.value;
  select.innerHTML='<option value="">Todo o time</option>'+quizProfiles.map(p=>'<option value="'+p.id+'">'+qesc(p.name||p.email)+'</option>').join('');
  if([...select.options].some(o=>o.value===old))select.value=old;

  const selected=selectedAdminSubmissions();
  const scores=selected.map(s=>scoreForSubmission(s.id));
  q$('quizTeamAverage').textContent=qfmt(qavg(scores));
  q$('quizEvaluatedExecutives').textContent=new Set(quizSubmissions.map(s=>s.executive_id)).size;
  q$('quizAverageGrowth').textContent=formatGrowth(teamAverageGrowth());
  renderCriticalTopics(selected);
  renderSectionAverages(selected);
  renderExecutiveQuizCards();
}
function formatGrowth(v){return (v>=0?'+':'')+qfmt(v)}
function teamAverageGrowth(){
  const deltas=[];
  quizProfiles.forEach(p=>{
    const list=quizSubmissions.filter(s=>s.executive_id===p.id).sort((a,b)=>new Date(b.submitted_at)-new Date(a.submitted_at));
    if(list.length>=2)deltas.push(scoreForSubmission(list[0].id)-scoreForSubmission(list[1].id));
  });
  return qavg(deltas);
}
function renderCriticalTopics(submissions){
  const submissionIds=new Set(submissions.map(s=>s.id));
  const rows=quizQuestions.map(q=>{
    const scores=quizAnswers.filter(a=>a.question_id===q.id&&submissionIds.has(a.submission_id)).map(a=>a.score);
    return {q,avg:qavg(scores),count:scores.length};
  }).filter(x=>x.count).sort((a,b)=>a.avg-b.avg).slice(0,8);
  q$('quizCriticalTopics').innerHTML=rows.length?rows.map(x=>'<div class="quiz-topic-row"><div><strong>'+qesc(x.q.prompt)+'</strong><small>'+qesc(x.q.section_label)+' • '+x.count+' respostas</small></div><div class="quiz-topic-score">'+qfmt(x.avg)+'</div></div>').join(''):qEmpty('Sem dados ainda','Os pontos críticos aparecerão após as primeiras avaliações.');
}
function renderSectionAverages(submissions){
  const submissionIds=new Set(submissions.map(s=>s.id));
  const html=sectionOrder.map(sec=>{
    const qids=new Set(quizQuestions.filter(q=>q.section===sec).map(q=>q.id));
    const scores=quizAnswers.filter(a=>submissionIds.has(a.submission_id)&&qids.has(a.question_id)).map(a=>a.score);
    const avg=qavg(scores);
    return '<div class="quiz-bar-row"><span>'+qesc(sectionLabel(sec))+'</span><div class="quiz-bar-track"><div class="quiz-bar-fill" style="width:'+(avg/5*100)+'%"></div></div><b>'+qfmt(avg)+'</b></div>';
  }).join('');
  q$('quizSectionAverages').innerHTML=html||qEmpty('Sem dados','Aguardando avaliações.');
}
function renderExecutiveQuizCards(){
  const cards=quizProfiles.map(p=>{
    const list=quizSubmissions.filter(s=>s.executive_id===p.id).sort((a,b)=>new Date(b.submitted_at)-new Date(a.submitted_at));
    const latest=list[0];
    if(!latest)return {p,list,score:null,growth:null,priorities:[]};
    const score=scoreForSubmission(latest.id);
    const growth=list[1]?score-scoreForSubmission(list[1].id):null;
    const answers=answersForSubmission(latest.id);
    const priorities=quizQuestions.map(q=>({q,score:answers.find(a=>a.question_id===q.id)?.score})).filter(x=>x.score!==undefined).sort((a,b)=>a.score-b.score).slice(0,3);
    return {p,list,score,growth,priorities,latest};
  });
  q$('quizExecutiveCards').innerHTML=cards.length?cards.map(x=>'<article class="quiz-exec-card"><div class="quiz-exec-card-head"><div><strong>'+qesc(x.p.name||x.p.email)+'</strong><small>'+x.list.length+' ciclo(s)'+(x.latest?' • último em '+qdate(x.latest.submitted_at):'')+'</small></div><div class="quiz-exec-score">'+(x.score===null?'—':qfmt(x.score))+'</div></div>'+(x.growth!==null?'<small>Evolução: <b>'+formatGrowth(x.growth)+'</b></small>':'')+(x.latest?.open_training_need?'<p class="muted">Foco declarado: '+qesc(x.latest.open_training_need)+'</p>':'')+'<div class="quiz-priority-list">'+(x.priorities.length?x.priorities.map(v=>'<span class="quiz-priority">'+qesc(v.q.section_label)+': '+v.score+'/5</span>').join(''):'<span class="muted">Ainda sem avaliação</span>')+'</div></article>').join(''):qEmpty('Sem executivos','Cadastre executivos para iniciar as avaliações.');
}
function bindQuiz(){
  q$('quizForm')?.addEventListener('submit',submitQuiz);
  q$('quizExecutiveFilter')?.addEventListener('change',renderQuizAdmin);
  q$('quizCycleFilter')?.addEventListener('change',renderQuizAdmin);
  q$$('[data-view="quiz"]').forEach(b=>b.addEventListener('click',()=>{q$('viewTitle').textContent='Quiz de conhecimento';loadQuizData()}));
  q$$('[data-view-link="quiz"]').forEach(b=>b.addEventListener('click',()=>{q$('viewTitle').textContent='Quiz de conhecimento';loadQuizData()}));
}
window.addEventListener('load',async()=>{
  const ok=await quizIdentity();if(!ok)return;
  bindQuiz();
  await loadQuizData();
});