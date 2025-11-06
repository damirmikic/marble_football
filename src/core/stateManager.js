import { GameState } from './GameState.js';

const defaultState = () => ({
  half: 1,
  running: false,
  started: false,
  autoMode: false,
  score: { red: 0, blue: 0 },
  timer: 0,
  injury: { first: 0, second: 0 },
  match: { current: 1, total: 1 },
  formations: { home: '4-4-2', away: '4-4-2' }
});

export const resetGameState = () => {
  const next = defaultState();
  GameState.half = next.half;
  GameState.running = next.running;
  GameState.started = next.started;
  GameState.autoMode = next.autoMode;
  GameState.score.red = next.score.red;
  GameState.score.blue = next.score.blue;
  GameState.timer = next.timer;
  GameState.injury.first = next.injury.first;
  GameState.injury.second = next.injury.second;
  GameState.match.current = next.match.current;
  GameState.match.total = next.match.total;
  GameState.formations.home = next.formations.home;
  GameState.formations.away = next.formations.away;
};

export const nextMatchState = () => {
  GameState.match.current += 1;
  if (GameState.match.current > GameState.match.total) {
    GameState.match.current = GameState.match.total;
  }
  GameState.half = 1;
  GameState.score.red = 0;
  GameState.score.blue = 0;
  GameState.timer = 0;
  GameState.injury.first = 0;
  GameState.injury.second = 0;
  GameState.running = false;
  GameState.started = false;
};

export const updateScore = (team, goals) => {
  if (!['red', 'blue'].includes(team)) {
    throw new Error(`Unknown team: ${team}`);
  }
  GameState.score[team] = goals;
};

export const setHalf = half => {
  GameState.half = half;
};

export const setTimer = value => {
  GameState.timer = value;
};

export const setRunning = value => {
  GameState.running = value;
};

export const setStarted = value => {
  GameState.started = value;
};

export const setAutoMode = value => {
  GameState.autoMode = value;
};

export const setFormations = ({ home, away }) => {
  if (home) GameState.formations.home = home;
  if (away) GameState.formations.away = away;
};

