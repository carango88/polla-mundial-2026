// Kalshi prediction-market snapshot — implied probabilities, hard-coded.
// Markets move constantly, so each snapshot is a FIXED reference taken on `asOf`.
// To refresh, replace the numbers and bump `asOf`.
//
//   champion : implied % to WIN the World Cup, by 3-letter team code
//   matches  : per-game implied %, keyed by window.DATA.schedule index,
//              as {home, draw, away} (the % for home win / draw / away win)
//
// The Kalshi tab compares these against the official results in results.js.

window.KALSHI = {
  asOf: "2026-06-13",   // snapshot date

  // Outright "Men's World Cup winner?" market (Kalshi), Jun 13 2026.
  champion: {
    FRA: 17.1, ESP: 16.9, POR: 10.9, ENG: 10.7, ARG: 8.8, BRA: 8.4,
    NED: 5.9,  GER: 5.0,  USA: 3.4,  NOR: 2.3,  BEL: 2.0, MEX: 1.8,
    JPN: 1.6,  COL: 1.6,  MAR: 1.6,  SUI: 0.9,  URU: 0.9, TUR: 0.8,
  },

  // Per-match win/draw/win implied %. Fill from Kalshi's game markets.
  // Example: 0: { home: 70, draw: 20, away: 10 },  // schedule[0] = MEX vs RSA
  matches: {
    // (awaiting odds — paste Kalshi's per-game percentages here)
  },
};
