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

// ---- results (answer key) state ----------------------------------------
function blankResults(){
  return { group: Array(D.schedule.length).fill(null),
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
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{
  tab=t.dataset.tab;
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===t));
  render();
});

function anyResults(){
  return results.group.some(Boolean)||results.r32.length||results.r16.length||
         results.qf.length||results.sf.length||results.champion||results.scorer;
}

// ---- LEADERBOARD --------------------------------------------------------
function renderLeaderboard(){
  const ranked = scoreAll();
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
      const rank = ranked.indexOf(r)+1;
      const cell=k=>colVal(r.s,k);
      return `<tr>
        <td class="rank">${rank}</td>
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
];
function renderParticipant(){
  const app=document.getElementById("app");
  const ranked=scoreAll();
  const byName=[...D.participants].sort((a,b)=>a.name.localeCompare(b.name,'es'));
  const opts=byName.map(p=>`<option value="${enc(p.name)}" ${p.name===detailName?'selected':''}>${p.name}</option>`).join("");
  const quick=QUICK_PROFILES.filter(n=>D.participants.some(p=>p.name===n))
    .map(n=>`<button class="jchip qa ${n===detailName?'act':''}" data-n="${enc(n)}">${deco(n)}${n}</button>`).join("");
  app.innerHTML=`<div class="toprow">
      <select id="psel" style="min-width:280px"><option value="">Selecciona…</option>${opts}</select>
      ${quick?`<span class="muted" style="font-size:12px">Acceso rápido:</span>${quick}`:""}
    </div><div id="pdetail"></div>`;
  document.getElementById("psel").onchange=e=>{detailName=e.target.value?dec(e.target.value):null;drawDetail();};
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
  const rank=scoreAll().findIndex(r=>r.p.name===detailName)+1;
  const koRow=(key,label,res)=>`<div class="kv"><span>${label} <span class="muted">${p[key].length} picks</span></span>
     <span><b class="${res.pts?'ok':'muted'}">${res.hits.length} aciertos</b> · ${res.pts} pts</span></div>`;
  const placeRow=(k,label)=>{const ok=s.placeHits[k];const pick=p[k]?nameOf(p[k]):'—';
     return `<div class="kv"><span>${label}</span><span>${pick} ${results[k]?(ok?'<span class="ok">✓</span>':'<span class="ko">✗</span>'):'<span class="muted">pend.</span>'} · ${ok?P[k]:0} pts</span></div>`;};
  box.innerHTML=`
   <div class="card row" style="justify-content:space-between">
     <div><div style="font-size:18px;font-weight:800">${p.name}</div>
       <div class="muted">Posición #${rank} de ${D.participants.length}</div></div>
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
  const chosen=anaNames.filter(n=>n&&D.participants.some(p=>p.name===n));
  const body=chosen.length
    ? analysisBody(chosen)
    : '<div class="card muted">Elige un participante para ver su análisis completo.</div>';
  app.innerHTML=`<div class="toprow">
      <span class="muted" style="font-size:12px">Analizar:</span>
      ${selBox(0)} ${selBox(1)}
      <span class="muted" style="font-size:12px">Logrados (verde) · Ganables (dorado) · Perdidos (rojo). Sobre 311.</span>
    </div>${body}`;
  document.querySelectorAll(".anasel").forEach(s=>s.onchange=e=>{
    const i=+e.target.dataset.i; anaNames[i]=e.target.value?dec(e.target.value):null; renderAnalysis();
  });
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
    <span class="splbl"><span class="fl">${flagOf(m.home)}</span> ${m.home} <span class="muted">vs</span> ${m.away} <span class="fl">${flagOf(m.away)}</span></span>
    <span class="splbar">
      <span class="sp home" style="width:${pct(h)}%" title="${m.home} ${R(h)}%"></span>
      <span class="sp draw" style="width:${pct(d)}%" title="Empate ${R(d)}%"></span>
      <span class="sp away" style="width:${pct(a)}%" title="${m.away} ${R(a)}%"></span>
    </span>
    <span class="spval muted">${R(h)}/${R(d)}/${R(a)}</span>
  </div>`;
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
  // only flag tracked profiles (💯/💵) when they share the top score; ignore everyone else
  const maxTracked=TRACKED.filter(n=>{const r=rankedS.find(x=>x.p.name===n); return r&&r.s.total===max;})
    .map(n=>NAME_TAG[n]).join(" ");

  const card=(title,body,sub="")=>`<div class="card"><h3 style="margin-top:0">${title}${sub?` <span class="muted" style="font-weight:400">${sub}</span>`:""}</h3>${body}</div>`;

  app.innerHTML=`
    <div class="toprow"><span class="badge live">Estadísticas de la polla</span>
      <span class="muted">${N} participantes · agregados sobre todas las selecciones</span></div>

    <div class="duel-grid">
      ${card("Puntaje actual",`
        <div class="kv"><span>Promedio</span><b>${avg}</b></div>
        <div class="kv"><span>Mediana</span><b>${med}</b></div>
        <div class="kv"><span>Máximo</span><b class="ok">${max}</b> <span class="muted">— ${tiedMax>1?`${tiedMax} empatados${maxTracked?` (incl. ${maxTracked})`:""}`:`${deco(leader.p.name)}${leader.p.name}`}</span></div>
        <div class="kv"><span>Mínimo</span><b>${min}</b></div>
        <div class="kv"><span>Puntos posibles</span><b class="muted">311</b></div>`,
        "partidos jugados hasta ahora")}
      ${card("🥇 Campeón más elegido", barList(tally(ps.map(p=>p.champion)), teamFmt))}
    </div>

    <div class="duel-grid">
      ${card("👟 Goleador más elegido", barList(tally(ps.map(p=>p.scorer)), plain))}
      ${card("⭐ Semifinalistas más elegidos", barList(tally(ps.flatMap(p=>p.sf)), teamFmt))}
    </div>

    <div class="duel-grid">
      ${card("🥈 Subcampeón más elegido", barList(tally(ps.map(p=>p.runnerUp)), teamFmt))}
      ${card("🥉 3.º puesto más elegido", barList(tally(ps.map(p=>p.third)), teamFmt))}
    </div>

    <div class="duel-grid">
      ${card("Equipos más elegidos para Cuartos", barList(tally(ps.flatMap(p=>p.qf)), teamFmt, 48), "todos los elegidos")}
      ${card("Equipos más elegidos para clasificar (R32)", barList(tally(ps.flatMap(p=>p.r32)), teamFmt, 48), "los 48 equipos")}
    </div>
    ${card("Partidos más divididos — top 10",
      `<div class="muted" style="font-size:11px;margin-bottom:10px">
         <span class="spdot home"></span> local · <span class="spdot draw"></span> empate · <span class="spdot away"></span> visitante · <span style="margin-left:6px">% local/empate/visitante</span></div>
       ${[...Array(D.schedule.length).keys()].map(splitScore).sort((a,b)=>b.H-a.H).slice(0,10).map(splitRow).join("")}`,
      "donde más se reparten las predicciones")}
    ${card("Predicciones por partido — fase de grupos",
      D.groups.map(g=>`<div class="grp-h" style="margin-top:12px"><span>Grupo ${g.label}</span></div>
        ${g.matches.map(i=>matchPoll(i)).join("")}`).join(""),
      "clic en un partido para ver qué resultado eligió cada quién")}`;
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

  app.innerHTML=`<div class="toprow">
      <span class="muted" style="font-size:12px">Comparar:</span>
      ${selBox(0)} ${selBox(1)} ${selBox(2)}
    </div>${body}`;
  document.querySelectorAll(".cmpsel").forEach(s=>s.onchange=e=>{
    const i=+e.target.dataset.i; cmp[i]=e.target.value?dec(e.target.value):null; renderCompare();
  });
}

// ---- KALSHI: prediction-market accuracy vs actual results --------------
function renderKalshi(){
  const app=document.getElementById("app");
  const K=window.KALSHI||{champion:{},matches:{}};
  const elim=new Set(results.eliminated||[]);

  // ----- champion market -----
  const entries=Object.entries(K.champion||{}).sort((a,b)=>b[1]-a[1]);
  const maxP=entries.length?entries[0][1]:1;
  const champRows=entries.map(([code,prob],i)=>{
    let status="vivo",cls="muted";
    if(results.champion){
      if(results.champion===code){status="🏆 Campeón";cls="ok";}
      else if(elim.has(code)){status="eliminado";cls="ko";}
      else status="—";
    } else if(elim.has(code)){status="❌ eliminado";cls="ko";}
    return `<div class="barrow">
      <span class="lbl">${i+1}. <span class="fl">${flagOf(code)}</span> ${nameOf(code)} <span class="muted">${code}</span></span>
      <span class="track"><span class="fill" style="width:${(prob/maxP*100).toFixed(0)}%"></span></span>
      <span class="val"><b>${prob.toFixed(1)}%</b> · <span class="${cls}">${status}</span></span></div>`;
  }).join("")||'<div class="muted">Sin datos del mercado de campeón.</div>';

  // champion-market accuracy signal (works before the final too)
  const fav=entries[0];
  const elimFav=entries.filter(([c])=>elim.has(c));
  let champNote;
  if(results.champion){
    const rank=entries.findIndex(([c])=>c===results.champion)+1;
    const favWon=fav&&fav[0]===results.champion;
    champNote=`Campeón oficial: <b>${nameOf(results.champion)}</b> · Kalshi lo tenía <b>#${rank||'—'}</b> ${rank?`(${entries[rank-1][1].toFixed(1)}%)`:''}. `
      +(favWon?'<span class="ok">✅ El favorito de Kalshi ganó.</span>':'<span class="ko">❌ El favorito de Kalshi no ganó.</span>');
  } else {
    champNote=`Favorito de Kalshi: <b>${fav?`${nameOf(fav[0])} (${fav[1].toFixed(1)}%)`:'—'}</b>. `
      +(elimFav.length?`<span class="ko">${elimFav.length} de sus favoritos ya están eliminados: ${elimFav.map(([c])=>c).join(", ")}.</span>`
        :'Ninguno de sus favoritos ha sido eliminado todavía.');
  }

  // ----- per-match accuracy (Brier score + favorite hit-rate) -----
  const M=K.matches||{};
  const rows=[]; let brierSum=0, favHits=0, n=0;
  for(const key of Object.keys(M)){
    const i=+key; const a=results.group[i]; if(!a) continue;       // only scored games
    const m=M[i]; const ph=(m.home||0)/100, pd=(m.draw||0)/100, pa=(m.away||0)/100;
    const oh=a==="1"?1:0, od=a==="E"?1:0, oa=a==="2"?1:0;
    const brier=(ph-oh)**2+(pd-od)**2+(pa-oa)**2;                  // 0 = perfect, 2 = worst
    const opts=[["1",m.home||0],["E",m.draw||0],["2",m.away||0]].sort((x,y)=>y[1]-x[1]);
    const favHit=opts[0][0]===a;
    brierSum+=brier; favHits+=favHit?1:0; n++;
    const sc=D.schedule[i], lbl=`${flagOf(sc.home)} ${sc.home} vs ${flagOf(sc.away)} ${sc.away}`;
    const resWord=a==="1"?`gana ${sc.home}`:a==="E"?"empate":`gana ${sc.away}`;
    rows.push(`<tr><td>${lbl}</td>
      <td style="text-align:right">${(m.home||0)}% / ${(m.draw||0)}% / ${(m.away||0)}%</td>
      <td>${resWord}</td>
      <td style="text-align:center" class="${favHit?'ok':'ko'}">${favHit?'✓':'✗'}</td>
      <td style="text-align:right" class="muted">${brier.toFixed(3)}</td></tr>`);
  }
  const matchCard = n
    ? `<div class="card"><h3 style="margin-top:0">🎯 Precisión por partido</h3>
        <div class="row" style="gap:16px;margin-bottom:10px">
          <span class="pill">Partidos evaluados <b>${n}</b></span>
          <span class="pill">Favorito acertó <b class="ok">${favHits}/${n}</b> (${(favHits/n*100).toFixed(0)}%)</span>
          <span class="pill">Brier medio <b>${(brierSum/n).toFixed(3)}</b> <span class="muted">(0 = perfecto)</span></span>
        </div>
        <table><thead><tr><th>Partido</th><th style="text-align:right">Kalshi (1/X/2)</th><th>Resultado</th>
          <th style="text-align:center">Fav.</th><th style="text-align:right">Brier</th></tr></thead>
          <tbody>${rows.join("")}</tbody></table>
        <div class="muted" style="font-size:12px;margin-top:6px">Brier = Σ(prob − resultado)² sobre 1/X/2. Más bajo = predicción más precisa.</div></div>`
    : `<div class="card"><h3 style="margin-top:0">🎯 Precisión por partido</h3>
        <div class="muted">Aún no hay odds de partidos cargadas en <code>kalshi.js</code>. Pega los porcentajes de Kalshi por partido (1/X/2) y aquí aparecerá el Brier score y el acierto del favorito.</div></div>`;

  app.innerHTML=`
    <div class="toprow"><span class="badge live">Kalshi vs realidad 📈</span>
      <span class="muted">Mercado de predicciones de Kalshi · snapshot del ${K.asOf||'—'}</span></div>
    ${matchCard}
    <div class="card"><h3 style="margin-top:0">🏆 Mercado de campeón (Kalshi)</h3>
      <div class="muted" style="font-size:12px;margin-bottom:8px">${champNote}</div>
      ${champRows}</div>
    <div class="card muted" style="font-size:12px">
      Las probabilidades de Kalshi son una <b>foto fija</b> del ${K.asOf||'—'} y cambian con el mercado.
      El mercado de campeón se resuelve al final del torneo; mientras tanto se marca qué favoritos van quedando eliminados (requiere mantener <code>eliminated:[]</code> en <code>results.js</code>).
    </div>`;
}

function render(){
  window.onscroll=null;   // clear any prior scroll-spy
  tab==="leaderboard"?renderLeaderboard():
  tab==="results"?renderResults():
  tab==="tracked"?renderTracked():
  tab==="analysis"?renderAnalysis():
  tab==="compare"?renderCompare():
  tab==="kalshi"?renderKalshi():
  tab==="stats"?renderStats():
  tab==="goals"?renderGoals():
  renderParticipant();
}
render();
