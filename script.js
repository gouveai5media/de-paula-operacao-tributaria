const brl = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const apuracao=document.querySelector('#apuracao');
const desconto=document.querySelector('#desconto');

function calcular(){
  const a=Math.max(0,Number(apuracao.value)||0);
  const credito=a*0.90;
  const darf=a*0.10;
  const percentual=Math.min(45,Math.max(0,Number(desconto.value)||0));
  const contrato=1-percentual/100;
  const pagamentoCredito=credito*contrato;
  const total=darf+pagamentoCredito;
  const economia=a-total;

  document.querySelector('#simApuracao').textContent=brl.format(a);
  document.querySelector('#simCredito').textContent=brl.format(credito);
  document.querySelector('#simDarf').textContent=brl.format(darf);
  const pagamentoPercentual=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(contrato*100)+'%';
  document.querySelector('#simContrato').textContent=pagamentoPercentual;
  document.querySelector('#regraPagamento').textContent=pagamentoPercentual;
  document.querySelector('#simPagamento').textContent=brl.format(pagamentoCredito);
  document.querySelector('#simTotal').textContent=brl.format(total);
  document.querySelector('#simEconomiaMensal').textContent=brl.format(economia);
  document.querySelector('#simEconomiaAnual').textContent=brl.format(economia*12);
}

apuracao.addEventListener('input',calcular);
desconto.addEventListener('input',calcular);
desconto.addEventListener('change',()=>{desconto.value=Math.min(45,Math.max(0,Number(desconto.value)||0));calcular();});
menu.addEventListener('click',()=>nav.classList.toggle('open'));
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
calcular();
