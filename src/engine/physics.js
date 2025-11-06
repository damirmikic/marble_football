import { SCREEN, GOAL, FIELD } from '../config/constants.js';

const goalYTop = (SCREEN.HEIGHT - GOAL.HEIGHT) / 2;
const goalYBottom = goalYTop + GOAL.HEIGHT;
const penaltyBoxYTop = (SCREEN.HEIGHT - FIELD.PENALTY_BOX_HEIGHT) / 2;
const penaltyBoxYBottom = penaltyBoxYTop + FIELD.PENALTY_BOX_HEIGHT;
const goalBoxYTop = (SCREEN.HEIGHT - FIELD.GOAL_BOX_HEIGHT) / 2;
const goalBoxYBottom = goalBoxYTop + FIELD.GOAL_BOX_HEIGHT;

export const resolveCollision = (p1, p2) => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
  const overlap = p1.radius + p2.radius - dist;
  if (overlap <= 0) return;

  const pushX = (dx / dist) * overlap * 0.5;
  const pushY = (dy / dist) * overlap * 0.5;

  p1.x += pushX;
  p1.y += pushY;
  p2.x -= pushX;
  p2.y -= pushY;

  [p1.vx, p2.vx] = [p2.vx, p1.vx];
  [p1.vy, p2.vy] = [p2.vy, p1.vy];
};

const isInLeftGoalBox = (x, y, radius) =>
  x - radius < FIELD.GOAL_BOX_WIDTH &&
  y + radius > goalBoxYTop &&
  y - radius < goalBoxYBottom;

const isInRightGoalBox = (x, y, radius) =>
  x + radius > SCREEN.WIDTH - FIELD.GOAL_BOX_WIDTH &&
  y + radius > goalBoxYTop &&
  y - radius < goalBoxYBottom;

const isInLeftPenaltyBox = (x, y, radius) =>
  x - radius < FIELD.PENALTY_BOX_WIDTH &&
  y + radius > penaltyBoxYTop &&
  y - radius < penaltyBoxYBottom;

const isInRightPenaltyBox = (x, y, radius) =>
  x + radius > SCREEN.WIDTH - FIELD.PENALTY_BOX_WIDTH &&
  y + radius > penaltyBoxYTop &&
  y - radius < penaltyBoxYBottom;

export const enforceRestrictedGoalAreas = player => {
  if (player.isGoalkeeper) return;

  const { x, y, radius } = player;

  if (isInLeftGoalBox(x, y, radius)) {
    player.x = FIELD.GOAL_BOX_WIDTH + radius + 1;
    player.vx = Math.abs(player.vx) || 0.5;
  } else if (isInLeftPenaltyBox(x, y, radius)) {
    player.x = FIELD.PENALTY_BOX_WIDTH + radius + 1;
    player.vx = Math.abs(player.vx) || 0.5;
  } else if (isInRightGoalBox(x, y, radius)) {
    player.x = SCREEN.WIDTH - FIELD.GOAL_BOX_WIDTH - radius - 1;
    player.vx = -Math.abs(player.vx) || -0.5;
  } else if (isInRightPenaltyBox(x, y, radius)) {
    player.x = SCREEN.WIDTH - FIELD.PENALTY_BOX_WIDTH - radius - 1;
    player.vx = -Math.abs(player.vx) || -0.5;
  }
};
