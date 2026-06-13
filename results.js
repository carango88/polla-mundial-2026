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
    g[1] = "1"; // Match 2: South Korea 2–1 Czechia (KOR win)
    // ── Jun 12 ──────────────────────────────────────────────
    g[2] = "E"; // Match 3: Canada 1–1 Bosnia & Herzegovina (draw)
    g[3] = "1"; // Match 4: United States 3–1 Paraguay (USA win)
    return g;
  })(),

  r32: [], r16: [], qf: [], sf: [],
  fourth: "", third: "", runnerUp: "", champion: "", scorer: "",

  // Goal scorers so far {player, team(code), goals}. Updated as matches are played.
  goals: [
    { player: "J. Quiñones", team: "MEX", goals: 1 },   // Jun 11 vs RSA
    { player: "R. Jiménez",  team: "MEX", goals: 1 },   // Jun 11 vs RSA
    { player: "L. Krejčí",   team: "CZE", goals: 1 },   // Jun 11 vs KOR (59')
    { player: "H. In-beom",  team: "KOR", goals: 1 },   // Jun 11 vs CZE (67')
    { player: "O. Hyeon-gyu", team: "KOR", goals: 1 },  // Jun 11 vs CZE (80')
    { player: "J. Lukić",    team: "BIH", goals: 1 },   // Jun 12 vs CAN (21')
    { player: "C. Larin",    team: "CAN", goals: 1 },   // Jun 12 vs BIH (78')
    { player: "F. Balogun",  team: "USA", goals: 2 },   // Jun 12 vs PAR (31', 45+5')
    { player: "Maurício",    team: "PAR", goals: 1 },   // Jun 12 vs USA (73')
    // + own goal D. Bobadilla (PAR) 7' → USA's 3rd goal, not a golden-boot goal
  ]
};
