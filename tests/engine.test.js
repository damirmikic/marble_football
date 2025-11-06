import { describe, it, expect } from 'vitest';
import { calculateOdds, calculateCombinedOverProbability } from '../src/betting/odds.js';
import { resolveCollision, enforceRestrictedGoalAreas } from '../src/engine/physics.js';
import { SCREEN, FIELD } from '../src/config/constants.js';

describe('betting odds helpers', () => {
  it('calculates decimal odds with margin', () => {
    const odd = calculateOdds(0.5, 0.05);
    expect(odd).toBeGreaterThan(1.9);
    expect(odd).toBeLessThan(1.92);
  });

  it('guards against zero probabilities', () => {
    const odd = calculateOdds(0);
    expect(odd).toBe(1.01);
  });

  it('combines goal distributions over a line', () => {
    const home = { 0: 1, 2: 1 };
    const away = { 0: 1, 1: 1 };
    const probability = calculateCombinedOverProbability(home, away, 2.5);
    // Only the (2,1) combination exceeds 2.5
    expect(probability).toBeCloseTo(0.25, 5);
  });
});

describe('physics helpers', () => {
  it('resolves collisions by swapping velocities', () => {
    const p1 = { x: 10, y: 10, vx: 1, vy: 0, radius: 5 };
    const p2 = { x: 14, y: 10, vx: -1, vy: 0, radius: 5 };
    resolveCollision(p1, p2);
    expect(p1.vx).toBe(-1);
    expect(p2.vx).toBe(1);
    expect(Math.hypot(p1.x - p2.x, p1.y - p2.y)).toBeGreaterThanOrEqual(p1.radius + p2.radius - 0.5);
  });

  it('prevents outfield players from entering goal areas', () => {
    const player = {
      x: FIELD.GOAL_BOX_WIDTH / 2,
      y: SCREEN.HEIGHT / 2,
      vx: -2,
      vy: 0,
      radius: 5,
      isGoalkeeper: false
    };
    enforceRestrictedGoalAreas(player);
    expect(player.x).toBeGreaterThan(FIELD.GOAL_BOX_WIDTH / 2);
    expect(player.vx).toBeGreaterThan(0);
  });
});
