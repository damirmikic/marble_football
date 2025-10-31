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
const PLAYER_RADIUS = 15; // Larger circles
const BALL_RADIUS = 8; // Ball radius
const GOAL_WIDTH = 10;
const GOAL_HEIGHT = 100;
const MAX_PLAYER_SPEED = 4; // Increased from 2 to 4 for faster gameplay
const MAX_BALL_SPEED = 8; // Increased from 5 to 8 for faster ball movement

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
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 0x008000 // Field green
});

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

    // White lines
    graphics.lineStyle(2, 0xFFFFFF);

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

    // Goals - draw visible goal structures
    graphics.lineStyle(4, 0xFFFFFF); // Goal posts

    // Left goal (Red team defends, Blue attacks)
    // Goal posts and crossbar
    graphics.moveTo(0, goalYTop - 3);
    graphics.lineTo(12, goalYTop - 3); // Top crossbar
    graphics.lineTo(12, goalYTop); // Right post top
    graphics.lineTo(12, goalYBottom); // Right post
    graphics.lineTo(12, goalYBottom + 3); // Right post bottom
    graphics.lineTo(0, goalYBottom + 3); // Bottom crossbar
    graphics.lineTo(0, goalYBottom); // Left post bottom
    graphics.lineTo(0, goalYTop); // Left post (goal line)

    // Goal net pattern
    graphics.lineStyle(1, 0xDDDDDD);
    for (let i = 1; i < 4; i++) {
        graphics.moveTo(1, goalYTop + (GOAL_HEIGHT * i / 4));
        graphics.lineTo(11, goalYTop + (GOAL_HEIGHT * i / 4));
    }
    for (let i = 1; i < 4; i++) {
        graphics.moveTo(1 + i * 3, goalYTop);
        graphics.lineTo(1 + i * 3, goalYBottom);
    }

    // Right goal (Blue team defends, Red attacks)  
    graphics.lineStyle(4, 0xFFFFFF); // Goal posts
    // Goal posts and crossbar
    graphics.moveTo(SCREEN_WIDTH, goalYTop - 3);
    graphics.lineTo(SCREEN_WIDTH - 12, goalYTop - 3); // Top crossbar
    graphics.lineTo(SCREEN_WIDTH - 12, goalYTop); // Left post top
    graphics.lineTo(SCREEN_WIDTH - 12, goalYBottom); // Left post
    graphics.lineTo(SCREEN_WIDTH - 12, goalYBottom + 3); // Left post bottom
    graphics.lineTo(SCREEN_WIDTH, goalYBottom + 3); // Bottom crossbar
    graphics.lineTo(SCREEN_WIDTH, goalYBottom); // Right post bottom
    graphics.lineTo(SCREEN_WIDTH, goalYTop); // Right post (goal line)

    // Goal net pattern
    graphics.lineStyle(1, 0xDDDDDD);
    for (let i = 1; i < 4; i++) {
        graphics.moveTo(SCREEN_WIDTH - 11, goalYTop + (GOAL_HEIGHT * i / 4));
        graphics.lineTo(SCREEN_WIDTH - 1, goalYTop + (GOAL_HEIGHT * i / 4));
    }
    for (let i = 1; i < 4; i++) {
        graphics.moveTo(SCREEN_WIDTH - 11 + i * 3, goalYTop);
        graphics.lineTo(SCREEN_WIDTH - 11 + i * 3, goalYBottom);
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

function showGameMessage(text, duration = 3000) {
    if (simulationMode) return; // Skip messages in simulation mode

    gameMessage.text = text;
    gameMessage.visible = true;
    setTimeout(() => {
        gameMessage.visible = false;
    }, duration);
}

function createPlayer(team, x, y, isGoalkeeper = false) {
    const player = new PIXI.Graphics();
    player.beginFill(team === 'red' ? 0xf44336 : 0x2196f3);
    player.drawCircle(0, 0, PLAYER_RADIUS);
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

    if (isGoalkeeper) {
        player.vx = 0; // Goalkeepers only move vertically
        player.vy = 0; // Start stationary
    }

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
    // --- START MODIFICATION: Use Sprite for football texture ---
    // Load a texture from a URL (using a free, public-domain soccer ball image)
    const texture = PIXI.Texture.from('https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Soccerball.svg/200px-Soccerball.svg.png');
    ball = new PIXI.Sprite(texture);

    ball.anchor.set(0.5); // Set anchor to center for proper rotation/positioning
    ball.width = BALL_RADIUS * 2;
    ball.height = BALL_RADIUS * 2;
    // --- END MODIFICATION ---

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
    console.log('startPlay called');

    // Give ball initial velocity - more vertical to prevent center scoring
    ball.vx = (Math.random() - 0.5) * 2; // Small horizontal movement
    ball.vy = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 3 + 2); // Strong vertical movement

    // Start players moving
    for (const player of players) {
        if (player.isGoalkeeper) {
            player.vy = MAX_PLAYER_SPEED * (Math.random() > 0.5 ? 1 : -1);
            player.vx = 0; // Goalkeepers don't move horizontally
        } else {
            player.vx = (Math.random() - 0.5) * MAX_PLAYER_SPEED;
            player.vy = (Math.random() - 0.5) * MAX_PLAYER_SPEED;
        }
    }

    gameRunning = true;
    gameStarted = true;
    console.log('Game started, gameRunning:', gameRunning);

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

function showGoalCelebration(team, callback) {
    // Get current game speed
    const speedInput = document.getElementById('gameSpeed');
    const currentSpeed = speedInput ? parseFloat(speedInput.value) || 1.0 : 1.0;

    if (autoMode || simulationMode || currentSpeed !== 1.0) {
        if (callback) callback(); // Skip popups in auto/simulation mode or when speed is not 1x
        return;
    }

    console.log(`Showing goal celebration for ${team} team`);

    // Set team-specific styling
    goalPopup.className = 'goal-popup show ' + team + '-goal';

    // Set the goal video and fallback
    if (team === 'red') {
        goalVideoSource.src = 'Video_of_Goal_Celebration_red.mp4';
        // Use SVG placeholder directly instead of missing image
        goalImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjQ0MzM2IiByeD0iMTAiLz4KICA8dGV4dCB4PSI1MCUiIHk9IjQwJSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UkVEIFRFQU08L3RleHQ+CiAgPHRleHQgeD0iNTAlIiB5PSI2NSUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyOCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkdPQUwhPC90ZXh0Pgo8L3N2Zz4K';
        goalText.textContent = 'RED TEAM SCORES!';
        console.log('Loading red team video: Video_of_Goal_Celebration_red.mp4');
    } else {
        goalVideoSource.src = 'Video_of_Goal_Celebrations_blue.mp4';
        // Use SVG placeholder directly instead of missing image
        goalImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMjE5NmYzIiByeD0iMTAiLz4KICA8dGV4dCB4PSI1MCUiIHk9IjQwJSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Qkx1RSBURU1NPC90ZXh0PgogIDx0ZXh0IHg9IjUwJSIgeT0iNjUlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjgiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5HT0FMITwvdGV4dD4KPC9zdmc+Cg==';
        goalText.textContent = 'BLUE TEAM SCORES!';
        console.log('Loading blue team video: Video_of_Goal_Celebrations_blue.mp4');
    }

    // Update score display
    goalScore.textContent = `${score.red} - ${score.blue}`;

    // Remove loop attribute to play video once
    goalVideo.removeAttribute('loop');

    // Reload video with new source
    goalVideo.load();

    // Handle video events
    goalVideo.onended = function () {
        console.log('Video finished playing');
        // Hide popup after video ends
        goalPopup.classList.remove('show');
        // Reset video for next time
        goalVideo.pause();
        goalVideo.currentTime = 0;
        goalVideo.style.display = 'block';
        goalImage.style.display = 'none';
        goalVideo.setAttribute('loop', ''); // Restore loop for next time

        // Call callback to continue game
        if (callback) callback();
    };

    goalVideo.play().catch((error) => {
        // If video fails to play, show fallback image and wait 3 seconds
        console.log('Video failed to play:', error);
        goalVideo.style.display = 'none';
        goalImage.style.display = 'block';

        setTimeout(() => {
            goalPopup.classList.remove('show');
            goalVideo.style.display = 'block';
            goalImage.style.display = 'none';
            if (callback) callback();
        }, 3000);
    });

    // Handle video load error (fallback to image)
    goalVideo.onerror = function () {
        console.log('Video failed to load');
        goalVideo.style.display = 'none';
        goalImage.style.display = 'block';

        setTimeout(() => {
            goalPopup.classList.remove('show');
            goalVideo.style.display = 'block';
            goalImage.style.display = 'none';
            if (callback) callback();
        }, 3000);
    };

    // No need for image error handler since we're using embedded SVG
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

// Push player out of goal box if they're not a goalkeeper
function enforceGoalBoxRestriction(player) {
    if (player.isGoalkeeper) return; // Goalkeepers can be in goal boxes

    if (player.team === 'red' && isInRightGoalBox(player.x, player.y, player.radius)) {
        // Red player in blue goal box - push them out
        player.x = SCREEN_WIDTH - GOAL_BOX_WIDTH - player.radius - 1;
        player.vx = Math.min(player.vx, 0); // Don't let them move further right
    } else if (player.team === 'blue' && isInLeftGoalBox(player.x, player.y, player.radius)) {
        // Blue player in red goal box - push them out
        player.x = GOAL_BOX_WIDTH + player.radius + 1;
        player.vx = Math.max(player.vx, 0); // Don't let them move further left
    }
}

function updateTimer(elapsedMS) {
    if (!gameRunning) return;

    // Get current game speed and apply it to timer
    const speedInput = document.getElementById('gameSpeed');
    const gameSpeed = speedInput ? parseFloat(speedInput.value) || 1.0 : 1.0;

    // Use a fixed time step (16.67ms for 60fps) and scale by game speed
    const baseTimeStep = 16.67; // milliseconds per frame at 60fps
    timer += (baseTimeStep / 1000.0) * gameSpeed;

    if (gameHalf === 1 && timer >= halftimeSeconds && !injuryTimeStarted) {
        // Generate injury time for first half (1-3 seconds)
        injuryTime.first = Math.floor(Math.random() * 3) + 1;
        injuryTimeStarted = true;
        showGameMessage(`+${injuryTime.first} INJURY TIME`, 2000);
    } else if (gameHalf === 1 && timer >= halftimeSeconds + injuryTime.first) {
        // --- START HALFTIME BETTING LOGIC ---
        gameRunning = false; // Stop the game
        showGameMessage("HALF TIME!", 3000);

        // Update odds for 2nd half, then open window
        if (typeof updateLiveOdds === 'function') {
            updateLiveOdds();
        }

        // Open the 15-second betting window
        if (typeof startBettingTimer === 'function') {
            startBettingTimer(15); // Open for 15 seconds
            if (typeof showBetMessage === 'function') {
                showBetMessage('Halftime! Place your live bets now!', 'info');
            }
        }
        
        // The 2nd half will now be started by closeBettingWindow() when the timer ends
        // --- END HALFTIME BETTING LOGIC ---
        
    } else if (gameHalf === 2 && timer >= halftimeSeconds * 2 && !injuryTimeStarted) {
        // Generate injury time for second half (3-6 seconds)
        injuryTime.second = Math.floor(Math.random() * 4) + 3;
        injuryTimeStarted = true;
        showGameMessage(`+${injuryTime.second} INJURY TIME`, 2000);
    } else if (gameHalf === 2 && timer >= halftimeSeconds * 2 + injuryTime.second) {
        // Game Over
        gameRunning = false;
        gameStarted = false;
        finishMatch(); // This function now handles bet settlement

        if (autoMode && currentMatchNumber < totalMatches && !matchTransitioning) {
            setTimeout(() => startNextMatch(), 1000);
        } else if (autoMode && currentMatchNumber >= totalMatches) {
            showGameMessage(`ALL MATCHES COMPLETE!\n${totalMatches} matches played`, 5000);
            document.getElementById('downloadCSV').style.display = 'inline-block';
            document.getElementById('startMatches').disabled = false;
            autoMode = false;
        } else if (!autoMode) {
            showGameMessage(`FULL TIME!\nRed ${score.red} - ${score.blue} Blue`, 3000);
            // Start next match with betting after showing final score
            // The 3sec delay allows time for bet settlement UI to appear
            setTimeout(() => startNextMatch(), 3000); 
        }
    }

    // Format timer display like real football (0-90 minutes + injury time)
    let displayText;
    const gameMinutes = Math.floor(timer).toString().padStart(2, '0');

    if (gameHalf === 1 && injuryTimeStarted) {
        const injuryTime = Math.floor(timer - halftimeSeconds);
        displayText = `Half: ${gameHalf} - ${gameMinutes}' +${injuryTime}'`;
    } else if (gameHalf === 2 && injuryTimeStarted) {
        const injuryTime = Math.floor(timer - halftimeSeconds * 2);
        displayText = `Half: ${gameHalf} - ${gameMinutes}' +${injuryTime}'`;
    } else {
        displayText = `Half: ${gameHalf} - ${gameMinutes}'`;
    }

    timerDisplay.textContent = displayText;

    // Update overlay timer as well
    const overlayTimer = document.getElementById('gameTimer');
    if (overlayTimer) {
        overlayTimer.textContent = displayText;
    }
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

function updatePlayers(deltaTime = 1) {
    // Get current game speed for consistent scaling
    const speedInput = document.getElementById('gameSpeed');
    const gameSpeed = speedInput ? parseFloat(speedInput.value) || 1.0 : 1.0;

    for (const player of players) {
        if (player.isGoalkeeper) {
            // Goalkeeper logic - constantly move up and down within goal area
            player.y += player.vy * gameSpeed;

            // Keep goalkeeper within goal box boundaries (6-yard box)
            const minY = goalBoxYTop + player.radius;
            const maxY = goalBoxYBottom - player.radius;

            if (player.y <= minY) {
                player.y = minY;
                player.vy = Math.abs(player.vy) || MAX_PLAYER_SPEED; // Ensure movement
            } else if (player.y >= maxY) {
                player.y = maxY;
                player.vy = -Math.abs(player.vy) || -MAX_PLAYER_SPEED; // Ensure movement
            }

            // Keep goalkeeper in their goal box
            if (player.team === 'red') {
                player.x = GOAL_BOX_WIDTH / 2; // Center of left goal box
            } else {
                player.x = SCREEN_WIDTH - GOAL_BOX_WIDTH / 2; // Center of right goal box
            }

            // Ensure goalkeeper is always moving
            if (Math.abs(player.vy) < 0.5) {
                player.vy = player.vy >= 0 ? MAX_PLAYER_SPEED : -MAX_PLAYER_SPEED;
            }
        } else {
            // Field player logic
            // Add a small random "nudge" to velocity (scaled by game speed)
            player.vx += (Math.random() - 0.5) * 0.2 * gameSpeed;
            player.vy += (Math.random() - 0.5) * 0.2 * gameSpeed;

            // Clamp speed
            const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
            if (speed > MAX_PLAYER_SPEED) {
                player.vx = (player.vx / speed) * MAX_PLAYER_SPEED;
                player.vy = (player.vy / speed) * MAX_PLAYER_SPEED;
            }

            // Apply velocity scaled by game speed
            player.x += player.vx * gameSpeed;
            player.y += player.vy * gameSpeed;

            // Enforce goal box restrictions (no field players in 6-yard boxes)
            enforceGoalBoxRestriction(player);

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

function updateBall(deltaTime = 1) {
    // Get current game speed for consistent scaling
    const speedInput = document.getElementById('gameSpeed');
    const gameSpeed = speedInput ? parseFloat(speedInput.value) || 1.0 : 1.0;

    // Apply velocity scaled by game speed (using fixed time step approach)
    const timeStep = gameSpeed; // Scale movement by game speed
    ball.x += ball.vx * timeStep;
    ball.y += ball.vy * timeStep;

    // Apply very light friction (scaled by game speed)
    const frictionRate = Math.pow(0.995, gameSpeed); // Friction scales with speed
    ball.vx *= frictionRate;
    ball.vy *= frictionRate;

    // --- START MODIFICATION: Add ball rotation ---
    // Use a value scaled by velocity but clamped for reasonable spin
    const spinFactor = 0.1;
    const spin = Math.max(-2, Math.min(2, ball.vx * spinFactor)) * gameSpeed;
    ball.rotation += spin;
    // --- END MODIFICATION ---

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
    // Blue team scores (ball crosses left goal line)
    if (ball.x < ball.radius) {
        if (ball.y > goalYTop && ball.y < goalYBottom) {
            score.blue++;
            logGoal('blue');
            updateScore();
            gameRunning = false;

            if (!autoMode) {
                showGameMessage(`GOAL!\nBlue Team Scores!\n${score.red} - ${score.blue}`, 2000);
                showGoalCelebration('blue', () => {
                    resetToCenter();
                    setTimeout(() => startPlay(), 1000);
                });
            } else {
                resetToCenter();
                setTimeout(() => startPlay(), 500);
            }
            return; // Exit function to avoid bouncing
        }
    }

    // Red team scores (ball crosses right goal line)
    if (ball.x > SCREEN_WIDTH - ball.radius) {
        if (ball.y > goalYTop && ball.y < goalYBottom) {
            score.red++;
            logGoal('red');
            updateScore();
            gameRunning = false;

            if (!autoMode) {
                showGameMessage(`GOAL!\nRed Team Scores!\n${score.red} - ${score.blue}`, 2000);
                showGoalCelebration('red', () => {
                    resetToCenter();
                    setTimeout(() => startPlay(), 1000);
                });
            } else {
                resetToCenter();
                setTimeout(() => startPlay(), 500);
            }
            return; // Exit function to avoid bouncing
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
    console.log('Initializing game...');

    // Clean up any existing game objects first
    if (app.stage.children.length > 0) {
        cleanupGameObjects();
    }

    console.log('Creating field...');
    createField();
    console.log('Creating players...');
    createAllPlayers();
    console.log('Creating ball...');
    createBall();
    console.log('Creating game message...');
    createGameMessage();
    console.log('Updating score...');
    updateScore(); // Initial score display

    // Only add the game loop once
    if (!gameLoopFunction) {
        gameLoopFunction = () => {
            if (gameRunning) {
                // Use deltaTime directly from ticker (already normalized and speed-adjusted)
                const deltaTime = app.ticker.deltaTime;
                updateTimer(app.ticker.elapsedMS);
                updatePlayers(deltaTime);
                updateBall(deltaTime);
                checkAllCollisions();
            }

            // Sync overlay with game state every frame
            syncOverlayWithGameState();
        };

        app.ticker.add(gameLoopFunction);
        console.log('Game loop started');
    }

    // Initialize overlay status
    initializeOverlayStatus();

    // Don't start the game immediately - let betting system initialize first
    showGameMessage("MATCH READY!\nWaiting for bets...", 3000);
    console.log('Game initialized, waiting for betting system...');
}

/* --- 5.5. FAST SIMULATION SYSTEM --- */

// Helper function to wait for match completion
function waitForMatchCompletion() {
    return new Promise((resolve) => {
        const checkCompletion = () => {
            // Check if game is not running (match ended) and we're in the second half
            if (!gameRunning && gameHalf === 2) {
                resolve();
            } else {
                setTimeout(checkCompletion, 10); // Check every 10ms
            }
        };
        checkCompletion();
    });
}

// Game-based simulation using formation analysis
async function simulateMatchFast(homeFormation, awayFormation, matchCount = 1) {
    const results = [];

    console.log(`Starting simulation of ${matchCount} matches using game-based logic`);

    for (let i = 0; i < matchCount; i++) {
        // Analyze formations using game data
        const homeFormationData = formations[homeFormation];
        const awayFormationData = formations[awayFormation];

        if (!homeFormationData || !awayFormationData) {
            console.error(`Formation not found: ${homeFormation} or ${awayFormation}`);
            continue;
        }

        // Calculate formation strengths based on player positioning
        const homeAttackStrength = calculateAttackStrength(homeFormationData);
        const homeDefenseStrength = calculateDefenseStrength(homeFormationData);
        const awayAttackStrength = calculateAttackStrength(awayFormationData);
        const awayDefenseStrength = calculateDefenseStrength(awayFormationData);

        // Simulate match based on formation matchup
        const homeGoalChance = (homeAttackStrength / awayDefenseStrength) * 0.15; // Base 15% per attack
        const awayGoalChance = (awayAttackStrength / homeDefenseStrength) * 0.15;

        // Simulate 90 minutes of play (simplified)
        let homeGoals = 0;
        let awayGoals = 0;
        let homeGoalsH1 = 0;
        let awayGoalsH1 = 0;

        // First half (45 minutes)
        for (let minute = 1; minute <= 45; minute++) {
            if (Math.random() < homeGoalChance / 45) {
                homeGoals++;
                homeGoalsH1++;
            }
            if (Math.random() < awayGoalChance / 45) {
                awayGoals++;
                awayGoalsH1++;
            }
        }

        // Second half (45 minutes)
        const homeGoalsH2 = homeGoals - homeGoalsH1;
        const awayGoalsH2 = awayGoals - awayGoalsH1;

        for (let minute = 46; minute <= 90; minute++) {
            if (Math.random() < homeGoalChance / 45) {
                homeGoals++;
            }
            if (Math.random() < awayGoalChance / 45) {
                awayGoals++;
            }
        }

        const finalHomeGoalsH2 = homeGoals - homeGoalsH1;
        const finalAwayGoalsH2 = awayGoals - awayGoalsH1;

        // Store result
        results.push({
            homeFormation,
            awayFormation,
            homeGoals,
            awayGoals,
            homeGoalsH1,
            awayGoalsH1,
            homeGoalsH2: finalHomeGoalsH2,
            awayGoalsH2: finalAwayGoalsH2,
            totalGoals: homeGoals + awayGoals,
            btts: homeGoals > 0 && awayGoals > 0,
            winner: homeGoals > awayGoals ? 'home' :
                awayGoals > homeGoals ? 'away' : 'draw',
            matchData: {
                homeFormation,
                awayFormation,
                homeGoals,
                awayGoals,
                firstHalfHomeGoals: homeGoalsH1,
                firstHalfAwayGoals: awayGoalsH1,
                secondHalfHomeGoals: finalHomeGoalsH2,
                secondHalfAwayGoals: finalAwayGoalsH2,
                result: homeGoals > awayGoals ? 'Home Win' :
                    awayGoals > homeGoals ? 'Away Win' : 'Draw'
            }
        });

        // Small delay every 10 matches to allow UI updates
        if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
        }
    }

    console.log(`Completed simulation of ${matchCount} matches`);
    return results;
}

// Helper functions to analyze formation strength
function calculateAttackStrength(formationData) {
    // Count forwards and attacking midfielders
    let attackStrength = 0;

    // All forwards count as attackers
    attackStrength += formationData.forwards ? formationData.forwards.length : 0;

    // Midfielders in attacking positions (y > 0.5) count as half attackers
    if (formationData.midfielders) {
        formationData.midfielders.forEach(player => {
            if (player.y > 0.5) {
                attackStrength += 0.5;
            }
        });
    }

    return Math.max(attackStrength, 1); // Minimum 1 to avoid division by zero
}

function calculateDefenseStrength(formationData) {
    // Count defenders and defensive midfielders
    let defenseStrength = 0;

    // All defenders count as defenders
    defenseStrength += formationData.defenders ? formationData.defenders.length : 0;

    // Midfielders in defensive positions (y < 0.5) count as half defenders
    if (formationData.midfielders) {
        formationData.midfielders.forEach(player => {
            if (player.y < 0.5) {
                defenseStrength += 0.5;
            }
        });
    }

    return Math.max(defenseStrength, 1); // Minimum 1 to avoid division by zero
}

// Helper function to get formation strength
function getFormationStrength(formation) {
    const formationStrengths = {
        '4-4-2': 75,
        '4-3-3': 80,
        '3-5-2': 70,
        '5-3-2': 65,
        '4-5-1': 72,
        '3-4-3': 78
    };
    return formationStrengths[formation] || 70;
}

// Generate historical data quickly


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
    matchData.push({ ...currentMatch });

    // --- START MODIFICATION: Implement Bet Settlement ---
    // Settle all active bets now that the match is final
    if (typeof settleBets === 'function' && activeBets.length > 0) {
        console.log('Match finished, settling active bets...');
        
        // Create the matchResult object in the format settleBets expects
        const matchResult = {
            winner: currentMatch.result === 'Home Win' ? 'red' : currentMatch.result === 'Away Win' ? 'blue' : 'draw',
            homeGoals: currentMatch.homeGoals,
            awayGoals: currentMatch.awayGoals,
            totalGoals: currentMatch.totalGoals,
            firstHalfHomeGoals: currentMatch.firstHalfHomeGoals,
            firstHalfAwayGoals: currentMatch.firstHalfAwayGoals,
            firstHalfGoals: currentMatch.firstHalfHomeGoals + currentMatch.firstHalfAwayGoals, // Combined for fh-goals market
            btts: (currentMatch.homeGoals > 0 && currentMatch.awayGoals > 0) // Explicitly add btts result
        };
        
        // Add a short delay to allow the final score to be seen before settlement UI updates
        setTimeout(() => {
            settleBets(matchResult);
        }, 1500); // 1.5 second delay
    }
    // --- END MODIFICATION ---

    // Update progress
    if (autoMode) {
        document.getElementById('matchProgress').textContent =
            `Match ${currentMatchNumber} of ${totalMatches} completed - ${currentMatch.homeTeam} ${currentMatch.homeGoals}-${currentMatch.awayGoals} ${currentMatch.awayTeam}`;
    }
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
    console.log('Cleaning up game objects...');

    // Remove all children from the stage
    while (app.stage.children.length > 0) {
        const child = app.stage.children[0];
        app.stage.removeChild(child);
        if (child.destroy) {
            child.destroy();
        }
    }

    // Clear arrays
    players.length = 0;
    ball = null;
    gameMessage = null;

    console.log('Game objects cleaned up');
}

function startNextMatch() {
    if (matchTransitioning) {
        console.log('Match transition already in progress, skipping...');
        return;
    }

    matchTransitioning = true;
    console.log(`Starting match ${currentMatchNumber + 1}...`);

    // Stop the current game
    gameRunning = false;
    gameStarted = false;

    // Clean up existing game objects
    cleanupGameObjects();

    // Increment match number and reset data
    currentMatchNumber++;
    resetMatchData();

    // Set formations before creating new objects
    currentMatch.homeFormation = getRandomFormation();
    currentMatch.awayFormation = getRandomFormation();
    console.log(`Match ${currentMatchNumber}: Red (${currentMatch.homeFormation}) vs Blue (${currentMatch.awayFormation})`);

    // Recreate all game objects
    console.log('Recreating game objects...');
    createField();
    createAllPlayers();
    createBall();
    createGameMessage();

    // Update displays
    updateScore();

    // --- START MODIFICATION ---
    // Reset odds to pre-match values for the new match
    if (typeof updateBettingOdds === 'function') {
        console.log('Resetting odds to pre-match values for next match.');
        updateBettingOdds();
    }
    // --- END MODIFICATION ---

    // Start betting window for the new match
    showGameMessage("NEW MATCH!\nBetting is open...", 3000);

    // Start betting timer (20 seconds)
    if (typeof startBettingTimer === 'function') {
        startBettingTimer(20);
        if (typeof showBetMessage === 'function') {
            showBetMessage('New match starting! Place your bets now!', 'info');
        }
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
    totalMatches = parseInt(document.getElementById('matchCount').value);
    if (totalMatches < 1) {
        alert('Please enter a valid number of matches (1 or more)');
        return;
    }

    // Reset everything
    matchData = [];
    currentMatchNumber = 1;
    autoMode = totalMatches > 1;

    document.getElementById('startMatches').disabled = true;
    document.getElementById('downloadCSV').style.display = 'none';
    document.getElementById('matchProgress').textContent = `Starting ${totalMatches} match${totalMatches > 1 ? 'es' : ''}...`;

    // Start first match
    resetMatchData();

    // Set formations before resetting positions
    currentMatch.homeFormation = getRandomFormation();
    currentMatch.awayFormation = getRandomFormation();
    console.log(`Match ${currentMatchNumber}: Red (${currentMatch.homeFormation}) vs Blue (${currentMatch.awayFormation})`);

    resetToCenter();
    updateScore();
    // Betting window will be started by default, which will then start the match
});

document.getElementById('downloadCSV').addEventListener('click', downloadCSV);



// Game speed control
function updateGameSpeed() {
    const speedInput = document.getElementById('gameSpeed');
    const speedDisplay = document.getElementById('speedDisplay');

    if (!speedInput || !speedDisplay) {
        console.error('Speed control elements not found');
        return;
    }

    const speed = parseFloat(speedInput.value) || 1.0;
    const clampedSpeed = Math.max(0.1, Math.min(50, speed)); // Clamp between 0.1 and 50

    if (app && app.ticker) {
        // Set ticker speed to match desired game speed
        app.ticker.speed = clampedSpeed;

        speedDisplay.textContent = `Speed: ${clampedSpeed.toFixed(1)}x`;
        console.log(`Game speed set to: ${clampedSpeed}x`);
    } else {
        console.error('App or ticker not available');
    }
}

// Initialize speed control when DOM is ready
function initSpeedControl() {
    const speedInput = document.getElementById('gameSpeed');
    const speedDisplay = document.getElementById('speedDisplay');
    const testButton = document.getElementById('testSpeed');

    if (speedInput && speedDisplay) {
        // Set initial speed display
        updateGameSpeed();

        // Add event listeners
        speedInput.addEventListener('input', updateGameSpeed);
        speedInput.addEventListener('change', updateGameSpeed);

        // Test button functionality
        if (testButton) {
            testButton.addEventListener('click', () => {
                speedInput.value = speedInput.value === '5' ? '1' : '5';
                updateGameSpeed();
                testButton.textContent = speedInput.value === '5' ? 'Test 1x Speed' : 'Test 5x Speed';
            });
        }

        console.log('Speed control initialized');
    } else {
        console.error('Speed control elements not found during initialization');
    }
}

// Start the game when DOM is ready
function startGameWhenReady() {
    console.log('Starting game initialization...');
    console.log('PIXI available:', typeof PIXI !== 'undefined');
    console.log('App created:', !!app);
    console.log('App view:', !!app?.view);
    console.log('DOM ready state:', document.readyState);

    try {
        initGame();
        console.log('Game initialized successfully, gameRunning:', gameRunning);
    } catch (error) {
        console.error('Error initializing game:', error);
    }
}

// Ensure DOM is ready before starting game
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startGameWhenReady);
} else {
    startGameWhenReady();
}

// Initialize speed control after game is ready
setTimeout(() => {
    initSpeedControl();
}, 100);

// Manual function to start a new match with betting (for testing)
function startNewMatchWithBetting() {
    console.log('Starting new match with betting...');

    // Reset game state
    gameRunning = false;
    gameStarted = false;
    matchTransitioning = false;

    // Reset match data
    resetMatchData();

    // Set formations
    currentMatch.homeFormation = getRandomFormation();
    currentMatch.awayFormation = getRandomFormation();

    // Update displays
    updateScore();

    // Start betting window
    if (typeof startBettingTimer === 'function') {
        startBettingTimer(20);
        if (typeof showBetMessage === 'function') {
            showBetMessage('New match! Betting window is open - place your bets!', 'info');
        }
    }

    showGameMessage("NEW MATCH!\nBetting is open...", 3000);
}

// Debug function to check system status
function debugBettingSystem() {
    console.log('=== BETTING SYSTEM DEBUG ===');
    console.log('bettingWindowOpen:', bettingWindowOpen);
    console.log('bettingTimeLeft:', bettingTimeLeft);
    console.log('bettingTimer:', bettingTimer);
    console.log('marketsLocked:', marketsLocked);
    console.log('gameRunning:', gameRunning);
    console.log('gameStarted:', gameStarted);
    console.log('autoMode:', autoMode);

    // Check if key elements exist
    const bettingTimer = document.getElementById('bettingTimer');
    const bettingStatus = document.getElementById('bettingStatus');
    const betMessage = document.getElementById('betMessage');
    const bettingMarkets = document.getElementById('bettingMarkets');

    console.log('bettingTimer element:', bettingTimer);
    console.log('bettingStatus element:', bettingStatus);
    console.log('betMessage element:', betMessage);
    console.log('bettingMarkets element:', bettingMarkets);

    if (bettingMarkets) {
        console.log('bettingMarkets display:', bettingMarkets.style.display);
        console.log('bettingMarkets visibility:', bettingMarkets.style.visibility);
        console.log('bettingMarkets classes:', bettingMarkets.className);
    }

    // Check if key functions exist
    console.log('startBettingTimer function:', typeof startBettingTimer);
    console.log('showBetMessage function:', typeof showBetMessage);
    console.log('showBettingStatus function:', typeof showBettingStatus);
    console.log('toggleBettingMarkets function:', typeof toggleBettingMarkets);
    console.log('=== END DEBUG ===');
}

// Force show betting interface for testing
function forceShowBetting() {
    console.log('Force showing betting interface...');

    // Reset all betting states
    bettingWindowOpen = true;
    marketsLocked = false;
    bettingTimeLeft = 20;

    const bettingMarkets = document.getElementById('bettingMarkets');
    if (bettingMarkets) {
        bettingMarkets.style.display = 'block';
        bettingMarkets.style.visibility = 'visible';
        bettingMarkets.style.opacity = '1';
        bettingMarkets.classList.remove('disabled');
        console.log('Betting markets forced visible');
    }

    // Unlock markets
    if (typeof unlockMarkets === 'function') {
        unlockMarkets();
    }

    showBettingStatus('open');
    toggleBettingMarkets(true);

    const timerContainer = document.getElementById('bettingTimerContainer');
    if (timerContainer) {
        timerContainer.style.display = 'block';
        console.log('Timer container shown');
    }

    console.log('Betting interface force-shown with all states reset');
}

// Force reset betting state
function resetBettingState() {
    console.log('Resetting betting state...');

    // Reset all variables
    bettingWindowOpen = false;
    marketsLocked = false;
    bettingTimeLeft = 0;

    if (bettingTimer) {
        clearInterval(bettingTimer);
        bettingTimer = null;
    }

    // Reset game states that might interfere
    gameRunning = false;
    // Don't reset gameStarted as it might be needed for other logic

    console.log('Betting state reset complete');
}

// Make debug function globally available
window.debugBettingSystem = debugBettingSystem;
window.startNewMatchWithBetting = startNewMatchWithBetting;
window.forceShowBetting = forceShowBetting;
window.resetBettingState = resetBettingState;

/* --- BETTING DASHBOARD FUNCTIONALITY --- */

// Historical data from 1000 simulations
const historicalStats = {
    homeWins: 343,
    draws: 288,
    awayWins: 369,
    totalMatches: 1000,
    homeGoals: {
        0: 298, 1: 395, 2: 218, 3: 67, 4: 18, 5: 3, 6: 1
    },
    awayGoals: {
        0: 289, 1: 380, 2: 204, 3: 98, 4: 22, 5: 6, 6: 1
    },
    firstHalfHome: {
        0: 575, 1: 330, 2: 81, 3: 13, 4: 1
    },
    firstHalfAway: {
        0: 539, 1: 357, 2: 82, 3: 16, 4: 6
    },
    avgHomeGoals: 1.125,
    avgAwayGoals: 1.206,
    avgFirstHalfHome: 0.535,
    avgFirstHalfAway: 0.593
};

// Calculate betting odds based on probabilities
function calculateOdds(probability, margin = 0.05) {
    // Add bookmaker margin and convert to decimal odds
    const adjustedProb = probability * (1 + margin);
    return Math.max(1.01, 1 / adjustedProb);
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

    // Total Goals Market (Over/Under 2.5)
    let over25Count = 0;
    for (let homeGoals = 0; homeGoals <= 6; homeGoals++) {
        for (let awayGoals = 0; awayGoals <= 6; awayGoals++) {
            if (homeGoals + awayGoals > 2.5) {
                const homeProb = (stats.homeGoals[homeGoals] || 0) / total;
                const awayProb = (stats.awayGoals[awayGoals] || 0) / total;
                over25Count += homeProb * awayProb * total;
            }
        }
    }

    const over25Prob = over25Count / total;
    const under25Prob = 1 - over25Prob;

    updateOddElement('over25Odd', 'button[data-outcome="over-2.5"]', over25Prob);
    updateOddElement('under25Odd', 'button[data-outcome="under-2.5"]', under25Prob);


    // Both Teams To Score
    const homeScoreProb = 1 - (stats.homeGoals[0] / total);
    const awayScoreProb = 1 - (stats.awayGoals[0] / total);
    const bttsYesProb = homeScoreProb * awayScoreProb;
    const bttsNoProb = 1 - bttsYesProb;

    updateOddElement('bttsYesOdd', 'button[data-outcome="yes"]', bttsYesProb);
    updateOddElement('bttsNoOdd', 'button[data-outcome="no"]', bttsNoProb);

    // First Half Goals (Over/Under 0.5)
    const fhHomeScoreProb = 1 - (stats.firstHalfHome[0] / total);
    const fhAwayScoreProb = 1 - (stats.firstHalfAway[0] / total);
    const fhOver05Prob = 1 - ((stats.firstHalfHome[0] / total) * (stats.firstHalfAway[0] / total));
    const fhUnder05Prob = 1 - fhOver05Prob;

    updateOddElement('fhOver05Odd', 'button[data-outcome="over-0.5"]', fhOver05Prob);
    updateOddElement('fhUnder05Odd', 'button[data-outcome="under-0.5"]', fhUnder05Prob);

    // Re-enable all fh-goals buttons (as this is pre-match)
    document.querySelectorAll('button[data-market="fh-goals"]').forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('suspended');
        btn.style.pointerEvents = 'auto';
        const selectionEl = btn.querySelector('.selection');
        const oddsEl = btn.querySelector('.odds-value');
        if (selectionEl && selectionEl.textContent.includes('Market Closed')) {
             // Reset text
             const outcome = btn.dataset.outcome;
             if(outcome === 'over-0.5') selectionEl.textContent = 'Over 0.5';
             if(outcome === 'under-0.5') selectionEl.textContent = 'Under 0.5';
             if(outcome === 'over-1.5') selectionEl.textContent = 'Over 1.5';
             if(outcome === 'under-1.5') selectionEl.textContent = 'Under 1.5';
             if(outcome === 'over-2.5') selectionEl.textContent = 'Over 2.5';
             if(outcome === 'under-2.5') selectionEl.textContent = 'Under 2.5';
        }
    });
}

// Countdown timer between matches
let countdownInterval;
let countdownSeconds = 0;

function startMatchCountdown(seconds = 20) {
    countdownSeconds = seconds;
    const countdownElement = document.getElementById('matchCountdown');

    countdownInterval = setInterval(() => {
        if (countdownSeconds > 0) {
            countdownElement.textContent = `Next match in: ${countdownSeconds}s`;
            countdownSeconds--;
        } else {
            countdownElement.textContent = 'Match starting...';
            clearInterval(countdownInterval);
        }
    }, 1000);
}

function stopMatchCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    document.getElementById('matchCountdown').textContent = 'Match in progress...';
}

// Add betting odds animation
function animateOddsChange() {
    const oddElements = document.querySelectorAll('.odds-value');
    oddElements.forEach(element => {
        element.style.transform = 'scale(1.1)';
        element.style.color = '#ff6b6b';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.color = '#ffd700';
        }, 300);
    });
}

// Betting system variables
let userBalance = 1000.00;
let activeBets = [];
let currentBet = null;
let marketsLocked = false;
let bettingTimer = null;
let bettingTimeLeft = 0;
let bettingWindowOpen = true;

// Balance and market functions are defined in the enhanced betting system below

// Betting functions are handled in the enhanced betting system below

// Initialize betting dashboard
function initBettingDashboard() {
    updateBettingOdds();
    updateBalanceDisplay();

    // Add click handlers for betting odds
    document.querySelectorAll('.odds-btn').forEach(item => {
        item.addEventListener('click', function (e) {
            // This functionality is handled by handleOddsClick
            // selectBet(market, this.querySelector('.outcome').textContent, odd);
            
            // The handleOddsClick function is now the primary listener
        });
    });

    // Bet amount input handler
    document.getElementById('betAmount').addEventListener('input', updatePotentialWin);

    // Place bet button
    document.getElementById('placeBet').addEventListener('click', placeBet);

    // Clear bet button
    document.getElementById('clearBet').addEventListener('click', clearBet);
}

// Betting dashboard initialization is now handled in the enhanced DOM initialization above

/* --- ENHANCED BETTING SYSTEM --- */

// Remove duplicate betting variables (already declared above)
// Merge betting functionality

// Update balance display
function updateBalanceDisplay() {
    const balanceElement = document.getElementById('userBalance');
    if (balanceElement) {
        balanceElement.textContent = `$${userBalance.toFixed(2)}`;
    }
}

// Enhanced betting system initialization
function initializeBetting() {
    console.log('Initializing betting system...');
    updateBalanceDisplay();
    setupBettingEventListeners();
    updateBetslip();
    updateBettingOdds(); // Also update odds

    // Ensure betting markets are visible and enabled by default
    const marketsElement = document.getElementById('bettingMarkets');
    if (marketsElement) {
        console.log('Setting up betting markets visibility...');
        marketsElement.style.display = 'block';
        marketsElement.style.visibility = 'visible';
        marketsElement.classList.remove('disabled');
    }

    console.log('Betting system initialized');
}

// Setup event listeners for betting
function setupBettingEventListeners() {
    // Odds button clicks
    document.querySelectorAll('.odds-btn').forEach(btn => {
        btn.removeEventListener('click', handleOddsClick); // Remove existing listeners
        btn.addEventListener('click', handleOddsClick);
    });

    // Bet amount input
    const betAmountInput = document.getElementById('betAmount');
    if (betAmountInput) {
        betAmountInput.removeEventListener('input', updatePotentialWin);
        betAmountInput.addEventListener('input', updatePotentialWin);
    }

    // Place bet button
    const placeBetBtn = document.getElementById('placeBet');
    if (placeBetBtn) {
        placeBetBtn.removeEventListener('click', placeBet);
        placeBetBtn.addEventListener('click', placeBet);
    }

    // Clear bet button
    const clearBetBtn = document.getElementById('clearBet');
    if (clearBetBtn) {
        clearBetBtn.removeEventListener('click', clearBet);
        clearBetBtn.addEventListener('click', clearBet);
    }
}

// Handle odds button click
function handleOddsClick(event) {
    if (marketsLocked) {
        showBetMessage('Markets are currently suspended during live play', 'warning');
        return;
    }
    
    const btn = event.currentTarget;
    if (btn.disabled) {
        showBetMessage('This market is settled or closed', 'warning');
        return;
    }

    const market = btn.dataset.market;
    const outcome = btn.dataset.outcome;
    const odds = parseFloat(btn.dataset.odd);

    // Clear previous selection
    document.querySelectorAll('.odds-btn').forEach(b => b.classList.remove('selected'));

    // Select current button
    btn.classList.add('selected');

    // Create bet object
    currentBet = {
        market: market,
        outcome: outcome,
        odds: odds,
        selection: btn.querySelector('.selection-name')?.textContent || btn.querySelector('.selection')?.textContent,
        marketName: getMarketDisplayName(market)
    };

    updateBetslip();
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

    // Update bet details
    const betMarketNameEl = document.getElementById('betMarketName');
    const betSelectionNameEl = document.getElementById('betSelectionName');
    const betOddsEl = document.getElementById('betOdds');

    if (betMarketNameEl) betMarketNameEl.textContent = currentBet.marketName;
    if (betSelectionNameEl) betSelectionNameEl.textContent = currentBet.selection;
    if (betOddsEl) betOddsEl.textContent = currentBet.odds.toFixed(2);

    // Update potential win
    updatePotentialWin();
}

// Update potential win calculation
function updatePotentialWin() {
    const betAmount = parseFloat(document.getElementById('betAmount').value) || 0;
    const potentialWinSpan = document.getElementById('potentialWin');

    if (currentBet && betAmount > 0) {
        const potentialWin = (betAmount * currentBet.odds); // This should be total return
        potentialWinSpan.textContent = potentialWin.toFixed(2); // Show total return
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

    const betAmount = parseFloat(document.getElementById('betAmount').value);

    if (!betAmount || betAmount <= 0) {
        showBetMessage('Please enter a valid bet amount', 'error');
        return;
    }

    if (betAmount > userBalance) {
        showBetMessage('Insufficient balance', 'error');
        return;
    }

    if (!bettingWindowOpen) {
        showBetMessage('Betting window is closed', 'error');
        return;
    }

    if (marketsLocked) {
        showBetMessage('Cannot place bet - markets are suspended', 'error');
        return;
    }

    // Deduct from balance
    userBalance -= betAmount;
    updateBalanceDisplay();

    // Create active bet
    const activeBet = {
        id: Date.now(),
        market: currentBet.market,
        outcome: currentBet.outcome,
        selection: currentBet.selection,
        marketName: currentBet.marketName,
        odds: currentBet.odds,
        stake: betAmount,
        potentialReturn: (betAmount * currentBet.odds),
        status: 'pending',
        timestamp: new Date()
    };

    activeBets.push(activeBet);
    updateActiveBets();

    showBetMessage(`Bet placed successfully! $${betAmount.toFixed(2)} on ${currentBet.selection}`, 'success');

    // Clear betslip
    clearBet();
}

// Clear bet
function clearBet() {
    currentBet = null;
    document.getElementById('betAmount').value = '';
    document.querySelectorAll('.odds-btn').forEach(btn => btn.classList.remove('selected'));
    updateBetslip();
    hideBetMessage();
}

// Show bet message
function showBetMessage(message, type) {
    const messageDiv = document.getElementById('betMessage');
    messageDiv.textContent = message;
    messageDiv.className = `bet-message ${type}`;
    messageDiv.style.display = 'block';

    // Auto hide after 5 seconds
    setTimeout(() => {
        hideBetMessage();
    }, 5000);
}

// Hide bet message
function hideBetMessage() {
    document.getElementById('betMessage').style.display = 'none';
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
                <div class="bet-market">${bet.marketName}</div>
                <div class="bet-selection-details">${bet.selection}</div>
                <div class="bet-stake-odds">
                    Stake: $${bet.stake.toFixed(2)} @ ${bet.odds.toFixed(2)}
                </div>
                <div class="bet-potential-return">
                    Return: $${(bet.status === 'won') ? bet.potentialReturn.toFixed(2) : (bet.status === 'pending' ? bet.potentialReturn.toFixed(2) : '0.00')}
                </div>
            </div>
            <div class="bet-status">${bet.status}</div>
        </div>
    `).join('');
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

    // Update live indicator
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
        btn.classList.remove('suspended');
    });

    // Update live indicator
    const liveIndicator = document.querySelector('.live-indicator');
    if (liveIndicator) {
        liveIndicator.textContent = '● LIVE';
    }
}

// Settle bets after match
function settleBets(matchResult) {
    // Safety check - don't settle if no result
    if (!matchResult || activeBets.length === 0) {
        console.log('Skipping bet settlement - no result or no bets');
        return;
    }

    console.log('Settling bets with result:', matchResult);

    activeBets.forEach(bet => {
        if (bet.status !== 'pending') return;

        let won = false;

        // Check bet outcome based on match result
        switch (bet.market) {
            case '1x2':
                if (bet.outcome === 'red-win' && matchResult.winner === 'red') won = true;
                if (bet.outcome === 'blue-win' && matchResult.winner === 'blue') won = true;
                if (bet.outcome === 'draw' && matchResult.winner === 'draw') won = true;
                break;

            case 'total-goals':
                const totalGoals = matchResult.totalGoals;
                const line = parseFloat(bet.outcome.split('-')[1]);
                if (bet.outcome.startsWith('over') && totalGoals > line) won = true;
                if (bet.outcome.startsWith('under') && totalGoals < line) won = true;
                break;

            case 'btts':
                const btts = matchResult.btts;
                if (bet.outcome === 'yes' && btts) won = true;
                if (bet.outcome === 'no' && !btts) won = true;
                break;

            case 'fh-goals':
                const fhGoals = matchResult.firstHalfGoals;
                const fhLine = parseFloat(bet.outcome.split('-')[1]);
                if (bet.outcome.startsWith('over') && fhGoals > fhLine) won = true;
                if (bet.outcome.startsWith('under') && fhGoals < fhLine) won = true;
                break;
            
            // Add cases for other markets like 'specials' if needed
        }

        if (won) {
            bet.status = 'won';
            const winnings = bet.potentialReturn;
            userBalance += winnings;
            showBetMessage(`Bet won! +$${winnings.toFixed(2)}`, 'success');
        } else {
            bet.status = 'lost';
        }
    });

    updateBalanceDisplay();
    updateActiveBets();
}

// Reinitialize betting after dynamic content updates
function reinitializeBetting() {
    setupBettingEventListeners();
}

// Enhanced DOM initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - starting betting system initialization...');

    // Initialize both betting systems
    setTimeout(() => {
        try {
            console.log('Initializing betting systems...');
            console.log('autoMode:', autoMode);
            console.log('gameStarted:', gameStarted);
            console.log('gameRunning:', gameRunning);

            if (typeof initializeBetting === 'function') {
                console.log('Calling initializeBetting...');
                initializeBetting();
            } else {
                console.error('initializeBetting function not found!');
            }

            if (typeof initBettingDashboard === 'function') {
                console.log('Calling initBettingDashboard...');
                initBettingDashboard();
            } else {
                console.error('initBettingDashboard function not found!');
            }

            // Always start betting window for new matches (unless in auto mode)
            if (!autoMode && typeof startBettingTimer === 'function') {
                console.log('Starting betting timer...');
                startBettingTimer(20); // 20 seconds initial betting window
                if (typeof showBetMessage === 'function') {
                    showBetMessage('Welcome! Betting window is open - place your bets!', 'info');
                } else {
                    console.error('showBetMessage function not found!');
                }
            } else {
                console.log('Not starting betting timer - autoMode:', autoMode, 'startBettingTimer available:', typeof startBettingTimer === 'function');
            }
            console.log('Betting systems initialized successfully');
        } catch (error) {
            console.error('Error initializing betting systems:', error);
            console.error('Error stack:', error.stack);
        }
    }, 1500); // Increased delay to ensure game is fully initialized
});

// Enhanced match event hooks
const enhancedOriginalStartPlay = startPlay;
startPlay = function () {
    // Call original startPlay first
    enhancedOriginalStartPlay.apply(this, arguments);

    // Only close betting if there's an active betting window
    try {
        if (typeof bettingWindowOpen !== 'undefined' && bettingWindowOpen) {
            if (typeof closeBettingWindow === 'function') {
                closeBettingWindow();
            }
            if (typeof showBettingStatus === 'function') {
                showBettingStatus('suspended');
            }
            if (typeof showBetMessage === 'function') {
                showBetMessage('Match started - betting suspended!', 'warning');
            }
        }

        // Disable betting markets during match
        if (typeof toggleBettingMarkets === 'function') {
            toggleBettingMarkets(false);
        }

        // Sync overlay immediately
        syncOverlayWithGameState();
    } catch (error) {
        console.error('Error in enhanced startPlay:', error);
    }
};

// Hook into game state changes
function checkGameState() {
    // Only lock markets when the game is actually running (not just started)
    if (gameRunning && !marketsLocked) {
        // console.log('Game is running, locking markets...'); // This logs too much
        lockMarkets();
    } else if (!gameRunning && marketsLocked && gameStarted) {
         // This condition is tricky because halftime also has gameRunning = false
         // We only want to unlock if it's NOT halftime
        if (gameHalf === 1 && timer < halftimeSeconds + injuryTime.first) {
             // Game paused but not halftime, e.g. after goal
             console.log('Game paused, unlocking markets...');
             unlockMarkets();
        }
        
    }
}

// Check game state periodically
setInterval(checkGameState, 1000);

// Betting timer and message functions
function startBettingTimer(seconds = 20) {
    console.log(`Starting betting timer for ${seconds} seconds...`);
    console.log('Current game state - gameRunning:', gameRunning, 'gameStarted:', gameStarted);

    bettingTimeLeft = seconds;
    bettingWindowOpen = true;

    // Clear any existing timer
    if (bettingTimer) {
        console.log('Clearing existing betting timer...');
        clearInterval(bettingTimer);
    }

    // Explicitly unlock markets and enable betting
    console.log('Unlocking markets and enabling betting...');
    marketsLocked = false;

    if (typeof unlockMarkets === 'function') {
        unlockMarkets();
    }

    if (typeof toggleBettingMarkets === 'function') {
        console.log('Enabling betting markets...');
        toggleBettingMarkets(true);
    } else {
        console.error('toggleBettingMarkets function not found!');
    }

    // Show betting open message
    console.log('Showing betting status as open...');
    showBettingStatus('open');

    console.log('Starting betting countdown interval...');
    bettingTimer = setInterval(() => {
        bettingTimeLeft--;
        // console.log(`Betting time left: ${bettingTimeLeft} seconds`); // This logs too much
        updateBettingTimerDisplay();

        if (bettingTimeLeft <= 10 && bettingTimeLeft > 0) {
            // Show warning when 10 seconds left
            showBetMessage(`Betting closes in ${bettingTimeLeft} seconds!`, 'warning');
        } else if (bettingTimeLeft <= 0) {
            // Close betting window
            console.log('Betting time expired, closing window...');
            closeBettingWindow();
        }
    }, 1000);

    // Update display immediately
    updateBettingTimerDisplay();
    console.log(`Betting window opened for ${seconds} seconds, bettingWindowOpen: ${bettingWindowOpen}`);
    console.log('Markets locked status:', marketsLocked);
    console.log('Betting timer ID:', bettingTimer);
}

function closeBettingWindow() {
    bettingWindowOpen = false;
    clearInterval(bettingTimer);
    bettingTimer = null;

    // Lock markets and show closed message
    lockMarkets();
    showBettingStatus('closed');
    
    // --- START MODIFICATION ---
    // Start the game after betting window closes
    if (!gameStarted && !gameRunning) { // Pre-match
        showBetMessage('Betting window closed - match starting soon!', 'error');
        showGameMessage("KICK OFF!\nMatch Starting...", 1000);
        setTimeout(() => startPlay(), 1000);
    } else if (gameHalf === 1 && !gameRunning) { // Halftime check
        // This is the new logic!
        showBetMessage('Halftime betting closed - 2nd half starting!', 'error');
        gameHalf = 2;
        timer = halftimeSeconds; // Set timer to 45:00
        injuryTimeStarted = false;
        resetToCenter();
        showGameMessage("SECOND HALF!\nStarting...", 1000);
        setTimeout(() => startPlay(), 1000); // Start 2nd half
    }
    // --- END MODIFICATION ---
}


function updateBettingTimerDisplay() {
    const timerElement = document.getElementById('bettingTimer');
    if (timerElement && bettingWindowOpen) {
        const minutes = Math.floor(bettingTimeLeft / 60);
        const seconds = bettingTimeLeft % 60;
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Add urgency styling when time is running out
        if (bettingTimeLeft <= 10) {
            timerElement.classList.add('urgent');
        } else {
            timerElement.classList.remove('urgent');
        }
    }

    // Update overlay timer as well (will be validated against game state)
    if (bettingWindowOpen) {
        updateOverlayBettingStatus('open', bettingTimeLeft);
    } else {
        syncOverlayWithGameState();
    }
}

function showBettingStatus(status) {
    console.log('showBettingStatus called with status:', status);
    const statusElement = document.getElementById('bettingStatus');
    const timerContainer = document.getElementById('bettingTimerContainer');
    const marketsElement = document.getElementById('bettingMarkets');

    console.log('Status element found:', !!statusElement);
    console.log('Timer container found:', !!timerContainer);
    console.log('Markets element found:', !!marketsElement);

    if (statusElement) {
        if (status === 'open') {
            console.log('Setting betting status to OPEN');
            statusElement.innerHTML = `
                <div class="betting-status-open">
                    <span class="status-icon">🟢</span>
                    <span class="status-text">Betting Open</span>
                </div>
            `;
            statusElement.className = 'betting-status open';

            // Make sure the entire betting interface is visible
            if (marketsElement) {
                marketsElement.style.display = 'block';
                marketsElement.style.visibility = 'visible';
                marketsElement.classList.remove('disabled');
                console.log('Made betting markets visible');
            }

        } else if (status === 'closed') {
            console.log('Setting betting status to CLOSED');
            statusElement.innerHTML = `
                <div class="betting-status-closed">
                    <span class="status-icon">🔴</span>
                    <span class="status-text">Betting Closed</span>
                </div>
            `;
            statusElement.className = 'betting-status closed';
        } else if (status === 'suspended') {
            console.log('Setting betting status to SUSPENDED');
            statusElement.innerHTML = `
                <div class="betting-status-suspended">
                    <span class="status-icon">⏸️</span>
                    <span class="status-text">Betting Suspended</span>
                </div>
            `;
            statusElement.className = 'betting-status suspended';
        }
    } else {
        console.error('Betting status element not found!');
    }

    // Update overlay status as well (will be validated against game state)
    updateOverlayBettingStatus(status);

    // Show/hide timer container
    if (timerContainer) {
        timerContainer.style.display = (status === 'open') ? 'block' : 'none';
        console.log('Timer container display set to:', (status === 'open') ? 'block' : 'none');
    } else {
        console.error('Timer container not found!');
    }
}

// Additional betting dashboard functions
function toggleBettingMarkets(enabled) {
    console.log('toggleBettingMarkets called with enabled:', enabled);
    const marketsElement = document.getElementById('bettingMarkets');

    if (marketsElement) {
        console.log('Found betting markets element');
        if (enabled) {
            console.log('Enabling betting markets...');
            marketsElement.classList.remove('disabled');
            marketsElement.style.display = 'block';
            marketsElement.style.visibility = 'visible';
            marketsElement.style.opacity = '1';

            // Enable all betting buttons that aren't settled
            const bettingButtons = marketsElement.querySelectorAll('.odds-btn');
            bettingButtons.forEach(btn => {
                if (!btn.disabled) { // Only re-enable if not explicitly disabled (e.g., settled)
                    btn.style.pointerEvents = 'auto';
                }
            });

            console.log('Betting markets enabled');
        } else {
            console.log('Disabling betting markets...');
            marketsElement.classList.add('disabled');

            // Disable all betting buttons
            const bettingButtons = marketsElement.querySelectorAll('.odds-btn');
            bettingButtons.forEach(btn => {
                btn.style.pointerEvents = 'none';
            });

            console.log('Betting markets disabled');
        }
    } else {
        console.error('Betting markets element not found!');
    }
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
    console.log(`Updating live odds using Poisson. HT Score: ${score.red} - ${score.blue}`);
    
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
    let totalOver25Prob = 0;
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
            if (final_total_goals > 2.5) {
                totalOver25Prob += prob_this_outcome;
            }

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


    // --- Total Goals O/U 2.5 ---
    const currentTotalGoals = currentHomeGoals + currentAwayGoals;
    if (currentTotalGoals > 2.5) {
        // Market is already settled as Over
        disableMarketButton(document.querySelector('button[data-outcome="over-2.5"]'), "Settled (Over)");
        disableMarketButton(document.querySelector('button[data-outcome="under-2.5"]'), "Settled (Over)");
    } else {
        // Normalize O/U 2.5 probability
        const finalOver25Prob = totalOver25Prob / totalProbSum;
        const finalUnder25Prob = 1.0 - finalOver25Prob;
        
        updateOddElement('over25Odd', 'button[data-outcome="over-2.5"]', finalOver25Prob);
        updateOddElement('under25Odd', 'button[data-outcome="under-2.5"]', finalUnder25Prob);
    }
    
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

    // --- First Half Goals Market ---
    // This market is always closed at halftime.
    document.querySelectorAll('button[data-market="fh-goals"]').forEach(btn => {
        disableMarketButton(btn, "Market Closed");
    });

    // Animate the odds changes
    animateOddsChange();
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
    const newOdd = calculateOdds(saneProbability, 0.05); // Use existing calculateOdds function
    const newOddStr = newOdd.toFixed(2);
    
    // Don't update if odd is unrealistic (e.g., > 1000)
    if (newOdd > 1000) {
        disableMarketButton(oddButton, "N/A");
        return;
    }

    oddSpan.textContent = newOddStr;
    oddButton.dataset.odd = newOddStr;
    
    // Re-enable button in case it was disabled (e.g., for a new match)
    oddButton.disabled = false;
    oddButton.classList.remove('suspended');
    oddButton.style.pointerEvents = 'auto';
    
    // Reset selection text
    const selectionEl = oddButton.querySelector('.selection-name') || oddButton.querySelector('.selection');
    if (selectionEl) {
        // Reset text from "Settled" etc. This is a bit manual,
        // might need a better way to store original text.
        const outcome = oddButton.dataset.outcome;
        if (outcome === 'red-win') selectionEl.textContent = 'Red Team';
        else if (outcome === 'blue-win') selectionEl.textContent = 'Blue Team';
        else if (outcome === 'draw') selectionEl.textContent = 'Draw';
        else if (outcome.includes('over-2.5')) selectionEl.textContent = 'Over 2.5';
        else if (outcome.includes('under-2.5')) selectionEl.textContent = 'Under 2.5';
        else if (outcome === 'yes') selectionEl.textContent = 'Yes';
        else if (outcome === 'no') selectionEl.textContent = 'No';
    }
}

/**
 * Helper function to disable a market button.
 * @param {HTMLElement} buttonElement - The button to disable.
 *S @param {string} text - The text to display (e.g., "Settled").
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
function updateOverlayBettingStatus(status, timeLeft = null) {
    const statusIndicator = document.getElementById('overlayStatusIndicator');
    const statusText = document.getElementById('overlayStatusText');
    const bettingTimer = document.getElementById('overlayBettingTimer');
    const timerValue = document.getElementById('overlayTimerValue');

    if (!statusIndicator || !statusText) return;

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

