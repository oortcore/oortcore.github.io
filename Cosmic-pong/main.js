const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// Game state
let paused = false;
let gameOver = false;
let rally = 0;
let selectedCharacter = 'blaze';
let difficulty = 0.1;

// Game objects
const paddleWidth = 15;
const paddleHeight = 120;

const player = {
    x: 10,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    color: '#ff4500',
    score: 0,
    shadowColor: '#ff4500'
};

const computer = {
    x: canvas.width - paddleWidth - 10,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    color: '#00bfff',
    score: 0,
    shadowColor: '#00bfff'
};

const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 12,
    speed: 8,
    initialSpeed: 8,
    velocityX: 5,
    velocityY: 5,
    spin: 0,
    color: '#ffff00',
    shadowColor: '#ffff00',
    isSlowStart: true
};

// Stars
const stars = [];
for (let i = 0; i < 200; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2.5,
        alpha: Math.random(),
        velocity: Math.random() * 0.2
    });
}

// Particles
const particles = [];

// Sound
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = AudioContext ? new AudioContext() : null;
let lastSoundTime = 0;
const soundCooldown = 100; // Reduced cooldown to allow more frequent sounds

function playSound(type) {
    if (!audioContext) return;
    const currentTime = audioContext.currentTime * 1000; // Convert to ms
    if (currentTime - lastSoundTime < soundCooldown) {
        return; // Prevent rapid sound playing
    }
    lastSoundTime = currentTime;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    if (type === 'hit') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime); // Slightly higher frequency
        gainNode.gain.setValueAtTime(0.6, audioContext.currentTime); // Increased gain
    } else if (type === 'score') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime); // Slightly higher frequency
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime); // Increased gain
    }

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2); // Shorter fade out
    oscillator.stop(audioContext.currentTime + 0.2); // Stop after shorter fade out
}

// Draw functions
function drawRect(x, y, w, h, color, shadowColor) {
    context.fillStyle = color;
    context.shadowColor = shadowColor;
    context.shadowBlur = 20;
    context.fillRect(x, y, w, h);
    context.shadowBlur = 0;
}

function drawCircle(x, y, r, color, shadowColor) {
    context.fillStyle = color;
    context.shadowColor = shadowColor;
    context.shadowBlur = 25;
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2, false);
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
}

function drawText(text, x, y, color) {
    context.fillStyle = color;
    context.font = "40px 'Press Start 2P'";
    context.textAlign = 'center';
    context.fillText(text, x, y);
}

function drawNet() {
    context.strokeStyle = '#888';
    context.lineWidth = 4;
    context.setLineDash([10, 10]);
    context.beginPath();
    context.moveTo(canvas.width / 2, 0);
    context.lineTo(canvas.width / 2, canvas.height);
    context.stroke();
    context.setLineDash([]);
}

function drawStars() {
    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.x += star.velocity;
        if (star.x > canvas.width) {
            star.x = 0;
        }
        context.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        context.beginPath();
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2, false);
        context.fill();
    }
}

function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.velocityX;
        p.y += p.velocityY;
        p.life -= 0.05;
        if (p.life <= 0) {
            particles.splice(i, 1);
        } else {
            context.fillStyle = `rgba(255, 255, 0, ${p.life})`;
            context.beginPath();
            context.arc(p.x, p.y, p.radius, 0, Math.PI * 2, false);
            context.fill();
        }
    }
}

// Game logic
let screenShake = 0;

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.velocityX = (Math.random() > 0.5 ? 1 : -1) * 8; // Start with a fixed slow speed
    ball.velocityY = (Math.random() > 0.5 ? 1 : -1) * 8 * 0.5; // Start with a fixed slow speed
    ball.speed = 8; // Set current speed to slow start speed
    ball.spin = 0;
    rally = 0;
    updateRallyCounter();
    ball.isSlowStart = true; // Indicate slow start
}

function collision(b, p) {
    return b.x + b.radius > p.x && b.x - b.radius < p.x + p.width && b.y + b.radius > p.y && b.y - b.radius < p.y + p.height;
}

canvas.addEventListener('mousemove', movePaddle);

function movePaddle(evt) {
    if (paused) return;
    let rect = canvas.getBoundingClientRect();
    player.y = evt.clientY - rect.top - player.height / 2;

    // Keep player paddle within canvas bounds
    if (player.y < 0) {
        player.y = 0;
    } else if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
    }
}

// Controls
const decreaseSpeedBtn = document.getElementById('decreaseSpeed');
const increaseSpeedBtn = document.getElementById('increaseSpeed');
const speedDisplay = document.getElementById('speedDisplay');
const pauseButton = document.getElementById('pauseButton');
const quitButton = document.getElementById('quitButton');
const rallyCounter = document.getElementById('rallyCounter');

decreaseSpeedBtn.addEventListener('click', () => { if (ball.speed > 1) { ball.speed--; ball.initialSpeed = ball.speed; speedDisplay.textContent = ball.speed; } });
increaseSpeedBtn.addEventListener('click', () => { if (ball.speed < 20) { ball.speed++; ball.initialSpeed = ball.speed; speedDisplay.textContent = ball.speed; } });
pauseButton.addEventListener('click', () => { paused = !paused; pauseButton.textContent = paused ? 'Resume' : 'Pause'; });
quitButton.addEventListener('click', () => { 
    gameOver = true; // Set game over to stop game loop
    startScreen.style.display = 'flex'; // Show start screen
    document.getElementById('gameContainer').style.display = 'none'; // Hide game container
    player.score = 0;
    computer.score = 0;
    resetBall();
    gameOverOverlay.style.display = 'none';
    paused = false; // Ensure game is not paused when returning to menu
    pauseButton.textContent = 'Pause';
});

function updateRallyCounter() {
    rallyCounter.textContent = `Rally: ${rally}`;
}

// Game over
const gameOverOverlay = document.getElementById('gameOverOverlay');
const gameOverMessage = document.getElementById('gameOverMessage');
const restartButton = document.getElementById('restartButton');

restartButton.addEventListener('click', () => {
    gameOver = false;
    paused = false;
    player.score = 0;
    computer.score = 0;
    resetBall();
    gameOverOverlay.style.display = 'none';
});

// Start screen
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const characterElements = document.querySelectorAll('.character');
const difficultyButtons = document.querySelectorAll('.difficulty');

characterElements.forEach(char => {
    char.addEventListener('click', () => {
        characterElements.forEach(c => c.classList.remove('selected'));
        char.classList.add('selected');
        selectedCharacter = char.id;
        updatePlayerColors();
    });
});

difficultyButtons.forEach(button => {
    button.addEventListener('click', () => {
        difficultyButtons.forEach(b => b.classList.remove('selected'));
        button.classList.add('selected');
        difficulty = parseFloat(button.dataset.level);
        ball.speed = parseFloat(button.dataset.speed);
        ball.initialSpeed = ball.speed;
        speedDisplay.textContent = ball.speed;
    });
});

startButton.addEventListener('click', () => {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    startScreen.style.display = 'none';
    document.getElementById('gameContainer').style.display = 'flex';
    gameLoop();
});

function updatePlayerColors() {
    const characterColors = {
        blaze: '#ff4500',
        aqua: '#00ffff',
        terra: '#32cd32'
    };
    player.color = characterColors[selectedCharacter];
    player.shadowColor = characterColors[selectedCharacter];
}

function update() {
    if (paused || gameOver) return;

    ball.x += ball.velocityX;
    ball.y += ball.velocityY;
    ball.y += ball.spin;

    // AI
    computer.y += (ball.y - (computer.y + computer.height / 2)) * difficulty;

    // Keep computer paddle within canvas bounds
    if (computer.y < 0) {
        computer.y = 0;
    } else if (computer.y + computer.height > canvas.height) {
        computer.y = canvas.height - computer.height;
    }

    // Ball collision with top/bottom walls
    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius; // Clamp to top
        ball.velocityY = -ball.velocityY;
        playSound('hit');
    } else if (ball.y + ball.radius > canvas.height) {
        ball.y = canvas.height - ball.radius; // Clamp to bottom
        ball.velocityY = -ball.velocityY;
        playSound('hit');
    }

    let p = (ball.x < canvas.width / 2) ? player : computer;

    if (collision(ball, p)) {
        let collidePoint = (ball.y - (p.y + p.height / 2)) / (p.height / 2);
        let angleRad = (Math.PI / 4) * collidePoint;
        let direction = (ball.x < canvas.width / 2) ? 1 : -1;
        ball.velocityX = direction * ball.speed * Math.cos(angleRad);
        ball.velocityY = ball.speed * Math.sin(angleRad);
        ball.spin = collidePoint * 2;

        playSound('hit');
        screenShake = 15;
        rally++;
        updateRallyCounter();

        if (ball.isSlowStart) {
            ball.speed = ball.initialSpeed;
            ball.isSlowStart = false;
        }

        for (let i = 0; i < 20; i++) {
            particles.push({
                x: ball.x, y: ball.y, radius: Math.random() * 4 + 1,
                velocityX: (Math.random() - 0.5) * 8, velocityY: (Math.random() - 0.5) * 8,
                life: 1
            });
        }
    }

    if (ball.x - ball.radius < 0) {
        computer.score++;
        resetBall();
        playSound('score');
    } else if (ball.x + ball.radius > canvas.width) {
        player.score++;
        resetBall();
        playSound('score');
    }

    if (player.score === 10 || computer.score === 10) {
        gameOver = true;
        let winner = (player.score === 10) ? 'Player' : 'Computer';
        gameOverMessage.innerHTML = `${winner} wins!<br>Final Rally: ${rally}`;
        gameOverOverlay.style.display = 'flex';
    }
}

function render() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (screenShake > 0) {
        context.save();
        context.translate(Math.random() * screenShake - screenShake / 2, Math.random() * screenShake - screenShake / 2);
    }

    drawStars();
    drawNet();
    drawText(player.score, canvas.width / 4, 60, player.color);
    drawText(computer.score, 3 * canvas.width / 4, 60, computer.color);
    drawRect(player.x, player.y, player.width, player.height, player.color, player.shadowColor);
    drawRect(computer.x, computer.y, computer.width, computer.height, computer.color, computer.shadowColor);
    drawParticles();
    drawCircle(ball.x, ball.y, ball.radius, ball.color, ball.shadowColor);

    if (screenShake > 0) {
        context.restore();
        screenShake *= 0.9;
    }
}

function gameLoop() {
    if (gameOver) return; // Stop loop if game is over
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Initial setup
function initialize() {
    document.getElementById('blaze').classList.add('selected');
    const mediumButton = document.querySelector('.difficulty[data-level="0.1"]');
    mediumButton.classList.add('selected');
    difficulty = parseFloat(mediumButton.dataset.level);
    ball.speed = parseFloat(mediumButton.dataset.speed);
    ball.initialSpeed = ball.speed;
    speedDisplay.textContent = ball.speed;
    updatePlayerColors();
}

initialize();
