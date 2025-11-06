import { eventBus } from '../core/EventBus.js';
import {
  setBettingStatus,
  setBettingTimer,
  toggleBettingTimerVisibility,
  toggleBettingMarkets,
  showBetMessage,
  hideBetMessage,
  updateOddsValue,
  highlightOdds,
  setButtonOddsValue
} from '../ui/DOMController.js';
import { scheduleInterval, clearScheduledInterval } from '../core/TimerManager.js';
import { historicalStats } from '../data/historicalStats.js';
import { calculateOdds, calculateCombinedOverProbability } from './odds.js';

const STATUS = {
  OPEN: { statusClass: 'open', text: 'Betting Open' },
  CLOSED: { statusClass: 'closed', text: 'Betting Closed' }
};

export class BetManager {
  constructor() {
    this.secondsRemaining = 0;
    this.intervalId = null;

    eventBus.on('bettingStart', () => this.startWindow());
    eventBus.on('bettingClose', () => this.closeWindow());
    eventBus.on('halftime', ({ score }) => this.handleHalftime(score));
    eventBus.on('fulltime', ({ score }) => this.handleFulltime(score));
    eventBus.on('goal', ({ team, score }) => this.handleGoal(team, score));

    this.updateOdds();
  }

  startWindow(seconds = 20) {
    this.secondsRemaining = seconds;
    this.updateOdds();
    toggleBettingMarkets(true);
    toggleBettingTimerVisibility(true);
    hideBetMessage();
    setBettingStatus(STATUS.OPEN);
    setBettingTimer(this.secondsRemaining);
    this.clearTimer();
    this.intervalId = scheduleInterval(() => {
      this.secondsRemaining -= 1;
      if (this.secondsRemaining <= 0) {
        this.closeWindow();
      } else {
        setBettingTimer(this.secondsRemaining);
      }
    }, 1000);
  }

  closeWindow() {
    this.clearTimer();
    toggleBettingMarkets(false);
    toggleBettingTimerVisibility(false);
    setBettingStatus(STATUS.CLOSED);
    setBettingTimer(0);
  }

  updateOdds() {
    const stats = historicalStats;
    const total = stats.totalMatches;

    const homeWinProb = stats.homeWins / total;
    const drawProb = stats.draws / total;
    const awayWinProb = stats.awayWins / total;

    this.setOdd('#redWinOdd', 'button[data-outcome="red-win"] .odds-value', homeWinProb);
    this.setOdd('#drawOdd', 'button[data-outcome="draw"] .odds-value', drawProb);
    this.setOdd('#blueWinOdd', 'button[data-outcome="blue-win"] .odds-value', awayWinProb);

    const fullTimeGoalLines = [
      { line: 1.5, key: '1.5', overSelector: '#over15Odd', underSelector: '#under15Odd' },
      { line: 2.5, key: '2.5', overSelector: '#over25Odd', underSelector: '#under25Odd' },
      { line: 3.5, key: '3.5', overSelector: '#over35Odd', underSelector: '#under35Odd' }
    ];

    fullTimeGoalLines.forEach(cfg => {
      const overProb = calculateCombinedOverProbability(stats.homeGoals, stats.awayGoals, cfg.line);
      const underProb = Math.max(0, Math.min(1, 1 - overProb));
      this.setOdd(cfg.overSelector, `button[data-market="total-goals"][data-outcome="over-${cfg.key}"] .odds-value`, overProb);
      this.setOdd(cfg.underSelector, `button[data-market="total-goals"][data-outcome="under-${cfg.key}"] .odds-value`, underProb);
    });
  }

  setOdd(displaySelector, buttonSelector, probability) {
    const odd = calculateOdds(probability);
    updateOddsValue(displaySelector, odd);
    setButtonOddsValue(buttonSelector, odd);
  }

  settle(matchResult) {
    const { score } = matchResult;
    const resultText = `Final score: Red ${score.red} - ${score.blue} Blue`;
    showBetMessage(resultText, 'success');
  }

  handleHalftime(score) {
    this.startWindow(15);
    showBetMessage(`Halftime - Red ${score.red} : ${score.blue} Blue`, 'info');
  }

  handleFulltime(score) {
    this.closeWindow();
    this.settle({ score });
  }

  handleGoal(team, score) {
    highlightOdds('.odds-btn');
    showBetMessage(`${team === 'red' ? 'Red' : 'Blue'} score!`, 'info');
    this.updateOdds();
  }

  clearTimer() {
    if (this.intervalId) {
      clearScheduledInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const betManager = new BetManager();
