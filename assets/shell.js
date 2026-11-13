// Shared: theme toggle (persisted), scroll reveal, toast
(function(){
  const root=document.documentElement;
  const saved=localStorage.getItem('theme');
  root.classList.toggle('dark', saved ? saved==='dark' : true);
  window.toggleTheme=function(){
    const d=!root.classList.contains('dark');
    root.classList.toggle('dark',d);localStorage.setItem('theme',d?'dark':'light');
    document.querySelectorAll('[data-theme-icon]').forEach(e=>e.textContent=d?'☀':'☾');
  };
  window.toast=function(msg){
    const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);
    setTimeout(()=>t.remove(),2600);
  };
  function ready(){
    document.querySelectorAll('[data-theme-icon]').forEach(e=>e.textContent=root.classList.contains('dark')?'☀':'☾');
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});
    document.querySelectorAll('.rv').forEach(el=>io.observe(el));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
