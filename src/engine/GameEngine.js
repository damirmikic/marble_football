import { SCREEN, SPEED, PLAYER, BALL, TIMER, SIMULATION } from '../config/constants.js';
import { Renderer } from './Renderer.js';
import { formations } from '../data/formations.js';
import { GameState } from '../core/GameState.js';
import {
  resetGameState,
  nextMatchState,
  updateScore,
  setHalf,
  setTimer,
  setRunning,
  setStarted,
  setAutoMode as setAutoModeState,
  setFormations as setFormationsState
} from '../core/stateManager.js';
import { scheduleTimeout, clearAllTimers, clearScheduledTimeout } from '../core/TimerManager.js';
import { eventBus } from '../core/EventBus.js';
import {
  updateTimerDisplay,
  updateScoreDisplay,
  showGoalPopup,
  hideGoalPopup,
  toggleScoreboardVisibility,
  getInputValue
} from '../ui/DOMController.js';
import { resolveCollision, enforceRestrictedGoalAreas } from './physics.js';
import { calculateFormationStrength } from './formation.js';

const HALF_TIME_MESSAGE = 'HALF TIME';
const FULL_TIME_MESSAGE = 'FULL TIME';

export class GameEngine {
  constructor() {
    this.renderer = null;
    this.players = [];
    this.ball = null;
    this.simulationMode = false;
    this.goalResetTimeout = null;
    this.loop = this.loop.bind(this);
  }

  init() {
    this.renderer = new Renderer();
    resetGameState();
    this.createEntities();
    this.renderer.app.ticker.add(this.loop);
    updateScoreDisplay(GameState.score);
    this.renderer.updateScore(GameState.score);
    updateTimerDisplay(this.formatTimerDisplay());
    eventBus.emit('bettingStart');
  }

  createEntities() {
    this.players = [];
    this.createPlayers('red', GameState.formations.home);
    this.createPlayers('blue', GameState.formations.away);
    this.createBall();
  }

  createPlayers(team, formationName) {
    const formationData = formations[formationName] || formations[SIMULATION.DEFAULT_FORMATION];
    const positions = this.expandFormationPositions(team, formationData);

    // Goalkeeper
    const goalkeeperX = team === 'red' ? PLAYER.RADIUS * 2 : SCREEN.WIDTH - PLAYER.RADIUS * 2;
    const goalkeeper = this.createPlayer({
      team,
      x: goalkeeperX,
      y: SCREEN.HEIGHT / 2,
      isGoalkeeper: true
    });
    this.players.push(goalkeeper);

    positions.forEach(position => {
      const player = this.createPlayer({
        team,
        x: position.x,
        y: position.y,
        isGoalkeeper: false
      });
      this.players.push(player);
    });
  }

  createPlayer({ team, x, y, isGoalkeeper }) {
    const radius = PLAYER.RADIUS;
    const sprite = this.renderer.createPlayerSprite({ team, radius });
    sprite.position.set(x, y);

    return {
      team,
      x,
      y,
      vx: 0,
      vy: 0,
      radius,
      isGoalkeeper,
      speed: isGoalkeeper ? SPEED.GOALKEEPER : SPEED.PLAYER_MAX,
      sprite
    };
  }

  createBall() {
    const texture = PIXI.Texture.from('https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Soccerball.svg/64px-Soccerball.svg.png'); // eslint-disable-line no-undef
    const sprite = new PIXI.Sprite(texture); // eslint-disable-line no-undef
    sprite.anchor.set(0.5);
    sprite.width = BALL.RADIUS * 2;
    sprite.height = BALL.RADIUS * 2;

    this.ball = {
      x: SCREEN.WIDTH / 2,
      y: SCREEN.HEIGHT / 2,
      vx: 0,
      vy: 0,
      radius: BALL.RADIUS,
      rotation: 0,
      sprite
    };

    this.renderer.setBallSprite(sprite);
  }

  expandFormationPositions(team, formationData) {
    if (!formationData) {
      return [];
    }
    const convert = ({ x, y }) => ({
      x: team === 'red' ? x * SCREEN.WIDTH : SCREEN.WIDTH - x * SCREEN.WIDTH,
      y: y * SCREEN.HEIGHT
    });

    const positions = [
      ...(formationData.defenders || []).map(convert),
      ...(formationData.midfielders || []).map(convert),
      ...(formationData.forwards || []).map(convert)
    ];

    return positions.slice(0, 10);
  }

  resetBall() {
    this.ball.x = SCREEN.WIDTH / 2;
    this.ball.y = SCREEN.HEIGHT / 2;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.rotation = 0;
  }

  resetPlayers() {
    this.players.forEach(player => {
      player.vx = 0;
      player.vy = 0;
    });

    // Reapply formation layout
    const homeFormation = formations[GameState.formations.home] || formations[SIMULATION.DEFAULT_FORMATION];
    const awayFormation = formations[GameState.formations.away] || formations[SIMULATION.DEFAULT_FORMATION];
    const homePositions = this.expandFormationPositions('red', homeFormation);
    const awayPositions = this.expandFormationPositions('blue', awayFormation);

    let homeIndex = 0;
    let awayIndex = 0;

    this.players.forEach(player => {
      if (player.isGoalkeeper) {
        player.x = player.team === 'red' ? PLAYER.RADIUS * 2 : SCREEN.WIDTH - PLAYER.RADIUS * 2;
        player.y = SCREEN.HEIGHT / 2;
      } else if (player.team === 'red') {
        const position = homePositions[homeIndex++];
        if (position) {
          player.x = position.x;
          player.y = position.y;
        }
      } else {
        const position = awayPositions[awayIndex++];
        if (position) {
          player.x = position.x;
          player.y = position.y;
        }
      }
    });
  }

  resetEntities() {
    this.resetBall();
    this.resetPlayers();
  }

  toggleSimulationMode(isEnabled) {
    this.simulationMode = Boolean(isEnabled);
    toggleScoreboardVisibility(!this.simulationMode);
    if (this.renderer?.app?.view) {
      this.renderer.app.view.style.display = this.simulationMode ? 'none' : 'block';
    }
  }

  loop(delta) {
    if (!this.renderer) return;

    const speedValue = parseFloat(getInputValue('gameSpeed')) || 1;
    const deltaSeconds = (delta / 60) * Math.max(0.1, speedValue);

    if (GameState.running) {
      this.advanceTimer(deltaSeconds);
    }

    this.updatePlayers(deltaSeconds);
    this.updateBall(deltaSeconds);
    this.syncGraphics();
  }

  advanceTimer(deltaSeconds) {
    GameState.timer += deltaSeconds;
    updateTimerDisplay(this.formatTimerDisplay());

    if (GameState.half === 1 && GameState.timer >= TIMER.HALF_DURATION) {
      setRunning(false);
      setHalf(2);
      setTimer(0);
      updateTimerDisplay(this.formatTimerDisplay());
      this.renderer.showMessage(HALF_TIME_MESSAGE);
      eventBus.emit('halftime', { score: { ...GameState.score } });
      eventBus.emit('bettingStart');
      scheduleTimeout(() => {
        setRunning(true);
        setTimer(0);
        updateTimerDisplay(this.formatTimerDisplay());
        eventBus.emit('bettingClose');
      }, 5000);
    } else if (GameState.half === 2 && GameState.timer >= TIMER.HALF_DURATION) {
      setRunning(false);
      setStarted(false);
      this.renderer.showMessage(`${FULL_TIME_MESSAGE}!`);
      eventBus.emit('fulltime', { score: { ...GameState.score } });
      eventBus.emit('matchEnd', { score: { ...GameState.score } });
      scheduleTimeout(() => this.prepareNextMatch(), 4000);
    }
  }

  updatePlayers(deltaSeconds) {
    this.players.forEach(player => {
      if (!GameState.running) return;
      const speed = player.speed;
      if (!player.isGoalkeeper) {
        player.vx += (Math.random() - 0.5) * 0.5;
        player.vy += (Math.random() - 0.5) * 0.5;
      } else {
        player.vy += (Math.random() - 0.5) * 0.2;
      }

      const maxSpeed = speed;
      const currentSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
      if (currentSpeed > maxSpeed) {
        const factor = maxSpeed / currentSpeed;
        player.vx *= factor;
        player.vy *= factor;
      }

      player.x += player.vx * deltaSeconds * 10;
      player.y += player.vy * deltaSeconds * 10;

      player.x = Math.max(player.radius, Math.min(SCREEN.WIDTH - player.radius, player.x));
      player.y = Math.max(player.radius, Math.min(SCREEN.HEIGHT - player.radius, player.y));

      enforceRestrictedGoalAreas(player);
    });

    for (let i = 0; i < this.players.length; i += 1) {
      for (let j = i + 1; j < this.players.length; j += 1) {
        resolveCollision(this.players[i], this.players[j]);
      }
    }
  }

  updateBall(deltaSeconds) {
    if (!this.ball) return;

    if (!GameState.running) {
      return;
    }

    this.ball.x += this.ball.vx * deltaSeconds * 10;
    this.ball.y += this.ball.vy * deltaSeconds * 10;

    this.ball.vx *= 0.99;
    this.ball.vy *= 0.99;
    this.ball.rotation += this.ball.vx * deltaSeconds;

    if (this.ball.y <= this.ball.radius) {
      this.ball.y = this.ball.radius;
      this.ball.vy = Math.abs(this.ball.vy);
    } else if (this.ball.y >= SCREEN.HEIGHT - this.ball.radius) {
      this.ball.y = SCREEN.HEIGHT - this.ball.radius;
      this.ball.vy = -Math.abs(this.ball.vy);
    }

    if (this.ball.x <= 0) {
      this.registerGoal('blue');
    } else if (this.ball.x >= SCREEN.WIDTH) {
      this.registerGoal('red');
    }

    this.players.forEach(player => {
      const dx = this.ball.x - player.x;
      const dy = this.ball.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.ball.radius + player.radius) {
        this.ball.vx = (dx / dist) * SPEED.BALL_MAX;
        this.ball.vy = (dy / dist) * SPEED.BALL_MAX;
      }
    });
  }

  registerGoal(team) {
    if (GameState.running) {
      updateScore(team, GameState.score[team] + 1);
      updateScoreDisplay(GameState.score);
      this.renderer.updateScore(GameState.score);
      this.renderer.showMessage(`${team.toUpperCase()} GOAL!`);
      showGoalPopup({
        team,
        message: `${team === 'red' ? 'Red' : 'Blue'} team scores!`,
        scoreText: `Red ${GameState.score.red} - ${GameState.score.blue} Blue`
      });
      if (this.goalResetTimeout) {
        clearScheduledTimeout(this.goalResetTimeout);
      }
      this.goalResetTimeout = scheduleTimeout(() => {
        hideGoalPopup();
        this.resetEntities();
      }, 2500);
      eventBus.emit('goal', { team, score: { ...GameState.score } });
    }
  }

  syncGraphics() {
    this.players.forEach(player => {
      this.renderer.updatePlayerSprite(player.sprite, player);
    });
    if (this.ball) {
      this.renderer.updateBallSprite(this.ball);
    }
  }

  startMatch() {
    if (!this.renderer) return;
    if (!GameState.started) {
      setStarted(true);
      setRunning(true);
      setTimer(0);
      eventBus.emit('bettingClose');
      this.kickOff();
    } else {
      setRunning(true);
    }
  }

  kickOff() {
    const homeFormation = formations[GameState.formations.home] || formations[SIMULATION.DEFAULT_FORMATION];
    const awayFormation = formations[GameState.formations.away] || formations[SIMULATION.DEFAULT_FORMATION];
    const homeAttack = calculateFormationStrength(homeFormation, 'attack');
    const awayAttack = calculateFormationStrength(awayFormation, 'attack');
    const homeDefense = calculateFormationStrength(homeFormation, 'defense');
    const awayDefense = calculateFormationStrength(awayFormation, 'defense');

    const redAdvantage = homeAttack / Math.max(1, awayDefense);
    const blueAdvantage = awayAttack / Math.max(1, homeDefense);

    this.ball.vx = (redAdvantage - blueAdvantage) * 0.5;
    this.ball.vy = (Math.random() - 0.5) * 2;
  }

  pauseMatch() {
    setRunning(false);
  }

  prepareNextMatch() {
    nextMatchState();
    this.resetEntities();
    setTimer(0);
    setHalf(1);
    updateTimerDisplay(this.formatTimerDisplay());
    updateScoreDisplay(GameState.score);
    this.renderer.updateScore(GameState.score);
    eventBus.emit('bettingStart');
  }

  setMatchCount(count) {
    GameState.match.total = Math.max(1, Number.parseInt(count, 10) || SIMULATION.DEFAULT_MATCH_TOTAL);
  }

  setAutoMode(enabled) {
  setAutoModeState(enabled);
  }

  setFormations(home, away) {
    setFormationsState({ home, away });
    this.resetPlayers();
  }

  formatTimerDisplay() {
    const minutes = Math.floor(GameState.timer);
    const seconds = Math.floor((GameState.timer % 1) * 60);
    return `Half: ${GameState.half} - ${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  cleanupGameObjects() {
    clearAllTimers();
    if (this.goalResetTimeout) {
      clearScheduledTimeout(this.goalResetTimeout);
      this.goalResetTimeout = null;
    }
    if (this.renderer) {
      this.renderer.destroy();
    }
  }
}

export const gameEngine = new GameEngine();
