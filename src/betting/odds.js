export const calculateOdds = (probability, margin = 0.05) => {
  const adjustedProb = probability * (1 + margin);
  return Math.max(1.01, 1 / Math.max(0.0001, adjustedProb));
};

export const calculateCombinedOverProbability = (homeDistribution, awayDistribution, line) => {
  const homeKeys = Object.keys(homeDistribution || {});
  const awayKeys = Object.keys(awayDistribution || {});

  if (!homeKeys.length || !awayKeys.length) {
    return 0;
  }

  const homeTotal = homeKeys.reduce((sum, key) => sum + (homeDistribution[key] || 0), 0);
  const awayTotal = awayKeys.reduce((sum, key) => sum + (awayDistribution[key] || 0), 0);

  if (!homeTotal || !awayTotal) {
    return 0;
  }

  let probability = 0;
  for (const hKey of homeKeys) {
    const homeGoals = Number(hKey);
    const homeProb = (homeDistribution[hKey] || 0) / homeTotal;
    if (!homeProb) continue;

    for (const aKey of awayKeys) {
      const awayGoals = Number(aKey);
      if (homeGoals + awayGoals <= line) continue;

      const awayProb = (awayDistribution[aKey] || 0) / awayTotal;
      if (!awayProb) continue;

      probability += homeProb * awayProb;
    }
  }

  return probability;
};
