(function(){
const $=s=>document.querySelector(s), view=$('#view'), mroot=$('#modal-root');
const catOf=id=>CATS.find(c=>c.id===id)||CATS[0];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={get:k=>JSON.parse(localStorage.getItem('pc_'+k)||'[]'),push(k,v){const a=store.get(k);a.push({...v,at:new Date().toISOString()});localStorage.setItem('pc_'+k,JSON.stringify(a));return a.length}};

/* ---------- state ---------- */
const DEF={q:'',cat:'all',open:false,verified:false,emergency:false,home:false,species:[],maxKm:15,maxFee:2000,minRating:0,sort:'relevance'};
let S={...DEF}, hi=null;
function parse(){
  const [path,qs]=(location.hash.slice(1)||'/').split('?');
  const p=new URLSearchParams(qs||'');
  return {path:path||'/',p};
}
function toQS(){
  const p=new URLSearchParams();
  if(S.q)p.set('q',S.q); if(S.cat!=='all')p.set('cat',S.cat);
  ['open','verified','emergency','home'].forEach(k=>S[k]&&p.set(k,1));
  if(S.species.length)p.set('sp',S.species.join(','));
  if(S.maxKm!==DEF.maxKm)p.set('km',S.maxKm); if(S.maxFee!==DEF.maxFee)p.set('fee',S.maxFee);
  if(S.minRating)p.set('r',S.minRating); if(S.sort!=='relevance')p.set('sort',S.sort);
  const s=p.toString(); return '#/search'+(s?'?'+s:'');
}

/* ---------- search logic ---------- */
function results(){
  const q=S.q.trim().toLowerCase();
  let r=PROVIDERS.filter(p=>{
    if(S.cat!=='all'&&p.cat!==S.cat)return false;
    if(S.open&&!p.open)return false; if(S.verified&&!p.verified)return false;
    if(S.emergency&&!p.emergency)return false; if(S.home&&!p.homeVisit)return false;
    if(S.species.length&&!S.species.some(s=>p.species.includes(s)))return false;
    if(p.km>S.maxKm&&p.area!=='Citywide')return false; if(p.fee>S.maxFee)return false; if(p.rating<S.minRating)return false;
    if(q){const hay=(p.name+' '+p.area+' '+p.services.join(' ')+' '+p.species.join(' ')+' '+catOf(p.cat).label).toLowerCase();
      if(!q.split(/\s+/).every(w=>hay.includes(w)))return false;}
    return true;
  });
  const by={distance:(a,b)=>a.km-b.km,rating:(a,b)=>b.rating-a.rating,fee:(a,b)=>a.fee-b.fee,
    relevance:(a,b)=>(b.open-a.open)||(b.verified-a.verified)||(b.rating*Math.log(b.reviews)-a.rating*Math.log(a.reviews))};
  return r.sort(by[S.sort]);
}
const fee=p=>p.fee===0?'Free / donation':'₹'+p.fee.toLocaleString('en-IN')+(p.priceUnit||'');

/* ---------- views ---------- */
function home(){
  const counts=Object.fromEntries(CATS.map(c=>[c.id,c.id==='all'?PROVIDERS.length:PROVIDERS.filter(p=>p.cat===c.id).length]));
  view.innerHTML=`
  <section class="wrap hero">
    <p class="kicker">Practo for Animals · MVP prototype</p>
    <h1>Trusted care for every<br>paw, wing & tail — <span class="note" style="font-size:.9em;color:var(--content)">nearby.</span></h1>
    <p class="lede" style="margin:1rem 0 1.6rem">Find verified vets, 24×7 hospitals, boarding, diagnostic labs, animal ambulances and NGOs — compare fees, hours and reviews, then book or call in one tap.</p>
    <form class="searchbox" id="hs">
      <label class="seg">${ic('search',18)}<input class="input" name="q" placeholder="Vet, vaccination, X-ray, boarding…" autocomplete="off"></label>
      <label class="seg">${ic('pin',18)}<select class="input" name="area"><option>Bengaluru · near me</option><option>Koramangala</option><option>Indiranagar</option><option>HSR Layout</option></select></label>
      <button class="btn primary sq" style="justify-content:center">Find a Vet</button>
    </form>
    <div class="quick">${['Vaccination','Open now','24×7 emergency','Cat-only','Home visit','Adoption'].map(t=>`<button class="chip" data-quick="${t}">${t}</button>`).join('')}</div>
  </section>

  <section class="wrap" style="margin-top:.5rem">
    <div class="sos rv"><div style="display:flex;gap:.8rem;align-items:center"><span class="pulse"></span><div><b>Animal emergency?</b><div class="sec" style="font-size:14px">Injured stray, poisoning, accident — see ambulances & 24×7 hospitals sorted by distance.</div></div></div>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap"><a class="btn sm" href="#/search?cat=hospital&emergency=1&sort=distance">24×7 hospitals</a><a class="btn sm sos-btn" href="#/search?cat=ambulance&emergency=1&sort=distance">${ic('ambulance',16)} Call ambulance</a></div></div>
  </section>

  <section class="wrap" style="margin-top:3rem">
    <div style="display:flex;justify-content:space-between;align-items:end;gap:1rem;margin-bottom:1rem"><div><p class="kicker">Explore services</p><h2>What does your pet need?</h2></div><a class="btn sm" href="#/search">View all</a></div>
    <div class="grid g3">${CATS.filter(c=>c.id!=='all').map(c=>`
      <a class="card cat rv" href="#/search?cat=${c.id}" style="text-decoration:none"><span class="ic">${ic(c.icon,26)}</span><h3>${c.label}</h3>
      <span class="sec" style="font-size:13px">${counts[c.id]} listed · ${c.id==='ngo'?'rescue, adoption, ABC':c.id==='ambulance'?'live dispatch':c.id==='boarding'?'day care & stays':c.id==='diagnostics'?'labs & imaging':c.id==='hospital'?'ICU, surgery':'consults & vaccines'}</span>
      <span class="big">${ic(c.icon,96)}</span></a>`).join('')}</div>
  </section>

  <section class="wrap" style="margin-top:3rem">
    <p class="kicker">Top rated near you</p>
    <div class="grid g2">${PROVIDERS.filter(p=>p.verified).sort((a,b)=>b.rating-a.rating).slice(0,4).map(card).join('')}</div>
  </section>

  <hr class="dash wrap" style="max-width:46rem">
  <section class="wrap">
    <p class="kicker">How it works</p><h2 style="margin-bottom:1.25rem">From worry to vet in under a minute.</h2>
    <div class="grid g3">
      <div class="step rv"><span class="n">01</span><div><h3>Search</h3><p class="sec" style="font-size:14px">By need (“vaccination”), species or emergency. Location-aware.</p></div></div>
      <div class="step rv"><span class="n">02</span><div><h3>Compare</h3><p class="sec" style="font-size:14px">Fees, hours, species treated, verified badge, last-updated date.</p></div></div>
      <div class="step rv"><span class="n">03</span><div><h3>Book or call</h3><p class="sec" style="font-size:14px">Request a slot, WhatsApp, or one-tap call — no account needed.</p></div></div>
    </div>
  </section>

  <section class="wrap" style="margin-top:3rem"><div class="grid g2">
    <div class="card rv" style="position:relative;overflow:hidden"><span class="ribbon">FREE LISTING</span><p class="kicker">For providers</p><h3>Run a clinic, shelter or boarding?</h3><p class="sec" style="font-size:14px">Get discovered by pet parents nearby. Verification in 48 hrs.</p><button class="btn primary sm" data-open="list">List Your Business →</button></div>
    <div class="card rv"><p class="kicker">Community-kept data</p><h3>Spotted wrong hours or a closed clinic?</h3><p class="sec" style="font-size:14px">Every listing shows when it was last verified. Help keep it accurate.</p><button class="btn sm" data-open="correct">Submit a Correction</button></div>
  </div></section>`;
  $('#hs').onsubmit=e=>{e.preventDefault();S={...DEF,q:e.target.q.value};location.hash=toQS()};
  view.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{
    const t=b.dataset.quick;S={...DEF};
    if(t==='Open now')S.open=true;else if(t==='24×7 emergency')S.emergency=true;else if(t==='Home visit')S.home=true;
    else if(t==='Cat-only'){S.species=['Cat'];S.cat='clinic'}else if(t==='Adoption')S.cat='ngo';else S.q=t.toLowerCase();
    location.hash=toQS();});
}

function card(p){
  const c=catOf(p.cat);
  return `<article class="card pcard rv ${hi===p.id?'hi':''}" data-id="${p.id}" tabindex="0">
    <div class="av">${ic(c.icon,26)}</div>
    <div style="min-width:0">
      <h3 style="font-size:1.02rem">${esc(p.name)}</h3><div style="display:flex;gap:.35rem;margin-top:.35rem;flex-wrap:wrap">${p.verified?'<span class="badge b-ok">✓ Verified</span>':'<span class="badge b-mut">Unverified</span>'}
        ${p.emergency?'<span class="badge b-bad">24×7</span>':''}${p.homeVisit?'<span class="badge b-info">Home visit</span>':''}</div>
      <div class="meta"><span>${ic('star',14,'style="color:#f59e0b;fill:#f59e0b"')} <b style="color:var(--content)">${p.rating}</b> (${p.reviews})</span><span>${ic('pin',14)} ${p.area} · ${p.km} km</span><span style="color:${p.open?'var(--ok)':'var(--warn)'}">● ${p.hours.startsWith('Open')||p.hours.startsWith('Opens')?p.hours:(p.open?'Open · ':'Closed · ')+p.hours}</span></div>
      <div class="chips">${p.services.slice(0,4).map(s=>`<span class="chip" style="font-size:11px;padding:.1rem .5rem">${s}</span>`).join('')}</div>
    </div>
    <div class="side-actions"><div><div style="font-weight:700">${fee(p)}</div><div class="muted" style="font-size:12px">${p.next}</div></div>
      <div style="display:flex;gap:.4rem"><button class="btn sm" data-call="${p.id}" aria-label="Call ${esc(p.name)}">${ic('phone',15)}</button><button class="btn sm primary" data-book="${p.id}">${p.cat==='ngo'?'Contact':p.cat==='ambulance'?'Dispatch':'Book'}</button></div></div>
  </article>`;
}

function search(p){
  S={...DEF,q:p.get('q')||'',cat:p.get('cat')||'all',open:!!p.get('open'),verified:!!p.get('verified'),emergency:!!p.get('emergency'),home:!!p.get('home'),
     species:(p.get('sp')||'').split(',').filter(Boolean),maxKm:+(p.get('km')||DEF.maxKm),maxFee:+(p.get('fee')||DEF.maxFee),minRating:+(p.get('r')||0),sort:p.get('sort')||'relevance'};
  const r=results();
  const sp=['Dog','Cat','Bird','Exotic','Cattle','Stray'];
  view.innerHTML=`<div class="wrap-wide">
  <div style="display:flex;gap:.5rem;align-items:center;padding-top:1.25rem;flex-wrap:wrap">
    <form id="ss" style="flex:1;min-width:240px;display:flex;gap:.5rem"><input class="input" name="q" value="${esc(S.q)}" placeholder="Search vets, services, areas…"><button class="btn primary sq">Search</button></form>
    <select class="input" id="sort" style="width:auto">${[['relevance','Best match'],['distance','Nearest'],['rating','Top rated'],['fee','Lowest fee']].map(([v,l])=>`<option value="${v}" ${S.sort===v?'selected':''}>${l}</option>`).join('')}</select>
  </div>
  <div class="chiprow custom-scroll">${CATS.map(c=>`<button class="chip ${S.cat===c.id?'on':''}" data-cat="${c.id}" style="cursor:pointer">${ic(c.icon,15)} ${c.label}</button>`).join('')}</div>
  <div class="sv">
    <aside class="filters" id="filters">
      <div style="display:flex;justify-content:space-between;align-items:center"><b>Filters</b><button class="btn sm" id="reset">Reset</button></div>
      <div class="fgroup"><h4>Availability</h4>
        ${[['open','Open now'],['emergency','24×7 / Emergency'],['home','Home visit / pickup'],['verified','Verified only']].map(([k,l])=>`<label class="chk"><input type="checkbox" data-f="${k}" ${S[k]?'checked':''}> ${l}</label>`).join('')}</div>
      <div class="fgroup"><h4>Pet type</h4><div class="chips">${sp.map(s=>`<button class="chip ${S.species.includes(s)?'on':''}" data-sp="${s}">${s}</button>`).join('')}</div></div>
      <div class="fgroup"><h4>Distance · <span class="mono" id="kmv">${S.maxKm} km</span></h4><input type="range" min="1" max="15" value="${S.maxKm}" id="km"></div>
      <div class="fgroup"><h4>Max fee · <span class="mono" id="feev">₹${S.maxFee}</span></h4><input type="range" min="0" max="2000" step="100" value="${S.maxFee}" id="fee"></div>
      <div class="fgroup"><h4>Rating</h4><div class="chips">${[0,4,4.5].map(v=>`<button class="chip ${S.minRating===v?'on':''}" data-r="${v}">${v?v+'+ ★':'Any'}</button>`).join('')}</div></div>
      <div class="card" style="padding:.9rem;font-size:13px"><b>Can't find a provider?</b><p class="sec" style="margin:.3rem 0 .6rem">Tell us and we'll add them.</p><button class="btn sm" data-open="list">Suggest / list a business</button></div>
    </aside>
    <section>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem"><span class="sec" style="font-size:14px"><b style="color:var(--content)" id="count">${r.length}</b> ${r.length===1?'result':'results'} ${S.cat!=='all'?'in '+catOf(S.cat).label:''} ${S.q?'for “'+esc(S.q)+'”':''} · Bengaluru</span><span class="tag hide-sm">sample data</span></div>
      <div class="grid" id="list">${r.length?r.map(card).join(''):`<div class="empty"><div style="color:var(--content-muted)">${ic('dog',40)}</div><h3 style="margin:.5rem 0">No matches</h3><p class="sec">Try widening distance or clearing filters.</p><button class="btn sm" id="reset2">Clear filters</button></div>`}</div>
      <p class="muted" style="font-size:12px;margin-top:1rem">Info wrong? <a href="#" data-open="correct">Submit a correction</a> — each listing shows when it was last verified.</p>
    </section>
    <aside class="map" id="map">
      <div class="road" style="left:0;right:0;top:45%;height:6px"></div><div class="road" style="top:0;bottom:0;left:40%;width:5px"></div><div class="road" style="left:10%;right:0;top:75%;height:4px;transform:rotate(-8deg)"></div>
      <span class="you" title="You"></span>
      ${r.map(p=>`<div class="pin ${hi===p.id?'hi':''}" data-pin="${p.id}" style="left:${p.x}%;top:${p.y}%"><span>${ic(catOf(p.cat).icon,13)} ${p.fee?'₹'+p.fee.toLocaleString('en-IN'):'Free'}</span><i></i></div>`).join('')}
      <div style="position:absolute;left:12px;bottom:12px" class="chip">Map preview · Google Maps / Mapbox in production</div>
    </aside>
  </div></div>`;
  $('#mobbar').hidden=false;
  const go=()=>{location.hash=toQS()};
  $('#ss').onsubmit=e=>{e.preventDefault();S.q=e.target.q.value;go()};
  $('#sort').onchange=e=>{S.sort=e.target.value;go()};
  view.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{S.cat=b.dataset.cat;go()});
  view.querySelectorAll('[data-f]').forEach(b=>b.onchange=()=>{S[b.dataset.f]=b.checked;go()});
  view.querySelectorAll('[data-sp]').forEach(b=>b.onclick=()=>{const s=b.dataset.sp;S.species=S.species.includes(s)?S.species.filter(x=>x!==s):[...S.species,s];go()});
  view.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{S.minRating=+b.dataset.r;go()});
  const km=$('#km'),fe=$('#fee');
  km.oninput=()=>$('#kmv').textContent=km.value+' km';km.onchange=()=>{S.maxKm=+km.value;go()};
  fe.oninput=()=>$('#feev').textContent='₹'+fe.value;fe.onchange=()=>{S.maxFee=+fe.value;go()};
  [$('#reset'),$('#reset2')].forEach(b=>b&&(b.onclick=()=>{S={...DEF,cat:S.cat};go()}));
}

/* ---------- interactions ---------- */
document.addEventListener('click',e=>{
  if(e.target.classList&&e.target.classList.contains('overlay')){mroot.innerHTML='';return}
  const t=e.target.closest('[data-book],[data-call],[data-open],[data-pin],.pcard,[data-close]');
  if(!t)return;
  if(t.dataset.close!==undefined){mroot.innerHTML='';return}
  if(t.dataset.book){e.stopPropagation();return book(+t.dataset.book)}
  if(t.dataset.call){e.stopPropagation();const p=PROVIDERS.find(x=>x.id==t.dataset.call);return toast('Prototype: would dial '+p.name+' (number hidden in sample data)')}
  if(t.dataset.open){e.preventDefault();return t.dataset.open==='list'?listBiz():correct()}
  if(t.dataset.pin){hi=+t.dataset.pin;const el=document.querySelector(`.pcard[data-id="${hi}"]`);document.querySelectorAll('.pcard.hi,.pin.hi').forEach(x=>x.classList.remove('hi'));t.classList.add('hi');el&&(el.classList.add('hi'),el.scrollIntoView({behavior:'smooth',block:'center'}));return}
  if(t.classList.contains('pcard'))return detail(+t.dataset.id);
});
document.addEventListener('mouseover',e=>{const c=e.target.closest('.pcard');if(!c)return;document.querySelectorAll('.pin').forEach(p=>p.classList.toggle('hi',p.dataset.pin===c.dataset.id))});
document.addEventListener('keydown',e=>{if(e.key==='Escape')mroot.innerHTML=''});
window.toggleSheet=w=>{const el=$('#'+w);el&&el.classList.toggle('show')};

function modal(html){mroot.innerHTML=`<div class="overlay"><div class="modal">${html}</div></div>`;const f=mroot.querySelector('input,select,textarea');f&&f.focus()}
const head=(k,t)=>`<header><div><p class="kicker">${k}</p><h2 style="font-size:1.35rem">${t}</h2></div><button class="icon-btn" data-close aria-label="Close">✕</button></header>`;

function detail(id){
  const p=PROVIDERS.find(x=>x.id===id),c=catOf(p.cat);
  modal(head(c.label,esc(p.name))+`
   <div class="chips" style="margin-bottom:1rem">${p.verified?'<span class="badge b-ok">✓ Verified by PawCare</span>':'<span class="badge b-mut">Not yet verified</span>'}${p.emergency?'<span class="badge b-bad">24×7 emergency</span>':''}${p.homeVisit?'<span class="badge b-info">Home visit</span>':''}</div>
   <dl class="kv"><dt>Rating</dt><dd>★ ${p.rating} · ${p.reviews} reviews</dd><dt>Location</dt><dd>${p.area} · ${p.km} km away</dd><dt>Hours</dt><dd>${p.hours}</dd><dt>Fee</dt><dd>${fee(p)}</dd>
   <dt>Treats</dt><dd>${p.species.join(', ')}</dd><dt>Services</dt><dd>${p.services.join(' · ')}</dd>${p.vets?`<dt>Vets on staff</dt><dd>${p.vets}</dd>`:''}<dt>Languages</dt><dd>${p.lang.join(', ')}</dd><dt>Last verified</dt><dd>${p.updated}</dd></dl>
   <div style="display:flex;gap:.5rem;margin-top:1.4rem;flex-wrap:wrap"><button class="btn primary" data-book="${p.id}">${p.cat==='ngo'?'Contact NGO':p.cat==='ambulance'?'Request dispatch':'Book appointment'}</button><button class="btn" data-call="${p.id}">${ic('phone',15)} Call</button><button class="btn" onclick="toast('Prototype: opens Google Maps directions')">${ic('arrow',15)} Directions</button></div>
   <p class="muted" style="font-size:12px;margin-top:1rem">Something wrong? <a href="#" data-open="correct" data-pid="${p.id}">Submit a correction</a></p>`);
}
function book(id){
  const p=PROVIDERS.find(x=>x.id===id);
  const slots=p.emergency&&p.cat!=='clinic'?['Now (walk-in)','In 30 min','In 1 hr']:['Today 5:30 PM','Today 7:00 PM','Tomorrow 10:15 AM','Tomorrow 12:00 PM'];
  modal(head('Request a slot',esc(p.name))+`<form id="bf" class="grid" novalidate>
    <div class="grid g2"><label class="field">Pet name<input class="input" name="pet" required placeholder="Bruno"></label>
    <label class="field">Pet type<select class="input" name="type">${p.species.map(s=>`<option>${s}</option>`).join('')}</select></label></div>
    <label class="field">Reason<input class="input" name="reason" placeholder="Annual vaccination, limping, not eating…"></label>
    <div class="field">Preferred slot<div class="slots">${slots.map((s,i)=>`<label class="chip"><input type="radio" name="slot" value="${s}" ${i?'':'checked'} style="accent-color:var(--info)"> ${s}</label>`).join('')}</div></div>
    <div class="grid g2"><label class="field">Your name<input class="input" name="name" required></label><label class="field">Mobile (WhatsApp)<input class="input" name="phone" inputmode="numeric" placeholder="10-digit" required></label></div>
    <span class="err" id="berr"></span>
    <button class="btn primary" style="justify-content:center">Send request</button>
    <p class="muted" style="font-size:12px;margin:0">Prototype: request is stored in your browser only. In production → provider gets WhatsApp + dashboard alert, you get confirmation.</p></form>`);
  $('#bf').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
    if(!f.pet||!f.name)return $('#berr').textContent='Pet name and your name are required.';
    if(!/^[6-9]\d{9}$/.test(f.phone))return $('#berr').textContent='Enter a valid 10-digit Indian mobile number.';
    store.push('bookings',{...f,provider:p.name});
    mroot.querySelector('.modal').innerHTML=head('Request sent','You\'re on the list ✓')+`<p class="sec">${esc(p.name)} will confirm <b>${esc(f.slot)}</b> for <b>${esc(f.pet)}</b> on WhatsApp.</p><p class="note">give ${esc(f.pet)} a scratch from us ♥</p><div style="margin-top:1rem"><button class="btn" data-close>Done</button></div>`;};
}
function listBiz(){
  modal(head('For providers · free','List your business')+`<form id="lf" class="grid">
   <label class="field">Business name<input class="input" name="biz" required></label>
   <div class="grid g2"><label class="field">Type<select class="input" name="type">${CATS.filter(c=>c.id!=='all').map(c=>`<option>${c.label}</option>`).join('')}</select></label><label class="field">Area / city<input class="input" name="area" required></label></div>
   <div class="grid g2"><label class="field">Contact person<input class="input" name="name" required></label><label class="field">Mobile<input class="input" name="phone" inputmode="numeric" required></label></div>
   <label class="field">Registration / licence no. <span class="muted">(for Verified badge, optional)</span><input class="input" name="reg"></label>
   <span class="err" id="lerr"></span><button class="btn primary" style="justify-content:center">Submit for verification</button></form>`);
  $('#lf').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
    if(!/^[6-9]\d{9}$/.test(f.phone))return $('#lerr').textContent='Enter a valid 10-digit mobile.';
    const n=store.push('listings',f);mroot.querySelector('.modal').innerHTML=head('Received','Thanks, '+esc(f.name.split(' ')[0])+'!')+`<p class="sec">Our team calls within 48 hrs to verify <b>${esc(f.biz)}</b>. Ref: <span class="hl">PC-L${String(n).padStart(4,'0')}</span></p><p class="muted" style="font-size:12px">Prototype: saved locally in this browser.</p><button class="btn" data-close>Close</button>`;};
}
function correct(){
  modal(head('Community data','Submit a correction')+`<form id="cf" class="grid">
   <label class="field">Listing<select class="input" name="pid">${PROVIDERS.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label>
   <label class="field">What's wrong?<select class="input" name="issue"><option>Wrong timings</option><option>Wrong phone/address</option><option>Permanently closed</option><option>Fee changed</option><option>Other</option></select></label>
   <label class="field">Details<textarea class="input" name="note" rows="3" placeholder="e.g. Now open till 10 PM on weekends" required></textarea></label>
   <button class="btn primary" style="justify-content:center">Send correction</button></form>`);
  $('#cf').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));store.push('corrections',f);mroot.innerHTML='';toast('Thanks! Correction queued for review ✓')};
}

/* ---------- static icons ---------- */
function paintIcons(){document.querySelectorAll('[data-ic]:not([data-icd])').forEach(el=>{el.insertAdjacentHTML('afterbegin',ic(el.dataset.ic,16)+' ');el.dataset.icd=1});const lg=$('#lg');if(lg&&!lg.innerHTML)lg.innerHTML=ic('paw',24)}
/* ---------- router ---------- */
function render(){
  const {path,p}=parse(); $('#mobbar').hidden=true;
  document.querySelectorAll('.filters.show,.map.show').forEach(x=>x.classList.remove('show'));
  if(path.startsWith('/search'))search(p);else home();
  document.body.classList.toggle('has-mobbar',path.startsWith('/search'));paintIcons();
  document.querySelectorAll('.rv').forEach(el=>el.classList.add('in'));
  document.querySelectorAll('.links a').forEach(a=>a.classList.toggle('on',location.hash.startsWith(a.getAttribute('href'))&&a.getAttribute('href')!=='#'));
}
window.addEventListener('hashchange',()=>{render();if(!location.hash.includes('search'))scrollTo(0,0)});
render();
})();
