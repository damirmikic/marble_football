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
const BALL_RADIUS = 8; // Larger ball
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
document.body.appendChild(app.view);

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
    ball = new PIXI.Graphics();
    ball.beginFill(0xFFFFFF); // White
    ball.drawCircle(0, 0, BALL_RADIUS);
    ball.endFill();
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

    // Set the goal video
    if (team === 'red') {
        goalVideoSource.src = 'Video_of_Goal_Celebration_red.mp4';
        goalImage.src = 'images/red score.png'; // Fallback image
        goalText.textContent = 'RED TEAM SCORES!';
        console.log('Loading red team video: Video_of_Goal_Celebration_red.mp4');
    } else {
        goalVideoSource.src = 'Video_of_Goal_Celebrations_blue.mp4';
        goalImage.src = 'images/blue score.png'; // Fallback image
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
    goalVideo.onended = function() {
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

    // Handle image load error (fallback to placeholder)
    goalImage.onerror = function () {
        this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNDQ0Ii8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkdPQUwhPC90ZXh0Pgo8L3N2Zz4K';
    };
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
        // Start Half 2
        gameHalf = 2;
        timer = halftimeSeconds; // Continue from 45 to 90
        injuryTimeStarted = false;
        gameRunning = false;
        showGameMessage("HALF TIME!", 2000);
        resetToCenter();
        setTimeout(() => startPlay(), 2000); // Start after 2 seconds
    } else if (gameHalf === 2 && timer >= halftimeSeconds * 2 && !injuryTimeStarted) {
        // Generate injury time for second half (3-6 seconds)
        injuryTime.second = Math.floor(Math.random() * 4) + 3;
        injuryTimeStarted = true;
        showGameMessage(`+${injuryTime.second} INJURY TIME`, 2000);
    } else if (gameHalf === 2 && timer >= halftimeSeconds * 2 + injuryTime.second) {
        // Game Over
        gameRunning = false;
        finishMatch();
        if (autoMode && currentMatchNumber < totalMatches) {
            setTimeout(() => startNextMatch(), 1000);
        } else if (autoMode && currentMatchNumber >= totalMatches) {
            showGameMessage(`ALL MATCHES COMPLETE!\n${totalMatches} matches played`, 5000);
            document.getElementById('downloadCSV').style.display = 'inline-block';
            document.getElementById('startMatches').disabled = false;
            autoMode = false;
        } else {
            showGameMessage(`FULL TIME!\nRed ${score.red} - ${score.blue} Blue`, 5000);
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
}

function updateScore() {
    scoreDisplay.innerHTML = `
        <span class="team-red">Red: ${score.red}</span> - 
        <span class="team-blue">Blue: ${score.blue}</span>`;
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

function initGame() {
    createField();
    createAllPlayers();
    createBall();
    createGameMessage();
    updateScore(); // Initial score display

    // Start the game loop
    app.ticker.add(() => {
        if (gameRunning) {
            // Use deltaTime directly from ticker (already normalized and speed-adjusted)
            const deltaTime = app.ticker.deltaTime;
            updateTimer(app.ticker.elapsedMS);
            updatePlayers(deltaTime);
            updateBall(deltaTime);
            checkAllCollisions();
        }
    });

    // Show initial message and start the game
    showGameMessage("KICK OFF!\nGame Starting...", 1000);
    setTimeout(() => startPlay(), 1000);
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
async function generateHistoricalData(numMatches = 1000, progressCallback = null) {
    console.log(`Generating ${numMatches} matches of historical data...`);
    
    const formationNames = Object.keys(formations);
    const results = [];
    
    // Process in batches to avoid blocking UI
    const batchSize = 50;
    for (let i = 0; i < numMatches; i += batchSize) {
        const batchCount = Math.min(batchSize, numMatches - i);
        
        // Random formation matchup
        const homeFormation = formationNames[Math.floor(Math.random() * formationNames.length)];
        const awayFormation = formationNames[Math.floor(Math.random() * formationNames.length)];
        
        // Simulate batch
        const batchResults = await simulateMatchFast(homeFormation, awayFormation, batchCount);
        results.push(...batchResults);
        
        // Update progress
        const completed = i + batchCount;
        const percentage = Math.round((completed / numMatches) * 100);
        console.log(`Progress: ${completed}/${numMatches} matches completed (${percentage}%)`);
        
        // Call progress callback if provided
        if (progressCallback) {
            progressCallback(completed, numMatches, percentage);
        }
        
        // Small delay to prevent browser freezing
        await new Promise(resolve => setTimeout(resolve, 1));
    }
    
    console.log('Historical data generation complete!');
    localStorage.setItem('historicalData', JSON.stringify(results));
    return results;
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
    matchData.push({ ...currentMatch });

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

function startNextMatch() {
    currentMatchNumber++;
    resetMatchData();

    // Set formations before resetting positions
    currentMatch.homeFormation = getRandomFormation();
    currentMatch.awayFormation = getRandomFormation();
    console.log(`Match ${currentMatchNumber}: Red (${currentMatch.homeFormation}) vs Blue (${currentMatch.awayFormation})`);

    resetToCenter();
    updateScore();
    setTimeout(() => startPlay(), 500);
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

function generateHistoricalCSV() {
    const historicalData = JSON.parse(localStorage.getItem('historicalData') || '[]');
    
    if (historicalData.length === 0) {
        alert('No historical data available. Please generate historical data first.');
        return '';
    }

    const headers = [
        'Match Number', 'Home Goals', 'Away Goals', 'Home Goals H1', 'Away Goals H1',
        'Home Goals H2', 'Away Goals H2', 'Total Goals', 'BTTS', 'Winner', 'Result'
    ];

    let csv = headers.join(',') + '\n';

    historicalData.forEach((match, index) => {
        const row = [
            index + 1,
            match.homeGoals,
            match.awayGoals,
            match.homeGoalsH1 || 0,
            match.awayGoalsH1 || 0,
            match.homeGoalsH2 || 0,
            match.awayGoalsH2 || 0,
            match.totalGoals,
            match.btts ? 'Yes' : 'No',
            match.winner,
            match.matchData.result
        ];
        csv += row.join(',') + '\n';
    });

    return csv;
}

function downloadHistoricalCSV() {
    const csv = generateHistoricalCSV();
    if (!csv) return; // No data available
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historical_soccer_data_${new Date().toISOString().split('T')[0]}.csv`;
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
    setTimeout(() => startPlay(), 1000);
});

document.getElementById('downloadCSV').addEventListener('click', downloadCSV);

// Historical data download button
document.getElementById('downloadHistoricalData').addEventListener('click', downloadHistoricalCSV);

// Historical data generation button
document.getElementById('generateData').addEventListener('click', async () => {
    const button = document.getElementById('generateData');
    const progressDiv = document.getElementById('historyProgress');
    const progressBarContainer = document.getElementById('historyProgressBar');
    const progressFill = document.getElementById('historyProgressFill');
    const progressText = document.getElementById('historyProgressText');
    const countInput = document.getElementById('historyCount');
    
    const numMatches = parseInt(countInput.value) || 1000;
    
    button.disabled = true;
    button.textContent = 'Generating...';
    progressDiv.textContent = 'Starting historical data generation...';
    
    // Show progress bar
    progressBarContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
    
    // Progress callback function
    const updateProgress = (completed, total, percentage) => {
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}% (${completed}/${total} matches)`;
        progressDiv.textContent = `Generating matches... ${completed}/${total} completed`;
    };
    
    try {
        const historicalData = await generateHistoricalData(numMatches, updateProgress);
        
        // Final success state
        progressFill.style.width = '100%';
        progressText.textContent = '100% Complete!';
        progressDiv.textContent = `Generated ${historicalData.length} matches! Data saved to localStorage.`;
        button.textContent = 'Generate Historical Data';
        
        // Show download button
        document.getElementById('downloadHistoricalData').style.display = 'inline-block';
        
        // Show some statistics
        const stats = analyzeHistoricalData(historicalData);
        console.log('Historical Data Statistics:', stats);
        
        // Hide progress bar after 3 seconds
        setTimeout(() => {
            progressBarContainer.style.display = 'none';
        }, 3000);
        
    } catch (error) {
        console.error('Error generating data:', error);
        progressDiv.textContent = 'Error generating data. Check console for details.';
        progressFill.style.width = '0%';
        progressText.textContent = 'Error!';
        button.textContent = 'Generate Historical Data';
        
        // Hide progress bar after error
        setTimeout(() => {
            progressBarContainer.style.display = 'none';
        }, 3000);
    } finally {
        button.disabled = false;
    }
});

// Analyze historical data for statistics
function analyzeHistoricalData(data) {
    const stats = {
        totalMatches: data.length,
        homeWins: 0,
        draws: 0,
        awayWins: 0,
        totalGoals: 0,
        bttsMatches: 0,
        formationStats: {}
    };
    
    data.forEach(match => {
        if (match.winner === 'home') stats.homeWins++;
        else if (match.winner === 'away') stats.awayWins++;
        else stats.draws++;
        
        stats.totalGoals += match.totalGoals;
        if (match.btts) stats.bttsMatches++;
        
        // Formation statistics
        const key = `${match.homeFormation}_vs_${match.awayFormation}`;
        if (!stats.formationStats[key]) {
            stats.formationStats[key] = { matches: 0, homeWins: 0, draws: 0, awayWins: 0 };
        }
        stats.formationStats[key].matches++;
        if (match.winner === 'home') stats.formationStats[key].homeWins++;
        else if (match.winner === 'away') stats.formationStats[key].awayWins++;
        else stats.formationStats[key].draws++;
    });
    
    stats.homeWinRate = (stats.homeWins / stats.totalMatches * 100).toFixed(1) + '%';
    stats.drawRate = (stats.draws / stats.totalMatches * 100).toFixed(1) + '%';
    stats.awayWinRate = (stats.awayWins / stats.totalMatches * 100).toFixed(1) + '%';
    stats.avgGoalsPerMatch = (stats.totalGoals / stats.totalMatches).toFixed(2);
    stats.bttsRate = (stats.bttsMatches / stats.totalMatches * 100).toFixed(1) + '%';
    
    return stats;
}

// Check for existing historical data and show download button if available
function checkExistingHistoricalData() {
    const historicalData = localStorage.getItem('historicalData');
    if (historicalData && JSON.parse(historicalData).length > 0) {
        document.getElementById('downloadHistoricalData').style.display = 'inline-block';
    }
}

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

// Start the game
initGame();

// Initialize speed control after game is ready
setTimeout(() => {
    initSpeedControl();
}, 100);

// Check for existing data on page load
checkExistingHistoricalData();