# Marble Football – Developer Guide

A marble-physics football match rendered with PIXI.js, with a live betting dashboard.
No build step: open `index.html` through any static server (e.g. `python3 -m http.server`).

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page layout: pitch container, controls, bet slip, markets, bet lists, goal popup |
| `script.js` | All game and betting logic (sections listed below) |
| `style.css` | Page, overlay and goal-popup styles |
| `betting-ui.css` | Betting dashboard styles |
| `Video_of_Goal_Celebration*.mp4` | Goal celebration clips (red / blue) |

## `script.js` sections

1. **Setup** – constants, match state, formations, PIXI app.
2. **Game objects** – pitch, marble players, locally drawn ball, on-pitch messages.
3. **Game logic** – restricted areas, match clock, halftime/full-time, collisions, goals.
4. **Game loop** – fixed-size sub-steps: one step equals one 60fps frame at 1x speed.
   `ticker.deltaTime × gameSpeed` is split into steps of at most 1, so the pace is the same
   on any refresh rate and the ball can't tunnel through players at high speed.
5. **Match lifecycle** – `startNextMatch()` → pre-match betting window → `startPlay()` →
   halftime window → `startSecondHalf()` → `finishMatch()` (records result, settles bets).
   `matchEpoch` / `scheduleForMatch()` make delayed callbacks from an older match no-ops.
6. **Betting** – odds from `historicalStats` (1000 simulated matches as a prior, updated after
   every match played), Poisson live odds at halftime, bet slip, settlement, bet history.
7. **Persistence** – balance, bet history and learned stats are saved to `localStorage`
   (`marbleFootball.v1`). Pending stakes are refunded if the page is closed mid-match.

## Modes

- **Single match (count = 1)**: continuous play with a 20s pre-match and 15s halftime
  betting window, then the next match starts automatically.
- **Batch (count > 1)**: betting windows are skipped and pauses shrink with game speed,
  for quickly generating match data. Download results with *Download Match Data (CSV)*.

Changing the series mid-match voids (refunds) any pending bets on that match.
