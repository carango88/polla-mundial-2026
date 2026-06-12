# 🏆 Polla Mundial 2026

Dashboard de la polla del Mundial 2026 (193 participantes). App estática — sin
servidor: se abre `index.html` en el navegador o se publica en GitHub Pages.

## Pestañas
- **Clasificación** — tabla general en vivo, con desglose por etapa.
- **Resultados** — respuestas oficiales (solo lectura), por grupo A–L.
- **Participante** — desglose individual de aciertos.
- **Mis perfiles** — seguimiento de perfiles, puntos en juego y premios.
- **Estadísticas** — agregados de la polla.
- **Goleadores** — tabla de goleadores y apuestas de bota de oro.

## Puntaje (311 máx.)
Fase de grupos 1 pt · R32 2 · Octavos 3 · Cuartos 4 · Semifinalistas 5 ·
4.º/3.º 10 · Subcampeón 15 · Campeón 25 · Goleador 15.

## Archivos
- `index.html`, `app.js` — interfaz y motor de puntaje
- `data.js` — datos de participantes (generado por `parser.py` desde `predictions.csv`)
- `results.js` — resultados oficiales (`window.RESULTS`), se actualiza al jugarse partidos
- `parser.py` — regenera `data.js` si cambia el CSV: `python3 parser.py`
