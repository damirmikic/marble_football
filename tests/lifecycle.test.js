const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launch, openGame } = require('./helpers');

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

test('betting windows: pre-match -> in-play after a goal -> halftime -> second half', async () => {
    const page = await openGame(browser, { freeze: false });
    // Above 1x the goal celebration is skipped, keeping the test quick
    await page.evaluate(() => { document.getElementById('gameSpeed').value = 2; updateGameSpeed(); });

    assert.equal(await page.evaluate(() => bettingPhase), 'prematch');
    await page.evaluate(() => { bettingTimeLeft = 1; });
    await page.waitForFunction(() => gameRunning && !bettingWindowOpen, null, { timeout: 5000 });

    // Score a goal: an in-play window opens at the new score
    await page.evaluate(() => { ball.x = SCREEN_WIDTH - 5; ball.y = SCREEN_HEIGHT / 2; ball.vx = 10; ball.vy = 0; });
    await page.waitForFunction(() => bettingWindowOpen, null, { timeout: 5000 });
    assert.deepEqual(await page.evaluate(() => [bettingPhase, score.red, gameHalf]), ['inplay', 1, 1]);

    // Closing it restarts play in the same half
    await page.evaluate(() => { bettingTimeLeft = 1; });
    await page.waitForFunction(() => gameRunning, null, { timeout: 5000 });
    assert.equal(await page.evaluate(() => gameHalf), 1);

    // Jump to the end of the first half
    await page.evaluate(() => { injuryTimeStarted = true; injuryTime.first = 1; timer = halftimeSeconds + 0.99; });
    await page.waitForFunction(() => bettingWindowOpen && bettingPhase === 'halftime', null, { timeout: 5000 });
    assert.ok(await page.evaluate(() => document.querySelector(oddsSelector('fh-goals', 'over-0.5')).disabled),
        'first-half markets close at halftime');

    await page.evaluate(() => { bettingTimeLeft = 1; });
    await page.waitForFunction(() => gameRunning && gameHalf === 2, null, { timeout: 5000 });
    assert.deepEqual(page.errors, []);
    await page.close();
});

test('pending stakes are refunded on reload; stats from an old model are ignored', async () => {
    const page = await openGame(browser);
    await page.evaluate(() => {
        userBalance = 500;
        activeBets = [{ id: 1, matchNumber: 1, market: '1x2', outcome: 'draw', selection: 'Draw', marketName: 'Match Winner',
            odds: 3, stake: 50, potentialReturn: 150, status: 'pending', timestamp: new Date() }];
        saveState();
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        saved.stats = { ...saved.stats, modelVersion: historicalStats.modelVersion - 1, avgHomeGoals: 99 };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    });
    await page.reload();
    await page.waitForFunction(() => typeof userBalance !== 'undefined' && document.getElementById('userBalance'));
    const r = await page.evaluate(() => ({ balance: userBalance, avgHome: historicalStats.avgHomeGoals }));
    assert.equal(r.balance, 550);
    assert.notEqual(r.avgHome, 99);
    await page.evaluate(() => localStorage.clear());
    await page.close();
});

test('both teams line up mirrored: defenders nearest their own goal', async () => {
    const page = await openGame(browser);
    const r = await page.evaluate(() => {
        currentMatch.homeFormation = '4-3-3'; currentMatch.awayFormation = '4-3-3';
        resetToCenter();
        const avgX = (team, role) => {
            const xs = players.filter(p => p.team === team && p.role === role).map(p => p.x);
            return xs.reduce((a, b) => a + b, 0) / xs.length;
        };
        return {
            red: [avgX('red', 'defender'), avgX('red', 'forward')],
            blue: [avgX('blue', 'defender'), avgX('blue', 'forward')],
            mirrored: Math.abs(avgX('red', 'defender') - (SCREEN_WIDTH - avgX('blue', 'defender'))) < 1e-6,
            ownHalves: players.filter(p => !p.isGoalkeeper).every(p => p.team === 'red' ? p.x < SCREEN_WIDTH / 2 : p.x > SCREEN_WIDTH / 2)
        };
    });
    assert.ok(r.red[0] < r.red[1], 'red defenders behind red forwards');
    assert.ok(r.blue[0] > r.blue[1], 'blue defenders behind blue forwards');
    assert.ok(r.mirrored && r.ownHalves);
    await page.close();
});

test('batch mode plays a series without betting windows and records CSV data', async () => {
    const page = await openGame(browser, { freeze: false });
    await page.fill('#matchCount', '2');
    await page.fill('#gameSpeed', '50');
    await page.evaluate(() => updateGameSpeed());
    await page.click('#startMatches');
    await page.waitForFunction(() => !autoMode && matchData.length === 2, null, { timeout: 60000 });
    const r = await page.evaluate(() => ({
        rows: generateCSV().trim().split('\n').length,
        consistent: matchData.every(m => m.homeGoals + m.awayGoals === m.totalGoals &&
            m.firstHalfHomeGoals + m.secondHalfHomeGoals === m.homeGoals),
        windowOpen: bettingWindowOpen
    }));
    assert.deepEqual(r, { rows: 3, consistent: true, windowOpen: false });
    assert.deepEqual(page.errors, []);
    await page.close();
});
