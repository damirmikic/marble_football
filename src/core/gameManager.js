import { gameEngine } from '../engine/GameEngine.js';
import { betManager } from '../betting/BetManager.js';

export const initGame = () => {
  gameEngine.init();
  return { engine: gameEngine, betting: betManager };
};

export const cleanupGame = () => {
  gameEngine.cleanupGameObjects();
};
