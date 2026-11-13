(function(){
const $=s=>document.querySelector(s), mroot=$('#modal-root');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const utm=Object.fromEntries([...new URLSearchParams(location.search)].filter(([k])=>k.startsWith('utm_')));

const TRACKS=[
 {id:'creator',icon:'🎨',name:'AI for Creators & Marketers',who:'Students, freelancers, content folks',tag:'No-code',
  weeks:[['Prompting that works','Structured prompts, personas, few-shot; build your prompt library.'],['AI research & writing','Perplexity/Claude for research → outlines → long-form drafts.'],['Visual content','Canva Magic Studio, Ideogram, carousels & thumbnails at speed.'],['Video & voice','Script → AI voice → captions → short-form edit.'],['Content engine','n8n/Make: idea → draft → design → schedule, on autopilot.'],['Demo day','Ship a 30-day content system + public case study.']]},
 {id:'builder',icon:'🧑‍💻',name:'AI Product Builder',who:'CS/engineering students, junior devs',tag:'Low-code',
  weeks:[['LLM APIs 101','OpenAI/Claude/Gemini APIs, tokens, cost, structured output.'],['Ship an AI web app','Lovable/Replit/Cursor → deploy a working app in a day.'],['RAG on your data','Embeddings, vector search, chat-with-your-docs.'],['Agents & tools','Function calling, multi-step agents, guardrails.'],['Automate it','Webhooks, n8n, cron jobs, Slack/WhatsApp bots.'],['Demo day','Launch publicly, collect 10 real users, write it up.']]},
 {id:'ops',icon:'⚙️',name:'AI for Work & Ops',who:'Young professionals, MBA, ops & sales',tag:'No-code',
  weeks:[['AI at work','Email, docs, meetings, spreadsheets with Copilot/Gemini.'],['Data without code','AI-assisted Sheets/Excel analysis and dashboards.'],['Make & n8n','Triggers, actions, routers — your first 5 automations.'],['Lead & CRM flows','Forms → enrichment → CRM → follow-ups.'],['Internal AI assistant','A custom GPT / Claude Project for your team SOPs.'],['Demo day','Present ROI: hours saved, before/after.']]}
];
let cur='creator';
function tracks(){
  $('#trackgrid').innerHTML=TRACKS.map(t=>`<button class="card track ${t.id===cur?'on':''}" data-t="${t.id}"><span style="font-size:26px">${t.icon}</span><h3>${t.name}</h3><span class="sec" style="font-size:13px">${t.who}</span><span class="chip" style="align-self:flex-start">${t.tag}</span><span class="big">${t.icon}</span></button>`).join('');
  const t=TRACKS.find(x=>x.id===cur);$('#curname').textContent=t.name;
  $('#weeks').innerHTML=t.weeks.map((w,i)=>`<div class="week"><span class="mono muted" style="font-size:12px">WEEK 0${i+1}</span><div><b>${w[0]}</b><p class="sec" style="margin:.2rem 0 0;font-size:14px">${w[1]}</p></div></div>`).join('');
  document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{cur=b.dataset.t;tracks();document.getElementById('curriculum').scrollIntoView({behavior:'smooth'})});
}

/* terminal typing demo */
const LINES=[['p','$ ','idea --raw "turn my notes into a LinkedIn carousel"'],['','→ ','researching with Perplexity… 6 sources'],['','→ ','structuring 8 slides with Claude…'],['','→ ','rendering on-brand layout via Canva API…'],['ok','✓ ','carousel.pdf ready · 41s · ₹0 spent']];
function typeTerm(){const el=$('#term');if(!el)return;let li=0,ci=0,html='';
  el.innerHTML=LINES.map(([c,p,t])=>`<span class="${c}">${p}</span>${esc(t)}`).join('<br>')+'<span class="caret"></span>';
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  setTimeout(()=>{
  (function tick(){if(li>=LINES.length){el.innerHTML=html+'<span class="caret"></span>';setTimeout(()=>{html='';li=0;ci=0;tick()},4200);return}
   const [cls,pre,txt]=LINES[li];ci++;const partial=`<span class="${cls}">${pre}</span>${esc(txt.slice(0,ci))}`;
   el.innerHTML=html+partial+'<span class="caret"></span>';
   if(ci>=txt.length){html+=partial+'<br>';li++;ci=0;setTimeout(tick,380)}else setTimeout(tick,li===0?38:16)})();},3500);}

/* modals */
function modal(h){mroot.innerHTML=`<div class="overlay"><div class="modal">${h}</div></div>`;const f=mroot.querySelector('input');f&&f.focus()}
const head=(k,t)=>`<header><div><p class="kicker">${k}</p><h2 style="font-size:1.35rem">${t}</h2></div><button class="icon-btn" data-close aria-label="Close">✕</button></header>`;
const save=(k,v)=>{const a=JSON.parse(localStorage.getItem('aal_'+k)||'[]');a.push({...v,utm,at:new Date().toISOString()});localStorage.setItem('aal_'+k,JSON.stringify(a));return a.length};
const phoneOk=p=>/^[6-9]\d{9}$/.test(String(p).replace(/\D/g,'').slice(-10));
const emailOk=e=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

let R={};
function reg(plan){R={plan:plan||'Live cohort',track:cur};step1()}
function bar(n){return `<div class="steps">${[1,2,3].map(i=>`<i class="${i<=n?'on':''}"></i>`).join('')}</div>`}
function step1(){
  modal(head('Apply · step 1 of 3','Let\'s start with you')+bar(1)+`<form id="f1" class="grid" novalidate>
   <label class="field">Full name<input class="input" name="name" value="${esc(R.name||'')}" required></label>
   <label class="field">Email<input class="input" name="email" type="email" value="${esc(R.email||'')}" required></label>
   <label class="field">Mobile (WhatsApp)<input class="input" name="phone" inputmode="numeric" value="${esc(R.phone||'')}" placeholder="10-digit" required></label>
   <span class="err" id="e1"></span><button class="btn primary" style="justify-content:center">Continue →</button>
   <p class="muted" style="font-size:12px;margin:0">We save your progress at this step, so a counsellor can help if you drop off.</p></form>`);
  $('#f1').onsubmit=e=>{e.preventDefault();Object.assign(R,Object.fromEntries(new FormData(e.target)));
    if(!R.name.trim())return $('#e1').textContent='Please enter your name.';
    if(!emailOk(R.email))return $('#e1').textContent='Please enter a valid email.';
    if(!phoneOk(R.phone))return $('#e1').textContent='Enter a valid 10-digit Indian mobile.';
    save('partial_leads',{name:R.name,email:R.email,phone:R.phone,stage:'step1'});step2();};
}
function step2(){
  modal(head('Apply · step 2 of 3','Which track fits you?')+bar(2)+`<form id="f2" class="grid">
   <div class="grid">${TRACKS.map(t=>`<label class="optcard"><input type="radio" name="track" value="${t.id}" ${R.track===t.id?'checked':''}> ${t.icon} <span><b>${t.name}</b><br><span class="muted" style="font-size:12px">${t.who}</span></span></label>`).join('')}</div>
   <div class="grid g2"><label class="field">You are a…<select class="input" name="status"><option>College student</option><option>Recent graduate</option><option>Working professional</option><option>Freelancer / creator</option></select></label>
   <label class="field">Plan<select class="input" name="plan">${['Self-paced','Live cohort','Live + 1:1'].map(p=>`<option ${R.plan===p?'selected':''}>${p}</option>`).join('')}</select></label></div>
   <div style="display:flex;gap:.5rem"><button type="button" class="btn" id="b2">← Back</button><button class="btn primary" style="flex:1;justify-content:center">Continue →</button></div></form>`);
  $('#b2').onclick=step1;
  $('#f2').onsubmit=e=>{e.preventDefault();Object.assign(R,Object.fromEntries(new FormData(e.target)));step3()};
}
function step3(){
  modal(head('Apply · step 3 of 3','One last thing')+bar(3)+`<form id="f3" class="grid">
   <label class="field">What do you want to build with AI? <span class="muted">(1–2 lines)</span><textarea class="input" name="goal" rows="3" placeholder="e.g. an automation that writes my weekly client reports"></textarea></label>
   <label class="field">How did you hear about us?<select class="input" name="source"><option>Instagram</option><option>LinkedIn</option><option>Friend / college</option><option>Google</option><option>Other</option></select></label>
   <label class="chk" style="font-size:13px;color:var(--content-secondary);display:flex;gap:.5rem"><input type="checkbox" name="wa" checked style="accent-color:var(--info)"> Send me updates on WhatsApp</label>
   <div style="display:flex;gap:.5rem"><button type="button" class="btn" id="b3">← Back</button><button class="btn primary" style="flex:1;justify-content:center">Submit application</button></div></form>`);
  $('#b3').onclick=step2;
  $('#f3').onsubmit=e=>{e.preventDefault();Object.assign(R,Object.fromEntries(new FormData(e.target)));
    const n=save('applications',R);const t=TRACKS.find(x=>x.id===R.track);
    mroot.querySelector('.modal').innerHTML=head('Application received','You\'re in the queue, '+esc(R.name.split(' ')[0])+' 🎉')+`
     <p class="sec">Application ID <span class="hl">AAL-${String(n).padStart(4,'0')}</span> for <b>${t.name}</b> (${esc(R.plan)}).</p>
     <div class="card" style="font-size:14px"><b>What happens next</b><ol class="sec" style="margin:.5rem 0 0;padding-left:1.1rem">
      <li>Instant: confirmation email + WhatsApp with syllabus PDF</li><li>Within 24 hrs: 10-min counsellor call to check fit</li><li>Shortlisted → payment link (EMI / student discount applied)</li><li>Onboarding kit + Discord invite before day 1</li></ol></div>
     <p class="muted" style="font-size:12px">Prototype: data stored only in this browser (localStorage). Production wiring is described on the submission page.</p>
     <button class="btn" data-close>Done</button>`;};
}
function enq(src){
  modal(head(src==='syllabus'?'Free download':'Have questions?',src==='syllabus'?'Get the full syllabus':'Talk to a counsellor')+`<form id="fe" class="grid" novalidate>
   <label class="field">Name<input class="input" name="name" required></label>
   <div class="grid g2"><label class="field">Mobile (WhatsApp)<input class="input" name="phone" inputmode="numeric" required></label><label class="field">Email<input class="input" name="email" type="email"></label></div>
   ${src==='syllabus'?'':'<label class="field">Best time to call<select class="input" name="time"><option>Morning</option><option>Afternoon</option><option>Evening</option></select></label>'}
   <span class="err" id="ee"></span><button class="btn primary" style="justify-content:center">${src==='syllabus'?'Send me the PDF':'Request a callback'}</button></form>`);
  $('#fe').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
    if(!f.name.trim())return $('#ee').textContent='Please enter your name.';
    if(!phoneOk(f.phone))return $('#ee').textContent='Enter a valid 10-digit Indian mobile.';
    if(f.email&&!emailOk(f.email))return $('#ee').textContent='That email looks off.';
    save('enquiries',{...f,src:src||'counsellor'});mroot.innerHTML='';
    toast(src==='syllabus'?'Syllabus is on its way to WhatsApp ✓ (prototype)':'Callback requested ✓ — we\'ll call within 24 hrs');};
}
document.addEventListener('click',e=>{
  if(e.target.classList&&e.target.classList.contains('overlay')){mroot.innerHTML='';return}
  const t=e.target.closest('[data-reg],[data-enq],[data-close]');if(!t)return;
  if(t.dataset.close!==undefined){mroot.innerHTML='';return}
  if(t.dataset.reg!==undefined)return reg(t.dataset.plan);
  if(t.dataset.enq!==undefined)return enq(t.dataset.src);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')mroot.innerHTML=''});
tracks();typeTerm();
})();
