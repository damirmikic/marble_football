/* --- 1. SETUP --- */

// Get UI elements
const timerDisplay = document.getElementById('timer');
const scoreDisplay = document.getElementById('score');
const goalPopup = document.getElementById('goalPopup');
const goalVideo = document.getElementById('goalVideo');
const goalVideoSource = document.getElementById('goalVideoSource');
const goalImage = document.getElementById('goalImage');
const goalText = document.getElementById('goalText');
const goalScore = document.getElementById('goalScore');

// Game constants
const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 500;
const PLAYER_RADIUS = 13;
const BALL_RADIUS = 8;
const GOAL_WIDTH = 10;
const GOAL_HEIGHT = 100;
const GOAL_DEPTH = 16;
const CANVAS_WIDTH = SCREEN_WIDTH + GOAL_DEPTH * 2;
const MAX_PLAYER_SPEED = 8.5;
const GOALKEEPER_SPEED = 2.2;      // Keeper's top speed along the goal line
const KEEPER_REACTION = 0.04;      // How quickly a keeper changes velocity (0-1 per step); lower = slower to react
const KEEPER_ANTICIPATION = 3;     // Steps ahead the keeper predicts the ball's y when it's coming at goal
const MAX_BALL_SPEED = 12.5;

// Field dimensions
const PENALTY_BOX_WIDTH = 80; // 16-yard box width
const PENALTY_BOX_HEIGHT = 200; // 16-yard box height
const GOAL_BOX_WIDTH = 30; // 6-yard box width
const GOAL_BOX_HEIGHT = 120; // 6-yard box height

// Game state
let score = { red: 0, blue: 0 };
let gameHalf = 1;
let halftimeSeconds = 45; // 45 seconds for testing (change to 45*60 for real game)
let timer = 0; // Start at 0:00
let gameRunning = false; // Start paused for initial setup
let gameStarted = false;
let injuryTime = { first: 0, second: 0 };
let injuryTimeStarted = false;
let matchTransitioning = false; // Prevent overlapping match transitions

// Simulation mode variables
let simulationMode = false;
let renderingEnabled = true;

// Game speed multiplier (1 = normal). Read from the speed input once per change, not every frame.
let gameSpeed = 1.0;

// Incremented whenever a match is (re)started. Delayed callbacks scheduled for an
// older match check this and do nothing, so stale timeouts can't kick off play
// in the middle of a new match's betting window.
let matchEpoch = 0;
// In batch simulation, fixed pauses (kick-off, half time, after goals) shrink with game speed
function pause(ms) {
    return autoMode ? Math.max(30, ms / gameSpeed) : ms;
}

function scheduleForMatch(fn, ms) {
    const epoch = matchEpoch;
    return setTimeout(() => {
        if (epoch === matchEpoch) fn();
    }, ms);
}

// Match logging system
let matchData = [];
let currentMatch = {
    matchNumber: 1,
    homeTeam: 'Red',
    awayTeam: 'Blue',
    homeGoals: 0,
    awayGoals: 0,
    firstHalfHomeGoals: 0,
    firstHalfAwayGoals: 0,
    secondHalfHomeGoals: 0,
    secondHalfAwayGoals: 0,
    ownGoals: 0,
    result: '', // 'Home Win', 'Away Win', 'Draw'
    totalGoals: 0,
    goalTimes: [], // Array to store goal minutes
    homeFormation: '',
    awayFormation: ''
};
let totalMatches = 1;
let currentMatchNumber = 1;
let autoMode = false;

// Formation definitions
const formations = {
    '4-4-2': {
        defenders: [
            { x: 0.15, y: 0.2 }, { x: 0.15, y: 0.4 },
            { x: 0.15, y: 0.6 }, { x: 0.15, y: 0.8 }
        ],
        midfielders: [
            { x: 0.35, y: 0.2 }, { x: 0.35, y: 0.4 },
            { x: 0.35, y: 0.6 }, { x: 0.35, y: 0.8 }
        ],
        forwards: [
            { x: 0.55, y: 0.35 }, { x: 0.55, y: 0.65 }
        ]
    },
    '3-5-2': {
        defenders: [
            { x: 0.15, y: 0.3 }, { x: 0.15, y: 0.5 }, { x: 0.15, y: 0.7 }
        ],
        midfielders: [
            { x: 0.25, y: 0.15 }, { x: 0.35, y: 0.35 }, { x: 0.35, y: 0.5 },
            { x: 0.35, y: 0.65 }, { x: 0.25, y: 0.85 }
        ],
        forwards: [
            { x: 0.55, y: 0.4 }, { x: 0.55, y: 0.6 }
        ]
    },
    '4-3-3': {
        defenders: [
            { x: 0.15, y: 0.2 }, { x: 0.15, y: 0.4 },
            { x: 0.15, y: 0.6 }, { x: 0.15, y: 0.8 }
        ],
        midfielders: [
            { x: 0.35, y: 0.3 }, { x: 0.35, y: 0.5 }, { x: 0.35, y: 0.7 }
        ],
        forwards: [
            { x: 0.55, y: 0.25 }, { x: 0.55, y: 0.5 }, { x: 0.55, y: 0.75 }
        ]
    },
    '4-3-2-1': {
        defenders: [
            { x: 0.15, y: 0.2 }, { x: 0.15, y: 0.4 },
            { x: 0.15, y: 0.6 }, { x: 0.15, y: 0.8 }
        ],
        midfielders: [
            { x: 0.35, y: 0.3 }, { x: 0.35, y: 0.5 }, { x: 0.35, y: 0.7 }
        ],
        forwards: [
            { x: 0.5, y: 0.4 }, { x: 0.5, y: 0.6 }, { x: 0.65, y: 0.5 }
        ]
    },
    '4-2-3-1': {
        defenders: [
            { x: 0.15, y: 0.2 }, { x: 0.15, y: 0.4 },
            { x: 0.15, y: 0.6 }, { x: 0.15, y: 0.8 }
        ],
        midfielders: [
            { x: 0.3, y: 0.35 }, { x: 0.3, y: 0.65 }
        ],
        forwards: [
            { x: 0.45, y: 0.25 }, { x: 0.45, y: 0.5 },
            { x: 0.45, y: 0.75 }, { x: 0.6, y: 0.5 }
        ]
    },
    '3-4-3': {
        defenders: [
            { x: 0.15, y: 0.3 }, { x: 0.15, y: 0.5 }, { x: 0.15, y: 0.7 }
        ],
        midfielders: [
            { x: 0.35, y: 0.2 }, { x: 0.35, y: 0.4 },
            { x: 0.35, y: 0.6 }, { x: 0.35, y: 0.8 }
        ],
        forwards: [
            { x: 0.55, y: 0.25 }, { x: 0.55, y: 0.5 }, { x: 0.55, y: 0.75 }
        ]
    }
};

// Create Pixi Application
const app = new PIXI.Application({
    width: CANVAS_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 0x008000 // Field green
});

// Offset the stage so goal structures drawn behind the lines remain visible
app.stage.x = GOAL_DEPTH;

// Append canvas to the game container instead of body
function initGameCanvas() {
    const gameContainer = document.getElementById('gameCanvasContainer');
    if (gameContainer) {
        gameContainer.appendChild(app.view);
    } else {
        // Fallback to body if container not found
        document.body.appendChild(app.view);
    }
}

// Initialize canvas when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGameCanvas);
} else {
    initGameCanvas();
}

// Arrays for game objects
const players = [];
let ball;
let gameMessage; // For in-game messages

// Calculate goal Y positions
const goalYTop = (SCREEN_HEIGHT - GOAL_HEIGHT) / 2;
const goalYBottom = (SCREEN_HEIGHT + GOAL_HEIGHT) / 2;

// Calculate penalty box positions
const penaltyBoxYTop = (SCREEN_HEIGHT - PENALTY_BOX_HEIGHT) / 2;
const penaltyBoxYBottom = (SCREEN_HEIGHT + PENALTY_BOX_HEIGHT) / 2;

// Calculate goal box positions
const goalBoxYTop = (SCREEN_HEIGHT - GOAL_BOX_HEIGHT) / 2;
const goalBoxYBottom = (SCREEN_HEIGHT + GOAL_BOX_HEIGHT) / 2;

/* --- 2. GAME OBJECT CREATION --- */

function createField() {
    const graphics = new PIXI.Graphics();

    // Mowed-grass stripes
    const STRIPES = 16;
    const stripeWidth = SCREEN_WIDTH / STRIPES;
    for (let i = 0; i < STRIPES; i++) {
        graphics.beginFill(i % 2 === 0 ? 0x2e8b3a : 0x287a33);
        graphics.drawRect(i * stripeWidth, 0, stripeWidth, SCREEN_HEIGHT);
        graphics.endFill();
    }

    // White lines
    graphics.lineStyle(2, 0xFFFFFF, 0.9);

    // Outer boundary
    graphics.drawRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Center line
    graphics.moveTo(SCREEN_WIDTH / 2, 0);
    graphics.lineTo(SCREEN_WIDTH / 2, SCREEN_HEIGHT);

    // Center circle
    graphics.drawCircle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 50);

    // Left side penalty box (16-yard box)
    graphics.drawRect(0, penaltyBoxYTop, PENALTY_BOX_WIDTH, PENALTY_BOX_HEIGHT);

    // Right side penalty box (16-yard box)
    graphics.drawRect(SCREEN_WIDTH - PENALTY_BOX_WIDTH, penaltyBoxYTop, PENALTY_BOX_WIDTH, PENALTY_BOX_HEIGHT);

    // Left side goal box (6-yard box)
    graphics.drawRect(0, goalBoxYTop, GOAL_BOX_WIDTH, GOAL_BOX_HEIGHT);

    // Right side goal box (6-yard box)
    graphics.drawRect(SCREEN_WIDTH - GOAL_BOX_WIDTH, goalBoxYTop, GOAL_BOX_WIDTH, GOAL_BOX_HEIGHT);

    // Penalty arcs ("D") outside each penalty box
    const PENALTY_SPOT = 55;
    const ARC_RADIUS = 40;
    const arcAngle = Math.acos((PENALTY_BOX_WIDTH - PENALTY_SPOT) / ARC_RADIUS);
    graphics.moveTo(PENALTY_SPOT + ARC_RADIUS * Math.cos(-arcAngle), SCREEN_HEIGHT / 2 + ARC_RADIUS * Math.sin(-arcAngle));
    graphics.arc(PENALTY_SPOT, SCREEN_HEIGHT / 2, ARC_RADIUS, -arcAngle, arcAngle);
    graphics.moveTo(SCREEN_WIDTH - PENALTY_SPOT + ARC_RADIUS * Math.cos(Math.PI - arcAngle),
        SCREEN_HEIGHT / 2 + ARC_RADIUS * Math.sin(Math.PI - arcAngle));
    graphics.arc(SCREEN_WIDTH - PENALTY_SPOT, SCREEN_HEIGHT / 2, ARC_RADIUS, Math.PI - arcAngle, Math.PI + arcAngle);

    // Center and penalty spots
    graphics.lineStyle(0);
    graphics.beginFill(0xFFFFFF, 0.9);
    graphics.drawCircle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 3);
    graphics.drawCircle(PENALTY_SPOT, SCREEN_HEIGHT / 2, 2.5);
    graphics.drawCircle(SCREEN_WIDTH - PENALTY_SPOT, SCREEN_HEIGHT / 2, 2.5);
    graphics.endFill();

    // Goals - draw visible goal structures
    graphics.lineStyle(4, 0xFFFFFF); // Goal posts

    // Left goal (Red team defends, Blue attacks)
    // Goal posts and crossbar positioned behind the goal line
    graphics.moveTo(0, goalYTop);
    graphics.lineTo(-GOAL_DEPTH, goalYTop); // Top crossbar (behind line)
    graphics.lineTo(-GOAL_DEPTH, goalYBottom); // Back post
    graphics.lineTo(0, goalYBottom); // Return to goal line

    // Goal net pattern
    graphics.lineStyle(1, 0xDDDDDD);
    for (let i = 1; i < 4; i++) {
        const netY = goalYTop + (GOAL_HEIGHT * i / 4);
        graphics.moveTo(-GOAL_DEPTH + 1, netY);
        graphics.lineTo(-1, netY);
    }
    for (let i = 1; i < 4; i++) {
        const netX = -GOAL_DEPTH + i * (GOAL_DEPTH / 4);
        graphics.moveTo(netX, goalYTop + 1);
        graphics.lineTo(netX, goalYBottom - 1);
    }

    // Right goal (Blue team defends, Red attacks)
    graphics.lineStyle(4, 0xFFFFFF); // Goal posts
    // Goal posts and crossbar positioned behind the goal line
    graphics.moveTo(SCREEN_WIDTH, goalYTop);
    graphics.lineTo(SCREEN_WIDTH + GOAL_DEPTH, goalYTop); // Top crossbar (behind line)
    graphics.lineTo(SCREEN_WIDTH + GOAL_DEPTH, goalYBottom); // Back post
    graphics.lineTo(SCREEN_WIDTH, goalYBottom); // Return to goal line

    // Goal net pattern
    graphics.lineStyle(1, 0xDDDDDD);
    for (let i = 1; i < 4; i++) {
        const netY = goalYTop + (GOAL_HEIGHT * i / 4);
        graphics.moveTo(SCREEN_WIDTH + 1, netY);
        graphics.lineTo(SCREEN_WIDTH + GOAL_DEPTH - 1, netY);
    }
    for (let i = 1; i < 4; i++) {
        const netX = SCREEN_WIDTH + i * (GOAL_DEPTH / 4);
        graphics.moveTo(netX, goalYTop + 1);
        graphics.lineTo(netX, goalYBottom - 1);
    }

    app.stage.addChild(graphics);
}

function createGameMessage() {
    gameMessage = new PIXI.Text('', {
        fontFamily: 'Arial',
        fontSize: 36,
        fill: 0xFFFFFF,
        stroke: 0x000000,
        strokeThickness: 4,
        align: 'center'
    });
    gameMessage.anchor.set(0.5);
    gameMessage.x = SCREEN_WIDTH / 2;
    gameMessage.y = SCREEN_HEIGHT / 2;
    gameMessage.visible = false;
    app.stage.addChild(gameMessage);
}

let gameMessageTimeout = null;
function showGameMessage(text, duration = 3000) {
    if (simulationMode || !gameMessage) return; // Skip messages in simulation mode

    gameMessage.text = text;
    gameMessage.visible = true;
    // Cancel the previous hide timer so it can't cut this message short
    clearTimeout(gameMessageTimeout);
    gameMessageTimeout = setTimeout(() => {
        if (gameMessage) gameMessage.visible = false;
    }, duration);
}

const TEAM_COLORS = {
    red: { body: 0xf44336, edge: 0x9a1b12, keeper: 0xff9800, keeperEdge: 0xa85d00 },
    blue: { body: 0x2196f3, edge: 0x0d4f8a, keeper: 0x00bcd4, keeperEdge: 0x006b78 }
};

function createPlayer(team, x, y, isGoalkeeper = false) {
    const colors = TEAM_COLORS[team];
    const player = new PIXI.Graphics();

    // Soft drop shadow
    player.beginFill(0x000000, 0.25);
    player.drawEllipse(2, 4, PLAYER_RADIUS, PLAYER_RADIUS * 0.8);
    player.endFill();

    // Marble body with a darker rim
    player.lineStyle(2, isGoalkeeper ? colors.keeperEdge : colors.edge);
    player.beginFill(isGoalkeeper ? colors.keeper : colors.body);
    player.drawCircle(0, 0, PLAYER_RADIUS);
    player.endFill();

    // Glossy highlight
    player.lineStyle(0);
    player.beginFill(0xFFFFFF, 0.45);
    player.drawCircle(-4, -4, 4);
    player.endFill();
    player.beginFill(0xFFFFFF, 0.2);
    player.drawCircle(-2, -2, 8);
    player.endFill();

    player.x = x;
    player.y = y;

    // Custom properties
    player.team = team;
    player.radius = PLAYER_RADIUS;
    player.isGoalkeeper = isGoalkeeper;

    // Start stationary - will move when game starts
    player.vx = 0;
    player.vy = 0;

    players.push(player);
    app.stage.addChild(player);
}

function getRandomFormation() {
    const formationNames = Object.keys(formations);
    return formationNames[Math.floor(Math.random() * formationNames.length)];
}

function positionPlayersInFormation(team, formationName) {
    const formation = formations[formationName];
    const isRed = team === 'red';
    const fieldWidth = SCREEN_WIDTH;
    const fieldHeight = SCREEN_HEIGHT;

    let positions = [];

    // Combine all field positions
    const allPositions = [
        ...formation.defenders,
        ...formation.midfielders,
        ...formation.forwards
    ];

    // Convert relative positions to absolute coordinates
    allPositions.forEach(pos => {
        let x, y;

        if (isRed) {
            // Red team on left side - more compact and closer to center
            x = (fieldWidth * 0.15) + (pos.x * (fieldWidth * 0.3)); // Start at 15% and use 30% of field width
            y = pos.y * (fieldHeight - 120) + 60; // More vertical margin, tighter formation
        } else {
            // Blue team on right side (mirror formation) - more compact and closer to center
            x = (fieldWidth * 0.55) + (pos.x * (fieldWidth * 0.3)); // Start at 55% and use 30% of field width
            y = pos.y * (fieldHeight - 120) + 60; // More vertical margin, tighter formation
        }

        positions.push({ x, y });
    });

    return positions;
}

function createAllPlayers() {
    // Get positions for both teams (formations should already be set)
    const redPositions = positionPlayersInFormation('red', currentMatch.homeFormation || '4-4-2');
    const bluePositions = positionPlayersInFormation('blue', currentMatch.awayFormation || '4-4-2');
    // Team Red (Left side)
    // 1 Goalkeeper
    createPlayer('red', GOAL_BOX_WIDTH / 2, SCREEN_HEIGHT / 2, true);
    // 10 Field players in formation
    for (let i = 0; i < 10; i++) {
        createPlayer('red', redPositions[i].x, redPositions[i].y);
    }

    // Team Blue (Right side)
    // 1 Goalkeeper
    createPlayer('blue', SCREEN_WIDTH - GOAL_BOX_WIDTH / 2, SCREEN_HEIGHT / 2, true);
    // 10 Field players in formation
    for (let i = 0; i < 10; i++) {
        createPlayer('blue', bluePositions[i].x, bluePositions[i].y);
    }
}

function createBall() {
    // Drawn locally (no external image) so the ball always renders, even offline.
    ball = new PIXI.Container();

    const shadow = new PIXI.Graphics();
    shadow.beginFill(0x000000, 0.3);
    shadow.drawEllipse(2, 3, BALL_RADIUS, BALL_RADIUS * 0.75);
    shadow.endFill();
    ball.addChild(shadow);

    // The body rotates; the shadow stays put.
    const body = new PIXI.Graphics();
    body.lineStyle(1, 0x333333);
    body.beginFill(0xFFFFFF);
    body.drawCircle(0, 0, BALL_RADIUS);
    body.endFill();

    // Classic black pentagon patches
    const pentagon = (cx, cy, r, rot) => {
        const pts = [];
        for (let i = 0; i < 5; i++) {
            const a = rot + i * (Math.PI * 2 / 5);
            pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        return pts;
    };
    body.lineStyle(0);
    body.beginFill(0x222222);
    body.drawPolygon(pentagon(0, 0, BALL_RADIUS * 0.38, -Math.PI / 2));
    for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
        body.drawPolygon(pentagon(Math.cos(a) * BALL_RADIUS * 0.92, Math.sin(a) * BALL_RADIUS * 0.92,
            BALL_RADIUS * 0.28, a + Math.PI / 5));
    }
    body.endFill();
    ball.addChild(body);
    ball.body = body;

    // Clip edge patches to the ball outline
    const clip = new PIXI.Graphics();
    clip.beginFill(0xFFFFFF);
    clip.drawCircle(0, 0, BALL_RADIUS);
    clip.endFill();
    ball.addChild(clip);
    body.mask = clip;

    ball.radius = BALL_RADIUS;
    resetBall(); // Set initial position and velocity
    app.stage.addChild(ball);
}

function resetBall() {
    ball.x = SCREEN_WIDTH / 2;
    ball.y = SCREEN_HEIGHT / 2;
    // Start stationary - will move when game starts
    ball.vx = 0;
    ball.vy = 0;
}

function resetToCenter() {
    // Reset ball to center
    resetBall();

    // Get formation positions for both teams (with fallback)
    const homeFormation = currentMatch.homeFormation || '4-4-2';
    const awayFormation = currentMatch.awayFormation || '4-4-2';

    const redPositions = positionPlayersInFormation('red', homeFormation);
    const bluePositions = positionPlayersInFormation('blue', awayFormation);

    // Reset players to formation positions
    let redIndex = 0;
    let blueIndex = 0;

    for (const player of players) {
        player.vx = 0;
        player.vy = 0;

        if (player.isGoalkeeper) {
            if (player.team === 'red') {
                player.x = GOAL_BOX_WIDTH / 2;
                player.y = SCREEN_HEIGHT / 2;
            } else {
                player.x = SCREEN_WIDTH - GOAL_BOX_WIDTH / 2;
                player.y = SCREEN_HEIGHT / 2;
            }
        } else {
            if (player.team === 'red') {
                player.x = redPositions[redIndex].x;
                player.y = redPositions[redIndex].y;
                redIndex++;
            } else {
                player.x = bluePositions[blueIndex].x;
                player.y = bluePositions[blueIndex].y;
                blueIndex++;
            }
        }
    }
}

function startPlay() {
    if (!ball) return;

    // Kick-off ends any open betting window
    if (bettingWindowOpen) {
        closeBettingWindow({ kickOff: false });
        showBettingStatus('suspended');
        showBetMessage('Match started - betting suspended!', 'warning');
    }
    toggleBettingMarkets(false);

    // Give ball initial velocity - more vertical to prevent center scoring
    ball.vx = (Math.random() - 0.5) * 2; // Small horizontal movement
    ball.vy = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 3 + 2); // Strong vertical movement

    // Start players moving
    for (const player of players) {
        if (player.isGoalkeeper) {
            player.vy = 0; // Keepers react to the ball (see updateGoalkeeper)
            player.vx = 0;
        } else {
            player.vx = (Math.random() - 0.5) * MAX_PLAYER_SPEED;
            player.vy = (Math.random() - 0.5) * MAX_PLAYER_SPEED;
        }
    }

    gameRunning = true;
    gameStarted = true;

    // Immediately sync overlay to show markets as suspended
    syncOverlayWithGameState();
}

/* --- 3. GAME LOGIC & HELPER FUNCTIONS --- */

// Simulation mode control functions
function enableSimulationMode() {
    simulationMode = true;
    renderingEnabled = false;

    // Hide canvas during simulation
    if (app && app.view) {
        app.view.style.display = 'none';
    }

    // Hide UI elements
    document.getElementById('timer').style.display = 'none';
    document.getElementById('score').style.display = 'none';
}

function disableSimulationMode() {
    simulationMode = false;
    renderingEnabled = true;

    // Show canvas
    if (app && app.view) {
        app.view.style.display = 'block';
    }

    // Show UI elements
    document.getElementById('timer').style.display = 'block';
    document.getElementById('score').style.display = 'block';
}

let celebrationId = 0;
function showGoalCelebration(team, callback) {
    if (autoMode || simulationMode || gameSpeed !== 1.0) {
        if (callback) callback(); // Skip popups in auto/simulation mode or when speed is not 1x
        return;
    }

    // The callback must run exactly once, however the video ends (or fails),
    // and a stale celebration must never touch a newer one.
    const myCelebration = ++celebrationId;
    let finished = false;
    let safetyTimer = null;
    const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(safetyTimer);
        if (myCelebration !== celebrationId) return;
        goalVideo.onended = null;
        goalVideo.onerror = null;
        goalVideo.pause();
        goalPopup.classList.remove('show');
        goalVideo.style.display = 'block';
        goalImage.style.display = 'none';
        if (callback) callback();
    };
    const showFallback = () => {
        if (finished || myCelebration !== celebrationId) return;
        goalVideo.style.display = 'none';
        goalImage.style.display = 'block';
        clearTimeout(safetyTimer);
        safetyTimer = setTimeout(finish, 3000);
    };

    // Set team-specific styling
    goalPopup.className = 'goal-popup show ' + team + '-goal';
    goalPopup.onclick = finish; // Click anywhere to skip the celebration

    const teamName = team === 'red' ? 'RED' : 'BLUE';
    const teamColor = team === 'red' ? '#f44336' : '#2196f3';
    goalVideoSource.src = team === 'red' ? 'Video_of_Goal_Celebration_red.mp4' : 'Video_of_Goal_Celebrations_blue.mp4';
    goalImage.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
        `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">` +
        `<rect width="100%" height="100%" fill="${teamColor}" rx="16"/>` +
        `<text x="50%" y="42%" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#fff" text-anchor="middle">${teamName} TEAM</text>` +
        `<text x="50%" y="72%" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#fff" text-anchor="middle">GOAL!</text>` +
        `</svg>`);
    goalText.textContent = `${teamName} TEAM SCORES!`;

    // Update score display
    goalScore.textContent = `${score.red} - ${score.blue}`;

    goalVideo.style.display = 'block';
    goalImage.style.display = 'none';
    goalVideo.removeAttribute('loop'); // Play once
    goalVideo.currentTime = 0;
    goalVideo.load();

    goalVideo.onended = finish;
    goalVideo.onerror = showFallback;
    goalVideoSource.onerror = showFallback;
    goalVideo.play().catch(showFallback);

    // Never let a stalled video freeze the match
    safetyTimer = setTimeout(finish, 12000);
}

// Check if a position is inside the left goal box (6-yard box)
function isInLeftGoalBox(x, y, radius) {
    return x - radius < GOAL_BOX_WIDTH &&
        y + radius > goalBoxYTop &&
        y - radius < goalBoxYBottom;
}

// Check if a position is inside the right goal box (6-yard box)
function isInRightGoalBox(x, y, radius) {
    return x + radius > SCREEN_WIDTH - GOAL_BOX_WIDTH &&
        y + radius > goalBoxYTop &&
        y - radius < goalBoxYBottom;
}

// Check if a position is inside the left penalty box (16-yard box)
function isInLeftPenaltyBox(x, y, radius) {
    return x - radius < PENALTY_BOX_WIDTH &&
        y + radius > penaltyBoxYTop &&
        y - radius < penaltyBoxYBottom;
}

// Check if a position is inside the right penalty box (16-yard box)
function isInRightPenaltyBox(x, y, radius) {
    return x + radius > SCREEN_WIDTH - PENALTY_BOX_WIDTH &&
        y + radius > penaltyBoxYTop &&
        y - radius < penaltyBoxYBottom;
}

// Push field players out of restricted goal areas
function enforceRestrictedGoalAreas(player) {
    if (player.isGoalkeeper) return; // Goalkeepers can enter restricted zones

    const inLeftGoalBox = isInLeftGoalBox(player.x, player.y, player.radius);
    const inRightGoalBox = isInRightGoalBox(player.x, player.y, player.radius);
    const inLeftPenaltyBox = isInLeftPenaltyBox(player.x, player.y, player.radius);
    const inRightPenaltyBox = isInRightPenaltyBox(player.x, player.y, player.radius);

    if (inLeftGoalBox) {
        player.x = GOAL_BOX_WIDTH + player.radius + 1;
        player.vx = Math.abs(player.vx) || 0.5;
    } else if (inLeftPenaltyBox) {
        player.x = PENALTY_BOX_WIDTH + player.radius + 1;
        player.vx = Math.abs(player.vx) || 0.5;
    } else if (inRightGoalBox) {
        player.x = SCREEN_WIDTH - GOAL_BOX_WIDTH - player.radius - 1;
        player.vx = -Math.abs(player.vx) || -0.5;
    } else if (inRightPenaltyBox) {
        player.x = SCREEN_WIDTH - PENALTY_BOX_WIDTH - player.radius - 1;
        player.vx = -Math.abs(player.vx) || -0.5;
    }
}


// Seconds of match clock that pass per simulation step at 1x speed (one 60fps frame)
const CLOCK_SECONDS_PER_STEP = 16.67 / 1000;

function formatMatchClock() {
    const minutes = Math.floor(timer).toString().padStart(2, '0');
    if (injuryTimeStarted) {
        const base = gameHalf === 1 ? halftimeSeconds : halftimeSeconds * 2;
        return `${minutes}' +${Math.max(0, Math.floor(timer - base))}'`;
    }
    return `${minutes}'`;
}

function updateClockDisplays() {
    const displayText = `Half: ${gameHalf} - ${formatMatchClock()}`;
    if (timerDisplay.textContent !== displayText) {
        timerDisplay.textContent = displayText;
        const overlayTimer = document.getElementById('gameTimer');
        if (overlayTimer) overlayTimer.textContent = displayText;
    }

    // Clock in the betting panel header
    const matchTimeEl = document.getElementById('matchTime');
    if (matchTimeEl) {
        let label;
        if (!gameStarted && !gameRunning) label = gameHalf === 2 ? 'FT' : 'Pre-match';
        else if (!gameRunning && gameHalf === 1 && timer >= halftimeSeconds) label = 'HT';
        else label = formatMatchClock();
        if (matchTimeEl.textContent !== label) matchTimeEl.textContent = label;
    }
}

function updateTimer(dt) {
    if (!gameRunning) return;

    timer += CLOCK_SECONDS_PER_STEP * dt;

    if (gameHalf === 1 && timer >= halftimeSeconds && !injuryTimeStarted) {
        // Generate injury time for first half (1-3 minutes)
        injuryTime.first = Math.floor(Math.random() * 3) + 1;
        injuryTimeStarted = true;
        showGameMessage(`+${injuryTime.first} INJURY TIME`, 2000);
    } else if (gameHalf === 1 && timer >= halftimeSeconds + injuryTime.first) {
        gameRunning = false; // Stop the game
        showGameMessage("HALF TIME!", 3000);

        if (autoMode) {
            // No betting in batch simulation - go straight to the second half
            scheduleForMatch(startSecondHalf, pause(1000));
        } else {
            // Price the second half, then open a 15-second live betting window.
            // closeBettingWindow() kicks off the second half when it expires.
            updateLiveOdds();
            startBettingTimer(15);
            showBetMessage('Halftime! Place your live bets now!', 'info');
        }
    } else if (gameHalf === 2 && timer >= halftimeSeconds * 2 && !injuryTimeStarted) {
        // Generate injury time for second half (3-6 minutes)
        injuryTime.second = Math.floor(Math.random() * 4) + 3;
        injuryTimeStarted = true;
        showGameMessage(`+${injuryTime.second} INJURY TIME`, 2000);
    } else if (gameHalf === 2 && timer >= halftimeSeconds * 2 + injuryTime.second) {
        // Game Over
        gameRunning = false;
        gameStarted = false;
        finishMatch(); // Records the result and settles bets

        if (autoMode && currentMatchNumber < totalMatches) {
            scheduleForMatch(startNextMatch, pause(1000));
        } else if (autoMode) {
            showGameMessage(`ALL MATCHES COMPLETE!\n${totalMatches} matches played`, 5000);
            document.getElementById('matchProgress').textContent =
                `All ${totalMatches} matches complete. Download the CSV or start a new series.`;
            document.getElementById('startMatches').disabled = false;
            autoMode = false;
        } else {
            showGameMessage(`FULL TIME!\nRed ${score.red} - ${score.blue} Blue`, 3000);
            scheduleForMatch(startNextMatch, 4000);
        }
    }

    updateClockDisplays();
}

function startSecondHalf() {
    gameHalf = 2;
    timer = halftimeSeconds;
    injuryTimeStarted = false;
    resetToCenter();
    updateClockDisplays();
    showGameMessage("SECOND HALF!", 1000);
    scheduleForMatch(startPlay, pause(1000));
}


function updateScore() {
    const scoreHTML = `
        <span class="team-red">Red: ${score.red}</span> - 
        <span class="team-blue">Blue: ${score.blue}</span>`;

    scoreDisplay.innerHTML = scoreHTML;

    // Update overlay score as well
    const overlayScore = document.getElementById('gameScore');
    if (overlayScore) {
        overlayScore.innerHTML = scoreHTML;
    }
}

// Simple Circle-to-Circle collision detection
function checkCircleCollision(c1, c2) {
    const dx = c1.x - c2.x;
    const dy = c1.y - c2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (c1.radius + c2.radius);
}

// A more stable collision response than just reversing velocity
function resolveCollision(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Minimum distance to separate them
    const overlap = (p1.radius + p2.radius) - dist + 1; // +1 to prevent sticking

    // Push them apart
    const pushX = (dx / dist) * overlap * 0.5;
    const pushY = (dy / dist) * overlap * 0.5;

    p1.x += pushX;
    p1.y += pushY;
    p2.x -= pushX;
    p2.y -= pushY;

    // Simple velocity swap (basic physics)
    [p1.vx, p2.vx] = [p2.vx, p1.vx];
    [p1.vy, p2.vy] = [p2.vy, p1.vy];
}

function resolveBallPlayerCollision(ball, player) {
    const dx = ball.x - player.x;
    const dy = ball.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Push ball away from player
    const overlap = (ball.radius + player.radius) - dist + 1;
    ball.x += (dx / dist) * overlap;
    ball.y += (dy / dist) * overlap;

    // Ball "kicked" by player - gets significant boost from collision
    const kickPower = 2.5; // Increased kick power
    ball.vx = player.vx * kickPower + (dx / dist) * 3; // Add direction away from player
    ball.vy = player.vy * kickPower + (dy / dist) * 3;

    // Ensure minimum kick speed for more dynamic gameplay
    const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    const minKickSpeed = 2;
    if (currentSpeed < minKickSpeed) {
        const factor = minKickSpeed / currentSpeed;
        ball.vx *= factor;
        ball.vy *= factor;
    }

    // Clamp ball speed to maximum
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (speed > MAX_BALL_SPEED) {
        ball.vx = (ball.vx / speed) * MAX_BALL_SPEED;
        ball.vy = (ball.vy / speed) * MAX_BALL_SPEED;
    }
}

/* --- 4. GAME LOOP (UPDATE) FUNCTIONS --- */

// Keepers slide along their goal line towards where the ball is heading.
// They have a top speed and react with a lag, so hard, well-placed shots still beat them.
function updateGoalkeeper(keeper, dt) {
    const isRed = keeper.team === 'red';
    const ballInOwnHalf = isRed ? ball.x < SCREEN_WIDTH / 2 : ball.x > SCREEN_WIDTH / 2;
    const ballComingAtGoal = isRed ? ball.vx < 0 : ball.vx > 0;

    // Track the ball in their own half (anticipating if it's heading for goal);
    // otherwise drift back to the centre of the goal.
    let targetY = SCREEN_HEIGHT / 2;
    if (ballInOwnHalf) {
        targetY = ballComingAtGoal ? ball.y + ball.vy * KEEPER_ANTICIPATION : ball.y;
    }

    const minY = goalBoxYTop + keeper.radius;
    const maxY = goalBoxYBottom - keeper.radius;
    targetY = Math.max(minY, Math.min(maxY, targetY));

    const desiredVy = Math.max(-GOALKEEPER_SPEED, Math.min(GOALKEEPER_SPEED, (targetY - keeper.y) * 0.2));
    keeper.vy += (desiredVy - keeper.vy) * Math.min(1, KEEPER_REACTION * dt);
    keeper.y += keeper.vy * dt;

    if (keeper.y < minY) {
        keeper.y = minY;
        keeper.vy = 0;
    } else if (keeper.y > maxY) {
        keeper.y = maxY;
        keeper.vy = 0;
    }

    // Keepers stay on their line
    keeper.vx = 0;
    keeper.x = isRed ? GOAL_BOX_WIDTH / 2 : SCREEN_WIDTH - GOAL_BOX_WIDTH / 2;
}

function updatePlayers(dt = 1) {
    for (const player of players) {
        if (player.isGoalkeeper) {
            updateGoalkeeper(player, dt);
        } else {
            // Field player logic
            // Add a small random "nudge" to velocity
            player.vx += (Math.random() - 0.5) * 0.2 * dt;
            player.vy += (Math.random() - 0.5) * 0.2 * dt;

            // Clamp speed
            const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
            if (speed > MAX_PLAYER_SPEED) {
                player.vx = (player.vx / speed) * MAX_PLAYER_SPEED;
                player.vy = (player.vy / speed) * MAX_PLAYER_SPEED;
            }

            player.x += player.vx * dt;
            player.y += player.vy * dt;

            // Enforce restricted areas (no field players in the 6-yard or 16-yard boxes)
            enforceRestrictedGoalAreas(player);

            // Wall collisions (bounce)
            if (player.x < player.radius) {
                player.x = player.radius;
                player.vx *= -1;
            } else if (player.x > SCREEN_WIDTH - player.radius) {
                player.x = SCREEN_WIDTH - player.radius;
                player.vx *= -1;
            }
            if (player.y < player.radius) {
                player.y = player.radius;
                player.vy *= -1;
            } else if (player.y > SCREEN_HEIGHT - player.radius) {
                player.y = SCREEN_HEIGHT - player.radius;
                player.vy *= -1;
            }
        }
    }
}

function updateBall(dt = 1) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Apply very light friction
    const frictionRate = Math.pow(0.995, dt);
    ball.vx *= frictionRate;
    ball.vy *= frictionRate;

    // Spin the ball body in the direction of travel
    const spinFactor = 0.1;
    const spin = Math.max(-2, Math.min(2, ball.vx * spinFactor)) * dt;
    ball.body.rotation += spin;

    // Ensure ball maintains minimum movement
    const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    const minSpeed = 0.5; // Minimum speed to keep ball moving

    if (currentSpeed < minSpeed && currentSpeed > 0) {
        // Scale up velocity to maintain minimum speed
        const factor = minSpeed / currentSpeed;
        ball.vx *= factor;
        ball.vy *= factor;
    } else if (currentSpeed === 0) {
        // If ball is completely stopped, give it a random direction
        const angle = Math.random() * Math.PI * 2;
        ball.vx = Math.cos(angle) * minSpeed;
        ball.vy = Math.sin(angle) * minSpeed;
    }

    // Ball collision with top/bottom walls (sidelines)
    if (ball.y < ball.radius) {
        ball.y = ball.radius;
        ball.vy *= -1;
    } else if (ball.y > SCREEN_HEIGHT - ball.radius) {
        ball.y = SCREEN_HEIGHT - ball.radius;
        ball.vy *= -1;
    }

    // Check for GOAL
    if (ball.y > goalYTop && ball.y < goalYBottom) {
        if (ball.x < ball.radius) {
            handleGoal('blue'); // Ball crossed the left goal line
            return;
        }
        if (ball.x > SCREEN_WIDTH - ball.radius) {
            handleGoal('red'); // Ball crossed the right goal line
            return;
        }
    }

    // Ball collision with end-lines (goal lines, but not in the goal)
    if (ball.x < ball.radius) {
        ball.x = ball.radius;
        ball.vx *= -1;
    } else if (ball.x > SCREEN_WIDTH - ball.radius) {
        ball.x = SCREEN_WIDTH - ball.radius;
        ball.vx *= -1;
    }
}


function handleGoal(team) {
    score[team]++;
    logGoal(team);
    updateScore();
    gameRunning = false;
    flashGoal(team);

    const restart = () => {
        resetToCenter();
        scheduleForMatch(startPlay, pause(1000));
    };

    if (autoMode) {
        restart();
        return;
    }

    const teamName = team === 'red' ? 'Red' : 'Blue';
    showGameMessage(`GOAL!\n${teamName} Team Scores!\n${score.red} - ${score.blue}`, 2000);
    const epoch = matchEpoch;
    showGoalCelebration(team, () => {
        if (epoch === matchEpoch) restart();
    });
}

// Brief full-pitch flash in the scoring team's colour
function flashGoal(team) {
    if (simulationMode) return;
    const flash = new PIXI.Graphics();
    flash.beginFill(TEAM_COLORS[team].body, 0.35);
    flash.drawRect(-GOAL_DEPTH, 0, CANVAS_WIDTH, SCREEN_HEIGHT);
    flash.endFill();
    app.stage.addChild(flash);
    const fade = () => {
        if (flash.destroyed) {
            app.ticker.remove(fade);
            return;
        }
        flash.alpha -= 0.03 * app.ticker.deltaTime;
        if (flash.alpha <= 0) {
            app.ticker.remove(fade);
            if (flash.parent) flash.parent.removeChild(flash);
            flash.destroy();
        }
    };
    app.ticker.add(fade);
}

function checkAllCollisions() {
    // Player vs Player
    for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
            if (checkCircleCollision(players[i], players[j])) {
                resolveCollision(players[i], players[j]);
            }
        }
    }

    // Player vs Ball
    for (const player of players) {
        if (checkCircleCollision(ball, player)) {
            resolveBallPlayerCollision(ball, player);
        }
    }
}

/* --- 5. INITIALIZE AND RUN GAME --- */

// Game loop function - defined once to avoid multiple instances
let gameLoopFunction = null;

function initGame() {

    // Clean up any existing game objects first
    if (app.stage.children.length > 0) {
        cleanupGameObjects();
    }
    createField();
    createAllPlayers();
    createBall();
    createGameMessage();
    updateScore(); // Initial score display

    // Only add the game loop once
    if (!gameLoopFunction) {
        gameLoopFunction = () => {
            if (gameRunning) {
                // One step == one 60fps frame at 1x speed. Using the ticker's
                // deltaTime keeps the pace the same on 60Hz and 144Hz screens, and
                // splitting fast-forwarded frames into sub-steps stops the ball
                // tunnelling through players and posts at high speeds.
                const frameSteps = Math.min(app.ticker.deltaTime, 4) * gameSpeed;
                const subSteps = Math.max(1, Math.ceil(frameSteps));
                const dt = frameSteps / subSteps;
                for (let i = 0; i < subSteps && gameRunning; i++) {
                    updateTimer(dt);
                    if (!gameRunning) break;
                    updatePlayers(dt);
                    updateBall(dt);
                    if (!gameRunning) break;
                    checkAllCollisions();
                }
            }

            // Sync overlay with game state every frame (writes only on change)
            syncOverlayWithGameState();
        };

        app.ticker.add(gameLoopFunction);
    }

    // Initialize overlay status
    initializeOverlayStatus();

    updateClockDisplays();

    // Don't start the game immediately - the pre-match betting window kicks off play
    showGameMessage("MATCH READY!\nWaiting for bets...", 3000);
}

/* --- 6. MATCH LOGGING SYSTEM --- */

function logGoal(team) {
    const goalMinute = Math.floor(timer);
    const goalData = {
        minute: goalMinute,
        team: team,
        half: gameHalf
    };

    currentMatch.goalTimes.push(goalData);

    if (team === 'red') {
        currentMatch.homeGoals++;
        if (gameHalf === 1) {
            currentMatch.firstHalfHomeGoals++;
        } else {
            currentMatch.secondHalfHomeGoals++;
        }
    } else {
        currentMatch.awayGoals++;
        if (gameHalf === 1) {
            currentMatch.firstHalfAwayGoals++;
        } else {
            currentMatch.secondHalfAwayGoals++;
        }
    }
    currentMatch.totalGoals++;
}

function finishMatch() {
    // Determine result
    if (currentMatch.homeGoals > currentMatch.awayGoals) {
        currentMatch.result = 'Home Win';
    } else if (currentMatch.awayGoals > currentMatch.homeGoals) {
        currentMatch.result = 'Away Win';
    } else {
        currentMatch.result = 'Draw';
    }

    // Add to match data
    matchData.push({ ...currentMatch, goalTimes: [...currentMatch.goalTimes] });
    document.getElementById('downloadCSV').style.display = 'inline-block';

    // Let the odds model learn from what actually happens on this pitch
    recordMatchInStats(currentMatch);

    // Settle this match's bets right away. The match number is passed explicitly
    // so settlement can't pick up the *next* match's number if it starts quickly.
    settleBets({
        matchNumber: currentMatch.matchNumber,
        winner: currentMatch.result === 'Home Win' ? 'red' : currentMatch.result === 'Away Win' ? 'blue' : 'draw',
        homeGoals: currentMatch.homeGoals,
        awayGoals: currentMatch.awayGoals,
        totalGoals: currentMatch.totalGoals,
        firstHalfHomeGoals: currentMatch.firstHalfHomeGoals,
        firstHalfAwayGoals: currentMatch.firstHalfAwayGoals,
        firstHalfGoals: currentMatch.firstHalfHomeGoals + currentMatch.firstHalfAwayGoals,
        btts: currentMatch.homeGoals > 0 && currentMatch.awayGoals > 0,
        homeTeam: currentMatch.homeTeam,
        awayTeam: currentMatch.awayTeam
    });

    // Update progress
    if (autoMode) {
        document.getElementById('matchProgress').textContent =
            `Match ${currentMatchNumber} of ${totalMatches} completed - ${currentMatch.homeTeam} ${currentMatch.homeGoals}-${currentMatch.awayGoals} ${currentMatch.awayTeam}`;
    }
    updateClockDisplays();
}


function resetMatchData() {
    currentMatch = {
        matchNumber: currentMatchNumber,
        homeTeam: 'Red',
        awayTeam: 'Blue',
        homeGoals: 0,
        awayGoals: 0,
        firstHalfHomeGoals: 0,
        firstHalfAwayGoals: 0,
        secondHalfHomeGoals: 0,
        secondHalfAwayGoals: 0,
        ownGoals: 0,
        result: '',
        totalGoals: 0,
        goalTimes: [],
        homeFormation: '',
        awayFormation: ''
    };
    score = { red: 0, blue: 0 };
    gameHalf = 1;
    timer = 0;
    injuryTimeStarted = false;
    injuryTime = { first: 0, second: 0 };
}

function cleanupGameObjects() {
    // Remove all children from the stage
    while (app.stage.children.length > 0) {
        const child = app.stage.children[0];
        app.stage.removeChild(child);
        if (child.destroy) {
            child.destroy({ children: true });
        }
    }

    // Clear arrays
    players.length = 0;
    ball = null;
    gameMessage = null;
}

function updateFormationLabels() {
    const red = document.getElementById('redFormation');
    const blue = document.getElementById('blueFormation');
    if (red) red.textContent = currentMatch.homeFormation || '';
    if (blue) blue.textContent = currentMatch.awayFormation || '';
}

function startNextMatch() {
    if (matchTransitioning) return;
    matchTransitioning = true;

    // Invalidate any callbacks still scheduled for the previous match
    matchEpoch++;

    // Stop the current game and hide a celebration that may still be showing
    gameRunning = false;
    gameStarted = false;
    celebrationId++;
    goalPopup.classList.remove('show');
    goalVideo.pause();

    cleanupGameObjects();

    // Increment match number and reset data
    currentMatchNumber++;
    resetMatchData();

    // Set formations before creating new objects
    currentMatch.homeFormation = getRandomFormation();
    currentMatch.awayFormation = getRandomFormation();
    updateFormationLabels();

    // Recreate all game objects
    createField();
    createAllPlayers();
    createBall();
    createGameMessage();

    // Update displays
    updateScore();
    updateClockDisplays();

    // Reset odds to pre-match values for the new match
    updateBettingOdds();

    if (autoMode) {
        // Batch simulation: no betting window, kick off straight away
        if (bettingTimer) clearInterval(bettingTimer);
        bettingTimer = null;
        bettingWindowOpen = false;
        clearSelection();
        lockMarkets();
        showBettingStatus('closed');
        showGameMessage(`MATCH ${currentMatchNumber} of ${totalMatches}`, 1000);
        scheduleForMatch(startPlay, pause(1000));
    } else {
        showGameMessage("NEW MATCH!\nBetting is open...", 3000);
        startBettingTimer(20);
        showBetMessage('New match starting! Place your bets now!', 'info');
    }

    matchTransitioning = false; // Allow next transition
}

function generateCSV() {
    const headers = [
        'Match Number', 'Home Team', 'Away Team', 'Home Formation', 'Away Formation',
        'Home Goals', 'Away Goals', '1st Half Home Goals', '1st Half Away Goals',
        '2nd Half Home Goals', '2nd Half Away Goals', 'Total Goals', 'Own Goals', 'Result',
        'Goal Times (Team:Minute)', 'First Goal Minute', 'Last Goal Minute'
    ];

    let csv = headers.join(',') + '\n';

    matchData.forEach(match => {
        // Format goal times as "Team:Minute" pairs
        const goalTimesStr = match.goalTimes.map(goal =>
            `${goal.team}:${goal.minute}'`
        ).join(';');

        const firstGoalMinute = match.goalTimes.length > 0 ? match.goalTimes[0].minute : '';
        const lastGoalMinute = match.goalTimes.length > 0 ? match.goalTimes[match.goalTimes.length - 1].minute : '';

        const row = [
            match.matchNumber,
            match.homeTeam,
            match.awayTeam,
            match.homeFormation,
            match.awayFormation,
            match.homeGoals,
            match.awayGoals,
            match.firstHalfHomeGoals,
            match.firstHalfAwayGoals,
            match.secondHalfHomeGoals,
            match.secondHalfAwayGoals,
            match.totalGoals,
            match.ownGoals,
            match.result,
            `"${goalTimesStr}"`, // Quoted to handle semicolons in CSV
            firstGoalMinute,
            lastGoalMinute
        ];
        csv += row.join(',') + '\n';
    });

    return csv;
}

function downloadCSV() {
    const csv = generateCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soccer_matches_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}



// Event listeners for match simulation
document.getElementById('startMatches').addEventListener('click', () => {
    const requested = parseInt(document.getElementById('matchCount').value, 10);
    if (!Number.isFinite(requested) || requested < 1) {
        alert('Please enter a valid number of matches (1 or more)');
        return;
    }
    totalMatches = Math.min(requested, 1000);

    // Abandon the match in progress: refund its pending bets
    voidPendingBets('Match abandoned');

    matchData = [];
    currentMatchNumber = 0; // startNextMatch() increments to 1
    autoMode = totalMatches > 1;
    matchTransitioning = false;

    document.getElementById('startMatches').disabled = autoMode;
    document.getElementById('downloadCSV').style.display = 'none';
    document.getElementById('matchProgress').textContent = autoMode
        ? `Simulating ${totalMatches} matches (betting disabled)...`
        : '';

    startNextMatch();
});

document.getElementById('downloadCSV').addEventListener('click', downloadCSV);

// Game speed control
function updateGameSpeed() {
    const speedInput = document.getElementById('gameSpeed');
    const speedDisplay = document.getElementById('speedDisplay');
    if (!speedInput) return;

    const speed = parseFloat(speedInput.value) || 1.0;
    gameSpeed = Math.max(0.1, Math.min(50, speed)); // Clamp between 0.1 and 50

    if (speedDisplay) speedDisplay.textContent = `Speed: ${gameSpeed.toFixed(1)}x`;
}

function initSpeedControl() {
    const speedInput = document.getElementById('gameSpeed');
    const testButton = document.getElementById('testSpeed');
    if (!speedInput) return;

    updateGameSpeed();
    speedInput.addEventListener('input', updateGameSpeed);
    speedInput.addEventListener('change', updateGameSpeed);

    if (testButton) {
        testButton.addEventListener('click', () => {
            speedInput.value = speedInput.value === '5' ? '1' : '5';
            updateGameSpeed();
            testButton.textContent = speedInput.value === '5' ? 'Back to 1x Speed' : 'Test 5x Speed';
        });
    }
}

// Start the game when DOM is ready
function startGameWhenReady() {
    try {
        currentMatch.homeFormation = getRandomFormation();
        currentMatch.awayFormation = getRandomFormation();
        initGame();
        updateFormationLabels();
    } catch (error) {
        console.error('Error initializing game:', error);
    }
    initSpeedControl();
}

/* --- BETTING DASHBOARD FUNCTIONALITY --- */

// Historical data from 1000 simulations. Used as a prior: every match played
// on this pitch is added in (see recordMatchInStats), so the odds keep learning.
const historicalStats = {
    // BEGIN CALIBRATED STATS (generated by tools/calibrate.js --write)
    modelVersion: 2, // bump invalidates stats learned in players' browsers
    homeWins: 1889,
    draws: 1245,
    awayWins: 1866,
    totalMatches: 5000,
    homeGoals: { 0: 1202, 1: 1761, 2: 1220, 3: 590, 4: 169, 5: 48, 6: 7, 7: 2, 8: 1 },
    awayGoals: { 0: 1238, 1: 1782, 2: 1213, 3: 535, 4: 176, 5: 46, 6: 9, 7: 1 },
    firstHalfHome: { 0: 2508, 1: 1755, 2: 595, 3: 132, 4: 8, 5: 1, 7: 1 },
    firstHalfAway: { 0: 2524, 1: 1768, 2: 577, 3: 112, 4: 18, 5: 1 },
    avgHomeGoals: 1.39,
    avgAwayGoals: 1.362,
    avgFirstHalfHome: 0.677,
    avgFirstHalfAway: 0.667
    // END CALIBRATED STATS
};

function recordMatchInStats(match) {
    const stats = historicalStats;
    const n = stats.totalMatches;

    if (match.homeGoals > match.awayGoals) stats.homeWins++;
    else if (match.homeGoals < match.awayGoals) stats.awayWins++;
    else stats.draws++;

    const bump = (dist, goals) => { dist[goals] = (dist[goals] || 0) + 1; };
    bump(stats.homeGoals, match.homeGoals);
    bump(stats.awayGoals, match.awayGoals);
    bump(stats.firstHalfHome, match.firstHalfHomeGoals);
    bump(stats.firstHalfAway, match.firstHalfAwayGoals);

    const runningAvg = (avg, value) => (avg * n + value) / (n + 1);
    stats.avgHomeGoals = runningAvg(stats.avgHomeGoals, match.homeGoals);
    stats.avgAwayGoals = runningAvg(stats.avgAwayGoals, match.awayGoals);
    stats.avgFirstHalfHome = runningAvg(stats.avgFirstHalfHome, match.firstHalfHomeGoals);
    stats.avgFirstHalfAway = runningAvg(stats.avgFirstHalfAway, match.firstHalfAwayGoals);
    stats.totalMatches = n + 1;

    saveState();
}

// Calculate betting odds based on probabilities
function calculateOdds(probability, margin = 0.05) {
    // Add bookmaker margin and convert to decimal odds
    const adjustedProb = probability * (1 + margin);
    return Math.max(1.01, 1 / adjustedProb);
}

function calculateCombinedOverProbability(homeDistribution, awayDistribution, line) {
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
}

// Update betting odds display
function updateBettingOdds() {
    const stats = historicalStats;
    const total = stats.totalMatches;

    // 1X2 Market
    const homeWinProb = stats.homeWins / total;
    const drawProb = stats.draws / total;
    const awayWinProb = stats.awayWins / total;

    updateOddElement('redWinOdd', 'button[data-outcome="red-win"]', homeWinProb);
    updateOddElement('drawOdd', 'button[data-outcome="draw"]', drawProb);
    updateOddElement('blueWinOdd', 'button[data-outcome="blue-win"]', awayWinProb);

    // Total Goals Markets (Full Time)
    const fullTimeGoalLines = [
        { line: 1.5, key: '1.5', overId: 'over15Odd', underId: 'under15Odd' },
        { line: 2.5, key: '2.5', overId: 'over25Odd', underId: 'under25Odd' },
        { line: 3.5, key: '3.5', overId: 'over35Odd', underId: 'under35Odd' }
    ];

    fullTimeGoalLines.forEach(cfg => {
        const overProb = calculateCombinedOverProbability(stats.homeGoals, stats.awayGoals, cfg.line);
        const underProb = Math.max(0, Math.min(1, 1 - overProb));

        updateOddElement(cfg.overId, `button[data-market="total-goals"][data-outcome="over-${cfg.key}"]`, overProb);
        updateOddElement(cfg.underId, `button[data-market="total-goals"][data-outcome="under-${cfg.key}"]`, underProb);
    });

    // Both Teams To Score
    const homeScoreProb = 1 - (stats.homeGoals[0] / total);
    const awayScoreProb = 1 - (stats.awayGoals[0] / total);
    const bttsYesProb = homeScoreProb * awayScoreProb;
    const bttsNoProb = 1 - bttsYesProb;

    updateOddElement('bttsYesOdd', 'button[data-outcome="yes"]', bttsYesProb);
    updateOddElement('bttsNoOdd', 'button[data-outcome="no"]', bttsNoProb);

    // First Half Goals Markets
    const firstHalfGoalLines = [
        { line: 0.5, key: '0.5', overId: 'fhOver05Odd', underId: 'fhUnder05Odd' },
        { line: 1.5, key: '1.5', overId: 'fhOver15Odd', underId: 'fhUnder15Odd' },
        { line: 2.5, key: '2.5', overId: 'fhOver25Odd', underId: 'fhUnder25Odd' }
    ];

    firstHalfGoalLines.forEach(cfg => {
        const overProb = calculateCombinedOverProbability(stats.firstHalfHome, stats.firstHalfAway, cfg.line);
        const underProb = Math.max(0, Math.min(1, 1 - overProb));

        updateOddElement(cfg.overId, `button[data-market="fh-goals"][data-outcome="over-${cfg.key}"]`, overProb);
        updateOddElement(cfg.underId, `button[data-market="fh-goals"][data-outcome="under-${cfg.key}"]`, underProb);
    });

    // --- NEW: Clean Sheet Market (Pre-match) ---
    const redCleanSheetProb = stats.awayGoals[0] / total;
    const blueCleanSheetProb = stats.homeGoals[0] / total;
    updateOddElement('redCleanSheetOdd', 'button[data-outcome="red-clean-sheet"]', redCleanSheetProb);
    updateOddElement('blueCleanSheetOdd', 'button[data-outcome="blue-clean-sheet"]', blueCleanSheetProb);


}

/* --- BETTING STATE & PERSISTENCE --- */

const STARTING_BALANCE = 1000;
const STORAGE_KEY = 'marbleFootball.v1';
const MAX_SAVED_HISTORY = 100;

let userBalance = STARTING_BALANCE;
let activeBets = [];
let betHistory = []; // Settled bets, newest first
let currentBet = null;
let marketsLocked = false;
let bettingTimer = null;
let bettingTimeLeft = 0;
let bettingWindowOpen = true;
let nextBetId = 1;

function saveState() {
    try {
        // Pending stakes are saved as balance, so closing the page mid-match refunds them
        const pendingStakes = activeBets
            .filter(bet => bet.status === 'pending')
            .reduce((sum, bet) => sum + bet.stake, 0);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            balance: Math.round((userBalance + pendingStakes) * 100) / 100,
            betHistory: betHistory.slice(0, MAX_SAVED_HISTORY),
            stats: historicalStats
        }));
    } catch (e) {
        // Storage unavailable (private mode, blocked) - play on without saving
    }
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (typeof data.balance === 'number' && Number.isFinite(data.balance) && data.balance >= 0) {
            userBalance = data.balance;
        }
        if (Array.isArray(data.betHistory)) {
            betHistory = data.betHistory;
        }
        const stats = data.stats;
        // Ignore stats learned under an older engine/odds model
        if (stats && stats.modelVersion === historicalStats.modelVersion &&
            stats.totalMatches >= historicalStats.totalMatches &&
            stats.homeGoals && stats.awayGoals && stats.firstHalfHome && stats.firstHalfAway) {
            Object.assign(historicalStats, stats);
        }
    } catch (e) {
        // Corrupt or inaccessible storage - start fresh
    }
}

function resetAccount() {
    const pending = activeBets.some(bet => bet.status === 'pending');
    const message = pending
        ? `Reset balance to $${STARTING_BALANCE} and clear bet history? Pending bets will be cancelled.`
        : `Reset balance to $${STARTING_BALANCE} and clear bet history?`;
    if (!confirm(message)) return;
    activeBets = [];
    betHistory = [];
    userBalance = STARTING_BALANCE;
    updateActiveBets();
    updateBetHistory();
    updateBalanceDisplay();
    saveState();
    showBetMessage(`Balance reset to $${STARTING_BALANCE}.`, 'info');
}

// Update balance display and the running profit/loss summary
function updateBalanceDisplay() {
    const balanceElement = document.getElementById('userBalance');
    if (balanceElement) {
        balanceElement.textContent = `$${userBalance.toFixed(2)}`;
    }

    const statsElement = document.getElementById('balanceStats');
    if (statsElement) {
        const settled = betHistory.filter(bet => bet.status === 'won' || bet.status === 'lost');
        const won = settled.filter(bet => bet.status === 'won').length;
        const profit = betHistory.reduce((sum, bet) => sum + (bet.settledReturn || 0) - bet.stake, 0);
        const sign = profit >= 0 ? '+' : '-';
        statsElement.innerHTML = settled.length
            ? `${settled.length} settled · ${won} won (${Math.round(won / settled.length * 100)}%) · ` +
              `<span class="${profit >= 0 ? 'pl-up' : 'pl-down'}">P/L ${sign}$${Math.abs(profit).toFixed(2)}</span>`
            : 'No settled bets yet';
    }
}

// Enhanced betting system initialization
function initializeBetting() {
    loadState();

    // Remember each selection's label so it can be restored after "Settled" / "Market Closed"
    document.querySelectorAll('.odds-btn').forEach(btn => {
        const labelEl = btn.querySelector('.selection-name') || btn.querySelector('.selection');
        if (labelEl) btn.dataset.label = labelEl.textContent.trim();
    });

    updateBalanceDisplay();
    setupBettingEventListeners();
    updateBetslip();
    updateBettingOdds();
    updateActiveBets();
    updateBetHistory();
}

// Setup event listeners for betting (called once)
function setupBettingEventListeners() {
    document.querySelectorAll('.odds-btn').forEach(btn => {
        btn.addEventListener('click', handleOddsClick);
    });

    const betAmountInput = document.getElementById('betAmount');
    betAmountInput.addEventListener('input', updatePotentialWin);
    betAmountInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') placeBet();
    });

    document.getElementById('placeBet').addEventListener('click', placeBet);
    document.getElementById('clearBet').addEventListener('click', clearBet);

    document.querySelectorAll('.quick-stake').forEach(btn => {
        btn.addEventListener('click', () => {
            const stake = btn.dataset.stake === 'max'
                ? Math.floor(userBalance)
                : Math.min(Number(btn.dataset.stake), Math.floor(userBalance));
            betAmountInput.value = stake > 0 ? stake : '';
            updatePotentialWin();
            betAmountInput.focus();
        });
    });

    const resetButton = document.getElementById('resetBalance');
    if (resetButton) resetButton.addEventListener('click', resetAccount);

    // Persist (and refund pending stakes) if the page is closed mid-match
    window.addEventListener('beforeunload', saveState);
}

function findOddsButton(market, outcome) {
    return document.querySelector(`.odds-btn[data-market="${market}"][data-outcome="${outcome}"]`);
}

// Handle odds button click
function handleOddsClick(event) {
    const btn = event.currentTarget;

    if (marketsLocked || !bettingWindowOpen) {
        showBetMessage('Markets are suspended - wait for the next betting window', 'warning');
        return;
    }
    if (btn.disabled) {
        showBetMessage('This market is settled or closed', 'warning');
        return;
    }

    // Clicking the selected odds again deselects it
    if (currentBet && currentBet.market === btn.dataset.market && currentBet.outcome === btn.dataset.outcome) {
        clearSelection();
        return;
    }

    document.querySelectorAll('.odds-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    currentBet = {
        market: btn.dataset.market,
        outcome: btn.dataset.outcome,
        odds: parseFloat(btn.dataset.odd),
        selection: btn.dataset.label || btn.textContent.trim(),
        marketName: getMarketDisplayName(btn.dataset.market)
    };

    updateBetslip();
    const amountInput = document.getElementById('betAmount');
    if (amountInput && !amountInput.value) amountInput.focus();
}

// Get display name for market
function getMarketDisplayName(market) {
    const marketNames = {
        '1x2': 'Match Winner',
        'total-goals': 'Total Goals',
        'btts': 'Both Teams to Score',
        'fh-goals': 'First Half Goals',
        'specials': 'Match Specials'
    };
    return marketNames[market] || market;
}

// Update betslip display
function updateBetslip() {
    const emptyBetslip = document.getElementById('emptyBetslip');
    const betslipContent = document.getElementById('betslipContent');

    if (!emptyBetslip || !betslipContent) return;

    if (!currentBet) {
        emptyBetslip.style.display = 'block';
        betslipContent.style.display = 'none';
        return;
    }

    emptyBetslip.style.display = 'none';
    betslipContent.style.display = 'block';

    document.getElementById('betMarketName').textContent = currentBet.marketName;
    document.getElementById('betSelectionName').textContent = currentBet.selection;
    document.getElementById('betOdds').textContent = currentBet.odds.toFixed(2);

    updatePotentialWin();
}

// Update potential (total) return
function updatePotentialWin() {
    const betAmount = parseFloat(document.getElementById('betAmount').value) || 0;
    const potentialWinSpan = document.getElementById('potentialWin');

    if (currentBet && betAmount > 0) {
        potentialWinSpan.textContent = (betAmount * currentBet.odds).toFixed(2);
    } else {
        potentialWinSpan.textContent = '0.00';
    }
}

// Place bet
function placeBet() {
    if (!currentBet) {
        showBetMessage('Please select a bet first', 'error');
        return;
    }

    if (!bettingWindowOpen || marketsLocked) {
        showBetMessage('Betting window is closed', 'error');
        clearSelection();
        return;
    }

    const betAmount = Math.round(parseFloat(document.getElementById('betAmount').value) * 100) / 100;
    if (!betAmount || betAmount <= 0) {
        showBetMessage('Please enter a valid bet amount', 'error');
        return;
    }

    if (betAmount > userBalance) {
        showBetMessage(`Insufficient balance (you have $${userBalance.toFixed(2)})`, 'error');
        return;
    }

    // Re-check the market: it may have been settled or re-priced since it was selected
    const btn = findOddsButton(currentBet.market, currentBet.outcome);
    if (!btn || btn.disabled) {
        showBetMessage('That selection is no longer available', 'error');
        clearSelection();
        return;
    }
    const liveOdds = parseFloat(btn.dataset.odd);
    if (Math.abs(liveOdds - currentBet.odds) > 0.001) {
        const previous = currentBet.odds;
        currentBet.odds = liveOdds;
        updateBetslip();
        showBetMessage(`Odds changed from ${previous.toFixed(2)} to ${liveOdds.toFixed(2)} - press Place Bet again to accept`, 'warning');
        return;
    }

    userBalance = Math.round((userBalance - betAmount) * 100) / 100;
    updateBalanceDisplay();

    activeBets.push({
        id: nextBetId++,
        matchNumber: currentMatch.matchNumber,
        market: currentBet.market,
        outcome: currentBet.outcome,
        selection: currentBet.selection,
        marketName: currentBet.marketName,
        odds: currentBet.odds,
        stake: betAmount,
        potentialReturn: betAmount * currentBet.odds,
        status: 'pending',
        timestamp: new Date()
    });
    updateActiveBets();
    saveState();

    showBetMessage(`Bet placed! $${betAmount.toFixed(2)} on ${currentBet.selection} @ ${currentBet.odds.toFixed(2)}`, 'success');

    // Keep the stake for the next bet, but clear the selection
    clearSelection();
}

// Deselect without touching the stake or the current message
function clearSelection() {
    currentBet = null;
    document.querySelectorAll('.odds-btn').forEach(btn => btn.classList.remove('selected'));
    updateBetslip();
}

// Clear bet slip completely
function clearBet() {
    clearSelection();
    document.getElementById('betAmount').value = '';
    updatePotentialWin();
    hideBetMessage();
}

// Show bet message
let betMessageTimeout = null;
function showBetMessage(message, type) {
    const messageDiv = document.getElementById('betMessage');
    if (!messageDiv) return;
    messageDiv.textContent = message;
    messageDiv.className = `bet-message ${type}`;
    messageDiv.style.display = 'block';

    // Auto hide after 5 seconds (a newer message resets the clock)
    clearTimeout(betMessageTimeout);
    betMessageTimeout = setTimeout(hideBetMessage, 5000);
}

// Hide bet message
function hideBetMessage() {
    const messageDiv = document.getElementById('betMessage');
    if (messageDiv) messageDiv.style.display = 'none';
}

function formatBetStatus(status) {
    switch ((status || '').toLowerCase()) {
        case 'won':
            return 'Won';
        case 'lost':
            return 'Lost';
        case 'void':
            return 'Void';
        case 'pending':
            return 'Pending';
        default:
            return status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
    }
}

function formatTime(date, options) {
    return new Date(date).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, ...options });
}

// Update active bets display
function updateActiveBets() {
    const betsList = document.getElementById('betsList');

    if (activeBets.length === 0) {
        betsList.innerHTML = '<div class="no-bets">No active bets</div>';
        return;
    }

    betsList.innerHTML = activeBets.map(bet => `
        <div class="bet-item ${bet.status}">
            <div class="bet-details">
                <div class="bet-market">${bet.marketName} (Match ${bet.matchNumber})</div>
                <div class="bet-selection-details">${bet.selection}</div>
                <div class="bet-stake-odds">Stake: $${bet.stake.toFixed(2)} @ ${bet.odds.toFixed(2)}</div>
                <div class="bet-return">Potential Return: $${bet.potentialReturn.toFixed(2)}</div>
                <div class="bet-timestamp">Placed: ${formatTime(bet.timestamp, { second: '2-digit' })}</div>
            </div>
            <div class="bet-status ${bet.status}">${formatBetStatus(bet.status)}</div>
        </div>
    `).join('');
}

// Update Bet History Display (newest first)
function updateBetHistory() {
    const historyList = document.getElementById('betHistoryList');
    if (!historyList) return;

    if (betHistory.length === 0) {
        historyList.innerHTML = '<div class="no-bets">No bet history</div>';
        return;
    }

    historyList.innerHTML = betHistory.map(bet => {
        const settledReturn = typeof bet.settledReturn === 'number' ? bet.settledReturn : 0;
        const returnLabel = bet.status === 'void'
            ? `Stake Returned: $${settledReturn.toFixed(2)}`
            : `Return: $${settledReturn.toFixed(2)}`;
        const settledAt = bet.settledTimestamp || bet.timestamp;

        return `
        <div class="bet-item ${bet.status}">
            <div class="bet-details">
                <div class="bet-market">${bet.marketName} (Match ${bet.matchNumber})</div>
                <div class="bet-selection-details">${bet.selection}</div>
                <div class="bet-stake-odds">Stake: $${bet.stake.toFixed(2)} @ ${bet.odds.toFixed(2)}</div>
                <div class="bet-return">${returnLabel}</div>
                <div class="bet-match-result">Result: ${bet.matchResultDisplay || 'Match result unavailable'}</div>
                <div class="bet-timestamp">Settled: ${formatTime(settledAt, { month: 'short', day: 'numeric' })}</div>
            </div>
            <div class="bet-status ${bet.status}">${formatBetStatus(bet.status)}</div>
        </div>
    `}).join('');
}

// Lock/unlock markets
function lockMarkets() {
    marketsLocked = true;
    document.querySelectorAll('.market-card').forEach(card => {
        card.classList.add('suspended');
    });
    document.querySelectorAll('.odds-btn').forEach(btn => {
        btn.classList.add('suspended');
    });

    const liveIndicator = document.querySelector('.live-indicator');
    if (liveIndicator) {
        liveIndicator.textContent = '● LIVE - SUSPENDED';
    }
}

function unlockMarkets() {
    marketsLocked = false;
    document.querySelectorAll('.market-card').forEach(card => {
        card.classList.remove('suspended');
    });
    document.querySelectorAll('.odds-btn').forEach(btn => {
        if (!btn.disabled) btn.classList.remove('suspended');
    });

    const liveIndicator = document.querySelector('.live-indicator');
    if (liveIndicator) {
        liveIndicator.textContent = '● LIVE';
    }
}

// Move settled bets from the active list into history
function moveToHistory(settled) {
    const settledIds = new Set(settled.map(bet => bet.id));
    activeBets = activeBets.filter(bet => !settledIds.has(bet.id));
    betHistory.unshift(...settled);
    updateBalanceDisplay();
    updateActiveBets();
    updateBetHistory();
    saveState();
}

// Refund every pending bet (used when a match is abandoned)
function voidPendingBets(reason) {
    const pending = activeBets.filter(bet => bet.status === 'pending');
    if (!pending.length) return;
    pending.forEach(bet => {
        bet.status = 'void';
        bet.settledReturn = bet.stake;
        bet.settledTimestamp = new Date();
        bet.matchResultDisplay = reason;
        userBalance += bet.stake;
    });
    moveToHistory(pending);
    showBetMessage(`${reason} - ${pending.length} pending bet${pending.length > 1 ? 's' : ''} refunded`, 'info');
}

// Settle bets after match
function settleBets(matchResult) {
    if (!matchResult) return;

    const matchNumber = matchResult.matchNumber;
    const betsToSettle = activeBets.filter(bet =>
        bet.matchNumber === matchNumber && bet.status === 'pending'
    );
    if (betsToSettle.length === 0) return;

    const homeTeam = matchResult.homeTeam || 'Red';
    const awayTeam = matchResult.awayTeam || 'Blue';
    const matchSummary = `${homeTeam} ${matchResult.homeGoals}-${matchResult.awayGoals} ${awayTeam}`;
    const winnerLabel = matchResult.winner === 'draw'
        ? 'Draw'
        : `${matchResult.winner === 'red' ? homeTeam : awayTeam} Win`;

    let totalReturn = 0;
    let wins = 0;

    betsToSettle.forEach(bet => {
        let status = 'lost';
        let payout = 0;

        switch (bet.market) {
            case '1x2':
                if (bet.outcome === 'red-win' && matchResult.winner === 'red') status = 'won';
                if (bet.outcome === 'blue-win' && matchResult.winner === 'blue') status = 'won';
                if (bet.outcome === 'draw' && matchResult.winner === 'draw') status = 'won';
                break;

            case 'total-goals':
            case 'fh-goals': {
                const goals = bet.market === 'total-goals' ? matchResult.totalGoals : matchResult.firstHalfGoals;
                const line = parseFloat(bet.outcome.split('-')[1]);
                if (!Number.isNaN(line) && goals === line) {
                    status = 'void';
                } else if (bet.outcome.startsWith('over') && goals > line) {
                    status = 'won';
                } else if (bet.outcome.startsWith('under') && goals < line) {
                    status = 'won';
                }
                break;
            }

            case 'btts':
                if (bet.outcome === 'yes' && matchResult.btts) status = 'won';
                if (bet.outcome === 'no' && !matchResult.btts) status = 'won';
                break;

            case 'specials':
                if (bet.outcome === 'red-clean-sheet' && matchResult.awayGoals === 0) status = 'won';
                if (bet.outcome === 'blue-clean-sheet' && matchResult.homeGoals === 0) status = 'won';
                break;
        }

        if (status === 'won') {
            payout = bet.potentialReturn;
            wins++;
        } else if (status === 'void') {
            payout = bet.stake;
        }
        userBalance += payout;
        totalReturn += payout;

        bet.status = status;
        bet.settledReturn = payout;
        bet.settledTimestamp = new Date();
        bet.matchResultDisplay = `${matchSummary} (${winnerLabel})`;
    });
    userBalance = Math.round(userBalance * 100) / 100;

    moveToHistory(betsToSettle);

    // One summary message instead of one per bet (they used to overwrite each other)
    const count = betsToSettle.length;
    if (wins > 0) {
        showBetMessage(`${wins} of ${count} bet${count > 1 ? 's' : ''} won! +$${totalReturn.toFixed(2)} returned`, 'success');
    } else if (totalReturn > 0) {
        showBetMessage(`Stakes returned: $${totalReturn.toFixed(2)}`, 'info');
    } else {
        showBetMessage(`No luck this time - ${count} bet${count > 1 ? 's' : ''} lost`, 'error');
    }

    if (userBalance < 1 && !activeBets.some(bet => bet.status === 'pending')) {
        setTimeout(() => showBetMessage('Out of funds! Use "Reset" under your balance to start again.', 'warning'), 2500);
    }
}


// Safety net: markets must be locked whenever the ball is in play
function checkGameState() {
    if (gameRunning && !marketsLocked) {
        lockMarkets();
    }
}
setInterval(checkGameState, 1000);

// Betting timer and message functions
function startBettingTimer(seconds = 20) {
    bettingTimeLeft = seconds;
    bettingWindowOpen = true;

    if (bettingTimer) clearInterval(bettingTimer);

    unlockMarkets();
    toggleBettingMarkets(true);
    showBettingStatus('open');

    bettingTimer = setInterval(() => {
        bettingTimeLeft--;
        updateBettingTimerDisplay();

        if (bettingTimeLeft === 10 || bettingTimeLeft === 5) {
            showBetMessage(`Betting closes in ${bettingTimeLeft} seconds!`, 'warning');
        } else if (bettingTimeLeft <= 0) {
            closeBettingWindow();
        }
    }, 1000);

    updateBettingTimerDisplay();
}

function closeBettingWindow({ kickOff = true } = {}) {
    bettingWindowOpen = false;
    clearInterval(bettingTimer);
    bettingTimer = null;

    lockMarkets();
    showBettingStatus('closed');

    // Odds will move before the next window opens, so don't carry a stale selection over
    clearSelection();

    if (!kickOff) return;

    if (!gameStarted && !gameRunning) {
        // Pre-match window closed: kick off
        showBetMessage('Betting window closed - match starting!', 'warning');
        showGameMessage("KICK OFF!", 1000);
        scheduleForMatch(startPlay, 1000);
    } else if (gameHalf === 1 && !gameRunning) {
        // Halftime window closed: start the second half
        showBetMessage('Halftime betting closed - 2nd half starting!', 'warning');
        startSecondHalf();
    }
}

function updateBettingTimerDisplay() {
    const timerElement = document.getElementById('bettingTimer');
    if (timerElement && bettingWindowOpen) {
        const minutes = Math.floor(bettingTimeLeft / 60);
        const seconds = Math.max(0, bettingTimeLeft % 60);
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        timerElement.classList.toggle('urgent', bettingTimeLeft <= 10);
    }
    syncOverlayWithGameState();
}

const BETTING_STATUS_VIEW = {
    open: { icon: '🟢', text: 'Betting Open' },
    closed: { icon: '🔴', text: 'Betting Closed' },
    suspended: { icon: '⏸️', text: 'Betting Suspended' }
};

function showBettingStatus(status) {
    const statusElement = document.getElementById('bettingStatus');
    const timerContainer = document.getElementById('bettingTimerContainer');
    const view = BETTING_STATUS_VIEW[status];

    if (statusElement && view) {
        statusElement.innerHTML = `
            <div class="betting-status-${status}">
                <span class="status-icon">${view.icon}</span>
                <span class="status-text">${view.text}</span>
            </div>
        `;
        statusElement.className = `betting-status ${status}`;
    }

    updateOverlayBettingStatus(status, status === 'open' ? bettingTimeLeft : null);

    if (timerContainer) {
        timerContainer.style.display = (status === 'open') ? 'block' : 'none';
    }
}

function toggleBettingMarkets(enabled) {
    const marketsElement = document.getElementById('bettingMarkets');
    if (!marketsElement) return;

    marketsElement.classList.toggle('disabled', !enabled);
    marketsElement.querySelectorAll('.odds-btn').forEach(btn => {
        // Settled/closed buttons stay disabled
        btn.style.pointerEvents = enabled && !btn.disabled ? 'auto' : 'none';
    });
}


/* --- NEW POISSON-BASED LIVE ODDS FUNCTIONS --- */

/**
 * Caches factorial results for performance.
 */
const factorial = (function () {
    const cache = { 0: 1, 1: 1 };
    function f(n) {
        if (n in cache) {
            return cache[n];
        } else {
            if (n < 0) return NaN;
            if (n > 170) return Infinity; // Handle large numbers
            let result = 1;
            for (let i = n; i > 1; i--) {
                result *= i;
            }
            cache[n] = result;
            return result;
        }
    }
    return f;
})();

/**
 * Calculates the Poisson probability of exactly k events (goals)
 * given an average expectancy (lambda).
 * P(k, λ) = (e^-λ * λ^k) / k!
 * @param {number} k - The number of goals (integer).
 * @param {number} lambda - The average expected goals.
 * @returns {number} - The probability (0-1).
 */
function poissonProbability(k, lambda) {
    if (k < 0 || lambda < 0) return 0;
    k = Math.floor(k); // Ensure k is an integer
    
    // Use Math.exp(-lambda) which is more numerically stable than Math.pow(Math.E, -lambda)
    const part1 = Math.exp(-lambda);
    const part2 = Math.pow(lambda, k);
    const part3 = factorial(k);
    
    if (part3 === Infinity) return 0; // Prevent division by infinity

    return (part1 * part2) / part3;
}

/**
 * Calculates and displays updated "live" odds at halftime
 * using a Poisson Distribution model.
 */
function updateLiveOdds() {
    
    // --- 1. Get Base Data ---
    // Get current score
    const currentHomeGoals = score.red;
    const currentAwayGoals = score.blue;

    // Get 2nd Half Goal Expectancy (Lambda) from historical stats
    // These are the *expected* goals for the 2nd half only.
    const lambda_home_remaining = historicalStats.avgHomeGoals - historicalStats.avgFirstHalfHome; // ~0.59
    const lambda_away_remaining = historicalStats.avgAwayGoals - historicalStats.avgFirstHalfAway; // ~0.613

    // --- 2. Calculate Probability Matrix ---
    let totalHomeWinProb = 0;
    let totalDrawProb = 0;
    let totalAwayWinProb = 0;
    // Track total goal probabilities for multiple lines
    const totalGoalLines = [
        {
            line: 1.5,
            overId: 'over15Odd',
            overSelector: 'button[data-outcome="over-1.5"]',
            underId: 'under15Odd',
            underSelector: 'button[data-outcome="under-1.5"]'
        },
        {
            line: 2.5,
            overId: 'over25Odd',
            overSelector: 'button[data-outcome="over-2.5"]',
            underId: 'under25Odd',
            underSelector: 'button[data-outcome="under-2.5"]'
        },
        {
            line: 3.5,
            overId: 'over35Odd',
            overSelector: 'button[data-outcome="over-3.5"]',
            underId: 'under35Odd',
            underSelector: 'button[data-outcome="under-3.5"]'
        }
    ];

    const totalGoalsProbabilities = totalGoalLines.reduce((acc, cfg) => {
        acc[cfg.line] = 0;
        return acc;
    }, {});

    let totalBTTS_Yes_Prob = 0;
    let totalProbSum = 0; // For normalization

    const max_goals_to_calc = 8; // Calculate up to 8 more goals for each team

    // Pre-calculate Poisson probabilities for each team to save computation
    let homeProbs = [];
    let awayProbs = [];
    for (let k = 0; k <= max_goals_to_calc; k++) {
        homeProbs[k] = poissonProbability(k, lambda_home_remaining);
        awayProbs[k] = poissonProbability(k, lambda_away_remaining);
    }

    // --- 3. Sum Probabilities for Each Market ---
    for (let k_home = 0; k_home <= max_goals_to_calc; k_home++) {
        for (let k_away = 0; k_away <= max_goals_to_calc; k_away++) {
            
            // Probability of (k_home) more home goals AND (k_away) more away goals
            const prob_this_outcome = homeProbs[k_home] * awayProbs[k_away];
            
            if (prob_this_outcome === 0) continue; // Skip if probability is negligible

            // Calculate the final score based on this outcome
            const final_home_goals = currentHomeGoals + k_home;
            const final_away_goals = currentAwayGoals + k_away;
            const final_total_goals = final_home_goals + final_away_goals;

            // --- A. 1x2 Market (Full Time) ---
            if (final_home_goals > final_away_goals) {
                totalHomeWinProb += prob_this_outcome;
            } else if (final_home_goals < final_away_goals) {
                totalAwayWinProb += prob_this_outcome;
            } else {
                totalDrawProb += prob_this_outcome;
            }

            // --- B. Total Goals (Over/Under 2.5) ---
            totalGoalLines.forEach(cfg => {
                if (final_total_goals > cfg.line) {
                    totalGoalsProbabilities[cfg.line] += prob_this_outcome;
                }
            });

            // --- C. BTTS (Both Teams to Score) ---
            if (final_home_goals > 0 && final_away_goals > 0) {
                totalBTTS_Yes_Prob += prob_this_outcome;
            }
            
            totalProbSum += prob_this_outcome;
        }
    }

    // --- 4. Normalize and Update Odds ---

    // --- 1x2 Market ---
    // Normalize probabilities (to account for max_goals_to_calc cap)
    const finalHomeProb = totalHomeWinProb / totalProbSum;
    const finalDrawProb = totalDrawProb / totalProbSum;
    const finalAwayProb = totalAwayWinProb / totalProbSum;
    
    updateOddElement('redWinOdd', 'button[data-outcome="red-win"]', finalHomeProb);
    updateOddElement('drawOdd', 'button[data-outcome="draw"]', finalDrawProb);
    updateOddElement('blueWinOdd', 'button[data-outcome="blue-win"]', finalAwayProb);


    // --- Total Goals Markets ---
    const currentTotalGoals = currentHomeGoals + currentAwayGoals;
    totalGoalLines.forEach(cfg => {
        const overButton = document.querySelector(cfg.overSelector);
        const underButton = document.querySelector(cfg.underSelector);

        if (currentTotalGoals > cfg.line) {
            // Market is already settled as Over
            disableMarketButton(overButton, "Settled (Over)");
            disableMarketButton(underButton, "Settled (Over)");
            return;
        }

        if (totalProbSum === 0) {
            disableMarketButton(overButton, "N/A");
            disableMarketButton(underButton, "N/A");
            return;
        }

        const finalOverProb = totalGoalsProbabilities[cfg.line] / totalProbSum;
        const finalUnderProb = 1.0 - finalOverProb;

        updateOddElement(cfg.overId, cfg.overSelector, finalOverProb);
        updateOddElement(cfg.underId, cfg.underSelector, finalUnderProb);
    });
    
    // --- BTTS Market ---
    if (currentHomeGoals > 0 && currentAwayGoals > 0) {
        // Market is already settled as YES
        disableMarketButton(document.querySelector('button[data-outcome="yes"]'), "Settled (Yes)");
        disableMarketButton(document.querySelector('button[data-outcome="no"]'), "Settled (Yes)");
    } else {
        // Normalize BTTS probability
        const finalBTTS_Yes_Prob = totalBTTS_Yes_Prob / totalProbSum;
        const finalBTTS_No_Prob = 1.0 - finalBTTS_Yes_Prob;

        updateOddElement('bttsYesOdd', 'button[data-outcome="yes"]', finalBTTS_Yes_Prob);
        updateOddElement('bttsNoOdd', 'button[data-outcome="no"]', finalBTTS_No_Prob);
    }

    // --- NEW: Clean Sheet Market (Halftime) ---
    const redCleanSheetButton = document.querySelector('button[data-outcome="red-clean-sheet"]');
    const blueCleanSheetButton = document.querySelector('button[data-outcome="blue-clean-sheet"]');

    // Red Clean Sheet (Blue scores 0)
    if (currentAwayGoals > 0) {
        // Red cannot get a clean sheet if Blue already scored
        disableMarketButton(redCleanSheetButton, "Settled (No)");
    } else {
        // Prob of Red clean sheet = Prob of Blue scoring 0 goals in 2nd half
        const redCleanSheetProb = poissonProbability(0, lambda_away_remaining);
        // We don't need to normalize this, it's a direct probability
        updateOddElement('redCleanSheetOdd', 'button[data-outcome="red-clean-sheet"]', redCleanSheetProb);
    }

    // Blue Clean Sheet (Red scores 0)
    if (currentHomeGoals > 0) {
        // Blue cannot get a clean sheet if Red already scored
        disableMarketButton(blueCleanSheetButton, "Settled (No)");
    } else {
        // Prob of Blue clean sheet = Prob of Red scoring 0 goals in 2nd half
        const blueCleanSheetProb = poissonProbability(0, lambda_home_remaining);
        updateOddElement('blueCleanSheetOdd', 'button[data-outcome="blue-clean-sheet"]', blueCleanSheetProb);
    }

    // --- First Half Goals Market ---
    // This market is always closed at halftime.
    document.querySelectorAll('button[data-market="fh-goals"]').forEach(btn => {
        disableMarketButton(btn, "Market Closed");
    });
}

/**
 * Helper function to update a single odd element's text and data-odd.
 * @param {string} elementId - The ID of the span/div holding the odds value.
 * @param {string} buttonSelector - The CSS selector for the button.
 * @param {number} probability - The new probability (0-1).
 */
function updateOddElement(elementId, buttonSelector, probability) {
    const oddSpan = document.getElementById(elementId);
    const oddButton = document.querySelector(buttonSelector);

    if (!oddSpan || !oddButton) {
        console.warn(`Element not found for ${elementId} or ${buttonSelector}`);
        return;
    }

    // Ensure probability is within a valid range to avoid extreme odds
    const saneProbability = Math.max(0.0001, Math.min(0.9999, probability));
    const newOdd = calculateOdds(saneProbability, 0.05);

    // Don't offer unrealistic prices
    if (newOdd > 1000) {
        disableMarketButton(oddButton, "N/A");
        return;
    }

    const newOddStr = newOdd.toFixed(2);
    const previousOdd = parseFloat(oddButton.dataset.odd);
    const wasDisabled = oddButton.disabled;

    oddSpan.textContent = newOddStr;
    oddButton.dataset.odd = newOddStr;

    // Flash green/red when the price moves
    if (!wasDisabled && Number.isFinite(previousOdd) && Math.abs(previousOdd - newOdd) >= 0.005) {
        oddSpan.classList.remove('odds-up', 'odds-down');
        void oddSpan.offsetWidth; // restart the animation
        oddSpan.classList.add(newOdd > previousOdd ? 'odds-up' : 'odds-down');
        clearTimeout(oddSpan._flashTimeout);
        oddSpan._flashTimeout = setTimeout(() => oddSpan.classList.remove('odds-up', 'odds-down'), 1500);
    }

    // Re-enable the button in case it was settled/closed earlier (e.g. new match)
    oddButton.disabled = false;
    if (!marketsLocked) oddButton.classList.remove('suspended');
    oddButton.style.pointerEvents = marketsLocked ? 'none' : 'auto';

    const selectionEl = oddButton.querySelector('.selection-name') || oddButton.querySelector('.selection');
    if (selectionEl && oddButton.dataset.label) {
        selectionEl.textContent = oddButton.dataset.label;
    }
}

/**
 * Helper function to disable a market button.
 * @param {HTMLElement} buttonElement - The button to disable.
 * @param {string} text - The text to display (e.g., "Settled").
 */
function disableMarketButton(buttonElement, text) {
    if (!buttonElement) return;
    
    buttonElement.disabled = true;
    buttonElement.classList.add('suspended');
    buttonElement.style.pointerEvents = 'none';
    
    const selectionEl = buttonElement.querySelector('.selection-name') || buttonElement.querySelector('.selection');
    if (selectionEl) {
        selectionEl.textContent = text;
    }
    const oddsEl = buttonElement.querySelector('.odds-value');
    if (oddsEl) {
        oddsEl.textContent = '-';
    }
}


/* --- GAME OVERLAY FUNCTIONS --- */

// Update overlay betting status
let lastOverlayKey = '';
function updateOverlayBettingStatus(status, timeLeft = null) {
    const statusIndicator = document.getElementById('overlayStatusIndicator');
    const statusText = document.getElementById('overlayStatusText');
    const bettingTimer = document.getElementById('overlayBettingTimer');
    const timerValue = document.getElementById('overlayTimerValue');

    if (!statusIndicator || !statusText) return;

    // This runs every frame, so skip DOM writes when nothing has changed
    const cacheKey = `${status}|${timeLeft}|${gameRunning}|${marketsLocked}|${bettingWindowOpen}`;
    if (cacheKey === lastOverlayKey) return;
    lastOverlayKey = cacheKey;

    // Validate status against actual game state
    let actualStatus = status;

    // If game is running, markets must be suspended regardless of input
    if (gameRunning) {
        actualStatus = 'suspended';
    }
    // If markets are locked, they can't be open
    else if (marketsLocked && status === 'open') {
        actualStatus = 'closed';
    }
    // If betting window is closed, markets can't be open
    else if (!bettingWindowOpen && status === 'open') {
        actualStatus = 'closed';
    }

    // Remove all status classes
    statusIndicator.classList.remove('open', 'closed', 'suspended');

    switch (actualStatus) {
        case 'open':
            statusIndicator.classList.add('open');
            statusText.textContent = 'Markets Open';
            if (bettingTimer && timeLeft !== null && timeLeft > 0) {
                bettingTimer.style.display = 'flex';
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                timerValue.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            } else {
                if (bettingTimer) bettingTimer.style.display = 'none';
            }
            break;
        case 'closed':
            statusIndicator.classList.add('closed');
            statusText.textContent = 'Markets Closed';
            if (bettingTimer) {
                bettingTimer.style.display = 'none';
            }
            break;
        case 'suspended':
            statusIndicator.classList.add('suspended');
            statusText.textContent = 'Markets Suspended';
            if (bettingTimer) {
                bettingTimer.style.display = 'none';
            }
            break;
        default:
            statusIndicator.classList.add('closed');
            statusText.textContent = 'Markets Closed';
            if (bettingTimer) {
                bettingTimer.style.display = 'none';
            }
    }
}

// Initialize overlay status
function initializeOverlayStatus() {
    // Check actual betting state and sync overlay
    // Only suspend when game is actually running, not just initialized
    if (gameRunning) {
        updateOverlayBettingStatus('suspended');
    } else if (bettingWindowOpen && !marketsLocked) {
        updateOverlayBettingStatus('open', bettingTimeLeft);
    } else {
        updateOverlayBettingStatus('closed');
    }
}

// Sync overlay with current game state
function syncOverlayWithGameState() {
    // Only suspend betting when game is actually running, not just when it's started
    if (gameRunning) {
        updateOverlayBettingStatus('suspended');
    } else if (bettingWindowOpen && !marketsLocked) {
        updateOverlayBettingStatus('open', bettingTimeLeft);
    } else {
        updateOverlayBettingStatus('closed');
    }
}


/* --- BOOT --- */

// Runs after the whole script has been evaluated, so every top-level binding exists.
function boot() {
    startGameWhenReady();
    try {
        initializeBetting();
        startBettingTimer(20); // Initial pre-match betting window
        showBetMessage('Welcome! Betting window is open - place your bets!', 'info');
    } catch (error) {
        console.error('Error initializing betting system:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
