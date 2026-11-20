#!/usr/bin/env node
/*
 * Recalculates the betting odds model (historicalStats in script.js) by playing
 * matches with the game's real engine in a headless browser, without rendering.
 *
 *   node tools/calibrate.js [matchesPerPairing=150] [--write]
 *
 * Every formation pairing (Red formation x Blue formation) is played the same number
 * of times. Formations are picked uniformly at random in the game, so the pooled
 * results are the overall odds model, and per-pairing results give each formation an
 * attack and defence rating (a Poisson model fitted to the goals).
 *
 * --write replaces the CALIBRATED STATS and FORMATION RATINGS blocks in script.js.
 * Requires Playwright with Chromium (npm i -D playwright && npx playwright install chromium).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const PER_PAIRING = parseInt(args.find(a => /^\d+$/.test(a)) || '150', 10);
const WRITE = args.includes('--write');
const CHUNK = 250;

function serve() {
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
    const server = http.createServer((req, res) => {
        const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
        if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            res.writeHead(404); res.end(); return;
        }
        res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
    });
    return new Promise(resolve => server.listen(0, () => resolve(server)));
}

(async () => {
    const server = await serve();
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('pageerror', e => console.error('page error:', e.message));
    await page.goto(`http://localhost:${server.address().port}/index.html`);
    await page.waitForFunction(() => typeof startPlay === 'function' && ball);

    // Freeze the live game and install a headless match runner that uses the real engine
    await page.evaluate(() => {
        app.ticker.stop();
        clearInterval(bettingTimer);
        bettingWindowOpen = false;
        matchEpoch++;
        autoMode = true;
        // Goals: just count them (no popups, messages or scheduled restarts)
        handleGoal = (team) => { score[team]++; logGoal(team); gameRunning = false; };

        window.simulateMatch = (homeFormation, awayFormation) => {
            resetMatchData();
            currentMatch.homeFormation = homeFormation;
            currentMatch.awayFormation = awayFormation;
            const kickOff = () => { resetToCenter(); startPlay(); };

            for (const half of [1, 2]) {
                gameHalf = half;
                timer = half === 1 ? 0 : halftimeSeconds;
                // Same injury-time rules as updateTimer()
                const end = half === 1
                    ? halftimeSeconds + Math.floor(Math.random() * 3) + 1
                    : halftimeSeconds * 2 + Math.floor(Math.random() * 4) + 3;
                kickOff();
                // Same step order as the game loop at 1x speed
                while (timer < end) {
                    timer += CLOCK_SECONDS_PER_STEP;
                    updatePlayers(1);
                    updateBall(1);
                    if (!gameRunning) { kickOff(); continue; }
                    checkAllCollisions();
                }
            }
            gameRunning = false;
            return [currentMatch.homeGoals, currentMatch.awayGoals,
                currentMatch.firstHalfHomeGoals, currentMatch.firstHalfAwayGoals];
        };
    });

    const formationNames = await page.evaluate(() => Object.keys(formations));
    const pairings = [];
    for (const home of formationNames) for (const away of formationNames) pairings.push([home, away]);
    const MATCHES = pairings.length * PER_PAIRING;

    const results = []; // [homeGoals, awayGoals, fhHome, fhAway, homeFormation, awayFormation]
    const started = Date.now();
    for (const [home, away] of pairings) {
        for (let done = 0; done < PER_PAIRING; done += CHUNK) {
            const n = Math.min(CHUNK, PER_PAIRING - done);
            const batch = await page.evaluate(([n, h, a]) => Array.from({ length: n }, () => simulateMatch(h, a)), [n, home, away]);
            results.push(...batch.map(r => [...r, home, away]));
        }
        process.stderr.write(`\r${results.length}/${MATCHES} matches (${((Date.now() - started) / 1000).toFixed(0)}s)`);
    }
    process.stderr.write('\n');
    await browser.close();
    server.close();

    const dist = () => ({});
    const stats = {
        modelVersion: 0, homeWins: 0, draws: 0, awayWins: 0, totalMatches: results.length,
        homeGoals: dist(), awayGoals: dist(), firstHalfHome: dist(), firstHalfAway: dist(),
        avgHomeGoals: 0, avgAwayGoals: 0, avgFirstHalfHome: 0, avgFirstHalfAway: 0
    };
    const bump = (d, k) => { d[k] = (d[k] || 0) + 1; };
    for (const [h, a, fh, fa] of results) {
        if (h > a) stats.homeWins++; else if (h < a) stats.awayWins++; else stats.draws++;
        bump(stats.homeGoals, h); bump(stats.awayGoals, a);
        bump(stats.firstHalfHome, fh); bump(stats.firstHalfAway, fa);
        stats.avgHomeGoals += h; stats.avgAwayGoals += a;
        stats.avgFirstHalfHome += fh; stats.avgFirstHalfAway += fa;
    }
    for (const k of ['avgHomeGoals', 'avgAwayGoals', 'avgFirstHalfHome', 'avgFirstHalfAway']) {
        stats[k] = Math.round(stats[k] / results.length * 1000) / 1000;
    }

    const btts = results.filter(([h, a]) => h > 0 && a > 0).length / results.length;
    console.log(`Avg goals/match: ${(stats.avgHomeGoals + stats.avgAwayGoals).toFixed(2)} ` +
        `(1st half ${(stats.avgFirstHalfHome + stats.avgFirstHalfAway).toFixed(2)}), ` +
        `Red/Draw/Blue: ${stats.homeWins}/${stats.draws}/${stats.awayWins}, BTTS ${(btts * 100).toFixed(1)}%`);

    // Fit a Poisson model: E[red goals] = avgHome * attack[red] * defence[blue],
    // E[blue goals] = avgAway * attack[blue] * defence[red]. Defence < 1 concedes less.
    const attack = Object.fromEntries(formationNames.map(f => [f, 1]));
    const defence = Object.fromEntries(formationNames.map(f => [f, 1]));
    const muH = stats.avgHomeGoals, muA = stats.avgAwayGoals;
    for (let iter = 0; iter < 50; iter++) {
        for (const f of formationNames) {
            let scored = 0, expected = 0;
            for (const [h, a, , , hf, af] of results) {
                if (hf === f) { scored += h; expected += muH * defence[af]; }
                if (af === f) { scored += a; expected += muA * defence[hf]; }
            }
            attack[f] = scored / expected;
        }
        for (const f of formationNames) {
            let conceded = 0, expected = 0;
            for (const [h, a, , , hf, af] of results) {
                if (hf === f) { conceded += a; expected += muA * attack[af]; }
                if (af === f) { conceded += h; expected += muH * attack[hf]; }
            }
            defence[f] = conceded / expected;
        }
        // Keep both averaging 1 so the overall goal rate stays in avgHomeGoals/avgAwayGoals
        const mean = o => formationNames.reduce((s, f) => s + o[f], 0) / formationNames.length;
        const ma = mean(attack), md = mean(defence);
        formationNames.forEach(f => { attack[f] /= ma; defence[f] /= md; });
    }
    const round3 = x => Math.round(x * 1000) / 1000;
    // Standard error of a rating is roughly 1/sqrt(goals involved)
    const goalsPerFormation = 2 * results.length / formationNames.length * (muH + muA) / 2;
    console.log(`Formation ratings (±${(100 / Math.sqrt(goalsPerFormation)).toFixed(1)}% noise; attack >1 scores more, defence <1 concedes less):`);
    formationNames.forEach(f => console.log(`  ${f.padEnd(8)} attack ${attack[f].toFixed(3)}  defence ${defence[f].toFixed(3)}`));
    const ratingsBody = formationNames
        .map(f => `    '${f}': { attack: ${round3(attack[f])}, defence: ${round3(defence[f])} },`)
        .join('\n').replace(/,$/, '');

    const scriptPath = path.join(ROOT, 'script.js');
    const source = fs.readFileSync(scriptPath, 'utf8');
    const block = /(\/\/ BEGIN CALIBRATED STATS[^\n]*\n)([\s\S]*?)(\n\s*\/\/ END CALIBRATED STATS)/;
    const current = source.match(block);
    const version = current && /modelVersion:\s*(\d+)/.exec(current[2]);
    stats.modelVersion = (version ? parseInt(version[1], 10) : 0) + (WRITE ? 1 : 0);

    const fmt = d => '{ ' + Object.keys(d).sort((x, y) => x - y).map(k => `${k}: ${d[k]}`).join(', ') + ' }';
    const body = [
        `    modelVersion: ${stats.modelVersion}, // bump invalidates stats learned in players' browsers`,
        `    homeWins: ${stats.homeWins},`,
        `    draws: ${stats.draws},`,
        `    awayWins: ${stats.awayWins},`,
        `    totalMatches: ${stats.totalMatches},`,
        `    homeGoals: ${fmt(stats.homeGoals)},`,
        `    awayGoals: ${fmt(stats.awayGoals)},`,
        `    firstHalfHome: ${fmt(stats.firstHalfHome)},`,
        `    firstHalfAway: ${fmt(stats.firstHalfAway)},`,
        `    avgHomeGoals: ${stats.avgHomeGoals},`,
        `    avgAwayGoals: ${stats.avgAwayGoals},`,
        `    avgFirstHalfHome: ${stats.avgFirstHalfHome},`,
        `    avgFirstHalfAway: ${stats.avgFirstHalfAway}`
    ].join('\n');

    if (WRITE) {
        const ratingsBlock = /(\/\/ BEGIN FORMATION RATINGS[^\n]*\n)([\s\S]*?)(\n\s*\/\/ END FORMATION RATINGS)/;
        if (!current || !ratingsBlock.test(source)) throw new Error('Calibration markers not found in script.js');
        fs.writeFileSync(scriptPath, source.replace(block, `$1${body}$3`).replace(ratingsBlock, `$1${ratingsBody}$3`));
        console.log(`script.js updated (modelVersion ${stats.modelVersion}).`);
    } else {
        console.log(body);
    }
})().catch(err => { console.error(err); process.exit(1); });
