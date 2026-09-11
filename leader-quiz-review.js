(()=>{
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmt=v=>v?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'';
  const avg=a=>a.length?a.reduce((s,x)=>s+Number(x||0),0)/a.length:0;
  const toastMsg=(m,t='')=>typeof toast==='function'?toast(m,t):console.log(m);

  function injectStyles(){
    if($('leaderQuizReviewStyles'))return;
    const s=document.createElement('style');s.id='leaderQuizReviewStyles';s.textContent=`
    .quiz-review-panel{margin-top:18px}.quiz-review-filters{display:grid;grid-template-columns:1fr 220px 220px;gap:14px;align-items:end}.quiz-review-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:18px}.quiz-review-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:15px 0}.quiz-review-kpi{padding:14px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.015)}.quiz-review-kpi small,.quiz-review-kpi strong{display:block}.quiz-review-kpi small{font-size:9px;color:var(--muted)}.quiz-review-kpi strong{font-size:25px;color:var(--gold2);margin-top:4px}.quiz-review-list{display:grid;gap:10px}.quiz-review-item{border:1px solid var(--line);border-radius:11px;padding:16px;background:rgba(255,255,255,.012)}.quiz-review-question{display:flex;gap:10px;align-items:flex-start}.quiz-review-number{width:26px;height:26px;border-radius:6px;background:rgba(217,183,102,.08);color:var(--gold);display:grid;place-items:center;font-size:9px;flex:0 0 auto}.quiz-review-question strong{font-size:12px;line-height:1.5}.quiz-review-meta{display:flex;gap:8px;flex-wrap:wrap;margin:11px 0}.quiz-review-score{padding:6px 9px;border:1px solid var(--line);border-radius:7px;font-size:10px}.quiz-review-score b{color:var(--gold2)}.quiz-review-controls{display:grid;grid-template-columns:150px 1fr auto;gap:10px;align-items:end}.quiz-review-controls textarea{min-height:68px}.quiz-review-summary{margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}.quiz-review-summary textarea{min-height:95px}.quiz-pending-badge{margin-left:auto;min-width:20px;height:20px;padding:0 6px;border-radius:99px;background:#b94a4a;color:#fff;display:grid;place-items:center;font-size:9px;font-weight:800}.quiz-pending-banner{margin-bottom:18px;padding:16px 18px;border:1px solid rgba(217,183,102,.28);border-radius:12px;background:linear-gradient(135deg,rgba(217,183,102,.09),rgba(217,183,102,.025));display:flex;justify-content:space-between;gap:18px;align-items:center}.quiz-pending-banner strong,.quiz-pending-banner small{display:block}.quiz-pending-banner small{color:var(--muted);margin-top:4px}.quiz-pending-banner button{white-space:nowrap}@media(max-width:900px){.quiz-review-filters,.quiz-review-controls{grid-template-columns:1fr}.quiz-review-kpis{grid-template-columns:1fr}.quiz-review-head,.quiz-pending-banner{flex-direction:column;align-items:flex-start}}
    `;document.head.appendChild(s);
  }

  async function pendingExecutiveQuiz(){
    try{
      if(!currentProfile||currentProfile.role!=='executive')return;
      const {data,error}=await client.from('quiz_submissions').select('submitted_at,cycle_number').eq('executive_id',currentUser.id).order('submitted_at',{ascending:false}).limit(1);
      if(error)return;
      const latest=data?.[0];
      const due=!latest||Date.now()>=new Date(latest.submitted_at).getTime()+10*86400000;
      if(!due)return;
      const nav=document.querySelector('.nav-item[data-view="quiz"]');
      if(nav&&!nav.querySelector('.quiz-pending-badge')){const b=document.createElement('b');b.className='quiz-pending-badge';b.textContent='!';nav.appendChild(b)}
      const dash=$('view-dashboard');if(dash&&!$('quizPendingBanner')){
        const banner=document.createElement('div');banner.id='quizPendingBanner';banner.className='quiz-pending-banner';
        banner.innerHTML='<div><strong>'+(latest?'Novo ciclo do Quiz disponível':'Seu primeiro Quiz está disponível')+'</strong><small>'+(latest?'Já passaram 10 dias desde o último preenchimento. Atualize suas notas para acompanharmos sua evolução.':'Faça sua primeira autoavaliação de conhecimento.')+'</small></div><button class="primary" type="button">Preencher agora</button>';
        banner.querySelector('button').onclick=()=>typeof setView==='function'&&setView('quiz');
        const hero=dash.querySelector('.hero-row');hero?.insertAdjacentElement('afterend',banner);
      }
    }catch(e){console.warn(e)}
  }

  let reviewState={profiles:[],subs:[],answers:[],questions:[]};
  async function loadLeaderReview(){
    try{
      if(!currentProfile||currentProfile.role!=='admin')return;
      injectStyles();
      const area=$('quizAdminArea');if(!area)return;
      let panel=$('leaderQuizReview');
      if(!panel){
        panel=document.createElement('section');panel.id='leaderQuizReview';panel.className='panel quiz-review-panel';
        panel.innerHTML=`<div class="quiz-review-head"><div><span class="eyebrow">1 A 1 • VALIDAÇÃO DO LÍDER</span><h2>Revisão individual do Quiz</h2><p class="muted">Selecione um executivo e um ciclo. A nota original é preservada; sua avaliação fica registrada separadamente.</p></div></div><div class="quiz-review-filters"><label>Executivo<select id="reviewExecutive"><option value="">Selecione</option></select></label><label>Ciclo<select id="reviewCycle"><option value="">Selecione o executivo</option></select></label><div><span class="muted">Autoavaliação x validação do líder</span></div></div><div id="reviewContent" style="margin-top:18px"></div>`;
        area.insertBefore(panel,area.firstChild);
        $('reviewExecutive').addEventListener('change',fillCycles);
        $('reviewCycle').addEventListener('change',renderReview);
      }
      const [p,s,a,q]=await Promise.all([
        client.from('profiles').select('id,name,email,executive_level,active').eq('role','executive').order('name'),
        client.from('quiz_submissions').select('id,executive_id,cycle_number,submitted_at,leader_review_summary,leader_reviewed_at').order('submitted_at',{ascending:false}),
        client.from('quiz_answers').select('id,submission_id,question_id,score,leader_score,leader_note,reviewed_at'),
        client.from('quiz_questions').select('id,prompt,section_label,sort_order').eq('active',true).order('sort_order')
      ]);
      if(p.error||s.error||a.error||q.error){$('reviewContent').innerHTML='<div class="empty-state"><strong>Não foi possível carregar a revisão</strong><span>Tente atualizar a página.</span></div>';return}
      reviewState={profiles:p.data||[],subs:s.data||[],answers:a.data||[],questions:q.data||[]};
      const sel=$('reviewExecutive'),old=sel.value;
      sel.innerHTML='<option value="">Selecione um executivo</option>'+reviewState.profiles.map(x=>'<option value="'+x.id+'">'+esc(x.name||x.email)+(x.executive_level?' • '+(x.executive_level==='senior'?'Sênior':'Pleno'):'')+'</option>').join('');
      if([...sel.options].some(o=>o.value===old)){sel.value=old;fillCycles()}
    }catch(e){console.warn(e)}
  }

  function fillCycles(){
    const exec=$('reviewExecutive').value,sel=$('reviewCycle');
    const list=reviewState.subs.filter(s=>s.executive_id===exec).sort((a,b)=>b.cycle_number-a.cycle_number);
    sel.innerHTML=list.length?list.map(s=>'<option value="'+s.id+'">Ciclo '+s.cycle_number+' • '+fmt(s.submitted_at)+'</option>').join(''):'<option value="">Sem ciclos respondidos</option>';
    if(list.length)renderReview();else $('reviewContent').innerHTML='<div class="empty-state"><strong>Sem Quiz respondido</strong><span>Este executivo ainda não enviou nenhum ciclo.</span></div>';
  }

  function renderReview(){
    const sub=reviewState.subs.find(s=>s.id===$('reviewCycle').value);if(!sub)return;
    const exec=reviewState.profiles.find(p=>p.id===sub.executive_id);
    const answers=reviewState.answers.filter(a=>a.submission_id===sub.id).sort((a,b)=>{
      const qa=reviewState.questions.find(q=>q.id===a.question_id)?.sort_order||0,qb=reviewState.questions.find(q=>q.id===b.question_id)?.sort_order||0;return qa-qb
    });
    const original=avg(answers.map(a=>a.score));
    const reviewed=answers.filter(a=>a.leader_score!==null&&a.leader_score!==undefined);
    const validated=reviewed.length?avg(answers.map(a=>a.leader_score??a.score)):original;
    $('reviewContent').innerHTML=`<div class="quiz-review-kpis"><div class="quiz-review-kpi"><small>Autoavaliação</small><strong>${original.toFixed(1)}</strong></div><div class="quiz-review-kpi"><small>Nota validada</small><strong>${validated.toFixed(1)}</strong></div><div class="quiz-review-kpi"><small>Perguntas revisadas</small><strong>${reviewed.length}/${answers.length}</strong></div></div><div class="quiz-review-head"><div><strong>${esc(exec?.name||exec?.email||'Executivo')} • Ciclo ${sub.cycle_number}</strong><p class="muted">Enviado em ${fmt(sub.submitted_at)}</p></div></div><div class="quiz-review-list">${answers.map(reviewItem).join('')}</div><div class="quiz-review-summary"><label>Resumo da conversa 1 a 1<textarea id="reviewSummary" placeholder="Registre os principais pontos validados, lacunas identificadas e o foco para os próximos 10 dias.">${esc(sub.leader_review_summary||'')}</textarea></label><div class="modal-actions"><button class="primary" id="saveReviewSummary" type="button">Salvar resumo da revisão</button></div></div>`;
    document.querySelectorAll('[data-save-review]').forEach(b=>b.onclick=()=>saveAnswerReview(b.dataset.saveReview));
    $('saveReviewSummary').onclick=()=>saveSummary(sub.id);
  }

  function reviewItem(a){
    const q=reviewState.questions.find(x=>x.id===a.question_id)||{};
    const opts=['','0','1','2','3','4','5'].map(v=>'<option value="'+v+'" '+(String(a.leader_score??'')===v?'selected':'')+'>'+(v===''?'Não revisado':v+'/5')+'</option>').join('');
    return `<article class="quiz-review-item"><div class="quiz-review-question"><span class="quiz-review-number">${q.sort_order||''}</span><div><strong>${esc(q.prompt||'Pergunta')}</strong><small class="muted" style="display:block;margin-top:4px">${esc(q.section_label||'')}</small></div></div><div class="quiz-review-meta"><span class="quiz-review-score">Executivo: <b>${a.score}/5</b></span>${a.leader_score!==null&&a.leader_score!==undefined?'<span class="quiz-review-score">Líder: <b>'+a.leader_score+'/5</b></span>':''}${a.reviewed_at?'<span class="quiz-review-score">Revisado em '+fmt(a.reviewed_at)+'</span>':''}</div><div class="quiz-review-controls"><label>Nota validada<select data-review-score="${a.id}">${opts}</select></label><label>Observação do líder<textarea data-review-note="${a.id}" placeholder="Ex.: marcou 5, mas na conversa demonstrou domínio parcial.">${esc(a.leader_note||'')}</textarea></label><button class="secondary" type="button" data-save-review="${a.id}">Salvar</button></div></article>`;
  }

  async function saveAnswerReview(id){
    const scoreEl=document.querySelector('[data-review-score="'+id+'"]'),noteEl=document.querySelector('[data-review-note="'+id+'"]');
    const score=scoreEl.value===''?null:Number(scoreEl.value);
    const {error}=await client.rpc('review_quiz_answer',{p_answer_id:id,p_leader_score:score,p_leader_note:noteEl.value.trim()||null});
    if(error){toastMsg('Não foi possível salvar a revisão.','error');return}
    toastMsg('Revisão salva.');await loadLeaderReview();renderReview();
  }
  async function saveSummary(id){
    const {error}=await client.rpc('save_quiz_leader_summary',{p_submission_id:id,p_summary:$('reviewSummary').value.trim()||null});
    if(error){toastMsg('Não foi possível salvar o resumo.','error');return}
    toastMsg('Resumo da conversa salvo.');await loadLeaderReview();
  }

  function boot(){injectStyles();setTimeout(()=>{pendingExecutiveQuiz();loadLeaderReview()},900);document.addEventListener('click',e=>{if(e.target.closest('[data-view="quiz"],[data-view-link="quiz"]'))setTimeout(loadLeaderReview,150)})}
  window.addEventListener('load',boot);
})();