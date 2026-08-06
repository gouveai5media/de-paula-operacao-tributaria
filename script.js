const brl = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const apuracao=document.querySelector('#apuracao'), residual=document.querySelector('#residual'), desconto=document.querySelector('#desconto');
function calcular(){
  const a=Math.max(0,Number(apuracao.value)||0), r=Number(residual.value)/100, d=Number(desconto.value)/100;
  const darf=a*r, credito=a-darf, economia=credito*d, reembolso=credito-economia, total=darf+reembolso;
  residualLabel.textContent=`${residual.value}%`; descontoLabel.textContent=`${desconto.value}%`;
  economiaMensal.textContent=brl.format(economia); economiaAnual.textContent=brl.format(economia*12); darfResidual.textContent=brl.format(darf); credito.textContent=brl.format(credito); reembolso.textContent=brl.format(reembolso); custoTotal.textContent=brl.format(total);
  document.querySelectorAll('.preset button').forEach(b=>b.classList.toggle('active',b.dataset.preset===desconto.value));
}
[apuracao,residual,desconto].forEach(el=>el.addEventListener('input',calcular));
document.querySelectorAll('.preset button').forEach(b=>b.addEventListener('click',()=>{desconto.value=b.dataset.preset;calcular()}));
menu.addEventListener('click',()=>nav.classList.toggle('open'));
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
calcular();
