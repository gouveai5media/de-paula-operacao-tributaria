document.getElementById('loginForm').addEventListener('submit',function(e){
  e.preventDefault();
  document.getElementById('message').textContent='A tela de acesso está publicada. A autenticação será ativada na próxima etapa.';
});