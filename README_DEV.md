# Marble Football Developer Guide

## Module Overview

```
src/
├── core/
│   ├── EventBus.js          # Lightweight event emitter shared across modules
│   ├── GameState.js         # Centralised match state object
│   ├── Logger.js            # Environment-aware logging helper
│   ├── TimerManager.js      # Single source of truth for timeouts/intervals
│   ├── gameManager.js       # Wires the engine and betting systems together
│   └── stateManager.js      # Mutators for GameState
├── engine/
│   ├── GameEngine.js        # Match loop, physics, goal handling
│   ├── Renderer.js          # PIXI scene setup, scoreboard and overlays
│   ├── formation.js         # Formation strength calculators
│   └── physics.js           # Collision and restricted area helpers
├── ui/
│   ├── DOMController.js     # All DOM querying and mutations
│   └── UIInitializer.js     # UI events, button wiring, UI reactions
├── betting/
│   ├── BetManager.js        # Betting lifecycle, event reactions, odds
│   └── odds.js              # Odds and probability helpers (unit-tested)
├── data/
│   ├── formations.js        # Formation coordinate templates
│   └── historicalStats.js   # Pre-computed betting distributions
├── config/
│   └── constants.js         # Game configuration constants
└── index.js                 # Entry point that boots the game & UI
```

## Game Flow Diagram

```
+-------------+      initGame()        +----------------+
|  index.js   | ---------------------> | core/gameManager|
+-------------+                        +----------------+
        |                                      |
        | initUI()                             | init()
        v                                      v
+----------------+         ticker loop   +----------------+
| ui/UIInitializer| <------------------->| engine/GameEngine|
+----------------+                        +----------------+
        |                                      |
        | DOM actions                          | eventBus.emit()
        v                                      v
+----------------+                        +----------------+
| ui/DOMController| <-------------------- | core/EventBus  |
+----------------+                        +----------------+
        ^                                      |
        | odds updates                         |
+----------------+                        +----------------+
| betting/BetMgr | ----------------------> | ui/DOMController|
+----------------+                        +----------------+
```

1. `index.js` boots both the engine (`initGame`) and UI wiring (`initUI`).
2. `gameManager` instantiates the `GameEngine` and `BetManager` which subscribe to the shared `eventBus`.
3. `GameEngine` owns the PIXI ticker, updates `GameState` through `stateManager`, and emits lifecycle events (`goal`, `halftime`, `fulltime`, `matchEnd`, `bettingStart`, `bettingClose`).
4. `BetManager` listens to those events to open/close markets and update odds, using the DOM controller helpers to touch the UI.
5. All DOM touching (querying, updating text, toggling styles) lives in `ui/DOMController`, keeping rendering logic (`Renderer`) PIXI-only.
6. Timers and intervals go through `core/TimerManager` so a cleanup call clears the whole simulation safely.

## Testing

Unit tests (Vitest) cover the probabilistic utilities and physics helpers:

- `calculateOdds`
- `calculateCombinedOverProbability`
- `resolveCollision`
- `enforceRestrictedGoalAreas`

Run them with:

```bash
npm test
```
