(()=>{
  const d=document;
  const root=d.documentElement;
  const isDirector=!!d.querySelector('.director-shell');
  const stored=localStorage.getItem('depaula-theme');
  root.dataset.theme=stored||'dark';

  const icons={
    dashboard:'<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/></svg>',
    overview:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    knowledge:'<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22z"/></svg>',
    tickets:'<svg viewBox="0 0 24 24"><path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 3v-4.5A2 2 0 0 1 3 14V6a2 2 0 0 1 2-2z"/></svg>',
    systems:'<svg viewBox="0 0 24 24"><path d="M9 15 21 3"/><path d="M15 3h6v6"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/></svg>',
    weekly:'<svg viewBox="0 0 24 24"><path d="M4 19V10"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/></svg>',
    quiz:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 0 1 4.6.8c0 2-2.4 2.2-2.4 4"/><path d="M12 17h.01"/></svg>',
    executives:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3.5 20c.5-4 2.5-6 5.5-6s5 2 5.5 6"/><circle cx="17.5" cy="9" r="2.2"/><path d="M15.5 15.5c3.2-.4 5.1 1.1 5.5 4.5"/></svg>',
    manage:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    teams:'<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c.6-4 2.6-6 5.5-6s4.9 2 5.5 6"/><path d="M14.5 15c3.7-.4 6 1.3 6.5 5"/></svg>',
    sun:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></svg>',
    moon:'<svg viewBox="0 0 24 24"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.7 6.7 0 0 0 21 12.8z"/></svg>',
    refresh:'<svg viewBox="0 0 24 24"><path d="M20 6v5h-5"/><path d="M19 11a7 7 0 1 0 1 5"/></svg>',
    menu:'<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    plane:'<svg viewBox="0 0 24 24"><path d="M22 2 9 15"/><path d="m22 2-7 20-4-9-9-4z"/></svg>',
    mail:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    document:'<svg viewBox="0 0 24 24"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></svg>',
    contract:'<svg viewBox="0 0 24 24"><path d="M5 3h14v18H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    objection:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.7 2.7 0 0 1 5.2.9c0 2.2-2.7 2.4-2.7 4.2M12 18h.01"/></svg>'
  };

  function themeButton(){
    const actions=d.querySelector('.top-actions');
    if(!actions||d.getElementById('themeToggle'))return;
    const b=d.createElement('button');
    b.id='themeToggle';b.className='theme-toggle';
    b.type='button';
    const paint=()=>{const light=root.dataset.theme==='light';b.innerHTML=light?icons.moon:icons.sun;b.title=light?'Usar tema escuro':'Usar tema claro';b.setAttribute('aria-label',b.title)};
    b.onclick=()=>{root.dataset.theme=root.dataset.theme==='light'?'dark':'light';localStorage.setItem('depaula-theme',root.dataset.theme);paint()};
    paint();
    const status=actions.querySelector('.status-dot');
    status?actions.insertBefore(b,status):actions.insertBefore(b,actions.lastElementChild);
  }

  function countdown(){
    const main=d.querySelector('.main');const top=d.querySelector('.topbar');
    if(!main||!top||d.querySelector('.trip-countdown'))return;
    const bar=d.createElement('div');bar.className='trip-countdown';
    bar.innerHTML='<div class="trip-info"><div class="trip-plane">'+icons.plane+'</div><div class="trip-copy"><strong>Rio de Janeiro • 02 de dezembro</strong><span>Contagem regressiva De Paula</span></div></div><div class="trip-motivation">Meta na frente. Time junto. Rio nos espera.</div><div class="trip-clock" aria-label="Contagem regressiva"><div class="trip-unit"><b data-rio-days>00</b><small>dias</small></div><div class="trip-unit"><b data-rio-hours>00</b><small>horas</small></div><div class="trip-unit"><b data-rio-min>00</b><small>min</small></div><div class="trip-unit"><b data-rio-sec>00</b><small>seg</small></div></div>';
    main.insertBefore(bar,top);
    const target=new Date('2026-12-02T00:00:00-03:00').getTime();
    const tick=()=>{
      const diff=target-Date.now();
      const clock=bar.querySelector('.trip-clock');
      if(diff<=0){clock.innerHTML='<span class="trip-today">É HOJE! RIO DE JANEIRO ✦</span>';return}
      const days=Math.floor(diff/86400000);const hours=Math.floor(diff%86400000/3600000);const min=Math.floor(diff%3600000/60000);const sec=Math.floor(diff%60000/1000);
      bar.querySelector('[data-rio-days]').textContent=String(days).padStart(2,'0');bar.querySelector('[data-rio-hours]').textContent=String(hours).padStart(2,'0');bar.querySelector('[data-rio-min]').textContent=String(min).padStart(2,'0');bar.querySelector('[data-rio-sec]').textContent=String(sec).padStart(2,'0');
    };
    tick();setInterval(tick,1000);
  }

  function premiumIcons(){
    d.querySelectorAll('.nav-item[data-view]').forEach(b=>{const s=b.querySelector(':scope > span');if(s){s.className='dp-icon';s.innerHTML=icons[b.dataset.view]||icons.dashboard}});
    d.querySelectorAll('.nav[data-view]').forEach(b=>{const label=b.querySelector('span')?.textContent||'';b.innerHTML='<span class="dp-icon">'+(icons[b.dataset.view]||icons.overview)+'</span><span>'+label+'</span>'});
    const quick={email:'mail',document:'document',contract:'contract',objection:'objection'};
    d.querySelectorAll('.quick-card').forEach(b=>{const s=b.querySelector(':scope > span');if(!s)return;let key=quick[b.dataset.categoryLink]||b.dataset.viewLink;if(key&&icons[key]){s.className='dp-icon';s.innerHTML=icons[key]}});
    const refresh=d.getElementById('refreshBtn');if(refresh){refresh.innerHTML=icons.refresh;refresh.setAttribute('aria-label','Atualizar')}
    const dirRefresh=d.getElementById('refresh');if(dirRefresh){dirRefresh.innerHTML=icons.refresh+'<span>Atualizar</span>';dirRefresh.style.display='flex';dirRefresh.style.alignItems='center';dirRefresh.style.gap='7px'}
  }

  function mobileSidebar(){
    const sidebar=d.querySelector('.sidebar');const top=d.querySelector('.topbar');if(!sidebar||!top)return;
    let menu=d.getElementById('mobileMenu');
    if(isDirector&&!menu){menu=d.createElement('button');menu.id='mobileMenu';menu.className='premium-mobile-menu';menu.innerHTML=icons.menu;menu.setAttribute('aria-label','Abrir menu');top.insertBefore(menu,top.firstChild);menu.onclick=()=>{sidebar.classList.toggle('open');sync()}}
    else if(menu){menu.innerHTML=icons.menu;menu.setAttribute('aria-label','Abrir menu')}
    const overlay=d.createElement('div');overlay.className='premium-sidebar-overlay';d.body.appendChild(overlay);
    const sync=()=>overlay.classList.toggle('show',sidebar.classList.contains('open')&&innerWidth<=900);
    if(menu&&!isDirector)menu.addEventListener('click',()=>setTimeout(sync,0));
    overlay.onclick=()=>{sidebar.classList.remove('open');sync()};
    sidebar.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>{if(innerWidth<=900){sidebar.classList.remove('open');sync()}}));
    addEventListener('resize',()=>{if(innerWidth>900){sidebar.classList.remove('open');sync()}});
  }

  function loadExtra(src){if(d.querySelector('script[src*="'+src.split('?')[0]+'"]'))return;const s=d.createElement('script');s.src=src;d.body.appendChild(s)}
  function init(){themeButton();countdown();premiumIcons();mobileSidebar();if(d.querySelector('.app-shell')){loadExtra('ui-senior.js?v=1');loadExtra('leader-quiz-review.js?v=1')}}
  d.readyState==='loading'?d.addEventListener('DOMContentLoaded',init):init();
})();