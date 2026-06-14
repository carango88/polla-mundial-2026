/* Polla Mundial 2026 — dashboard logic */
const D = window.DATA;
const P = D.points;
const nameOf = c => D.teamNames[c] || c;
const FLAGS = {
  MEX:"🇲🇽",CAN:"🇨🇦",USA:"🇺🇸",ARG:"🇦🇷",BRA:"🇧🇷",FRA:"🇫🇷",ESP:"🇪🇸",ENG:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  GER:"🇩🇪",NED:"🇳🇱",POR:"🇵🇹",BEL:"🇧🇪",CRO:"🇭🇷",URU:"🇺🇾",COL:"🇨🇴",SUI:"🇨🇭",
  ECU:"🇪🇨",SEN:"🇸🇳",MAR:"🇲🇦",JPN:"🇯🇵",KOR:"🇰🇷",AUS:"🇦🇺",IRN:"🇮🇷",KSA:"🇸🇦",
  QAT:"🇶🇦",NOR:"🇳🇴",SWE:"🇸🇪",TUR:"🇹🇷",CZE:"🇨🇿",AUT:"🇦🇹",SCO:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",CIV:"🇨🇮",
  EGY:"🇪🇬",TUN:"🇹🇳",ALG:"🇩🇿",GHA:"🇬🇭",CPV:"🇨🇻",RSA:"🇿🇦",COD:"🇨🇩",NZL:"🇳🇿",
  PAR:"🇵🇾",PAN:"🇵🇦",BIH:"🇧🇦",UZB:"🇺🇿",IRQ:"🇮🇶",JOR:"🇯🇴",CUW:"🇨🇼",HAI:"🇭🇹",NGA:"🇳🇬"
};
const flagOf = c => FLAGS[c] || "🏳️";
// Group-stage match dates (US Eastern), aligned to window.DATA.schedule order.
const MATCH_DATES=["Jun 11","Jun 11","Jun 12","Jun 12","Jun 13","Jun 13","Jun 13","Jun 14","Jun 14","Jun 14","Jun 14","Jun 14","Jun 15","Jun 15","Jun 15","Jun 15","Jun 16","Jun 16","Jun 16","Jun 17","Jun 17","Jun 17","Jun 17","Jun 17","Jun 18","Jun 18","Jun 18","Jun 18","Jun 19","Jun 19","Jun 19","Jun 19","Jun 20","Jun 20","Jun 20","Jun 21","Jun 21","Jun 21","Jun 21","Jun 21","Jun 22","Jun 22","Jun 22","Jun 22","Jun 23","Jun 23","Jun 23","Jun 23","Jun 24","Jun 24","Jun 24","Jun 24","Jun 24","Jun 24","Jun 25","Jun 25","Jun 25","Jun 25","Jun 25","Jun 25","Jun 26","Jun 26","Jun 26","Jun 26","Jun 26","Jun 26","Jun 27","Jun 27","Jun 27","Jun 27","Jun 27","Jun 27"];

// ---- results (answer key) state ----------------------------------------
function blankResults(){
  return { group: Array(D.schedule.length).fill(null),
           scores: Array(D.schedule.length).fill(null),  // [home,away] goals per group match
           r32:[], r16:[], qf:[], sf:[],
           fourth:"", third:"", runnerUp:"", champion:"", scorer:"",
           eliminated:[],     // teams that can no longer advance (knock out of contention)
           goals:[] };        // official goal scorers {player, team, goals}
}
// Layer the official (hard-coded) results from results.js on top of anything
// entered manually — official always wins.
function applyOfficial(r){
  const o = window.RESULTS;
  if(!o) return r;
  if(Array.isArray(o.group)) o.group.forEach((v,i)=>{ if(v) r.group[i]=v; });
  if(Array.isArray(o.scores)) o.scores.forEach((v,i)=>{ if(v) r.scores[i]=v; });
  for(const k of ["r32","r16","qf","sf"]) if(Array.isArray(o[k])&&o[k].length) r[k]=o[k].slice();
  for(const k of ["fourth","third","runnerUp","champion","scorer"]) if(o[k]) r[k]=o[k];
  if(Array.isArray(o.eliminated)) r.eliminated=o.eliminated.slice();
  if(Array.isArray(o.goals)) r.goals=o.goals.slice();
  return r;
}
// Results come ONLY from the official source (results.js). They are never
// editable in the browser — set matches are locked, the rest are pending.
function loadResults(){ return applyOfficial(blankResults()); }
let results = loadResults();

// ---- scoring engine -----------------------------------------------------
function setScore(picks, actual, per){
  if(!actual || !actual.length) return {pts:0, hits:[]};
  const set = new Set(actual);
  const hits = picks.filter(c => set.has(c));
  return {pts: hits.length*per, hits};
}
function scoreParticipant(p){
  // group
  let gPts=0, gHits=0, gPlayed=0;
  for(let i=0;i<D.schedule.length;i++){
    const a=results.group[i];
    if(a){ gPlayed++; if(p.group[i]===a){ gPts+=P.group; gHits++; } }
  }
  const r32=setScore(p.r32,results.r32,P.r32);
  const r16=setScore(p.r16,results.r16,P.r16);
  const qf =setScore(p.qf ,results.qf ,P.qf);
  const sf =setScore(p.sf ,results.sf ,P.sf);
  let place=0; const placeHits={};
  for(const k of ["fourth","third","runnerUp","champion"]){
    const ok = results[k] && p[k]===results[k];
    if(ok) place+=P[k]; placeHits[k]=ok;
  }
  const scOk = results.scorer && p.scorer===results.scorer;
  const scPts = scOk?P.scorer:0;
  const total = gPts+r32.pts+r16.pts+qf.pts+sf.pts+place+scPts;
  return {group:gPts,gHits,gPlayed,r32,r16,qf,sf,place,placeHits,scPts,scOk,total};
}
function scoreAll(){
  return D.participants.map(p=>({p, s:scoreParticipant(p)}))
    .sort((a,b)=> b.s.total-a.s.total || a.p.name.localeCompare(b.p.name));
}

// ---- routing ------------------------------------------------------------
let tab="leaderboard", sortKey="total", detailName=null;
const SECONDARY=["groups","goals","sim","tracked","stats"];
function selectTab(name){
  tab=name;
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.tab===name));
  // on mobile, the secondary tabs live in the More popup → keep the More button lit when one is active
  const moreTab=document.getElementById("moreTab");
  if(moreTab) moreTab.classList.toggle("active",SECONDARY.includes(name));
  document.querySelectorAll("#moreMenu .mitem").forEach(x=>x.classList.toggle("active",x.dataset.tab===name));
  render();
}
const moreTab=document.getElementById("moreTab");
const moreMenu=document.getElementById("moreMenu");
const closeMore=()=>moreMenu&&moreMenu.classList.remove("open");
// build the More popup from the secondary tabs (icon + label)
if(moreMenu){
  document.querySelectorAll('.tabs .tab[data-prio="2"]').forEach(t=>{
    const b=document.createElement("button");
    b.className="mitem"; b.dataset.tab=t.dataset.tab; b.innerHTML=t.innerHTML;
    b.onclick=()=>{ selectTab(t.dataset.tab); closeMore(); };
    moreMenu.appendChild(b);
  });
}
document.querySelectorAll(".tabs .tab").forEach(t=>{
  if(t.id==="moreTab"){ t.onclick=e=>{ e.stopPropagation(); moreMenu.classList.toggle("open"); }; return; }
  t.onclick=()=>{ selectTab(t.dataset.tab); closeMore(); };
});
document.addEventListener("click",e=>{
  if(moreMenu&&moreMenu.classList.contains("open")&&!moreMenu.contains(e.target)&&!moreTab.contains(e.target)) closeMore();
});

function anyResults(){
  return results.group.some(Boolean)||results.r32.length||results.r16.length||
         results.qf.length||results.sf.length||results.champion||results.scorer;
}

// Competition ranking with ties: people on the same total share a position (1,1,1,4,5…).
// label(total) → "T1" when tied, plain "4" when not. Position is by total points only.
function rankInfo(ranked){
  const cnt={}; ranked.forEach(r=>{cnt[r.s.total]=(cnt[r.s.total]||0)+1;});
  const distinct=[...new Set(ranked.map(r=>r.s.total))].sort((a,b)=>b-a);
  const rk={}; let acc=0; distinct.forEach(t=>{rk[t]=acc+1; acc+=cnt[t];});
  return {rank:t=>rk[t], tied:t=>cnt[t]>1, label:t=>(cnt[t]>1?"T":"")+rk[t]};
}

// ---- LEADERBOARD --------------------------------------------------------
function renderLeaderboard(){
  const ranked = scoreAll();
  const ri = rankInfo(ranked);
  const cols=[["group","Grupos","Fase de grupos"],["r32","R32","Ronda de 32"],["r16","R16","Octavos"],
              ["qf","4tos","Cuartos"],["sf","Semis","Semifinalistas"],
              ["fourth","4.º","Cuarto lugar"],["third","3.º","Tercer lugar"],["runnerUp","2.º","Subcampeón"],["champion","🏆","Campeón"],
              ["scPts","⚽","Goleador"]];
  const colVal=(s,k)=>
    k==="group"?s.group:
    k==="scPts"?s.scPts:
    (k==="champion"||k==="runnerUp"||k==="third"||k==="fourth")?(s.placeHits[k]?P[k]:0):
    s[k].pts;
  const app=document.getElementById("app");
  app.innerHTML = `
  <div class="toprow">
    <input class="search" id="q" placeholder="Buscar participante…">
    <span class="muted">${ranked.length} entradas</span>
    ${anyResults()?'<span class="badge live">Resultados cargados</span>':'<span class="muted">· Sin resultados aún — carga la pestaña Resultados</span>'}
  </div>
  <div class="card" style="padding:0;overflow:auto">
  <table><thead><tr>
    <th>#</th><th data-k="name">Participante</th>
    ${cols.map(c=>`<th data-k="${c[0]}" style="text-align:right" title="${c[2]||c[1]}">${c[1]}</th>`).join("")}
    <th data-k="total" style="text-align:right">Total</th>
  </tr></thead><tbody id="lb"></tbody></table></div>`;

  const draw = (filter="")=>{
    let rows = ranked;
    if(filter) rows = rows.filter(r=>r.p.name.toLowerCase().includes(filter.toLowerCase()));
    if(sortKey!=="total"){
      rows=[...rows].sort((a,b)=>{
        if(sortKey==="name") return a.p.name.localeCompare(b.p.name);
        return colVal(b.s,sortKey)-colVal(a.s,sortKey);
      });
    }
    document.getElementById("lb").innerHTML = rows.map((r,i)=>{
      const cell=k=>colVal(r.s,k);
      return `<tr>
        <td class="rank" title="${ri.tied(r.s.total)?'Empatado en la posición '+ri.rank(r.s.total):''}">${ri.label(r.s.total)}</td>
        <td><span class="name-link" data-n="${enc(r.p.name)}">${deco(r.p.name)}${r.p.name}</span></td>
        ${cols.map(c=>`<td style="text-align:right" class="muted">${cell(c[0])||""}</td>`).join("")}
        <td style="text-align:right"><span class="total">${r.s.total}</span></td>
      </tr>`;
    }).join("");
    document.querySelectorAll(".name-link").forEach(el=>el.onclick=()=>{
      detailName=dec(el.dataset.n); tab="participant";
      document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.tab==="participant"));
      render();
    });
  };
  draw();
  document.getElementById("q").oninput=e=>draw(e.target.value);
  document.querySelectorAll("th[data-k]").forEach(th=>th.onclick=()=>{
    sortKey=th.dataset.k; draw(document.getElementById("q").value);
  });
}

// ---- RESULTS (read-only official answer key) ---------------------------
// Results come only from results.js. Set matches are locked; the rest are
// shown as pending. Nothing here is editable in the browser.
function renderResults(){
  const app=document.getElementById("app");
  const played=results.group.filter(Boolean).length;
  app.innerHTML=`
  <div class="toprow">
    <span class="badge live">🔒 Resultados oficiales</span>
    <span class="muted">Se actualizan desde la fuente oficial — no editables.</span>
  </div>
  <div class="jumpbar">
    <span class="muted" style="font-size:11px;align-self:center">Ir a:</span>
    ${D.groups.map(g=>`<button class="jchip" data-t="sec-g-${g.label}">${g.label}</button>`).join("")}
    <span class="jsep"></span>
    <button class="jchip" data-t="sec-r32">R32</button>
    <button class="jchip" data-t="sec-r16">R16</button>
    <button class="jchip" data-t="sec-qf">4tos</button>
    <button class="jchip" data-t="sec-sf">Semis</button>
    <button class="jchip" data-t="sec-puestos">Puestos</button>
  </div>
  <div class="card">
    <div class="row"><h3 style="margin:0">Fase de grupos</h3>
      <span class="stage-pts">1 pto por acierto · </span>
      <span class="counter ${played===72?'full':''}">${played}/72 jugados</span></div>
    <div style="margin-top:6px">${D.groups.map(groupBlock).join("")}</div>
  </div>
  ${koView("r32","Clasificados a Ronda de 32",32,2)}
  ${koView("r16","Clasificados a Octavos",16,3)}
  ${koView("qf","Clasificados a Cuartos",8,4)}
  ${koView("sf","Semifinalistas",4,5)}
  <div class="card" id="sec-puestos">
    <h3 style="margin-top:0">Puestos finales y goleador</h3>
    ${placeView("champion","Campeón",25)}
    ${placeView("runnerUp","Subcampeón",15)}
    ${placeView("third","3er puesto",10)}
    ${placeView("fourth","4to puesto",10)}
    <div class="kv"><span>Goleador <span class="muted">15 pts</span></span>
      <span>${results.scorer?`🔒 ${results.scorer}`:'<span class="muted">Pendiente</span>'}</span></div>
  </div>`;

  // sticky jump-bar offset + smooth scroll + scroll-spy highlight
  const hh=document.querySelector("header").offsetHeight;
  document.documentElement.style.setProperty("--hh", hh+"px");
  const chips=[...document.querySelectorAll(".jchip")];
  chips.forEach(b=>b.onclick=()=>{
    const el=document.getElementById(b.dataset.t); if(el) el.scrollIntoView({behavior:"smooth",block:"start"});
  });
  const spy=()=>{
    const line=hh+80; let cur=chips[0];
    for(const b of chips){ const el=document.getElementById(b.dataset.t); if(el && el.getBoundingClientRect().top<=line) cur=b; }
    chips.forEach(b=>b.classList.toggle("act",b===cur));
  };
  if(tab==="results"){ window.onscroll=spy; spy(); } else window.onscroll=null;
}
// One participant's pick for match i: highlights the team they chose, ✓/✗ if played.
function pickCard(p,i){
  const m=D.schedule[i], pk=p.group[i], a=results.group[i];
  const correct = a ? (pk===a) : null;
  const state = correct===null ? "pend" : (correct ? "ok" : "bad");
  const status = correct===null ? "·" : (correct ? "✓" : "✗");
  const homeSel=pk==="1", awaySel=pk==="2", drew=pk==="E";
  const mid = drew ? '🤝' : '<span class="muted">vs</span>';
  return `<div class="pcard ${state}" title="${a?('Resultado: '+(a==="1"?m.home:a==="2"?m.away:"Empate")):'Pendiente'}">
    <span class="pstat">${status}</span>
    <span class="pteam h ${homeSel?'psel':''}"><span class="fl">${flagOf(m.home)}</span> ${m.home}</span>
    <span class="pmid">${mid}</span>
    <span class="pteam a ${awaySel?'psel':''}">${m.away} <span class="fl">${flagOf(m.away)}</span></span>
  </div>`;
}
function groupBlock(g){
  const played=g.matches.filter(i=>results.group[i]).length;
  const teams=g.teams.map(c=>`<span class="fl">${flagOf(c)}</span> ${c}`).join(" · ");
  return `<div class="grp" id="sec-g-${g.label}">
    <div class="grp-h"><span>Grupo ${g.label}</span>
      <span class="grp-teams">${teams}</span>
      <span class="muted" style="margin-left:auto;font-weight:600">${played}/6</span></div>
    <div class="grpgrid">${g.matches.map(i=>matchView(D.schedule[i],i)).join("")}</div>
  </div>`;
}
function matchView(m,i){
  const r=results.group[i];
  const homeWon=r==="1", awayWon=r==="2", tie=r==="E";
  const homeCls = homeWon?"win":(awayWon?"lose":"");   // tie → both neutral
  const awayCls = awayWon?"win":(homeWon?"lose":"");
  const state = tie?"tie":(r?"played":"pending");
  const mid = tie ? '<b class="tie hand">🤝</b>' : '<b class="tie">vs</b>';
  return `<div class="match ro ${state}" title="${r?'Resultado oficial':'Pendiente'}">
    <span class="t home ${homeCls}">${homeWon?'✓ ':''}<span class="fl">${flagOf(m.home)}</span> ${m.home}</span>
    ${mid}
    <span class="t away ${awayCls}">${m.away} <span class="fl">${flagOf(m.away)}</span>${awayWon?' ✓':''}</span>
  </div>`;
}
function koView(key,title,target,per){
  const teams=results[key]||[];
  const body = teams.length
    ? `<div class="teamgrid">${teams.map(c=>`<span class="chk on">🔒 <span class="fl">${flagOf(c)}</span> ${c} <span class="muted">${nameOf(c)}</span></span>`).join("")}</div>`
    : `<div class="muted">Pendiente</div>`;
  return `<div class="card" id="sec-${key}">
    <div class="row"><h3 style="margin:0">${title}</h3>
      <span class="stage-pts">${per} ptos c/u · </span>
      <span class="counter ${teams.length===target?'full':''}">${teams.length}/${target}</span></div>
    <div style="margin-top:10px">${body}</div></div>`;
}
function placeView(key,label,pts){
  const c=results[key];
  return `<div class="kv"><span>${label} <span class="muted">${pts} pts</span></span>
    <span>${c?`🔒 <span class="fl">${flagOf(c)}</span> ${nameOf(c)}`:'<span class="muted">Pendiente</span>'}</span></div>`;
}

// ---- PARTICIPANT DETAIL -------------------------------------------------
// Profiles pinned as quick-access buttons in the Participante tab.
const QUICK_PROFILES = [
  "JUAN HUNDRED LONDOÑO",
  "BENJAMIN WHITE",
  "ROBERTO JOSE ARANGO CABAL",
  "HELENA ARANGO - MAGGIE LONDOÑO",
  "ISHAN Y MARIA ELISA",
  "JOSE ROBERTO Y ROBERTO JOSE ARANGO",
  "IVETTE MANZUR",
  "RAFA BHABHA Y MAGGIE LONDOÑO",
  "SEBAS BHABHA Y JOSE ROBERTO ARANGO",
  "ROBERTO ARANGO",
  "MARIA CABAL",
  "LUIS GUILLERMO LONDOÑO",
  "PABLO LONDOÑO MEJIA",
  "MIGUEL LONDONO",
  "CIPRIANO LONDONO",
  "MATEO LONDONO",
  "LA GABRIELINA",
];
function renderParticipant(){
  const app=document.getElementById("app");
  const ranked=scoreAll();
  const byName=[...D.participants].sort((a,b)=>a.name.localeCompare(b.name,'es'));
  const opts=byName.map(p=>`<option value="${enc(p.name)}" ${p.name===detailName?'selected':''}>${p.name}</option>`).join("");
  const quick=QUICK_PROFILES.filter(n=>D.participants.some(p=>p.name===n))
    .map(n=>`<button class="jchip qa ${n===detailName?'act':''}" data-n="${enc(n)}">${deco(n)}${n}</button>`).join("");
  const dlist=`<datalist id="pnames">${byName.map(p=>`<option value="${p.name}"></option>`).join("")}</datalist>`;
  app.innerHTML=`<div class="toprow">
      <input id="psearch" class="search" list="pnames" placeholder="🔍 Buscar participante…" value="${detailName?detailName.replace(/"/g,'&quot;'):''}" autocomplete="off">
      <select id="psel" style="min-width:240px"><option value="">Selecciona…</option>${opts}</select>
      ${dlist}
      ${quick?`<span class="muted" style="font-size:12px">Acceso rápido:</span>${quick}`:""}
    </div><div id="pdetail"></div>`;
  const pick=name=>{
    const hit=D.participants.find(p=>p.name===name) || D.participants.find(p=>p.name.toLowerCase()===String(name||'').toLowerCase());
    if(!hit) return;
    detailName=hit.name;
    const sel=document.getElementById("psel"); if(sel) sel.value=enc(hit.name);
    drawDetail();
  };
  document.getElementById("psel").onchange=e=>{detailName=e.target.value?dec(e.target.value):null;drawDetail();};
  const sb=document.getElementById("psearch");
  sb.onchange=e=>pick(e.target.value);          // fires when a datalist option is chosen
  document.querySelectorAll(".qa").forEach(b=>b.onclick=()=>{
    detailName=dec(b.dataset.n);
    document.getElementById("psel").value=b.dataset.n;
    document.querySelectorAll(".qa").forEach(x=>x.classList.toggle("act",x===b));
    drawDetail();
  });
  drawDetail();
}
function drawDetail(){
  const box=document.getElementById("pdetail");
  if(!detailName){box.innerHTML='<div class="card muted">Elige un participante para ver el desglose.</div>';return;}
  const p=D.participants.find(x=>x.name===detailName); const s=scoreParticipant(p);
  const _ri=rankInfo(scoreAll());
  const posStr=(_ri.tied(s.total)?"T":"#")+_ri.rank(s.total);
  const koRow=(key,label,res)=>`<div class="kv"><span>${label} <span class="muted">${p[key].length} picks</span></span>
     <span><b class="${res.pts?'ok':'muted'}">${res.hits.length} aciertos</b> · ${res.pts} pts</span></div>`;
  const placeRow=(k,label)=>{const ok=s.placeHits[k];const pick=p[k]?nameOf(p[k]):'—';
     return `<div class="kv"><span>${label}</span><span>${pick} ${results[k]?(ok?'<span class="ok">✓</span>':'<span class="ko">✗</span>'):'<span class="muted">pend.</span>'} · ${ok?P[k]:0} pts</span></div>`;};
  box.innerHTML=`
   <div class="card row" style="justify-content:space-between">
     <div><div style="font-size:18px;font-weight:800">${p.name}</div>
       <div class="muted">Posición ${posStr} de ${D.participants.length}${_ri.tied(s.total)?' (empate)':''}</div></div>
     <div style="text-align:right"><div class="total" style="font-size:28px">${s.total}</div><div class="muted">de 311 pts</div></div>
   </div>
   <div class="card">
     <div class="kv"><span>Fase de grupos <span class="muted">${s.gPlayed} jugados</span></span><span><b class="${s.group?'ok':'muted'}">${s.gHits} aciertos</b> · ${s.group} pts</span></div>
     ${koRow("r32","Ronda de 32",s.r32)}
     ${koRow("r16","Octavos",s.r16)}
     ${koRow("qf","Cuartos",s.qf)}
     ${koRow("sf","Semifinalistas",s.sf)}
     ${placeRow("champion","Campeón")}
     ${placeRow("runnerUp","Subcampeón")}
     ${placeRow("third","3er puesto")}
     ${placeRow("fourth","4to puesto")}
     <div class="kv"><span>Goleador</span><span>${p.scorer||'—'} ${results.scorer?(s.scOk?'<span class="ok">✓</span>':'<span class="ko">✗</span>'):'<span class="muted">pend.</span>'} · ${s.scPts} pts</span></div>
   </div>
   ${picksCard(p.name)}
   <div class="card"><h3 style="margin-top:0">Picks de grupos <span class="muted" style="font-weight:400;font-size:12px">· tu elección resaltada · ✓/✗ en jugados</span></h3>
     ${D.groups.map(g=>`<div class="grp-h" style="margin-top:10px"><span>Grupo ${g.label}</span></div>
        <div class="grpgrid">${g.matches.map(i=>pickCard(p,i)).join("")}</div>`).join("")}
   </div>`;
}


// ---- MIS PERFILES: profiles I'm backing & monitoring -------------------
const TRACKED = ["JUAN HUNDRED LONDOÑO","BENJAMIN WHITE"];
const NAME_TAG = {"JUAN HUNDRED LONDOÑO":"💯","BENJAMIN WHITE":"💵"};
const deco = n => NAME_TAG[n] ? NAME_TAG[n]+" " : "";

// For a participant, break every segment into: locked (already won),
// winnable (still possible given their picks + which teams remain alive),
// and lost (forfeited — wrong played match, or a picked team eliminated).
function outlook(p){
  const elim = new Set(results.eliminated||[]);
  const seg=[];

  // Group stage — 72 matches, 1 pt each
  let gCur=0,gWin=0,gLost=0,played=0;
  for(let i=0;i<D.schedule.length;i++){
    const a=results.group[i];
    if(a){ played++; (p.group[i]===a)?gCur++:gLost++; }
    else gWin++;                       // not played yet → still winnable
  }
  seg.push({key:"group",label:"Fase de grupos",max:72,cur:gCur,win:gWin,lost:gLost,
            note:`${played}/72 jugados`});

  // Knockout sets — points only winnable for YOUR picks that are still alive
  for(const [key,label,per,max,n] of
      [["r32","Ronda de 32",2,64,32],["r16","Octavos",3,48,16],
       ["qf","Cuartos",4,32,8],["sf","Semifinalistas",5,20,4]]){
    const inSet=new Set(results[key]||[]);
    let cur=0,win=0,lost=0; const alive=[],dead=[],hit=[];
    for(const c of p[key]){
      if(inSet.has(c)){cur+=per;hit.push(c);}
      else if(elim.has(c)){lost+=per;dead.push(c);}
      else {win+=per;alive.push(c);}
    }
    const defined=(results[key]||[]).length;
    seg.push({key,label,max,cur,win,lost,alive,dead,hit,
              note:defined?`${defined}/${n} definidos`:"sin definir"});
  }

  // Exact placements + golden boot
  for(const [key,label,pts] of
      [["champion","Campeón",25],["runnerUp","Subcampeón",15],
       ["third","3.º puesto",10],["fourth","4.º puesto",10],["scorer","Goleador",15]]){
    const res=results[key], pick=p[key]; let cur=0,win=0,lost=0;
    if(res){ (pick===res)?(cur=pts):(lost=pts); }
    else if(key!=="scorer" && pick && elim.has(pick)) lost=pts;   // team can't get there
    else win=pts;
    seg.push({key,label,max:pts,cur,win,lost,pick,
              note:res?`oficial: ${key==="scorer"?res:nameOf(res)}`:"sin definir"});
  }

  const current=seg.reduce((s,x)=>s+x.cur,0);
  const winnable=seg.reduce((s,x)=>s+x.win,0);
  const lost=seg.reduce((s,x)=>s+x.lost,0);
  return {seg,current,winnable,lost,max:current+winnable};
}

// ---- prize monitoring ---------------------------------------------------
// Standings at each checkpoint use CUMULATIVE points through that stage.
const ALL_SEGS=["group","r32","r16","qf","sf","champion","runnerUp","third","fourth","scorer"];
const PRIZES=[
  {label:"Fin 1.ª fase", sub:"partidos + 32 clasificados", segs:["group","r32"],
   slots:[{pos:1,amt:4000000},{pos:2,amt:2000000}]},
  {label:"Fin 2.ª ronda", sub:"+ octavos (16)", segs:["group","r32","r16"],
   slots:[{pos:1,amt:4000000},{pos:2,amt:2000000}]},
  {label:"Fin 3.ª ronda", sub:"+ cuartos (8)", segs:["group","r32","r16","qf"],
   slots:[{pos:1,amt:4000000},{pos:2,amt:2000000}]},
  {label:"Fin del mundial", sub:"todo", segs:ALL_SEGS,
   slots:[{pos:1,amt:56022000,pct:"50.14%"},{pos:2,amt:19005000,pct:"17.01%"},
          {pos:3,amt:9000000},{pos:4,amt:5000000},{pos:5,amt:3000000},{pos:6,amt:2256160}]},
];
// Net pot derived from the fixed prizes + their %: $4M=3.58%, $9M=8.06%, etc. → ~$111.7M
const POT=111700000;
const cop=n=>"$"+Math.round(n).toLocaleString("es-CO");
// a prize amount; percentage-based slots are approximate (pot shown as #### in PDF)
const money=(s)=> s.pct ? `≈${cop(POT*parseFloat(s.pct)/100)} (${s.pct})` : cop(s.amt);
const moneyEach=(s,share)=>{ const base=s.pct?POT*parseFloat(s.pct)/100:s.amt; return (s.pct?"≈":"")+cop(base/share); };
function cpScore(o,segs){ let cur=0,max=0;
  for(const s of o.seg){ if(segs.includes(s.key)){ cur+=s.cur; max+=s.cur+s.win; } }
  return {cur,max};
}
// rank of `name` at a checkpoint by current points, plus best reachable rank (using ceiling)
function cpRanks(allO,segs,name){
  const me=cpScore(allO.find(x=>x.name===name).o,segs);
  let above=0,aboveMax=0,tied=0;
  for(const x of allO){ if(x.name===name) continue; const c=cpScore(x.o,segs);
    if(c.cur>me.cur) above++; if(c.cur>me.max) aboveMax++; if(c.cur===me.cur) tied++; }
  return {cur:me.cur,max:me.max,rank:above+1,bestRank:aboveMax+1,tied};   // tied = others sharing this exact score
}
function prizeCard(name,allO){
  const rows=PRIZES.map(t=>{
    const n=t.slots.length, r=cpRanks(allO,t.segs,name);
    let estado,empate="";
    if(r.rank<=n){
      if(r.tied){
        estado='<span class="ok">🤝 empatado en zona</span>';
        empate=`<span class="muted">empatado con ${r.tied} (${r.tied+1} se reparten)</span>`;
      } else {
        estado='<span class="ok">🏆 en zona — solo</span>';
      }
    }
    else if(r.bestRank<=n){ estado='<span style="color:var(--gold)">🟢 alcanzable</span>'; }
    else estado='<span class="ko">🔴 fuera de alcance</span>';
    const prizeList=t.slots.map(s=>`${s.pos}.º`).join(" · ");
    const tieNote=r.tied? ` <span class="muted">(+${r.tied} empat.)</span>`:"";
    return `<tr>
      <td><b>${t.label}</b><div class="muted" style="font-size:11px">${t.sub} · premios ${prizeList}</div></td>
      <td style="text-align:right">#${r.rank}${tieNote}<div class="muted" style="font-size:11px">mejor #${r.bestRank}</div></td>
      <td style="text-align:right" class="muted">${r.cur}/${r.max}</td>
      <td>${estado}${empate?`<div style="font-size:11px;margin-top:2px">${empate}</div>`:""}</td></tr>`;
  }).join("");
  return `<div class="card">
    <h3 style="margin-top:0">🏅 Premios en la mira — ${deco(name)}${name}</h3>
    <table><thead><tr><th>Etapa / premios</th><th style="text-align:right">Vas</th>
      <th style="text-align:right">Pts cum.</th><th>Estado</th></tr></thead>
      <tbody>${rows}</tbody></table>
  </div>`;
}

// Key make-or-break picks: differential upside (valuable & rare) vs consensus
// risk (valuable & popular outcomes this profile is missing), across all phases.
function keyDiffs(p){
  const ps=D.participants, N=ps.length;
  const up=[], risk=[];
  const EXACT=[["champion","Campeón",25],["runnerUp","Subcampeón",15],["scorer","Goleador",15],["third","3.º lugar",10],["fourth","4.º lugar",10]];
  for(const [k,label,pts] of EXACT){
    const pick=p[k];
    if(pick) up.push({key:k,label,team:pick,player:k==="scorer",pts,pop:ps.filter(x=>x[k]===pick).length/N});
    const top=tally(ps.map(x=>x[k]))[0];                 // field favourite for this slot
    if(top && top[0]!==pick) risk.push({key:k,label,team:top[0],player:k==="scorer",pts,pop:top[1]/N});
  }
  const SET=[["sf","Semis",5],["qf","QF",4],["r16","R16",3],["r32","R32",2]];
  for(const [k,label,pts] of SET){
    for(const team of p[k]) up.push({key:k,label,team,pts,pop:ps.filter(x=>x[k].includes(team)).length/N});
    for(const [team,cnt] of tally(ps.flatMap(x=>x[k]))){ const pop=cnt/N; if(pop>0.5 && !p[k].includes(team)) risk.push({key:k,label,team,pts,pop}); }
  }
  const lev=o=>o.pts*(1-o.pop), rlev=o=>o.pts*o.pop;
  const dedupe=(arr,score)=>{ const m=new Map();
    for(const o of arr){ const id=(o.player?"P:":"T:")+o.team; const cur=m.get(id); if(!cur||score(o)>score(cur)) m.set(id,o); }
    return [...m.values()]; };
  return {
    up:   dedupe(up,lev).sort((a,b)=>lev(b)-lev(a)).slice(0,6),
    risk: dedupe(risk,rlev).sort((a,b)=>rlev(b)-rlev(a)).slice(0,6),
  };
}
function keyCard(name){
  const p=D.participants.find(x=>x.name===name); const {up,risk}=keyDiffs(p);
  const fmt=it=> it.player ? `<b>${it.team}</b>` : `<b><span class="fl">${flagOf(it.team)}</span> ${it.team}</b>`;
  const row=(it,cls,note)=>`<div class="kv"><span>${fmt(it)} <span class="muted">${it.label} · ${it.pts} pts</span></span><span class="${cls}" style="white-space:nowrap">${note}</span></div>`;
  const ups = up.length ? up.map(it=>row(it,"ok",`solo ${Math.round(it.pop*100)}% lo tiene`)).join("") : '<div class="muted">—</div>';
  const rks = risk.length ? risk.map(it=>row(it,"ko",`${Math.round(it.pop*100)}% lo tiene · tú no`)).join("") : '<div class="muted">—</div>';
  return `<div class="card">
    <h3 style="margin-top:0">🎯 Resultados clave — ${deco(name)}${name}</h3>
    <div class="muted" style="font-size:12px;margin-bottom:4px">🟢 A favor — diferenciales: si aciertan, te separan del grupo</div>
    ${ups}
    <div class="muted" style="font-size:12px;margin:12px 0 4px">🔴 En contra — consenso que no tienes: si ocurre, pierdes terreno</div>
    ${rks}
  </div>`;
}

function bar(o){
  const pct=v=>(v/311*100).toFixed(1)+"%";
  return `<div class="stack" title="Logrados ${o.current} · Ganables ${o.winnable} · Perdidos ${o.lost} · de 311">
    <span class="s-cur" style="width:${pct(o.current)}"></span>
    <span class="s-win" style="width:${pct(o.winnable)}"></span>
    <span class="s-lost" style="width:${pct(o.lost)}"></span></div>`;
}

// Shows a profile's actual bracket picks (R32/R16/QF/SF + top-4 + scorer)
// with live status: ✓ ya clasificó · ✗ eliminado · pendiente.
function picksCard(name){
  const p=D.participants.find(x=>x.name===name);
  const elim=new Set(results.eliminated||[]);
  const chip=(c,stageKey)=>{
    const inSet=(results[stageKey]||[]).includes(c);
    const out=elim.has(c);
    const cls=inSet?"pk-ok":(out?"pk-out":"pk-pend");
    const mark=inSet?"✓":(out?"✗":"");
    return `<span class="pk ${cls}"><span class="fl">${flagOf(c)}</span> ${c}${mark?` ${mark}`:""}</span>`;
  };
  const stage=(key,label,pts)=>p[key]&&p[key].length?`<div class="pkstage">
    <div class="pkhead">${label} <span class="muted">${pts} pts c/u</span></div>
    <div class="pkwrap">${p[key].map(c=>chip(c,key)).join("")}</div></div>`:"";
  const plc=(key,label,pts)=>{
    const c=p[key]; if(!c) return "";
    const res=results[key];
    const cls=res?(res===c?"pk-ok":"pk-out"):(elim.has(c)?"pk-out":"pk-pend");
    const mark=res?(res===c?"✓":"✗"):"";
    return `<span class="pk ${cls}"><span class="muted">${label}:</span> <span class="fl">${flagOf(c)}</span> ${c}${mark?` ${mark}`:""} <span class="muted">${pts}</span></span>`;
  };
  const sc=p.scorer?`<span class="pk ${results.scorer?(norm(results.scorer)===norm(p.scorer)?"pk-ok":"pk-out"):"pk-pend"}"><span class="muted">⚽:</span> ${p.scorer} <span class="muted">15</span></span>`:"";
  return `<div class="card">
    <h3 style="margin-top:0">📋 Selecciones — ${deco(name)}${name}</h3>
    ${stage("r32","Ronda de 32",2)}
    ${stage("r16","Octavos",3)}
    ${stage("qf","Cuartos",4)}
    ${stage("sf","Semifinalistas",5)}
    <div class="pkstage"><div class="pkhead">Puestos finales y goleador</div>
      <div class="pkwrap">${plc("champion","🏆 Campeón",25)}${plc("runnerUp","2.º",15)}${plc("third","3.º",10)}${plc("fourth","4.º",10)}${sc}</div></div>
    <div class="muted" style="font-size:11px;margin-top:8px">✓ ya clasificó · ✗ eliminado · sin marca = pendiente</div>
  </div>`;
}

// How many other participants share this profile's 4 podium picks
// (Campeón/2.º/3.º/4.º) — as a set (any order) and in the exact same order.
function finalistsCard(name){
  const p=D.participants.find(x=>x.name===name);
  const slots=[["champion","🏆 Campeón"],["runnerUp","2.º"],["third","3.º"],["fourth","4.º"]];
  const mineSet=new Set(slots.map(([k])=>p[k]).filter(Boolean));
  const others=D.participants.filter(x=>x.name!==name);
  const sameSet=others.filter(x=>{
    const s=new Set([x.champion,x.runnerUp,x.third,x.fourth].filter(Boolean));
    if(mineSet.size!==4||s.size!==4) return false;
    for(const t of mineSet) if(!s.has(t)) return false;
    return true;
  });
  const sameOrder=sameSet.filter(x=>slots.every(([k])=>x[k]===p[k]));
  const chips=slots.map(([k,lbl])=>p[k]
    ?`<span class="pk"><span class="muted">${lbl}:</span> <span class="fl">${flagOf(p[k])}</span> ${p[k]}</span>`
    :`<span class="pk pk-out"><span class="muted">${lbl}:</span> —</span>`).join("");
  const nameList=(arr,withScorer)=>{
    if(!arr.length) return "";
    const names=arr.map(x=>`${deco(x.name)}${x.name}${withScorer?` <span class="muted">(⚽ ${x.scorer||"—"})</span>`:""}`);
    const cap=14, shown=names.slice(0,cap).join(" · ");
    return shown+(names.length>cap?` <span class="muted">· y ${names.length-cap} más</span>`:"");
  };
  return `<div class="card">
    <h3 style="margin-top:0">🏁 Mismo podio — ${deco(name)}${name}</h3>
    <div class="pkwrap" style="margin-bottom:12px">${chips}</div>
    <div class="kv"><span>Mismos 4 equipos <span class="muted">(en cualquier orden)</span></span><b class="${sameSet.length?'ok':'muted'}">${sameSet.length}</b></div>
    <div class="muted" style="font-size:12px;margin:3px 0 12px">${sameSet.length?nameList(sameSet):"Nadie más eligió exactamente este cuarteto."}</div>
    <div class="kv"><span>Mismo orden exacto <span class="muted">(1.º→4.º idénticos)</span></span><b class="${sameOrder.length?'ok':'muted'}">${sameOrder.length}</b></div>
    <div class="muted" style="font-size:12px;margin-top:3px">${sameOrder.length?nameList(sameOrder,true):"Nadie más coincide en el orden exacto."}</div>
  </div>`;
}

// Builds the full analysis (summary + key diffs + prizes + picks + podio +
// segment table) for a list of participant names. Used by both "Los que son"
// (fixed profiles) and "Análisis" (any participant chosen by the user).
function analysisBody(names){
  const players=names.map(n=>D.participants.find(p=>p.name===n)).filter(Boolean);
  if(!players.length) return "";
  const ranked=scoreAll();
  const rankOf=n=>ranked.findIndex(r=>r.p.name===n)+1;
  const bestOther=n=>Math.max(...ranked.filter(r=>r.p.name!==n).map(r=>r.s.total));
  const O=players.map(p=>({p,o:outlook(p),rank:rankOf(p.name)}));
  const allO=D.participants.map(p=>({name:p.name,o:outlook(p)}));

  const card=(x)=>{
    const alive=bestOther(x.p.name)<=x.o.max;
    const behind=ranked[0].s.total - x.o.current;
    const tied=ranked.filter(r=>r.s.total===x.o.current && r.p.name!==x.p.name).length;
    const lead = behind>0?` · a ${behind} del líder` : (tied?` · 🤝 líder empatado con ${tied}`:' · 🏆 líder en solitario');
    return `<div class="card duel-card">
      <div class="row" style="justify-content:space-between">
        <div><div style="font-size:17px;font-weight:800">${deco(x.p.name)}${x.p.name}</div>
          <div class="muted">Posición #${x.rank} de ${D.participants.length}${lead}${tied&&behind>0?` · empatado con ${tied}`:''}</div></div>
        <div style="text-align:right"><div class="total" style="font-size:26px">${x.o.current}</div><div class="muted">pts ahora</div></div>
      </div>
      ${bar(x.o)}
      <div class="row" style="justify-content:space-between;margin-top:8px">
        <span class="pill">Máx. posible <b class="ok">${x.o.max}</b></span>
        <span class="pill">Ganables <b style="color:var(--gold)">${x.o.winnable}</b></span>
        <span class="pill">Perdidos <b class="ko">${x.o.lost}</b></span>
      </div>
      <div class="muted" style="margin-top:8px">${alive?'🟢 Aún matemáticamente vivo para ganar la polla':'🔴 Ya no puede ganar la polla'}</div>
    </div>`;
  };

  const segTable=(x)=>`<div class="card">
    <h3 style="margin-top:0">${x.p.name} — desglose por segmento</h3>
    <table><thead><tr>
      <th>Segmento</th><th style="text-align:right">En juego</th>
      <th style="text-align:right">Logrados</th><th style="text-align:right">Ganables</th>
      <th style="text-align:right">Perdidos</th><th>Estado</th></tr></thead>
    <tbody>${x.o.seg.map(s=>`<tr>
      <td>${s.label}</td>
      <td style="text-align:right" class="muted">${s.max}</td>
      <td style="text-align:right" class="ok">${s.cur||""}</td>
      <td style="text-align:right" style="color:var(--gold)">${s.win||""}</td>
      <td style="text-align:right" class="ko">${s.lost||""}</td>
      <td class="muted">${s.dead&&s.dead.length?`${s.note} · perdidos: ${s.dead.join(", ")}`:s.note}</td>
    </tr>`).join("")}
    <tr style="font-weight:800"><td>Total</td>
      <td style="text-align:right" class="muted">311</td>
      <td style="text-align:right" class="ok">${x.o.current}</td>
      <td style="text-align:right" style="color:var(--gold)">${x.o.winnable}</td>
      <td style="text-align:right" class="ko">${x.o.lost}</td>
      <td class="muted">máx ${x.o.max}</td></tr>
    </tbody></table></div>`;

  return `
    <div class="duel-grid">${O.map(card).join("")}</div>
    <div class="duel-grid">${O.map(x=>keyCard(x.p.name)).join("")}</div>
    <div class="duel-grid">${O.map(x=>prizeCard(x.p.name,allO)).join("")}</div>
    <div class="duel-grid">${O.map(x=>picksCard(x.p.name)).join("")}</div>
    <div class="duel-grid">${O.map(x=>finalistsCard(x.p.name)).join("")}</div>
    <div class="duel-grid">${O.map(segTable).join("")}</div>`;
}

function renderTracked(){
  const app=document.getElementById("app");
  const present=TRACKED.filter(n=>D.participants.some(p=>p.name===n));
  if(!present.length){app.innerHTML='<div class="card">No encontré los perfiles seguidos.</div>';return;}
  app.innerHTML=`
    <div class="toprow">
      <span class="badge live">Perfiles que sigo</span>
      <span class="muted">Logrados (verde) · Ganables según sus selecciones y equipos aún vivos (dorado) · Perdidos (rojo). Sobre 311.</span>
    </div>
    ${analysisBody(TRACKED)}
    <div class="card muted" style="font-size:12px">
      “Ganables” cuenta solo los puntos que <b>las selecciones de cada perfil</b> aún pueden conseguir: un equipo que no eligió —o que ya quedó eliminado— no suma, aunque siga el segmento abierto.
      A medida que se registren resultados y eliminaciones en <code>results.js</code>, estos máximos bajan automáticamente.
    </div>`;
}

// Same analysis as "Los que son" but for any participant(s) the user picks.
let anaNames=[];
function renderAnalysis(){
  const app=document.getElementById("app");
  const ranked=scoreAll();
  if(!anaNames.length) anaNames=[ranked[0]?ranked[0].p.name:null];
  const byName=[...D.participants].sort((a,b)=>a.name.localeCompare(b.name,'es'));
  const opts=sel=>byName.map(p=>`<option value="${enc(p.name)}" ${p.name===sel?'selected':''}>${p.name}</option>`).join("");
  const selBox=i=>`<select class="anasel" data-i="${i}" style="min-width:210px">
    <option value="">${i===0?'Selecciona…':'+ comparar con otro (opcional)'}</option>${opts(anaNames[i])}</select>`;
  const dlist=`<datalist id="ananames">${byName.map(p=>`<option value="${p.name}"></option>`).join("")}</datalist>`;
  const chosen=anaNames.filter(n=>n&&D.participants.some(p=>p.name===n));
  const body=chosen.length
    ? analysisBody(chosen)
    : '<div class="card muted">Elige un participante para ver su análisis completo.</div>';
  app.innerHTML=`<div class="toprow">
      <span class="muted" style="font-size:12px">Analizar:</span>
      <input id="anasearch" class="search" list="ananames" placeholder="🔍 Buscar participante…" autocomplete="off">
      ${selBox(0)} ${selBox(1)}
      ${dlist}
      <span class="muted" style="font-size:12px">Logrados (verde) · Ganables (dorado) · Perdidos (rojo). Sobre 311.</span>
    </div>${body}`;
  document.querySelectorAll(".anasel").forEach(s=>s.onchange=e=>{
    const i=+e.target.dataset.i; anaNames[i]=e.target.value?dec(e.target.value):null; renderAnalysis();
  });
  document.getElementById("anasearch").onchange=e=>{
    const hit=D.participants.find(p=>p.name===e.target.value)
            ||D.participants.find(p=>p.name.toLowerCase()===String(e.target.value||'').toLowerCase());
    if(hit){ anaNames[0]=hit.name; renderAnalysis(); }
  };
}

// ---- ESTADÍSTICAS: pool-wide aggregate stats ---------------------------
function tally(values){
  const m=new Map();
  for(const v of values){ if(!v) continue; m.set(v,(m.get(v)||0)+1); }
  return [...m.entries()].sort((a,b)=> b[1]-a[1] || String(a[0]).localeCompare(String(b[0])));
}
function barList(entries, fmt, n=10){
  const N=D.participants.length;
  const top=entries.slice(0,n);
  const mx=top.length?top[0][1]:1;
  if(!top.length) return '<div class="muted">—</div>';
  return top.map(([k,c])=>`<div class="barrow">
    <span class="lbl">${fmt(k)}</span>
    <span class="track"><span class="fill" style="width:${(c/mx*100).toFixed(0)}%"></span></span>
    <span class="val">${c} · ${(c/N*100).toFixed(0)}%</span></div>`).join("");
}
// How divided participants are on a match: Shannon entropy of {home,draw,away}.
function splitScore(i){
  const c=[0,0,0];
  for(const p of D.participants){ const v=p.group[i]; if(v==="1")c[0]++; else if(v==="E")c[1]++; else if(v==="2")c[2]++; }
  const tot=c[0]+c[1]+c[2]||1;
  let H=0; for(const n of c){ if(n){ const pr=n/tot; H-=pr*Math.log2(pr); } }
  return {i,c,tot,H};
}
function splitRow(s){
  const m=D.schedule[s.i], [h,d,a]=s.c, tot=s.tot, pct=n=>n/tot*100, R=n=>Math.round(pct(n));
  return `<div class="splitrow">
    <span class="splbl"><span class="spdate">${MATCH_DATES[s.i]||""}</span><span class="fl">${flagOf(m.home)}</span> ${m.home} <span class="muted">vs</span> ${m.away} <span class="fl">${flagOf(m.away)}</span></span>
    <span class="splbar">
      <span class="sp home" style="width:${pct(h)}%" title="${m.home} ${R(h)}%"></span>
      <span class="sp draw" style="width:${pct(d)}%" title="Empate ${R(d)}%"></span>
      <span class="sp away" style="width:${pct(a)}%" title="${m.away} ${R(a)}%"></span>
    </span>
    <span class="spval muted">${R(h)}/${R(d)}/${R(a)}</span>
  </div>`;
}
// Most-divided knockout-advancement picks: for each team, how close to 50/50 the
// "will reach this round?" pick is (binary entropy). Returns a rendered top-N list.
function koDividedRows(key, topN){
  const tot=D.participants.length||1;
  const cnt={}; D.participants.forEach(p=>(p[key]||[]).forEach(t=>{cnt[t]=(cnt[t]||0)+1;}));
  const rows=Object.keys(cnt).map(t=>{
    const pr=cnt[t]/tot; const H=(pr<=0||pr>=1)?0:(-pr*Math.log2(pr)-(1-pr)*Math.log2(1-pr));
    return {t,c:cnt[t],H};
  }).sort((a,b)=>b.H-a.H).slice(0,topN);
  return rows.map(r=>{
    const pct=r.c/tot*100, R=Math.round(pct);
    return `<div class="splitrow">
      <span class="splbl"><span class="fl">${flagOf(r.t)}</span> ${r.t} <span class="muted">${nameOf(r.t)}</span></span>
      <span class="splbar">
        <span class="sp home" style="width:${pct}%" title="Sí clasifica ${R}%"></span>
        <span class="sp away" style="width:${100-pct}%" title="No ${100-R}%"></span>
      </span>
      <span class="spval muted">${R}% sí · ${100-R}% no</span>
    </div>`;
  }).join("");
}
function matchPoll(i){
  const m=D.schedule[i], r=results.group[i];
  let c1=0,cE=0,c2=0;
  for(const p of D.participants){ const v=p.group[i]; if(v==="1")c1++; else if(v==="E")cE++; else if(v==="2")c2++; }
  const tot=c1+cE+c2||1;
  const row=(label,n,cls,win)=>`<div class="barrow">
    <span class="lbl">${label}${win?' <span class="ok">✓</span>':''}</span>
    <span class="track"><span class="fill ${cls}" style="width:${(n/tot*100).toFixed(0)}%"></span></span>
    <span class="val">${n} · ${(n/tot*100).toFixed(0)}%</span></div>`;
  const played = r?`<span class="muted" style="font-weight:600;font-size:11px">· jugado</span>`:"";
  return `<details class="mpoll">
    <summary><span class="fl">${flagOf(m.home)}</span> ${m.home} <span class="muted">vs</span> ${m.away} <span class="fl">${flagOf(m.away)}</span> ${played}</summary>
    <div class="mpoll-body">
      ${row(`<span class="fl">${flagOf(m.home)}</span> ${m.home} gana`, c1, "home", r==="1")}
      ${row("🤝 Empate", cE, "draw", r==="E")}
      ${row(`<span class="fl">${flagOf(m.away)}</span> ${m.away} gana`, c2, "away", r==="2")}
    </div></details>`;
}
let statTab="resumen";
function renderStats(){
  const app=document.getElementById("app");
  const ps=D.participants, N=ps.length;
  const teamFmt=c=>`${flagOf(c)} ${c} <span class="muted">${nameOf(c)}</span>`;
  const plain=s=>s;

  // score distribution (current points)
  const scored=ps.map(p=>scoreParticipant(p).total).sort((a,b)=>a-b);
  const sum=scored.reduce((a,b)=>a+b,0);
  const avg=(sum/N).toFixed(1);
  const med=scored[Math.floor(N/2)];
  const max=scored[N-1], min=scored[0];
  const rankedS=scoreAll();
  const leader=rankedS[0];
  const tiedMax=scored.filter(s=>s===max).length;   // how many share the top score
  const maxTracked=TRACKED.filter(n=>{const r=rankedS.find(x=>x.p.name===n); return r&&r.s.total===max;})
    .map(n=>NAME_TAG[n]).join(" ");

  const card=(title,body,sub="")=>`<div class="card"><h3 style="margin-top:0">${title}${sub?` <span class="muted" style="font-weight:400">${sub}</span>`:""}</h3>${body}</div>`;

  // each sub-section is shown one at a time via the chip bar
  const sections=[
    {id:"resumen", label:"📋 Resumen", html:`<div class="duel-grid">
      ${card("Puntaje actual",`
        <div class="kv"><span>Promedio</span><b>${avg}</b></div>
        <div class="kv"><span>Mediana</span><b>${med}</b></div>
        <div class="kv"><span>Máximo</span><b class="ok">${max}</b> <span class="muted">— ${tiedMax>1?`${tiedMax} empatados${maxTracked?` (incl. ${maxTracked})`:""}`:`${deco(leader.p.name)}${leader.p.name}`}</span></div>
        <div class="kv"><span>Mínimo</span><b>${min}</b></div>
        <div class="kv"><span>Puntos posibles</span><b class="muted">311</b></div>`,
        "partidos jugados hasta ahora")}
      ${card("🥇 Campeón más elegido", barList(tally(ps.map(p=>p.champion)), teamFmt))}</div>`},
    {id:"scorer", label:"👟 Goleador", html:card("👟 Goleador más elegido", barList(tally(ps.map(p=>p.scorer)), plain, 48))},
    {id:"sf", label:"⭐ Semifinalistas", html:card("⭐ Semifinalistas más elegidos", barList(tally(ps.flatMap(p=>p.sf)), teamFmt, 48))},
    {id:"champion", label:"🥇 Campeón", html:card("🥇 Campeón más elegido", barList(tally(ps.map(p=>p.champion)), teamFmt, 48))},
    {id:"runnerUp", label:"🥈 Subcampeón", html:card("🥈 Subcampeón más elegido", barList(tally(ps.map(p=>p.runnerUp)), teamFmt, 48))},
    {id:"third", label:"🥉 3.º puesto", html:card("🥉 3.º puesto más elegido", barList(tally(ps.map(p=>p.third)), teamFmt, 48))},
    {id:"qf", label:"Cuartos", html:card("Equipos más elegidos para Cuartos", barList(tally(ps.flatMap(p=>p.qf)), teamFmt, 48), "todos los elegidos")},
    {id:"r32", label:"R32", html:card("Equipos más elegidos para clasificar (R32)", barList(tally(ps.flatMap(p=>p.r32)), teamFmt, 48), "los 48 equipos")},
    {id:"divided", label:"⚖️ Divididos", html:card("Partidos más divididos — top 25",
      `<div class="muted" style="font-size:11px;margin-bottom:10px">
         <span class="spdot home"></span> local · <span class="spdot draw"></span> empate · <span class="spdot away"></span> visitante · <span style="margin-left:6px">% local/empate/visitante</span></div>
       ${[...Array(D.schedule.length).keys()].map(splitScore).sort((a,b)=>b.H-a.H).slice(0,25).map(splitRow).join("")}`,
      "donde más se reparten las predicciones")},
    {id:"divr32", label:"⚖️ R32 divididos", html:card("Clasificados a R32 más divididos — top 20",
      `<div class="muted" style="font-size:11px;margin-bottom:10px">
         <span class="spdot home"></span> sí clasifica · <span class="spdot away"></span> no · <span style="margin-left:6px">% sí/no</span></div>
       ${koDividedRows("r32",20)}`,
      "equipos donde más se reparten los pronósticos de clasificación")},
    {id:"divr16", label:"⚖️ Octavos divididos", html:card("Clasificados a Octavos más divididos — top 20",
      `<div class="muted" style="font-size:11px;margin-bottom:10px">
         <span class="spdot home"></span> sí clasifica · <span class="spdot away"></span> no · <span style="margin-left:6px">% sí/no</span></div>
       ${koDividedRows("r16",20)}`,
      "equipos donde más se reparten los pronósticos de clasificación")},
  ];
  // group chips don't switch sections — they jump to a group within one long
  // stacked view of all groups (per-match prediction breakdowns)
  const groupChips=D.groups.map(g=>({id:"grp"+g.label, label:"Grupo "+g.label}));
  const allChips=[...sections.map(s=>({id:s.id,label:s.label})), ...groupChips];
  if(!allChips.some(c=>c.id===statTab)) statTab=sections[0].id;
  const isGroup=statTab.startsWith("grp");

  const content = isGroup
    ? `<div class="muted" style="font-size:12px;margin-bottom:6px">Predicciones por partido · clic en un partido para ver quién eligió qué · usa los botones para saltar de grupo</div>`
      + D.groups.map(g=>`<div id="statgrp-${g.label}" class="card grp" style="margin-top:0">
          <h3 style="margin-top:0">Grupo ${g.label}</h3>
          ${g.matches.map(i=>matchPoll(i)).join("")}</div>`).join("")
    : sections.find(s=>s.id===statTab).html;

  const chips=allChips.map(c=>`<button class="jchip ${c.id===statTab?'act':''}" data-sec="${c.id}">${c.label}</button>`).join("");

  app.innerHTML=`
    <div class="toprow"><span class="badge live">Estadísticas de la polla</span>
      <span class="muted">${N} participantes · agregados sobre todas las selecciones</span></div>
    <div class="jumpbar">${chips}</div>
    ${content}`;
  document.querySelectorAll(".jumpbar .jchip").forEach(b=>b.onclick=()=>{
    const target=b.dataset.sec;
    if(isGroup && target.startsWith("grp")){
      // already showing all groups — just highlight + scroll, no full re-render
      statTab=target;
      document.querySelectorAll(".jumpbar .jchip").forEach(x=>x.classList.toggle("act",x.dataset.sec===target));
      document.getElementById("statgrp-"+target.slice(3))?.scrollIntoView({behavior:"smooth",block:"start"});
    } else { statTab=target; renderStats(); }
  });
  if(isGroup) document.getElementById("statgrp-"+statTab.slice(3))?.scrollIntoView({block:"start"});
}

// ---- GOLEADORES: official scorers + golden-boot bets --------------------
const norm=s=>(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase();
function renderGoals(){
  const app=document.getElementById("app");
  const goals=[...(results.goals||[])].filter(g=>g.goals>0).sort((a,b)=>b.goals-a.goals);
  const totalGoals=goals.reduce((s,g)=>s+g.goals,0);
  const maxG=goals.length?goals[0].goals:1;
  const lead=maxG; // current leading goal tally

  // how many participants bet on each player as golden boot (matched by surname)
  const pickCount={};
  for(const p of D.participants){ if(p.scorer){ const sn=norm(p.scorer.split(" ").pop()); pickCount[sn]=(pickCount[sn]||0)+1; } }

  // official scorer table
  const scorerRows = goals.length ? goals.map((g,i)=>{
    const leader = g.goals===lead;
    const bets = pickCount[norm(g.player.split(" ").pop())]||0;
    return `<div class="barrow">
      <span class="lbl">${i+1}. <span class="fl">${flagOf(g.team)}</span> ${g.player} <span class="muted">${g.team}</span>
        <span class="${bets?'ok':'muted'}" title="${bets} participantes lo eligieron como goleador">(${bets})</span></span>
      <span class="track"><span class="fill" style="width:${(g.goals/maxG*100).toFixed(0)}%"></span></span>
      <span class="val">${'⚽'.repeat(Math.min(g.goals,5))} <b>${g.goals}</b>${leader?' 👑':''}</span></div>`;
  }).join("") : '<div class="muted">Aún no hay goles registrados.</div>';

  // golden-boot bets in the pool, matched against who has actually scored
  const ps=D.participants;
  const picks=tally(ps.map(p=>p.scorer));
  const goalsBySurname={};
  for(const g of goals){ const sn=norm(g.player.split(" ").pop()); goalsBySurname[sn]=(goalsBySurname[sn]||0)+g.goals; }
  const N=ps.length;
  const betRows=picks.map(([name,cnt])=>{
    const scored=goalsBySurname[norm(name)]||0;
    return `<div class="barrow">
      <span class="lbl">${name}${scored?` <span class="ok">⚽${scored}</span>`:''}</span>
      <span class="track"><span class="fill" style="width:${(cnt/picks[0][1]*100).toFixed(0)}%"></span></span>
      <span class="val">${cnt} · ${(cnt/N*100).toFixed(0)}%</span></div>`;
  }).join("");

  const off = results.scorer
    ? `<span class="ok">🔒 Bota de oro oficial: ${results.scorer}</span>`
    : `<span class="muted">Bota de oro aún sin definir · líder actual: ${goals.length?`${goals[0].player} (${lead})`:'—'}</span>`;

  app.innerHTML=`
    <div class="toprow"><span class="badge live">Goleadores ⚽</span>
      <span class="muted">${totalGoals} goles en el torneo · ${off}</span></div>
    <div class="duel-grid">
      <div class="card"><h3 style="margin-top:0">Tabla de goleadores (oficial)</h3>
        <div class="muted" style="font-size:12px;margin-bottom:8px">(n) = participantes que lo eligieron como bota de oro.</div>
        ${scorerRows}</div>
      <div class="card"><h3 style="margin-top:0">Bota de oro — apuestas de la polla</h3>
        <div class="muted" style="font-size:12px;margin-bottom:8px">Apellidos elegidos por los participantes (⚽ = ya anotó).</div>
        ${betRows}</div>
    </div>`;
}

// ---- utils --------------------------------------------------------------
function enc(s){return encodeURIComponent(s);} function dec(s){return decodeURIComponent(s);}
// ---- COMPARAR: side-by-side of 2–3 participants ------------------------
let cmp=[];
function renderCompare(){
  const app=document.getElementById("app");
  const ranked=scoreAll();
  const rankOf=n=>ranked.findIndex(r=>r.p.name===n)+1;
  if(!cmp.length){
    const def=i=>(TRACKED[i]&&D.participants.some(p=>p.name===TRACKED[i]))?TRACKED[i]:(ranked[i]?ranked[i].p.name:null);
    cmp=[def(0),def(1)];
  }
  const byName=[...D.participants].sort((a,b)=>a.name.localeCompare(b.name,'es'));
  const opts=sel=>byName.map(p=>`<option value="${enc(p.name)}" ${p.name===sel?'selected':''}>${p.name}</option>`).join("");
  const selBox=i=>`<select class="cmpsel" data-i="${i}" style="min-width:200px">
    <option value="">${i<2?'Selecciona…':'+ 3.º (opcional)'}</option>${opts(cmp[i])}</select>`;

  const C=cmp.map(n=>n?D.participants.find(p=>p.name===n):null).filter(Boolean);

  let body;
  if(C.length<2){
    body=`<div class="card muted">Elige al menos 2 participantes para comparar.</div>`;
  }else{
    const data=C.map(p=>({p,s:scoreParticipant(p),o:outlook(p)}));
    const colH=data.map(d=>`<th style="text-align:right">${deco(d.p.name)}${d.p.name}</th>`).join("");

    // points table — best value per row is flagged ▲ (unless everyone ties)
    const ptsRow=(label,vals,fmt,better="hi")=>{
      const best=better==="hi"?Math.max(...vals):Math.min(...vals);
      const allEqual=vals.every(v=>v===vals[0]);
      const cells=vals.map((v,i)=>{
        const lead=!allEqual && v===best;
        return `<td style="text-align:right" class="${lead?'ok':''}">${fmt(v,data[i])}${lead?' ▲':''}</td>`;
      }).join("");
      return `<tr><td>${label}</td>${cells}</tr>`;
    };
    const ptsTable=`<div class="card"><h3 style="margin-top:0">📊 Puntos</h3>
      <table><thead><tr><th>Métrica</th>${colH}</tr></thead><tbody>
        ${ptsRow("Posición",data.map(d=>rankOf(d.p.name)),v=>`#${v}`,"lo")}
        ${ptsRow("Total actual",data.map(d=>d.s.total),v=>`<b class="total">${v}</b>`)}
        ${ptsRow("Máx. posible",data.map(d=>d.o.max),v=>v)}
        ${ptsRow("Fase de grupos",data.map(d=>d.s.group),(v,d)=>`${v} <span class="muted">(${d.s.gHits}/${d.s.gPlayed})</span>`)}
        ${ptsRow("R32",data.map(d=>d.s.r32.pts),(v,d)=>`${v} <span class="muted">(${d.s.r32.hits.length})</span>`)}
        ${ptsRow("R16",data.map(d=>d.s.r16.pts),(v,d)=>`${v} <span class="muted">(${d.s.r16.hits.length})</span>`)}
        ${ptsRow("QF",data.map(d=>d.s.qf.pts),(v,d)=>`${v} <span class="muted">(${d.s.qf.hits.length})</span>`)}
        ${ptsRow("Semis",data.map(d=>d.s.sf.pts),(v,d)=>`${v} <span class="muted">(${d.s.sf.hits.length})</span>`)}
        ${ptsRow("Campeón",data.map(d=>d.s.placeHits.champion?P.champion:0),v=>v)}
        ${ptsRow("Subcampeón",data.map(d=>d.s.placeHits.runnerUp?P.runnerUp:0),v=>v)}
        ${ptsRow("3.º",data.map(d=>d.s.placeHits.third?P.third:0),v=>v)}
        ${ptsRow("4.º",data.map(d=>d.s.placeHits.fourth?P.fourth:0),v=>v)}
        ${ptsRow("Goleador",data.map(d=>d.s.scPts),v=>v)}
      </tbody></table></div>`;

    // final selections — flag chips, ✓/✗ vs official, "iguales" when all match
    const slot=(key,label)=>{
      const res=results[key];
      const picks=data.map(d=>d.p[key]);
      const allSame=picks[0]&&picks.every(x=>x===picks[0]);
      const cells=data.map(d=>{
        const c=d.p[key];
        const cls=res?(c===res?"ok":"ko"):"";
        const disp=key==="scorer"?(c||"—"):(c?`<span class="fl">${flagOf(c)}</span> ${c}`:"—");
        const mark=res?(c===res?" ✓":" ✗"):"";
        return `<td style="text-align:right" class="${cls}">${disp}${mark}</td>`;
      }).join("");
      return `<tr><td>${label}${allSame?' <span class="muted" style="font-size:11px">· iguales</span>':''}</td>${cells}</tr>`;
    };
    const picksTable=`<div class="card"><h3 style="margin-top:0">🏆 Selecciones finales</h3>
      <table><thead><tr><th>Puesto</th>${colH}</tr></thead><tbody>
        ${slot("champion","Campeón")}${slot("runnerUp","Subcampeón")}${slot("third","3.º")}${slot("fourth","4.º")}${slot("scorer","⚽ Goleador")}
      </tbody></table></div>`;

    // knockout sets — count each picked + how many ALL of them share
    const KO=[["r32","Ronda de 32",32],["r16","Octavos",16],["qf","Cuartos",8],["sf","Semifinalistas",4]];
    const elimSet=new Set(results.eliminated||[]);
    const pkChip=(c,key)=>{
      const inSet=(results[key]||[]).includes(c);
      const cls=inSet?"pk-ok":(elimSet.has(c)?"pk-out":"pk-pend");
      return `<span class="pk ${cls}"><span class="fl">${flagOf(c)}</span> ${c}</span>`;
    };
    const setRow=([key,label,n])=>{
      const sets=data.map(d=>new Set(d.p[key]));
      const inter=[...sets[0]].filter(c=>sets.every(s=>s.has(c)));
      const cells=data.map(d=>`<td style="text-align:right">${d.p[key].length}/${n}</td>`).join("");
      return `<tr><td>${label}</td>${cells}<td style="text-align:right" class="ok">${inter.length}</td></tr>`;
    };
    // per-round breakdown of the teams each one picked that NOT everyone shares
    const diffBlock=([key,label])=>{
      const sets=data.map(d=>new Set(d.p[key]));
      const inter=new Set([...sets[0]].filter(c=>sets.every(s=>s.has(c))));
      const perP=data.map(d=>d.p[key].filter(c=>!inter.has(c)));
      const totalDiff=perP.reduce((a,b)=>a+b.length,0);
      if(!totalDiff) return "";
      const cols=data.map((d,i)=>`<div style="flex:1;min-width:150px">
        <div class="muted" style="font-size:11px;margin-bottom:4px">${deco(d.p.name)}${d.p.name}</div>
        <div class="pkwrap">${perP[i].length?perP[i].map(c=>pkChip(c,key)).join(""):'<span class="muted">— sin diferencias</span>'}</div></div>`).join("");
      return `<div style="margin-top:14px">
        <div class="pkhead">${label} <span class="muted">· ${totalDiff} selecciones no compartidas</span></div>
        <div style="display:flex;gap:16px;flex-wrap:wrap">${cols}</div></div>`;
    };
    const diffs=KO.map(diffBlock).join("");
    const setsTable=`<div class="card"><h3 style="margin-top:0">🔁 Coincidencias en eliminatorias</h3>
      <div class="muted" style="font-size:12px;margin-bottom:8px">Equipos que eligió cada uno y cuántos comparten <b>todos</b> los seleccionados.</div>
      <table><thead><tr><th>Ronda</th>${colH}<th style="text-align:right">En común</th></tr></thead><tbody>
        ${KO.map(setRow).join("")}
      </tbody></table>
      <h3>🔀 Diferencias por ronda</h3>
      <div class="muted" style="font-size:12px;margin-bottom:4px">Equipos que NO todos comparten — los que marcan la diferencia. ✓ verde = ya clasificó · rojo tachado = eliminado.</div>
      ${diffs||'<div class="muted">Eligieron exactamente los mismos equipos en todas las rondas.</div>'}</div>`;

    body=ptsTable+picksTable+setsTable;
  }

  const dlist=`<datalist id="cmpnames">${byName.map(p=>`<option value="${p.name}"></option>`).join("")}</datalist>`;
  app.innerHTML=`<div class="toprow">
      <span class="muted" style="font-size:12px">Comparar:</span>
      <input id="cmpsearch" class="search" list="cmpnames" placeholder="🔍 Buscar y añadir…" autocomplete="off">
      ${selBox(0)} ${selBox(1)} ${selBox(2)}
      ${dlist}
    </div>${body}`;
  document.querySelectorAll(".cmpsel").forEach(s=>s.onchange=e=>{
    const i=+e.target.dataset.i; cmp[i]=e.target.value?dec(e.target.value):null; renderCompare();
  });
  document.getElementById("cmpsearch").onchange=e=>{
    const hit=D.participants.find(p=>p.name===e.target.value)
            ||D.participants.find(p=>p.name.toLowerCase()===String(e.target.value||'').toLowerCase());
    if(!hit) return;
    let slot=[0,1,2].find(i=>!cmp[i]); if(slot===undefined) slot=0;   // first empty, else replace 1st
    cmp[slot]=hit.name; renderCompare();
  };
}

// ---- GRUPOS: live standings + qualification projection (FIFA Art. 12-13) ---
// Sort a group by: points → goal difference → goals for. Teams still level on all
// three are left tied (shown as "empate · por definir") — who advances among them is
// resolved with the official R32 results, not guessed here. Name is only a stable
// display order, not a real tiebreaker.
function sortGroup(stats, g){
  return [...stats].sort((a,b)=> b.pts-a.pts || b.gd-a.gd || b.gf-a.gf || a.team.localeCompare(b.team));
}
function computeGroups(){
  const scores=results.scores||[];
  const tables={}; const thirds=[];
  for(const g of D.groups){
    const st={}; g.teams.forEach(t=>st[t]={team:t,pj:0,w:0,d:0,l:0,gf:0,gc:0,pts:0});
    for(const mi of g.matches){
      const sc=scores[mi]; if(!sc) continue;
      const m=D.schedule[mi]; const [x,y]=sc, H=st[m.home], A=st[m.away];
      H.pj++;A.pj++;H.gf+=x;H.gc+=y;A.gf+=y;A.gc+=x;
      if(x>y){H.w++;H.pts+=3;A.l++;} else if(x<y){A.w++;A.pts+=3;H.l++;} else {H.d++;A.d++;H.pts++;A.pts++;}
    }
    Object.values(st).forEach(t=>t.gd=t.gf-t.gc);
    const sorted=sortGroup(Object.values(st), g);
    // flag teams level on points/GD/GF — separated only by head-to-head / FIFA ranking
    sorted.forEach((t,k)=>{ t._tie = sorted.some((o,j)=>j!==k && o.pts===t.pts && o.gd===t.gd && o.gf===t.gf); });
    tables[g.label]=sorted;
    thirds.push({...sorted[2], group:g.label});
  }
  thirds.sort((a,b)=> b.pts-a.pts || b.gd-a.gd || b.gf-a.gf || a.team.localeCompare(b.team));
  return {tables, thirds, played: scores.filter(Boolean).length};
}
let grpTab="terceros";
function renderGroups(){
  const app=document.getElementById("app");
  const {tables, thirds, played}=computeGroups();
  const qualThird=new Set(thirds.slice(0,8).map(t=>t.team+"|"+t.group));
  const teamRow=c=>`<span class="fl">${flagOf(c)}</span> ${c} <span class="muted">${nameOf(c)}</span>`;
  const playedIn={}; D.groups.forEach(g=>{ playedIn[g.label]=g.matches.filter(mi=>(results.scores||[])[mi]).length; });

  // best-third ranking table (thirds from groups that haven't started show neutral)
  const thirdRows=thirds.map((t,i)=>{
    if(!playedIn[t.group]){
      return `<tr style="opacity:.5"><td class="rank muted">–</td><td>${teamRow(t.team)} <span class="muted">(Gr. ${t.group})</span></td>
        <td style="text-align:right">0</td><td style="text-align:right">0</td><td style="text-align:right">0</td><td><span class="muted">por jugar</span></td></tr>`;
    }
    const inTop=i<8;
    return `<tr style="${inTop?'background:rgba(255,211,78,.08)':'opacity:.6'}">
      <td class="rank">${i+1}</td><td>${teamRow(t.team)} <span class="muted">(Gr. ${t.group})</span></td>
      <td style="text-align:right">${t.pts}</td><td style="text-align:right">${t.gd>0?'+':''}${t.gd}</td>
      <td style="text-align:right">${t.gf}</td>
      <td>${inTop?'<span class="ok">✓ clasifica</span>':'<span class="muted">fuera</span>'}</td></tr>`;
  }).join("");
  const thirdsCard=`<div id="grp-terceros" class="card grp" style="margin-top:0">
    <h3 style="margin-top:0">🥉 Mejores terceros <span class="muted" style="font-weight:400;font-size:12px">· los 8 mejores avanzan a la R32</span></h3>
    <table><thead><tr><th>#</th><th>Equipo</th><th style="text-align:right">Pts</th><th style="text-align:right">DG</th><th style="text-align:right">GF</th><th>Estado</th></tr></thead>
      <tbody>${thirdRows}</tbody></table></div>`;

  const groupCard=g=>{
    const gplayed=playedIn[g.label];
    const rows=tables[g.label].map((t,i)=>{
      if(!gplayed){   // group hasn't started — everyone equal, no ranking/marks
        return `<tr><td class="rank muted">–</td><td>${teamRow(t.team)}</td>
          <td style="text-align:right" class="muted">0</td><td style="text-align:right">0</td><td style="text-align:right">0</td><td style="text-align:right">0</td>
          <td style="text-align:right" class="muted">0:0</td><td style="text-align:right">0</td><td style="text-align:right"><b>0</b></td>
          <td><span class="muted">por jugar</span></td></tr>`;
      }
      // rank by points → GD → GF only; teams level on all three share a position and stay "por definir"
      const better=tables[g.label].filter(o=>o.pts>t.pts||(o.pts===t.pts&&o.gd>t.gd)||(o.pts===t.pts&&o.gd===t.gd&&o.gf>t.gf)).length;
      const grpSize=tables[g.label].filter(o=>o.pts===t.pts&&o.gd===t.gd&&o.gf===t.gf).length;
      const rankNum=better+1;
      let tint, estado;
      if(better+grpSize<=2){ tint='background:rgba(58,210,159,.10)'; estado='<span class="ok">✓ 1.º/2.º</span>'; }
      else if(better<2){ tint='background:rgba(255,211,78,.08)'; estado='<span style="color:var(--gold)">empate · por definir</span>'; }
      else if(t._tie){ tint='opacity:.6'; estado='<span class="muted">empate · por definir</span>'; }
      else if(better===2){ const q=qualThird.has(t.team+"|"+g.label);
        tint=q?'background:rgba(255,211,78,.10)':'opacity:.6';
        estado=q?'<span style="color:var(--gold)">3.º · clasifica</span>':'<span class="muted">3.º · fuera</span>'; }
      else { tint='opacity:.5'; estado='<span class="muted">fuera</span>'; }
      const tieMark=t._tie?'<span class="tie-eq" title="Igualado en puntos, DG y GF — posición por definir con los resultados oficiales">⁼</span>':'';
      return `<tr style="${tint}">
        <td class="rank">${rankNum}${tieMark}</td><td>${teamRow(t.team)}</td>
        <td style="text-align:right" class="muted">${t.pj}</td>
        <td style="text-align:right">${t.w}</td><td style="text-align:right">${t.d}</td><td style="text-align:right">${t.l}</td>
        <td style="text-align:right" class="muted">${t.gf}:${t.gc}</td>
        <td style="text-align:right">${t.gd>0?'+':''}${t.gd}</td>
        <td style="text-align:right"><b>${t.pts}</b></td><td>${estado}</td></tr>`;
    }).join("");
    return `<div id="grp-${g.label}" class="card grp">
      <h3 style="margin-top:0">Grupo ${g.label}${gplayed?'':' <span class="muted" style="font-weight:400;font-size:12px">· sin jugar</span>'}</h3>
      <table><thead><tr><th>#</th><th>Equipo</th><th style="text-align:right">PJ</th><th style="text-align:right">G</th><th style="text-align:right">E</th><th style="text-align:right">P</th><th style="text-align:right">GF:GC</th><th style="text-align:right">DG</th><th style="text-align:right">Pts</th><th>Estado</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
  };

  const chips=[{id:"terceros",label:"🥉 Terceros"}, ...D.groups.map(g=>({id:"grp"+g.label,label:"Grupo "+g.label}))]
    .map(c=>`<button class="jchip ${c.id===grpTab?'act':''}" data-g="${c.id}">${c.label}</button>`).join("");

  app.innerHTML=`
    <div class="toprow"><span class="badge live">Clasificación de grupos</span>
      <span class="muted">${played}/72 partidos jugados · proyección en vivo: 1.º y 2.º + 8 mejores terceros pasan a la R32</span></div>
    <div class="jumpbar">${chips}</div>
    ${thirdsCard}
    ${D.groups.map(groupCard).join("")}
    <div class="card muted" style="font-size:12px">
      Tabla provisional según los partidos ya jugados. Desempates aplicados: puntos → entre empatados (pts/dif./goles) → diferencia y goles totales.
      Desempate: puntos → diferencia de gol → goles a favor. Los equipos que sigan igualados se muestran como <b>«empate · por definir»</b> (marcados con <span class="tie-eq">⁼</span>) y su posición se resuelve con los resultados oficiales. Los cruces exactos de la R32 entre terceros se definen al terminar la fase de grupos (Anexo C).
    </div>`;
  document.querySelectorAll(".jumpbar .jchip").forEach(b=>b.onclick=()=>{
    grpTab=b.dataset.g;
    document.querySelectorAll(".jumpbar .jchip").forEach(x=>x.classList.toggle("act",x.dataset.g===grpTab));
    const id=grpTab==="terceros"?"grp-terceros":"grp-"+grpTab.slice(3);
    document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});
  });
}

// ---- SIMULADOR: what-if bracket scoring ---------------------------------
// Group points = the REAL tally so far (from results). Knockout points come
// from a hypothetical bracket the user builds: R32 ⊇ R16 ⊇ QF ⊇ final four.
let simNames=[], simR32=null, simR16=null, simQF=null, simPodio=null, simGoleador=null, simScroll=0;
const SIM_OTRO="__OTRO__";   // "a scorer nobody picked" → 0 pts for everyone
function simPopOrder(key){
  return tally(D.participants.flatMap(p=>{const v=p[key]; return Array.isArray(v)?v:(v?[v]:[]);})).map(e=>e[0]);
}
function initSim(){
  const r32o=simPopOrder("r32");
  simR32=new Set(r32o.slice(0,32));
  const rank=(set,order,n)=>[...set].sort((a,b)=>(order.indexOf(a)+1||999)-(order.indexOf(b)+1||999)).slice(0,n);
  simR16=new Set(rank(simR32, simPopOrder("r16"), 16));
  simQF =new Set(rank(simR16, simPopOrder("qf"), 8));
  const ex=new Set();
  const pick=key=>{ for(const c of simPopOrder(key)) if(simQF.has(c)&&!ex.has(c)){ex.add(c);return c;} for(const c of simQF) if(!ex.has(c)){ex.add(c);return c;} return ""; };
  simPodio=[pick("champion"),pick("runnerUp"),pick("third"),pick("fourth")];
  simGoleador=simPopOrder("scorer")[0]||SIM_OTRO;   // default: most-picked golden boot
  if(!simNames.length) simNames=TRACKED.filter(n=>D.participants.some(p=>p.name===n)).slice(0,2);
}
function simScore(p){
  const s=scoreParticipant(p);                 // s.group = real group points so far
  const cnt=(picks,set)=>picks.filter(c=>set.has(c)).length;
  const r32h=cnt(p.r32,simR32), r16h=cnt(p.r16,simR16), qfh=cnt(p.qf,simQF);
  const sfSet=new Set(simPodio.filter(Boolean)), sfh=cnt(p.sf,sfSet);
  const champ=!!simPodio[0]&&p.champion===simPodio[0], ru=!!simPodio[1]&&p.runnerUp===simPodio[1];
  const th=!!simPodio[2]&&p.third===simPodio[2], fo=!!simPodio[3]&&p.fourth===simPodio[3];
  const place=(champ?P.champion:0)+(ru?P.runnerUp:0)+(th?P.third:0)+(fo?P.fourth:0);
  const golHit=!!simGoleador && simGoleador!==SIM_OTRO && p.scorer && norm(p.scorer)===norm(simGoleador);
  const sc=golHit?P.scorer:0;
  const total=s.group+r32h*P.r32+r16h*P.r16+qfh*P.qf+sfh*P.sf+place+sc;
  return {grp:s.group,gHits:s.gHits,gPlayed:s.gPlayed,r32h,r16h,qfh,sfh,champ,ru,th,fo,place,golHit,sc,total};
}
function renderSim(){
  if(!simR32) initSim();
  const app=document.getElementById("app");
  const byName=[...D.participants].sort((a,b)=>a.name.localeCompare(b.name,'es'));
  const opts=sel=>byName.map(p=>`<option value="${enc(p.name)}" ${p.name===sel?'selected':''}>${p.name}</option>`).join("");
  const selBox=i=>`<select class="simsel" data-i="${i}" style="min-width:190px"><option value="">${i===0?'Participante…':'+ otro (opcional)'}</option>${opts(simNames[i])}</select>`;
  const dlist=`<datalist id="simnames">${byName.map(p=>`<option value="${p.name}"></option>`).join("")}</datalist>`;

  const chip=(c,round,on)=>`<span class="pk ${on?'pk-ok':''} simchip" data-round="${round}" data-c="${c}" style="cursor:pointer"><span class="fl">${flagOf(c)}</span> ${c}</span>`;
  const grid=(cands,set,round,max)=>`<div class="card">
    <h3 style="margin-top:0">${round.toUpperCase()} <span class="muted" style="font-weight:400;font-size:12px">· ${set.size}/${max} · ${P[round.toLowerCase()]||({r32:2,r16:3,qf:4})[round.toLowerCase()]} pts c/u</span></h3>
    <div class="pkwrap">${cands.map(c=>chip(c,round.toLowerCase(),set.has(c))).join("")}</div></div>`;

  const r32grid=grid(D.teams,simR32,"R32",32);
  const r16grid=grid([...simR32].sort(),simR16,"R16",16);
  const qfgrid =grid([...simR16].sort(),simQF,"QF",8);
  const podSel=(i,label,pts)=>{const o=[...simQF].sort().map(c=>`<option value="${c}" ${simPodio[i]===c?'selected':''}>${nameOf(c)} (${c})</option>`).join("");
    return `<div class="kv"><span>${label} <span class="muted">${pts} pts</span></span><select class="simpod" data-i="${i}"><option value="">—</option>${o}</select></div>`;};
  const podioCard=`<div class="card"><h3 style="margin-top:0">🏆 Final four (en orden) <span class="muted" style="font-weight:400;font-size:12px">· elige de los ${simQF.size} de Cuartos · semifinalistas = los 4 · 5 pts c/u</span></h3>
    ${podSel(0,"🏆 Campeón",25)}${podSel(1,"🥈 Subcampeón",15)}${podSel(2,"🥉 3.º",10)}${podSel(3,"4.º",10)}</div>`;
  const golList=tally(D.participants.map(p=>p.scorer));   // [surname, count] by popularity
  const golCard=`<div class="card"><h3 style="margin-top:0">👟 Goleador (bota de oro) <span class="muted" style="font-weight:400;font-size:12px">· 15 pts</span></h3>
    <div class="kv"><span>Goleador del torneo</span>
      <select class="simgol" style="min-width:240px">
        ${golList.map(([s,c])=>`<option value="${enc(s)}" ${simGoleador===s?'selected':''}>${s} (${c} eligieron)</option>`).join("")}
        <option value="${SIM_OTRO}" ${simGoleador===SIM_OTRO?'selected':''}>Otro goleador</option>
      </select></div></div>`;

  // project EVERY participant under this scenario → full ranking
  const allSim=D.participants.map(p=>({name:p.name,t:simScore(p).total})).sort((a,b)=>b.t-a.t||a.name.localeCompare(b.name));
  const Np=allSim.length, rankOf=n=>allSim.findIndex(x=>x.name===n)+1, winner=allSim[0];
  const selSet=new Set(simNames.filter(Boolean));
  const tiedAtTop=allSim.filter(x=>x.t===winner.t).length;

  const winnerCard=`<div class="card"><h3 style="margin-top:0">🏆 Con este escenario, ganaría la Polla</h3>
    <div style="font-size:19px;font-weight:800">${deco(winner.name)}${winner.name} <span class="total" style="font-size:19px">${winner.t} pts</span>${tiedAtTop>1?` <span class="muted" style="font-size:13px">· 🤝 empatado con ${tiedAtTop-1}</span>`:""}</div>
    <div class="muted" style="font-size:12px;margin-top:4px">Top 5 · ${allSim.slice(0,5).map((x,i)=>`${i+1}. ${deco(x.name)}${x.name} (${x.t})`).join(" · ")}</div></div>`;

  // projected leaderboard: top 10 + any selected participant outside it
  const lbRow=(x,i)=>`<tr style="${selSet.has(x.name)?'background:rgba(58,210,159,.14)':''}"><td class="rank">${i+1}</td><td>${deco(x.name)}${x.name}</td><td style="text-align:right"><b>${x.t}</b></td></tr>`;
  const top=allSim.slice(0,10).map((x,i)=>lbRow(x,i)).join("");
  const extra=[...selSet].map(n=>rankOf(n)-1).filter(i=>i>=10).sort((a,b)=>a-b).map(i=>lbRow(allSim[i],i)).join("");
  const lbCard=`<div class="card"><h3 style="margin-top:0">Clasificación proyectada</h3>
    <table><thead><tr><th>#</th><th>Participante</th><th style="text-align:right">Pts</th></tr></thead>
    <tbody>${top}${extra?`<tr><td colspan="3" class="muted" style="text-align:center">· · ·</td></tr>${extra}`:""}</tbody></table></div>`;

  // per-participant breakdown for the selected ones
  const C=simNames.map(n=>n?D.participants.find(p=>p.name===n):null).filter(Boolean);
  let ptsCard="";
  if(!C.length){ ptsCard=`<div class="card muted">Elige participantes arriba para ver su desglose y puesto proyectado.</div>`; }
  else{
    const data=C.map(p=>({p,r:simScore(p)}));
    const colH=data.map(d=>`<th style="text-align:right">${deco(d.p.name)}${d.p.name}</th>`).join("");
    const best=Math.max(...data.map(d=>d.r.total));
    const row=(label,fmt)=>{const cells=data.map(d=>`<td style="text-align:right">${fmt(d.r,d.p)}</td>`).join("");return `<tr><td>${label}</td>${cells}</tr>`;};
    const mk=(ok,pts)=>ok?`<span class="ok">✓ ${pts}</span>`:`<span class="muted">0</span>`;
    ptsCard=`<div class="card"><h3 style="margin-top:0">📊 Puntos proyectados</h3>
      <table><thead><tr><th>Segmento</th>${colH}</tr></thead><tbody>
        ${row(`Fase de grupos <span class="muted">(real, ${data[0].r.gPlayed} jugados)</span>`, r=>`${r.grp} <span class="muted">(${r.gHits})</span>`)}
        ${row("R32 ×2", r=>`${r.r32h*2} <span class="muted">(${r.r32h})</span>`)}
        ${row("Octavos ×3", r=>`${r.r16h*3} <span class="muted">(${r.r16h})</span>`)}
        ${row("Cuartos ×4", r=>`${r.qfh*4} <span class="muted">(${r.qfh})</span>`)}
        ${row("Semifinalistas ×5", r=>`${r.sfh*5} <span class="muted">(${r.sfh})</span>`)}
        ${row("🏆 Campeón", r=>mk(r.champ,25))}
        ${row("🥈 Subcampeón", r=>mk(r.ru,15))}
        ${row("🥉 3.º", r=>mk(r.th,10))}
        ${row("4.º", r=>mk(r.fo,10))}
        ${row(`👟 Goleador <span class="muted">(${simGoleador===SIM_OTRO?'otro':simGoleador})</span>`, r=>mk(r.golHit,15))}
        <tr style="font-weight:800"><td>Total proyectado</td>${data.map(d=>`<td style="text-align:right" class="${d.r.total===best&&C.length>1?'ok':''}"><b class="total">${d.r.total}</b>${d.r.total===best&&C.length>1?' ▲':''}</td>`).join("")}</tr>
        <tr><td>Puesto proyectado</td>${data.map(d=>{const rk=rankOf(d.p.name);return `<td style="text-align:right"><b>#${rk}</b> <span class="muted">de ${Np}</span>${rk===1?' 🏆':''}</td>`;}).join("")}</tr>
      </tbody></table>
      <div class="muted" style="font-size:11px;margin-top:6px">Grupos = puntos reales al momento. R32/R16/QF/semis/puestos = según el escenario. Goleador usa el resultado real si ya está definido. El puesto es contra los 193 participantes bajo este escenario.</div></div>`;
  }
  const results_html = winnerCard + ptsCard + lbCard;

  app.innerHTML=`
    <div class="toprow"><span class="badge live">Simulador 🎲</span>
      <span class="muted" style="font-size:12px">Escenario hipotético · grupos reales + eliminatorias que tú defines</span></div>
    <div class="toprow"><span class="muted" style="font-size:12px">Participantes:</span>
      <input id="simsearch" class="search" list="simnames" placeholder="🔍 Buscar y añadir…" autocomplete="off">
      ${selBox(0)} ${selBox(1)} ${selBox(2)} ${dlist}</div>
    ${results_html}
    <div class="card muted" style="font-size:12px">Construye el escenario: marca quién pasa a R32, luego R16 (solo de los de R32), Cuartos (solo de R16) y ordena el final four (de los de Cuartos). Los puntos de arriba se actualizan al instante.</div>
    ${r32grid}${r16grid}${qfgrid}${podioCard}${golCard}`;

  document.querySelectorAll(".simsel").forEach(s=>s.onchange=e=>{simScroll=window.scrollY;simNames[+e.target.dataset.i]=e.target.value?dec(e.target.value):null;renderSim();});
  document.getElementById("simsearch").onchange=e=>{const hit=D.participants.find(p=>p.name===e.target.value);if(hit){simScroll=window.scrollY;const slot=[0,1,2].find(i=>!simNames[i]);simNames[slot===undefined?0:slot]=hit.name;renderSim();}};
  document.querySelectorAll(".simchip").forEach(el=>el.onclick=()=>{
    simScroll=window.scrollY; const c=el.dataset.c, r=el.dataset.round;
    if(r==="r32"){ if(simR32.has(c)){simR32.delete(c);simR16.delete(c);simQF.delete(c);simPodio=simPodio.map(x=>x===c?"":x);} else if(simR32.size<32) simR32.add(c); }
    else if(r==="r16"){ if(simR16.has(c)){simR16.delete(c);simQF.delete(c);simPodio=simPodio.map(x=>x===c?"":x);} else if(simR16.size<16&&simR32.has(c)) simR16.add(c); }
    else if(r==="qf"){ if(simQF.has(c)){simQF.delete(c);simPodio=simPodio.map(x=>x===c?"":x);} else if(simQF.size<8&&simR16.has(c)) simQF.add(c); }
    renderSim();
  });
  document.querySelectorAll(".simpod").forEach(s=>s.onchange=e=>{
    simScroll=window.scrollY; const i=+e.target.dataset.i, v=e.target.value;
    simPodio=simPodio.map((x,j)=> j!==i && x===v ? "" : x);   // keep distinct
    simPodio[i]=v; renderSim();
  });
  document.querySelector(".simgol").onchange=e=>{simScroll=window.scrollY;simGoleador=e.target.value===SIM_OTRO?SIM_OTRO:dec(e.target.value);renderSim();};
  if(simScroll){ window.scrollTo(0,simScroll); simScroll=0; }
}

function render(){
  window.onscroll=null;   // clear any prior scroll-spy
  tab==="leaderboard"?renderLeaderboard():
  tab==="results"?renderResults():
  tab==="groups"?renderGroups():
  tab==="tracked"?renderTracked():
  tab==="analysis"?renderAnalysis():
  tab==="compare"?renderCompare():
  tab==="sim"?renderSim():
  tab==="stats"?renderStats():
  tab==="goals"?renderGoals():
  renderParticipant();
}
render();
