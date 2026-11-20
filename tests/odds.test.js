const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launch, openGame } = require('./helpers');

let browser, page;
before(async () => { browser = await launch(); page = await openGame(browser); });
after(async () => { assert.deepEqual(page.errors, []); await browser.close(); });

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('market probabilities are complete and consistent', async () => {
    const m = await page.evaluate(() => {
        const r = marketProbabilities(1.4, 1.2);
        const csSum = Object.values(r.scores).reduce((a, b) => a + b, 0);
        return { ...r, csSum };
    });
    close(m.homeWin + m.draw + m.awayWin, 1);
    close(m.csSum, 1);
    assert.ok(m.over[1.5] > m.over[2.5] && m.over[2.5] > m.over[3.5], 'over lines must decrease');
    assert.ok(m.homeWin > m.awayWin, 'higher expected goals should be favourite');
});

test('current score is carried into the probabilities', async () => {
    const m = await page.evaluate(() => marketProbabilities(0.5, 0.5, 2, 1));
    close(m.over[2.5], 1); // already 3 goals
    close(m.btts, 1);
    assert.equal(m.scores['0-0'], undefined);
    assert.ok(m.homeWin > 0.6);
});

test('odds include the 5% margin', async () => {
    const odd = await page.evaluate(() => calculateOdds(0.5));
    close(odd, 1 / (0.5 * 1.05), 1e-9);
});

test('expected goals follow the formation ratings', async () => {
    const r = await page.evaluate(() => {
        currentMatch.homeFormation = '3-4-3';
        currentMatch.awayFormation = '4-3-2-1';
        return { xg: getExpectedGoals(), red: formationRatings['3-4-3'], blue: formationRatings['4-3-2-1'], stats: historicalStats };
    });
    close(r.xg.home, r.stats.avgHomeGoals * r.red.attack * r.blue.defence);
    close(r.xg.away, r.stats.avgAwayGoals * r.blue.attack * r.red.defence);
});

test('pre-match odds differ between formation pairings', async () => {
    const [a, b] = await page.evaluate(() => [['3-4-3', '4-3-2-1'], ['4-3-2-1', '3-4-3']].map(([h, a]) => {
        currentMatch.homeFormation = h; currentMatch.awayFormation = a;
        updateBettingOdds();
        return parseFloat(document.getElementById('redWinOdd').textContent);
    }));
    assert.ok(a < b, `stronger pairing should shorten Red's price (${a} vs ${b})`);
});

test('remaining expected goals shrink as the match runs', async () => {
    const r = await page.evaluate(() => {
        score.red = 0; score.blue = 0;
        const at = (half, t, injuryKnown = false) => {
            gameHalf = half; timer = t; injuryTimeStarted = injuryKnown;
            return remainingExpectedGoals();
        };
        const full = getExpectedGoals();
        return { full, kickoff: at(1, 0), mid: at(1, 30), halftime: at(1, 48, true), late: at(2, 85), over: at(2, 100, true) };
    });
    close(r.kickoff.home, r.full.home);
    assert.ok(r.mid.home < r.kickoff.home && r.halftime.home < r.mid.home && r.late.home < r.halftime.home);
    assert.equal(r.halftime.firstHalfOpen, false);
    close(r.halftime.home, Math.max(0.01, r.full.home - r.full.fhHome));
    assert.equal(r.over.home, 0);
});

test('in-play repricing closes decided markets', async () => {
    const r = await page.evaluate(() => {
        currentMatch.homeFormation = '4-4-2'; currentMatch.awayFormation = '4-4-2';
        gameHalf = 1; timer = 20; injuryTimeStarted = false;
        score.red = 2; score.blue = 0;
        currentMatch.firstHalfHomeGoals = 2; currentMatch.firstHalfAwayGoals = 0;
        updateInPlayOdds();
        const disabled = (m, o) => document.querySelector(oddsSelector(m, o)).disabled;
        return {
            over15: disabled('total-goals', 'over-1.5'),
            over25: disabled('total-goals', 'over-2.5'),
            fhOver15: disabled('fh-goals', 'over-1.5'),
            blueCs: disabled('specials', 'blue-clean-sheet'),
            cs00: disabled('correct-score', '0-0'),
            cs20: disabled('correct-score', '2-0'),
            cs00Label: document.querySelector(oddsSelector('correct-score', '0-0')).textContent.trim().split(/\s+/)[0]
        };
    });
    assert.deepEqual(r, { over15: true, over25: false, fhOver15: true, blueCs: true, cs00: true, cs20: false, cs00Label: '0-0' });
});
