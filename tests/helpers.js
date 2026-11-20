// Opens the game in a headless browser. Repo files are served straight from disk via
// request interception, so no web server is needed.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');

async function launch() {
    return chromium.launch();
}

/**
 * Loads index.html in a fresh page. With { freeze: true } the live game loop and the
 * opening betting window are stopped so tests can drive state directly.
 */
async function openGame(browser, { freeze = true } = {}) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('http://game.test/**', route => {
        const file = path.join(ROOT, decodeURIComponent(new URL(route.request().url()).pathname));
        if (!file.startsWith(ROOT) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
        return route.fulfill({ path: file });
    });
    await page.goto('http://game.test/index.html');
    await page.waitForFunction(() => typeof startPlay === 'function' && ball && typeof bettingWindowOpen !== 'undefined');
    if (freeze) {
        await page.evaluate(() => {
            app.ticker.stop();
            clearInterval(bettingTimer);
            bettingTimer = null;
            matchEpoch++; // cancel anything scheduled
        });
    }
    page.errors = errors;
    return page;
}

module.exports = { launch, openGame };
