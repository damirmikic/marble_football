import { SCREEN, GOAL } from '../config/constants.js';
import { attachCanvas } from '../ui/DOMController.js';

const FIELD_COLOR = 0x0a7f33;
const LINE_COLOR = 0xffffff;

export class Renderer {
  constructor() {
    this.app = new PIXI.Application({ // eslint-disable-line no-undef
      width: SCREEN.WIDTH + GOAL.DEPTH * 2,
      height: SCREEN.HEIGHT,
      backgroundColor: FIELD_COLOR,
      antialias: true
    });
    this.app.stage.x = GOAL.DEPTH;

    this.fieldLayer = new PIXI.Container(); // eslint-disable-line no-undef
    this.entitiesLayer = new PIXI.Container(); // eslint-disable-line no-undef
    this.hudLayer = new PIXI.Container(); // eslint-disable-line no-undef

    this.app.stage.addChild(this.fieldLayer);
    this.app.stage.addChild(this.entitiesLayer);
    this.app.stage.addChild(this.hudLayer);

    this.scoreText = new PIXI.Text('Red 0 - 0 Blue', { // eslint-disable-line no-undef
      fontFamily: 'Arial',
      fontSize: 18,
      fill: 0xffffff,
      align: 'center'
    });
    this.scoreText.anchor.set(0.5, 0);
    this.scoreText.position.set(SCREEN.WIDTH / 2, 10);
    this.hudLayer.addChild(this.scoreText);

    this.messageText = new PIXI.Text('', { // eslint-disable-line no-undef
      fontFamily: 'Arial Black',
      fontSize: 24,
      fill: 0xffd700,
      align: 'center',
      stroke: 0x000000,
      strokeThickness: 4
    });
    this.messageText.anchor.set(0.5);
    this.messageText.position.set(SCREEN.WIDTH / 2, SCREEN.HEIGHT / 2);
    this.messageText.visible = false;
    this.hudLayer.addChild(this.messageText);

    this.ballSprite = null;
    this.playerSprites = new Set();

    this.drawField();
    attachCanvas(this.app.view);
  }

  drawField() {
    const graphics = new PIXI.Graphics(); // eslint-disable-line no-undef
    graphics.lineStyle(2, LINE_COLOR);

    graphics.drawRect(0, 0, SCREEN.WIDTH, SCREEN.HEIGHT);
    graphics.moveTo(SCREEN.WIDTH / 2, 0);
    graphics.lineTo(SCREEN.WIDTH / 2, SCREEN.HEIGHT);
    graphics.drawCircle(SCREEN.WIDTH / 2, SCREEN.HEIGHT / 2, 60);

    const goalYTop = (SCREEN.HEIGHT - GOAL.HEIGHT) / 2;
    graphics.drawRect(-GOAL.DEPTH, goalYTop, GOAL.DEPTH, GOAL.HEIGHT);
    graphics.drawRect(SCREEN.WIDTH, goalYTop, GOAL.DEPTH, GOAL.HEIGHT);

    this.fieldLayer.addChild(graphics);
  }

  createPlayerSprite({ team, radius }) {
    const sprite = new PIXI.Graphics(); // eslint-disable-line no-undef
    const color = team === 'red' ? 0xff3b30 : 0x0a84ff;
    sprite.beginFill(color);
    sprite.drawCircle(0, 0, radius);
    sprite.endFill();
    sprite.cacheAsBitmap = true;
    this.entitiesLayer.addChild(sprite);
    this.playerSprites.add(sprite);
    return sprite;
  }

  removePlayerSprite(sprite) {
    if (!sprite) return;
    this.entitiesLayer.removeChild(sprite);
    this.playerSprites.delete(sprite);
    sprite.destroy();
  }

  setBallSprite(sprite) {
    if (this.ballSprite) {
      this.entitiesLayer.removeChild(this.ballSprite);
      this.ballSprite.destroy();
    }
    this.ballSprite = sprite;
    this.entitiesLayer.addChild(sprite);
  }

  updatePlayerSprite(sprite, { x, y }) {
    if (!sprite) return;
    sprite.position.set(x, y);
  }

  updateBallSprite({ x, y, rotation = 0 }) {
    if (!this.ballSprite) return;
    this.ballSprite.position.set(x, y);
    this.ballSprite.rotation = rotation;
  }

  updateScore(score) {
    this.scoreText.text = `Red ${score.red} - ${score.blue} Blue`;
  }

  showMessage(text, duration = 2000) {
    this.messageText.text = text;
    this.messageText.visible = true;
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    this.messageTimeout = setTimeout(() => {
      this.messageText.visible = false;
    }, duration);
  }

  destroy() {
    this.playerSprites.forEach(sprite => this.removePlayerSprite(sprite));
    if (this.ballSprite) {
      this.ballSprite.destroy();
      this.ballSprite = null;
    }
    this.app.destroy(true, { children: true });
  }
}
