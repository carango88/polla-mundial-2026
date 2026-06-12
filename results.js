// Official World Cup 2026 results — the answer key, hard-coded from FIFA.
// Updated as matches are played (later, a daily job can regenerate this file).
//
//   group : 72 entries aligned to window.DATA.schedule
//           '1' = home team won · 'E' = draw · '2' = away team won · null = not played yet
//   r32/r16/qf/sf : arrays of 3-letter codes for teams that REACHED that stage
//   fourth/third/runnerUp/champion : 3-letter code · scorer : surname (golden boot)
//
// These override anything entered manually in the Resultados tab.

window.RESULTS = {
  group: (function () {
    const g = Array(72).fill(null);
    // ── Jun 11 ──────────────────────────────────────────────
    g[0] = "1"; // Match 1: Mexico 2–0 South Africa (MEX win)
    return g;
  })(),

  r32: [], r16: [], qf: [], sf: [],
  fourth: "", third: "", runnerUp: "", champion: "", scorer: "",

  // Goal scorers so far {player, team(code), goals}. Updated as matches are played.
  goals: [
    { player: "J. Quiñones", team: "MEX", goals: 1 },   // Jun 11 vs RSA
    { player: "R. Jiménez",  team: "MEX", goals: 1 },   // Jun 11 vs RSA
  ]
};
