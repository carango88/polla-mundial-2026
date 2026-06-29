#!/usr/bin/env node
// Auto-update results.js from ESPN's World Cup 2026 feed.
//
//   node update_results.js
//
// Pulls finished matches from ESPN's public JSON API, maps them to the pool
// schedule, and regenerates results.js (group results + goal scorers).
// Knockout sets, placements and `eliminated` are PRESERVED from the existing
// file (ESPN's per-stage advancement isn't auto-derived yet — edit by hand).
//
// Runs locally or via .github/workflows/update-results.yml on a schedule.

const fs = require("fs");
const path = require("path");

const HERE = __dirname;
const LEAGUE = "fifa.world";
const START = "2026-06-11";              // first match day
const SB = d => `https://site.api.espn.com/apis/site/v2/sports/soccer/${LEAGUE}/scoreboard?dates=${d}`;
const SUM = id => `https://site.api.espn.com/apis/site/v2/sports/soccer/${LEAGUE}/summary?event=${id}`;

// load schedule + previous results (they assign window globals)
global.window = {};
require(path.join(HERE, "data.js"));
require(path.join(HERE, "results.js"));
const DATA = window.DATA;
const PREV = window.RESULTS || {};
const schedule = DATA.schedule;

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJSON(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "polla-mundial-updater" } });
      if (r.ok) return await r.json();
      if (r.status === 429) await sleep(1500 * (attempt + 1));
    } catch (e) { await sleep(800); }
  }
  return null;
}

function* dateRange(startISO) {
  const start = new Date(startISO + "T00:00:00Z");
  // scan the whole tournament window so upcoming knockout FIXTURES (R32/R16/…) are
  // captured for the bracket, not just matches up to today
  const end = new Date("2026-07-20T00:00:00Z");
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const y = d.getUTCFullYear(), m = String(d.getUTCMonth() + 1).padStart(2, "0"), day = String(d.getUTCDate()).padStart(2, "0");
    yield `${y}${m}${day}`;
  }
}

// schedule index for a match between two teams — order-independent, because ESPN may
// list home/away opposite to our schedule for neutral-venue games (which would otherwise
// silently drop the game).
function scheduleIndex(a, b) {
  return schedule.findIndex(m => (m.home === a && m.away === b) || (m.home === b && m.away === a));
}

// Detect the knockout round from the ESPN season SLUG only. (Event names/notes
// reference the feeder round — e.g. an R16 fixture's name says "Round of 32
// winner" — so using them mislabels every round. The slug is clean.)
function roundOf(ev) {
  const slug = ((ev.season && ev.season.slug) || "").toLowerCase();
  if (/round-of-32/.test(slug)) return "r32";
  if (/round-of-16/.test(slug)) return "r16";
  if (/quarter/.test(slug)) return "qf";
  if (/semi/.test(slug)) return "sf";
  if (/3rd|third|bronze/.test(slug)) return "bronze";
  if (/final/.test(slug)) return "final";
  return null;
}
// Group ranking per FIFA Art.13: points → head-to-head (pts/GD/GF among tied) → overall GD → GF → name.
function sortGroupStats(stats, g, scores) {
  const arr = [...stats].sort((a, b) => b.pts - a.pts);
  const out = []; let i = 0;
  while (i < arr.length) {
    let j = i; while (j < arr.length && arr[j].pts === arr[i].pts) j++;
    const tied = arr.slice(i, j);
    if (tied.length > 1) {
      const ids = new Set(tied.map(t => t.team)); const h = {}; tied.forEach(t => h[t.team] = { pts: 0, gf: 0, gc: 0 });
      for (const mi of g.matches) {
        const sc = scores[mi]; if (!sc) continue; const m = schedule[mi];
        if (ids.has(m.home) && ids.has(m.away)) {
          const [x, y] = sc, H = h[m.home], A = h[m.away]; H.gf += x; H.gc += y; A.gf += y; A.gc += x;
          if (x > y) H.pts += 3; else if (x < y) A.pts += 3; else { H.pts++; A.pts++; }
        }
      }
      tied.forEach(t => { const z = h[t.team]; t._hp = z.pts; t._hgd = z.gf - z.gc; t._hgf = z.gf; });
      tied.sort((a, b) => b._hp - a._hp || b._hgd - a._hgd || b._hgf - a._hgf || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
    }
    out.push(...tied); i = j;
  }
  return out;
}
// Teams mathematically guaranteed a top-2 finish: top-2 (on points) in EVERY
// possible combination of the group's remaining results. Brute-forces outcomes
// (3^remaining, tiny). Catches obvious qualifiers before their group finishes.
function clinchedTop2(g, scores) {
  const base = {}; g.teams.forEach(t => base[t] = 0);
  for (const mi of g.matches) {
    const sc = scores[mi]; if (!sc) continue; const m = schedule[mi]; const [x, y] = sc;
    if (x > y) base[m.home] += 3; else if (x < y) base[m.away] += 3; else { base[m.home]++; base[m.away]++; }
  }
  const remaining = g.matches.filter(i => !scores[i]);
  const clinched = new Set(g.teams);
  const combos = 3 ** remaining.length;
  for (let c = 0; c < combos; c++) {
    const pts = { ...base }; let cc = c;
    for (const mi of remaining) {
      const o = cc % 3; cc = (cc - o) / 3; const m = schedule[mi];
      if (o === 0) pts[m.home] += 3; else if (o === 1) pts[m.away] += 3; else { pts[m.home]++; pts[m.away]++; }
    }
    for (const t of g.teams) if (g.teams.filter(o => o !== t && pts[o] > pts[t]).length > 1) clinched.delete(t);
  }
  return [...clinched];
}
// R32 qualifiers from standings: top-2 of every COMPLETE group + any team already
// guaranteed top-2 in an unfinished group, plus the 8 best thirds once ALL 12 are
// complete. Used until ESPN publishes the actual draw.
function deriveR32(scores) {
  const r32 = new Set(), thirds = []; let allComplete = true;
  for (const g of DATA.groups) {
    const complete = g.matches.every(i => scores[i]);
    const st = {}; g.teams.forEach(t => st[t] = { team: t, pts: 0, gf: 0, gc: 0, gd: 0 });
    for (const mi of g.matches) {
      const sc = scores[mi]; if (!sc) continue; const m = schedule[mi]; const [x, y] = sc, H = st[m.home], A = st[m.away];
      H.gf += x; H.gc += y; A.gf += y; A.gc += x; if (x > y) H.pts += 3; else if (x < y) A.pts += 3; else { H.pts++; A.pts++; }
    }
    Object.values(st).forEach(t => t.gd = t.gf - t.gc);
    const sorted = sortGroupStats(Object.values(st), g, scores);
    if (complete) { r32.add(sorted[0].team); r32.add(sorted[1].team); thirds.push(sorted[2]); }
    else { allComplete = false; for (const t of clinchedTop2(g, scores)) r32.add(t); }
    // a 3rd-placed team on 4+ points is effectively a guaranteed best-eight third
    if (sorted[2] && sorted[2].pts >= 4) r32.add(sorted[2].team);
  }
  if (allComplete) {
    thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
    for (const t of thirds.slice(0, 8)) r32.add(t.team);
  }
  return [...r32];
}

async function main() {
  const group = Array(schedule.length).fill(null);
  const scores = Array(schedule.length).fill(null);   // [home, away] goals per group match
  const goalMap = new Map();   // key `player|TEAM` -> {player, team, goals}
  const ko = { r32: new Set(), r16: new Set(), qf: new Set(), sf: new Set() };  // teams reaching each knockout round
  const bracket = [];                  // knockout fixtures for the bracket view {round,a,b,as,bs,w,done}
  const TEAMS = new Set(DATA.teams);   // real 3-letter codes — reject ESPN bracket placeholders ("RD16 W1", etc.)
  let finalMatch = null, bronzeMatch = null;
  let scannedDays = 0, finished = 0;
  const seenEv = new Set();   // dedupe events that appear on adjacent date scoreboards

  for (const date of dateRange(START)) {
    const sb = await getJSON(SB(date));
    scannedDays++;
    if (!sb || !sb.events) continue;
    for (const ev of sb.events) {
      if (seenEv.has(ev.id)) continue; seenEv.add(ev.id);
      const comp = ev.competitions && ev.competitions[0];
      if (!comp) continue;
      const home = comp.competitors.find(c => c.homeAway === "home");
      const away = comp.competitors.find(c => c.homeAway === "away");
      if (!home || !away) continue;
      const hAb = home.team.abbreviation, aAb = away.team.abbreviation;
      const done = ev.status && ev.status.type && ev.status.type.completed;
      const idx = scheduleIndex(hAb, aAb);

      // knockout participation — captured even before kickoff (reaching a round is what scores)
      if (idx < 0) {
        const rd = roundOf(ev);
        if (rd) {
          const a = TEAMS.has(hAb) ? hAb : null, b = TEAMS.has(aAb) ? aAb : null;   // null = placeholder slot (TBD)
          const wAb = done ? (((comp.competitors.find(c => c.winner) || {}).team || {}).abbreviation) : null;
          const w = (wAb && TEAMS.has(wAb)) ? wAb : null;
          bracket.push({ round: rd, a, b, as: done ? Number(home.score) : null, bs: done ? Number(away.score) : null, w, done: !!done });
          if (rd === "final" || rd === "bronze") {
            if (done) {
              const lAb = ((comp.competitors.find(c => !c.winner) || {}).team || {}).abbreviation;
              const rec = { win: w || "", lose: (lAb && TEAMS.has(lAb)) ? lAb : "" };
              if (rd === "final") finalMatch = rec; else bronzeMatch = rec;
            }
          } else {
            if (a) ko[rd].add(a); if (b) ko[rd].add(b);     // both teams reached this round
            const adv = { r32: "r16", r16: "qf", qf: "sf" }[rd];
            if (done && adv && w) ko[adv].add(w);            // winner advances
          }
        }
      }

      if (!done) continue;
      const hs = Number(home.score), as = Number(away.score);

      // group result — orient ESPN's score to OUR schedule's home/away (ESPN order may differ)
      if (idx >= 0) {
        const m = schedule[idx];
        const sh = (m.home === hAb) ? hs : as;   // goals for the schedule's home team
        const sa = (m.home === hAb) ? as : hs;
        group[idx] = sh > sa ? "1" : sh < sa ? "2" : "E";
        scores[idx] = [sh, sa];
      }
      finished++;

      // scorers from the match summary
      const sum = await getJSON(SUM(ev.id));
      await sleep(250);
      if (!sum) continue;
      const idToAb = {};
      for (const r of (sum.rosters || [])) if (r.team) idToAb[r.team.id] = r.team.abbreviation;
      for (const ke of (sum.keyEvents || [])) {
        if (!ke.scoringPlay) continue;
        const t = (ke.type && ke.type.text) || "";
        if (/own goal/i.test(t)) continue;          // own goals don't count for golden boot
        if (ke.shootout) continue;                   // penalty shootout goals don't count
        const teamCode = ke.team && idToAb[ke.team.id];
        const ath = (ke.participants || [])[0];
        const player = ath && ath.athlete && ath.athlete.displayName;
        if (!player || !teamCode) continue;
        const key = `${player}|${teamCode}`;
        const cur = goalMap.get(key) || { player, team: teamCode, goals: 0 };
        cur.goals++; goalMap.set(key, cur);
      }
    }
  }

  const goals = [...goalMap.values()].sort((a, b) => b.goals - a.goals || a.player.localeCompare(b.player));

  // ----- knockout fields ----- (updater is the source of truth; no stale-PREV fallback)
  // R32: ESPN's actual draw once fully published (32 teams); else derive from standings.
  const r32 = ko.r32.size >= 32 ? [...ko.r32] : deriveR32(scores);
  const r16 = [...ko.r16], qf = [...ko.qf], sf = [...ko.sf];
  let champion = "", runnerUp = "", third = "", fourth = "";
  if (finalMatch) { champion = finalMatch.win || ""; runnerUp = finalMatch.lose || ""; }
  if (bronzeMatch) { third = bronzeMatch.win || ""; fourth = bronzeMatch.lose || ""; }

  // eliminated: teams that fell at a boundary we know in full (drives the "ganables" math)
  const elim = new Set();
  const cut = (a, b, expect) => { if (b.length === expect) { const bs = new Set(b); for (const t of a) if (!bs.has(t)) elim.add(t); } };
  if (r32.length === 32) for (const g of DATA.groups) for (const t of g.teams) if (!r32.includes(t)) elim.add(t);
  cut(r32, r16, 16); cut(r16, qf, 8); cut(qf, sf, 4);

  const out = {
    group, scores,
    r32, r16, qf, sf,
    fourth, third, runnerUp, champion,
    scorer: PREV.scorer || "",                 // golden boot decided at tournament end (manual)
    eliminated: [...elim],
    bracket,
    goals,
  };

  // NOTE: no timestamp in the output — the file must be byte-identical when the
  // data is unchanged, so the workflow only commits on a REAL results change
  // (otherwise the bot would commit on every run and you'd race it constantly).
  const js =
`// Official World Cup 2026 results — AUTO-GENERATED by update_results.js from the ESPN feed.
//   group  : 72 entries aligned to window.DATA.schedule ('1' home / 'E' draw / '2' away / null)
//   scores : 72 entries [homeGoals, awayGoals] per group match (null if unplayed)
//   r32    : 32 qualifiers — ESPN draw if published, else derived from standings (top-2 + 8 best thirds)
//   r16/qf/sf, placements, eliminated : from ESPN knockout fixtures as they're played
//   scorer (golden boot) : decided at tournament end (manual)
//   goals  : [{player, team, goals}] excluding own goals & shootout goals
window.RESULTS = ${JSON.stringify(out, null, 2)};
`;

  fs.writeFileSync(path.join(HERE, "results.js"), js);
  console.log(`Scanned ${scannedDays} day(s), ${finished} finished match(es).`);
  console.log(`Group results set: ${group.filter(Boolean).length}/${schedule.length}`);
  console.log(`R32 ${r32.length} · R16 ${r16.length} · QF ${qf.length} · SF ${sf.length} · champ ${champion || "—"} · elim ${out.eliminated.length}`);
  console.log(`Scorers: ${goals.length} player(s), ${goals.reduce((s, g) => s + g.goals, 0)} goal(s).`);
}

main();
