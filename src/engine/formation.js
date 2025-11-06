export const calculateFormationStrength = (formationData, type) => {
  if (!formationData) {
    return 1;
  }

  const { defenders = [], midfielders = [], forwards = [] } = formationData;
  let strength = 0;

  if (type === 'attack') {
    strength += forwards.length;
    midfielders.forEach(player => {
      if (player.y > 0.5) {
        strength += 0.5;
      }
    });
  } else if (type === 'defense') {
    strength += defenders.length;
    midfielders.forEach(player => {
      if (player.y < 0.5) {
        strength += 0.5;
      }
    });
  } else {
    throw new Error(`Unknown formation strength type: ${type}`);
  }

  return Math.max(strength, 1);
};
