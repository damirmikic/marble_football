const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { launch, openGame } = require('./helpers');

let browser, page;
before(async () => { browser = await launch(); page = await openGame(browser); });
after(async () => { assert.deepEqual(page.errors, []); await browser.close(); });
beforeEach(async () => {
    await page.evaluate(() => {
        userBalance = 1000; activeBets = []; betHistory = [];
        score.red = 0; score.blue = 0; gameHalf = 1; timer = 0;
        currentMatch.homeFormation = '4-4-2'; currentMatch.awayFormation = '4-4-2';
        updateBettingOdds();
        bettingWindowOpen = true; unlockMarkets(); toggleBettingMarkets(true);
        clearBet();
    });
});

// Settles one bet per [market, outcome] against a final score and returns their statuses
async function settle(selections, home, away, fhHome = 0, fhAway = 0) {
    return page.evaluate(([selections, home, away, fhHome, fhAway]) => {
        activeBets = selections.map(([market, outcome], i) => ({
            id: 1000 + i, matchNumber: 99, market, outcome, selection: outcome, marketName: market,
            odds: 2, stake: 10, potentialReturn: 20, status: 'pending', timestamp: new Date()
        }));
        settleBets({
            matchNumber: 99, homeGoals: home, awayGoals: away, totalGoals: home + away,
            firstHalfGoals: fhHome + fhAway, btts: home > 0 && away > 0,
            winner: home > away ? 'red' : home < away ? 'blue' : 'draw'
        });
        return Object.fromEntries(betHistory.map(b => [`${b.market}:${b.outcome}`, b.status]));
    }, [selections, home, away, fhHome, fhAway]);
}

test('settles every market type', async () => {
    const r = await settle([
        ['1x2', 'red-win'], ['1x2', 'draw'], ['1x2', 'blue-win'],
        ['total-goals', 'over-2.5'], ['total-goals', 'under-3.5'],
        ['btts', 'yes'], ['btts', 'no'],
        ['fh-goals', 'over-0.5'], ['fh-goals', 'under-1.5'],
        ['specials', 'red-clean-sheet'], ['specials', 'blue-clean-sheet'],
        ['correct-score', '2-1'], ['correct-score', '1-1'], ['correct-score', 'other']
    ], 2, 1, 1, 0);
    assert.deepEqual(r, {
        '1x2:red-win': 'won', '1x2:draw': 'lost', '1x2:blue-win': 'lost',
        'total-goals:over-2.5': 'won', 'total-goals:under-3.5': 'won',
        'btts:yes': 'won', 'btts:no': 'lost',
        'fh-goals:over-0.5': 'won', 'fh-goals:under-1.5': 'won',
        'specials:red-clean-sheet': 'lost', 'specials:blue-clean-sheet': 'lost',
        'correct-score:2-1': 'won', 'correct-score:1-1': 'lost', 'correct-score:other': 'lost'
    });
});

test('correct score "Any other" wins on unlisted scores', async () => {
    const r = await settle([['correct-score', 'other'], ['correct-score', '3-1']], 4, 2);
    assert.deepEqual(r, { 'correct-score:other': 'won', 'correct-score:3-1': 'lost' });
});

test('settlement pays winners and only settles the given match', async () => {
    const r = await page.evaluate(() => {
        const bet = (id, matchNumber, outcome) => ({ id, matchNumber, market: '1x2', outcome, selection: outcome,
            marketName: '1x2', odds: 2.5, stake: 10, potentialReturn: 25, status: 'pending', timestamp: new Date() });
        userBalance = 980;
        activeBets = [bet(1, 5, 'red-win'), bet(2, 6, 'red-win')];
        settleBets({ matchNumber: 5, homeGoals: 1, awayGoals: 0, totalGoals: 1, firstHalfGoals: 0, btts: false, winner: 'red' });
        return { balance: userBalance, active: activeBets.map(b => b.id), history: betHistory.map(b => b.id) };
    });
    assert.deepEqual(r, { balance: 1005, active: [2], history: [1] });
});

test('placing a bet deducts the stake', async () => {
    await page.click(`button[data-market="1x2"][data-outcome="draw"]`);
    await page.fill('#betAmount', '25');
    await page.click('#placeBet');
    const r = await page.evaluate(() => ({ balance: userBalance, bets: activeBets.length }));
    assert.deepEqual(r, { balance: 975, bets: 1 });
});

test('stale odds must be confirmed before the bet is placed', async () => {
    await page.click(`button[data-market="1x2"][data-outcome="red-win"]`);
    await page.fill('#betAmount', '10');
    await page.evaluate(() => { document.querySelector(oddsSelector('1x2', 'red-win')).dataset.odd = '7.77'; });
    await page.click('#placeBet');
    assert.equal(await page.evaluate(() => activeBets.length), 0);
    assert.match(await page.textContent('#betMessage'), /Odds changed/);
    await page.click('#placeBet');
    assert.deepEqual(await page.evaluate(() => [activeBets.length, activeBets[0].odds]), [1, 7.77]);
});

test('bets are refused when the window is closed or funds are short', async () => {
    await page.click(`button[data-market="btts"][data-outcome="yes"]`);
    await page.fill('#betAmount', '5000');
    await page.click('#placeBet');
    assert.match(await page.textContent('#betMessage'), /Insufficient balance/);

    await page.evaluate(() => { bettingWindowOpen = false; });
    await page.fill('#betAmount', '10');
    await page.click('#placeBet');
    assert.match(await page.textContent('#betMessage'), /closed/);
    assert.equal(await page.evaluate(() => activeBets.length), 0);
});

test('a settled market cannot be bet on', async () => {
    await page.click(oddsSel('total-goals', 'over-1.5'));
    await page.evaluate(() => disableMarketButton(document.querySelector(oddsSelector('total-goals', 'over-1.5')), 'Settled'));
    await page.fill('#betAmount', '10');
    await page.click('#placeBet');
    assert.match(await page.textContent('#betMessage'), /no longer available/);
});
function oddsSel(m, o) { return `button[data-market="${m}"][data-outcome="${o}"]`; }

test('voiding refunds pending bets', async () => {
    const r = await page.evaluate(() => {
        userBalance = 990;
        activeBets = [{ id: 1, matchNumber: 1, market: '1x2', outcome: 'draw', selection: 'Draw', marketName: 'Match Winner',
            odds: 3, stake: 10, potentialReturn: 30, status: 'pending', timestamp: new Date() }];
        voidPendingBets('Match abandoned');
        return { balance: userBalance, status: betHistory[0].status, active: activeBets.length };
    });
    assert.deepEqual(r, { balance: 1000, status: 'void', active: 0 });
});
