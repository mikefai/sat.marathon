/* SAT-24H-Marathon — vanilla JS "backend": in-memory store + persistence + renderers */
(function(){
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const LS_KEY='sat-marathon-v1';

/* ---------- tiny store (localStorage-backed) ---------- */
const store={
  data: load(),
  load(){try{return JSON.parse(localStorage.getItem(LS_KEY))||{}}catch(e){return{}}},
  save(){try{localStorage.setItem(LS_KEY,JSON.stringify(this.data))}catch(e){}},
  get(k,d){return this.data[k]!==undefined?this.data[k]:d},
  set(k,v){this.data[k]=v;this.save()},
  reset(){this.data={};localStorage.removeItem(LS_KEY);location.reload()}
};
function load(){try{return JSON.parse(localStorage.getItem(LS_KEY))||{}}catch(e){return{}}}

/* ---------- derived collections ---------- */
const ALL_QS=[...(window.MARATHON_QS_RW||[]),...(window.MARATHON_QS_MATH||[])];
const ALL_TYPES=[...(window.MARATHON_RW||[]),...(window.MARATHON_MATH||[])];
const ALL_CARDS=window.MARATHON_FLASHCARDS||[];
const ALL_TRAPS=window.MARATHON_TRAPS||[];
const ALL_DESMOS=window.MARATHON_DESMOS||[];

/* answer log for stat line */
let answered=store.get('answered',{}); // id -> {ok:boolean}
function logAnswer(id,ok){answered[id]={ok};store.set('answered',answered);refreshStats()}
function refreshStats(){
  const ids=Object.keys(answered);
  const ok=ids.filter(i=>answered[i].ok).length;
  $('#statDone').textContent=`${ids.length} answered`;
  $('#statAcc').textContent=ids.length?`${Math.round(ok/ids.length*100)}% accuracy`:'— accuracy';
  $('#statMiss').textContent=`${ids.length-ok} misses`;
}

/* ---------- tabs ---------- */
$$('.tabs button').forEach(b=>b.addEventListener('click',()=>{
  $$('.tabs button').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');
  $$('.pane').forEach(p=>p.classList.remove('on'));
  $('#tab-'+b.dataset.tab).classList.add('on');
}));
$('#btnReset').addEventListener('click',()=>{if(confirm('Clear all progress?'))store.reset()});
$('#btnPrint').addEventListener('click',()=>window.print());

/* ---------- TYPES ---------- */
function renderTypes(){
  const q=($('#tsearch').value||'').toLowerCase();
  const f=$$('.filters button').find(b=>b.classList.contains('on'))?.dataset.tfilter||'all';
  let list=ALL_TYPES;
  if(f==='RW')list=list.filter(t=>/^RW/.test(t.id));
  if(f==='Math')list=list.filter(t=>/^M\d/.test(t.id));
  if(f==='high')list=[...list].sort((a,b)=>(b.highYield?1:0)-(a.highYield?1:0));
  if(q)list=list.filter(t=>(t.name+' '+t.domain+' '+t.cue+' '+t.pattern).toLowerCase().includes(q));
  $('#typeList').innerHTML=list.map(t=>`
    <article class="type">
      <h3>${t.id} · ${t.name}</h3>
      <div>
        <span class="pill ${t.highYield?'hot':''}">${t.highYield?'HIGH-YIELD':'standard'}</span>
        <span class="pill">${t.domain}</span>
        <span class="pill">${t.freq}</span>
        <span class="pill">target ~${t.secs}s</span>
      </div>
      <p><strong>Pattern:</strong> ${t.pattern}</p>
      <div class="cue"><strong>3-sec cue:</strong> ${t.cue}</div>
      <ol>${t.steps.map(s=>`<li>${s}</li>`).join('')}</ol>
      <p><strong>Wrong-answer shape:</strong> ${t.wrong}</p>
      <p class="trapref">Trap: ${t.trap} · Desmos: ${t.desmos}</p>
      <p><button class="mini" data-drill-type="${t.id}" type="button">Drill this type →</button></p>
    </article>`).join('')||'<p class="note">No types match.</p>';
}
$$('.filters button').forEach(b=>b.addEventListener('click',()=>{$$('.filters button').forEach(x=>x.classList.remove('on'));b.classList.add('on');renderTypes()}));
$('#tsearch').addEventListener('input',renderTypes);
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-drill-type]');
  if(t){$('#dType').value=t.dataset.drillType;renderDrills();$$('.tabs button')[2].click();return}
});

/* ---------- DRILLS ---------- */
let drillState={list:[],clock:0,timerOn:true,interval:null};
function filteredQs(){
  const sec=$('#dSection').value, ty=$('#dType').value, diff=$('#dDiff').value, hard=$('#dHard').checked;
  return ALL_QS.filter(q=>
    (sec==='all'||q.section===sec)&&
    (ty==='all'||q.type===ty)&&
    (diff==='all'||q.difficulty===diff)&&
    (!hard||q.difficulty==='Hard')
  );
}
document.addEventListener('change',e=>{
  const l=e.target.closest('.opts label');
  if(l && e.target.name){document.querySelectorAll(`input[name="${e.target.name}"]`).forEach(r=>r.closest('label')?.classList.remove('sel'));l.classList.add('sel');}
});
document.addEventListener('click',e=>{
  const c=e.target.closest('[data-check]'); if(c){checkQ(c.dataset.check);return}
  const f=e.target.closest('[data-flag]'); if(f){f.closest('.q').classList.toggle('flagged');f.textContent=f.closest('.q').classList.contains('flagged')?'Flagged':'Flag';return}
  const r=e.target.closest('[data-reveal]'); if(r){showAnswer(r.dataset.reveal);return}
});
function qById(id){return ALL_QS.find(q=>q.id===id)}
function norm(s){return String(s||'').trim().toLowerCase().replace(/[\s−-]+/g,'')}
function checkQ(id){
  const q=qById(id); const box=document.querySelector(`[data-fb="${id}"]`);
  let guess;
  if(q.options){const sel=document.querySelector(`input[name="${id}"]:checked`);guess=sel?sel.value:null}
  else{const inp=document.querySelector(`[data-in="${id}"]`);guess=inp?inp.value:null}
  if(!guess){box.innerHTML='<div class="fb no">Enter an answer first.</div>';return}
  const ok=norm(guess)===norm(q.answer);
  box.innerHTML=`<div class="fb ${ok?'ok':'no'}"><strong>${ok?'Correct.':'Answer: '+q.answer}</strong><br>${q.why}<br><small>Desmos: ${q.desmos} · Trap: ${q.trap}</small></div>`;
  logAnswer(id,ok);
}
function showAnswer(id){const q=qById(id);const box=document.querySelector(`[data-fb="${id}"]`);box.innerHTML=`<div class="fb no"><strong>Answer: ${q.answer}</strong><br>${q.why}<br><small>Desmos: ${q.desmos}</small></div>`}

/* drill type dropdown fill */
(function fillTypes(){const s=$('#dType');['RW1','RW2','RW3','RW4','RW5','RW6','RW7','RW8','RW9','RW10','RW11','RW12','M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12','M13','M14'].forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t;s.appendChild(o)})})();
['dSection','dType','dDiff','dHard'].forEach(id=>$('#'+id).addEventListener('change',renderDrills));
$('#dShuffle').addEventListener('click',()=>{
  drillState.list=[...drillState.list].sort(()=>Math.random()-0.5);
  renderDrillsFromList(drillState.list);
});
function renderDrillsFromList(list){
  $('#drillList').innerHTML=list.map((q,i)=>`
    <article class="q" data-qid="${q.id}">
      <div class="qmeta"><span>${q.section}</span><span>${q.type}</span><span>${q.difficulty}</span><span>~${q.secs}s</span><span class="trapref">trap ${q.trap}</span></div>
      <h3>${i+1}. ${q.stem.replace(/\n/g,'<br>')}</h3>
      ${q.options?`<div class="opts">${q.options.map((o,ix)=>`<label><input type="radio" name="${q.id}" value="${o}"> ${'ABCD'[ix]}) ${o}</label>`).join('')}</div>`
               :`<input type="text" placeholder="Grid-in answer" data-in="${q.id}" />`}
      <div class="qactions">
        <button type="button" data-check="${q.id}">Check</button>
        <button type="button" class="ghost" data-flag="${q.id}">Flag</button>
        <button type="button" class="ghost" data-reveal="${q.id}">Show answer</button>
      </div>
      <div data-fb="${q.id}"></div>
    </article>`).join('')||'<p class="note">No questions for this filter.</p>';
}
function renderDrills(){
  const list=filteredQs();
  drillState.list=list;
  renderDrillsFromList(list);
}

/* ---------- FLASHCARDS ---------- */
let cardOrder=[...ALL_CARDS.keys()], cardIdx=0, cardMiss=new Set(store.get('cardMiss',[]));
function currentDeck(){
  let ids=[...cardOrder];
  if($('#cMiss').checked){ids=ids.filter(i=>cardMiss.has(i)); if(ids.length===0) return [...cardOrder];}
  return ids;
}
function renderCard(){
  const deck=currentDeck(); cardIdx=Math.min(cardIdx,deck.length-1);
  const i=deck[cardIdx]; const c=ALL_CARDS[i];
  $('#flashFront').textContent=c.f;
  $('#flashBack').textContent=c.b;
  $('#flashBack').hidden=true;
  $('#flashFront').hidden=false;
  $('#cCount').textContent=`${cardIdx+1} / ${deck.length}`;
}
$('#cShuffle').addEventListener('click',()=>{cardOrder=[...cardOrder].sort(()=>Math.random()-0.5);cardIdx=0;renderCard()});
$('#cMiss').addEventListener('change',()=>{cardIdx=0;renderCard()});
$('#cFlip').addEventListener('click',()=>{const f=$('#flashFront'),b=$('#flashBack');const showBack=b.hidden;b.hidden=!showBack;f.hidden=showBack});
$('#flash').addEventListener('click',()=>$('#cFlip').click());
$('#cNext').addEventListener('click',()=>{const d=currentDeck();cardIdx=(cardIdx+1)%d.length;renderCard()});
$('#cPrev').addEventListener('click',()=>{const d=currentDeck();cardIdx=(cardIdx-1+d.length)%d.length;renderCard()});
$('#cKnow').addEventListener('click',()=>{const d=currentDeck();const id=d[cardIdx];cardMiss.delete(id);store.set('cardMiss',[...cardMiss]);const newDeck=currentDeck();cardIdx=Math.min(cardIdx,Math.max(0,newDeck.length-1));renderCard()});
$('#cMissBtn').addEventListener('click',()=>{const d=currentDeck();cardMiss.add(d[cardIdx]);store.set('cardMiss',[...cardMiss]);cardIdx=(cardIdx+1)%d.length;renderCard()});
document.addEventListener('keydown',e=>{if(e.target.id==='flash'&&e.code==='Space'){e.preventDefault();$('#cFlip').click()}});

/* ---------- FORMULAS (from Math guide knowledge, compressed) ---------- */
const FORMULA_HTML = `
<div class="card"><h2>Math — the 14 you must know cold</h2>
<p><strong>Isolation:</strong> do same op both sides, undo add/sub before ×/÷.<br>
<strong>Two variables:</strong> slope m=(y₂−y₁)/(x₂−x₁); y−y₁=m(x−x₁); parallel=same m; perp m₁m₂=−1.<br>
<strong>Percent:</strong> is/of = %/100; change (new−old)/old; multiplier ×(1±r).<br>
<strong>Quadratic:</strong> x=(−b±√(b²−4ac))/(2a); vertex x=−b/2a; D=b²−4ac.<br>
<strong>Vertex form:</strong> y=a(x−h)²+k, vertex (h,k).<br>
<strong>Exponents:</strong> a^m·a^n=a^(m+n); (a^m)^n=a^(mn); a^(1/n)=ⁿ√a.<br>
<strong>Exponential:</strong> y=a·b^x; b=ratio of consecutive y; a at x=0.<br>
<strong>Circle:</strong> (x−h)²+(y−k)²=r²; C=2πr; A=πr².<br>
<strong>Sector/arc:</strong> arc=(θ/360)·2πr; area=(θ/360)·πr²; radians s=rθ.<br>
<strong>Triangle:</strong> sum=180; special sides 30-60-90=1:√3:2; 45-45-90=1:1:√2.<br>
<strong>Distance:</strong> d=√((Δx)²+(Δy)²); midpoint average.<br>
<strong>Stats:</strong> mean=sum/n; median=middle; range=max−min; MOE → estimate±MOE.<br>
<strong>Similar solids:</strong> length×k, area×k², volume×k³.<br>
<strong>Rational:</strong> excluded x from original denominators; cross-multiply a/b=c/d → ad=bc.</p></div>
<div class="card"><h2>RW — grammar & meaning cheat</h2>
<p><strong>Boundaries:</strong> IC = complete sentence. IC.IC / IC;IC / IC, and FANBOYS IC / IC: detail. No comma alone between two IC.<br>
<strong>Agreement:</strong> strip prepositional phrases; verb matches subject number.<br>
<strong>Pronouns:</strong> one clear antecedent; agree in number.<br>
<strong>Parallel:</strong> same form in lists/comparisons (to run, to swim).<br>
<strong>Transitions:</strong> same (moreover), contrast (however), cause (therefore), example (for example).<br>
<strong>Vocab-in-context:</strong> cover, predict, plug in, check tone+precision.<br>
<strong>Inference:</strong> forced by text, one step beyond — not could-be-true.<br>
<strong>Evidence:</strong> must support exact claim (numbers, mechanism).<br>
<strong>Purpose:</strong> describes the sentence's job — not its content.</p></div>`;
$('#formulaBox').innerHTML=FORMULA_HTML;

/* ---------- DESMOS VAULT ---------- */
function renderVault(){
  const q=$('#vsearch').value.toLowerCase();
  const list=ALL_DESMOS.filter(d=>!q||(d.tag+' '+d.code).toLowerCase().includes(q));
  $('#vault').innerHTML=list.map(d=>`<div class="vault-item"><strong>${d.tag}</strong><br><code class="copy" data-code="${d.code.replace(/"/g,'&quot;')}" title="Click to copy">${d.code.replace(/</g,'&lt;')}</code><br><small>${d.why}</small></div>`).join('')||'<p class="note">No matches.</p>';
}
$('#vsearch').addEventListener('input',renderVault);
document.addEventListener('click',e=>{const c=e.target.closest('code.copy');if(c){navigator.clipboard?.writeText(c.dataset.code);c.style.background='#3f6212';setTimeout(()=>c.style.background='',800)}});

/* ---------- TRAPS ---------- */
function renderTraps(){
  const q=$('#trapSearch').value.toLowerCase();
  const list=ALL_TRAPS.filter(t=>!q||(t.trap+' '+t.check+' '+t.example).toLowerCase().includes(q));
  $('#trapList').innerHTML=list.map(t=>`<div class="trap"><b>${t.id} · ${t.trap}</b><p><strong>Check:</strong> ${t.check}</p><p><strong>Example:</strong> ${t.example}</p></div>`).join('')||'<p class="note">No traps found.</p>';
}
$('#trapSearch').addEventListener('input',renderTraps);

/* ---------- MINI-MOCK ---------- */
let mock={list:[],i:0,clock:2100,interval:null,answers:{}};
function fmt(t){const m=Math.floor(t/60),s=t%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function renderMock(){
  const q=mock.list[mock.i];
  if(!q){const ids=mock.list.map(x=>x.id);const correct=ids.filter(id=>mock.answers[id]===true).length;$('#mockList').innerHTML=`<div class="card"><h2>Mock complete</h2><p>Score: ${correct} / ${mock.list.length} correct. Review misses in Drills.</p></div>`;$('#mScore').textContent='';clearInterval(mock.interval);return}


  $('#mScore').textContent=`Q ${mock.i+1}/${mock.list.length}`;

  $('#mockList').innerHTML=`<article class="q">
    <div class="qmeta"><span>${q.section}</span><span>${q.type}</span><span>${q.difficulty}</span></div>
    <h3>${q.stem.replace(/\n/g,'<br>')}</h3>
    ${q.options?`<div class="opts">${q.options.map((o,ix)=>`<label><input type="radio" name="mq" value="${o}" ${mock.answers[q.id+'_guess']===o?'checked':''}> ${'ABCD'[ix]}) ${o}</label>`).join('')}</div>`:`<input type="text" value="${mock.answers[q.id+'_guess']||''}" data-mockin="${q.id}" />`}
    <div class="qactions"><button type="button" id="mNext">Next →</button><button type="button" class="ghost" id="mSkip">Skip</button></div>
  </article>`;
  document.querySelectorAll('input[name="mq"]').forEach(r=>r.addEventListener('change',()=>mock.answers[q.id+'_guess']=r.value));
  const inp=document.querySelector(`[data-mockin="${q.id}"]`);if(inp)inp.addEventListener('input',()=>mock.answers[q.id+'_guess']=inp.value);
  $('#mNext').addEventListener('click',()=>{gradeMockQ(q);mock.i++;renderMock()});
  $('#mSkip').addEventListener('click',()=>{mock.answers[q.id]=false;mock.i++;renderMock()});
}
function gradeMockQ(q){
  const g=mock.answers[q.id+'_guess'];
  mock.answers[q.id]=g? (norm(g)===norm(q.answer)) : false;
  answered[q.id]={ok:mock.answers[q.id]};store.set('answered',answered);refreshStats();
}
$('#mStart').addEventListener('click',()=>{
  const shuffled=[...ALL_QS].sort(()=>Math.random()-0.5).slice(0,20);
  mock={list:shuffled,i:0,clock:2100,interval:null,answers:{}};
  $('#mClock').textContent=fmt(mock.clock);
  clearInterval(mock.interval);
  mock.interval=setInterval(()=>{mock.clock--;$('#mClock').textContent=fmt(mock.clock);if(mock.clock<=0){clearInterval(mock.interval);gradeAllMock();renderMock()}},1000);
  renderMock();
});
$('#mQuit').addEventListener('click',()=>{clearInterval(mock.interval);mock.list=[];mock.i=0;$('#mockList').innerHTML='';$('#mScore').textContent='';$('#mClock').textContent='35:00'});
function gradeAllMock(){mock.list.forEach(q=>gradeMockQ(q))}

/* ---------- initial render ---------- */
renderTypes();renderDrills();renderCard();renderVault();renderTraps();refreshStats();
})();
