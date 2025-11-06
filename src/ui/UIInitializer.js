import {
  initDOM,
  bindClick,
  getInputValue,
  setInputValue,
  toggleBetSlip,
  showBetMessage,
  hideBetMessage
} from './DOMController.js';
import { gameEngine } from '../engine/GameEngine.js';
import { eventBus } from '../core/EventBus.js';

const parseNumber = value => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const initUI = () => {
  initDOM();
  toggleBetSlip(false);

  bindClick('startMatches', () => {
    const matchCount = parseInt(getInputValue('matchCount'), 10) || 1;
    gameEngine.setMatchCount(matchCount);
    gameEngine.startMatch();
  });

  bindClick('testSpeed', () => {
    setInputValue('gameSpeed', 5);
  });

  bindClick('placeBet', () => {
    const amount = parseNumber(getInputValue('betAmount'));
    if (amount <= 0) {
      showBetMessage('Enter a valid stake amount.', 'error');
      return;
    }
    showBetMessage(`Bet placed: $${amount.toFixed(2)}`, 'success');
  });

  bindClick('clearBet', () => {
    setInputValue('betAmount', '');
    toggleBetSlip(false);
    hideBetMessage();
  });

  eventBus.on('goal', ({ team }) => {
    showBetMessage(`${team === 'red' ? 'Red' : 'Blue'} team just scored!`, 'info');
  });

  eventBus.on('matchEnd', ({ score }) => {
    showBetMessage(`Match ended ${score.red}-${score.blue}.`, 'info');
  });
};
