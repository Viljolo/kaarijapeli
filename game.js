// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// Game state
let score = 0;
let lives = 3;
let currentLevel = 1;
let gameRunning = true;
let gameStartTime = Date.now();
let isSliding = false;
let slideProgress = 0;
let slideSpeed = 0.02;
let emeraldCollected = false;
let levelComplete = false;
let bossInvulnerable = false; // Add boss invulnerability after slide

// Audio system
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const audioBuffers = {};
let backgroundMusic = null;
let currentMusic = null;

// Sound effects
const sounds = {
    jump: null,
    coin: null,
    levelComplete: null,
    gameOver: null,
    enemyHit: null,
    emeraldCollect: null,
    slide: null
};

// Player weapon system
const playerProjectiles = [];
const bossProjectiles = [];

// Trampoline class
class Trampoline {
    constructor(x, y, width = 60, height = 10) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.animation = 0;
        this.bouncePower = 20;
    }
}

// Death pit class
class DeathPit {
    constructor(x, y, width = 40, height = 40) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.animation = 0;
    }
}

// Projectile class for music notes
class MusicNote {
    constructor(x, y, direction, speed = 3) { // Reduced speed from 5 to 3
        this.x = x;
        this.y = y;
        this.width = 8;
        this.height = 8;
        this.direction = direction;
        this.speed = speed;
        this.life = 90; // Increased life from 60 to 90 (1.5 seconds)
        this.animation = 0;
    }
}

// Fire projectile class for boss
class FireProjectile {
    constructor(x, y, directionX, directionY = 0, speed = 2) { // Added directionY parameter
        this.x = x;
        this.y = y;
        this.width = 12;
        this.height = 12;
        this.directionX = directionX;
        this.directionY = directionY;
        this.speed = speed;
        this.life = 120; // 2 seconds at 60fps
        this.animation = 0;
    }
}

// Audio functions
function createOscillator(frequency, type, duration, volume = 0.3) {
    if (isMuted) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

function playJumpSound() {
    if (isMuted) return;
    createOscillator(400, 'sine', 0.2, 0.2);
    setTimeout(() => createOscillator(300, 'sine', 0.1, 0.15), 50);
}

function playCoinSound() {
    if (isMuted) return;
    createOscillator(800, 'square', 0.1, 0.15);
    setTimeout(() => createOscillator(1000, 'square', 0.1, 0.15), 100);
    setTimeout(() => createOscillator(1200, 'square', 0.1, 0.15), 200);
}

function playLevelCompleteSound() {
    if (isMuted) return;
    const notes = [523, 659, 784, 1047]; // C, E, G, C
    notes.forEach((note, index) => {
        setTimeout(() => {
            createOscillator(note, 'sine', 0.3, 0.2);
        }, index * 200);
    });
}

function playGameOverSound() {
    if (isMuted) return;
    const notes = [400, 350, 300, 250]; // Descending notes
    notes.forEach((note, index) => {
        setTimeout(() => {
            createOscillator(note, 'sawtooth', 0.5, 0.3);
        }, index * 300);
    });
}

function playEnemyHitSound() {
    if (isMuted) return;
    createOscillator(150, 'sawtooth', 0.5, 0.4);
    setTimeout(() => createOscillator(100, 'sawtooth', 0.3, 0.3), 100);
}

function playEmeraldCollectSound() {
    if (isMuted) return;
    const notes = [400, 500, 600, 700, 800]; // Ascending arpeggio
    notes.forEach((note, index) => {
        setTimeout(() => {
            createOscillator(note, 'sine', 0.2, 0.2);
        }, index * 100);
    });
}

function playSlideSound() {
    if (isMuted) return;
    const slideNoise = audioContext.createOscillator();
    const slideGain = audioContext.createGain();
    const slideFilter = audioContext.createBiquadFilter();
    
    slideNoise.connect(slideFilter);
    slideFilter.connect(slideGain);
    slideGain.connect(audioContext.destination);
    
    slideNoise.type = 'sawtooth';
    slideNoise.frequency.setValueAtTime(200, audioContext.currentTime);
    slideFilter.type = 'lowpass';
    slideFilter.frequency.setValueAtTime(300, audioContext.currentTime);
    
    slideGain.gain.setValueAtTime(0.1, audioContext.currentTime);
    slideGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
    
    slideNoise.start(audioContext.currentTime);
    slideNoise.stop(audioContext.currentTime + 1);
}

// Additional audio functions for enhanced experience
function playAmbientSound() {
    if (isMuted) return;
    
    const ambientOsc = audioContext.createOscillator();
    const ambientGain = audioContext.createGain();
    const ambientFilter = audioContext.createBiquadFilter();
    
    ambientOsc.connect(ambientFilter);
    ambientFilter.connect(ambientGain);
    ambientGain.connect(audioContext.destination);
    
    ambientOsc.frequency.setValueAtTime(80, audioContext.currentTime);
    ambientOsc.type = 'sine';
    
    ambientFilter.type = 'lowpass';
    ambientFilter.frequency.setValueAtTime(200, audioContext.currentTime);
    
    ambientGain.gain.setValueAtTime(0.02, audioContext.currentTime);
    ambientGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 3);
    
    ambientOsc.start(audioContext.currentTime);
    ambientOsc.stop(audioContext.currentTime + 3);
}

function playVictoryFanfare() {
    if (isMuted) return;
    
    const victoryNotes = [523, 659, 784, 1047, 1319, 1047, 784, 659, 523];
    victoryNotes.forEach((note, index) => {
        setTimeout(() => {
            createOscillator(note, 'sine', 0.4, 0.25);
        }, index * 200);
    });
}

// Enhanced background music generator with sensible, melodic electronic music
function createBackgroundMusic() {
    const musicGain = audioContext.createGain();
    musicGain.connect(audioContext.destination);
    musicGain.gain.setValueAtTime(0.08, audioContext.currentTime);
    
    const bassGain = audioContext.createGain();
    bassGain.connect(musicGain);
    bassGain.gain.setValueAtTime(0.3, audioContext.currentTime);
    
    const melodyGain = audioContext.createGain();
    melodyGain.connect(musicGain);
    melodyGain.gain.setValueAtTime(0.25, audioContext.currentTime);
    
    const drumGain = audioContext.createGain();
    drumGain.connect(musicGain);
    drumGain.gain.setValueAtTime(0.2, audioContext.currentTime);
    
    // Create a simple, melodic scale based on level
    let scale;
    if (currentLevel <= 3) {
        // C major scale for early levels - happy and simple
        scale = [261, 293, 329, 349, 392, 440, 493, 523]; // C, D, E, F, G, A, B, C
    } else if (currentLevel <= 6) {
        // G major scale for mid levels - more adventurous
        scale = [196, 220, 247, 261, 293, 329, 370, 392]; // G, A, B, C, D, E, F#, G
    } else {
        // E minor scale for late levels - dramatic and intense
        scale = [165, 185, 207, 220, 247, 277, 311, 330]; // E, F#, G, A, B, C, D, E
    }
    
    let beatCount = 0;
    
    function playBass() {
        if (isMuted) return;
        const note = scale[beatCount % scale.length];
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(bassGain);
        
        oscillator.frequency.setValueAtTime(note, audioContext.currentTime);
        oscillator.type = 'sine';
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.8);
    }
    
    function playMelody() {
        if (isMuted) return;
        const note = scale[(beatCount * 2) % scale.length] * 2; // Higher octave
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(melodyGain);
        
        oscillator.frequency.setValueAtTime(note, audioContext.currentTime);
        oscillator.type = 'triangle';
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
    }
    
    function playDrum() {
        if (isMuted) return;
        const drumOsc = audioContext.createOscillator();
        const drumGainNode = audioContext.createGain();
        const drumFilter = audioContext.createBiquadFilter();
        
        drumOsc.connect(drumFilter);
        drumFilter.connect(drumGainNode);
        drumGainNode.connect(drumGain);
        
        drumOsc.type = 'square';
        drumOsc.frequency.setValueAtTime(150, audioContext.currentTime);
        drumOsc.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.1);
        
        drumFilter.type = 'lowpass';
        drumFilter.frequency.setValueAtTime(300, audioContext.currentTime);
        
        drumGainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        drumGainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        drumOsc.start(audioContext.currentTime);
        drumOsc.stop(audioContext.currentTime + 0.2);
    }
    
    // Create a musical pattern
    const musicInterval = setInterval(() => {
        if (isMuted) return;
        
        // Play bass on every beat
        playBass();
        
        // Play melody on every other beat
        if (beatCount % 2 === 0) {
            playMelody();
        }
        
        // Play drum on every beat
        playDrum();
        
        beatCount++;
    }, 800); // Slower, more sensible tempo
    
    // Return object with cleanup function
    return { 
        gain: musicGain,
        cleanup: () => {
            clearInterval(musicInterval);
        }
    };
}

function startBackgroundMusic() {
    if (isMuted || currentMusic) return;
    currentMusic = createBackgroundMusic();
}

function stopBackgroundMusic() {
    if (currentMusic) {
        if (currentMusic.cleanup) {
            currentMusic.cleanup();
        }
        currentMusic.gain.gain.setValueAtTime(0, audioContext.currentTime);
        currentMusic = null;
    }
}

// Audio control
let isMuted = false;

function toggleMute() {
    isMuted = !isMuted;
    if (isMuted) {
        stopBackgroundMusic();
    } else {
        startBackgroundMusic();
    }
    
    // Update the audio info display
    const audioInfo = document.querySelector('.audio-info');
    if (audioInfo) {
        audioInfo.innerHTML = isMuted ? 
            '🔇 <strong>Audio:</strong> Muted - Press \'M\' to unmute' : 
            '🎵 <strong>Audio:</strong> Press \'M\' to mute/unmute | Enjoy the groovy beats!';
    }
}

// Player character (Green Hero)
const player = {
    x: 50,
    y: 300,
    width: 30,
    height: 40,
    velocityX: 0,
    velocityY: 0,
    speed: 5,
    jumpPower: 12,
    onGround: false,
    direction: 1, // 1 for right, -1 for left
    animationFrame: 0,
    animationSpeed: 0.2,
    isJumping: false,
    // Weapon system
    hasSword: true,
    hasShield: true,
    attackCooldown: 0,
    shieldActive: false,
    isAttacking: false
};

// Huge emerald (level goal)
const hugeEmerald = {
    x: 750,
    y: 50,
    width: 40,
    height: 40,
    collected: false,
    falling: false,
    fallSpeed: 0,
    slideX: 0
};

// Boss object
const boss = {
    x: 700,
    y: 300,
    width: 50,
    height: 60,
    velocityX: -1,
    velocityY: 0,
    direction: -1,
    health: 3,
    maxHealth: 3,
    isAlive: true,
    attackCooldown: 0,
    attackRange: 200,
    animationFrame: 0,
    animationSpeed: 0.1,
    // Weapon system
    hasMicrophone: true,
    microphoneCooldown: 0,
    fireAttackCooldown: 0
};

// Level data - Much longer and more complex levels
const levels = [
    // Level 1 - Tutorial (Extended)
    {
        platforms: [
            { x: 0, y: 350, width: 1200, height: 50 },
            { x: 200, y: 250, width: 100, height: 20 },
            { x: 400, y: 200, width: 100, height: 20 },
            { x: 600, y: 150, width: 100, height: 20 },
            { x: 800, y: 100, width: 100, height: 20 },
            { x: 1000, y: 50, width: 100, height: 20 },
            { x: 300, y: 300, width: 80, height: 20 },
            { x: 500, y: 250, width: 80, height: 20 },
            { x: 700, y: 200, width: 80, height: 20 },
            { x: 900, y: 150, width: 80, height: 20 }
        ],
        coins: [
            { x: 250, y: 200, width: 15, height: 15, collected: false, animation: 0 },
            { x: 450, y: 150, width: 15, height: 15, collected: false, animation: 0 },
            { x: 650, y: 100, width: 15, height: 15, collected: false, animation: 0 },
            { x: 850, y: 50, width: 15, height: 15, collected: false, animation: 0 },
            { x: 350, y: 250, width: 15, height: 15, collected: false, animation: 0 },
            { x: 550, y: 200, width: 15, height: 15, collected: false, animation: 0 },
            { x: 750, y: 150, width: 15, height: 15, collected: false, animation: 0 }
        ],
        enemies: [
            { x: 300, y: 310, width: 25, height: 25, velocityX: -1, direction: -1 },
            { x: 600, y: 310, width: 25, height: 25, velocityX: 1, direction: 1 }
        ],
        trampolines: [
            new Trampoline(350, 320, 60, 10),
            new Trampoline(750, 320, 60, 10)
        ],
        deathPits: [
            new DeathPit(150, 350, 40, 50), // Fixed positioning - y should be 350 (ground level), height 50 to extend below ground
            new DeathPit(450, 350, 40, 50)  // Fixed positioning - y should be 350 (ground level), height 50 to extend below ground
        ]
    },
    // Level 2 - Adventure (Extended)
    {
        platforms: [
            { x: 0, y: 350, width: 1400, height: 50 },
            { x: 150, y: 280, width: 80, height: 20 },
            { x: 300, y: 220, width: 80, height: 20 },
            { x: 450, y: 160, width: 80, height: 20 },
            { x: 600, y: 100, width: 80, height: 20 },
            { x: 750, y: 50, width: 80, height: 20 },
            { x: 900, y: 100, width: 80, height: 20 },
            { x: 1050, y: 150, width: 80, height: 20 },
            { x: 1200, y: 200, width: 80, height: 20 },
            { x: 200, y: 320, width: 60, height: 20 },
            { x: 400, y: 260, width: 60, height: 20 },
            { x: 600, y: 200, width: 60, height: 20 },
            { x: 800, y: 140, width: 60, height: 20 },
            { x: 1000, y: 180, width: 60, height: 20 }
        ],
        coins: [
            { x: 200, y: 230, width: 15, height: 15, collected: false, animation: 0 },
            { x: 350, y: 170, width: 15, height: 15, collected: false, animation: 0 },
            { x: 500, y: 110, width: 15, height: 15, collected: false, animation: 0 },
            { x: 650, y: 50, width: 15, height: 15, collected: false, animation: 0 },
            { x: 800, y: 50, width: 15, height: 15, collected: false, animation: 0 },
            { x: 950, y: 100, width: 15, height: 15, collected: false, animation: 0 },
            { x: 1100, y: 150, width: 15, height: 15, collected: false, animation: 0 },
            { x: 1250, y: 200, width: 15, height: 15, collected: false, animation: 0 }
        ],
        enemies: [
            { x: 200, y: 310, width: 25, height: 25, velocityX: -1, direction: -1 },
            { x: 500, y: 310, width: 25, height: 25, velocityX: 1, direction: 1 },
            { x: 800, y: 310, width: 25, height: 25, velocityX: -1, direction: -1 }
        ],
        trampolines: [
            new Trampoline(250, 330, 60, 10),
            new Trampoline(550, 330, 60, 10),
            new Trampoline(850, 330, 60, 10)
        ],
        deathPits: [
            new DeathPit(100, 350, 40, 50), // Fixed positioning
            new DeathPit(350, 350, 40, 50), // Fixed positioning
            new DeathPit(600, 350, 40, 50)  // Fixed positioning
        ]
    },
    // Level 3 - Challenge (Extended)
    {
        platforms: [
            { x: 0, y: 350, width: 1600, height: 50 },
            { x: 100, y: 250, width: 60, height: 20 },
            { x: 250, y: 200, width: 60, height: 20 },
            { x: 400, y: 150, width: 60, height: 20 },
            { x: 550, y: 100, width: 60, height: 20 },
            { x: 700, y: 50, width: 60, height: 20 },
            { x: 850, y: 100, width: 60, height: 20 },
            { x: 1000, y: 150, width: 60, height: 20 },
            { x: 1150, y: 200, width: 60, height: 20 },
            { x: 1300, y: 250, width: 60, height: 20 },
            { x: 1450, y: 200, width: 60, height: 20 },
            { x: 150, y: 300, width: 40, height: 20 },
            { x: 350, y: 250, width: 40, height: 20 },
            { x: 550, y: 200, width: 40, height: 20 },
            { x: 750, y: 150, width: 40, height: 20 },
            { x: 950, y: 200, width: 40, height: 20 },
            { x: 1150, y: 250, width: 40, height: 20 }
        ],
        coins: [
            { x: 150, y: 200, width: 15, height: 15, collected: false, animation: 0 },
            { x: 300, y: 150, width: 15, height: 15, collected: false, animation: 0 },
            { x: 450, y: 100, width: 15, height: 15, collected: false, animation: 0 },
            { x: 600, y: 50, width: 15, height: 15, collected: false, animation: 0 },
            { x: 750, y: 50, width: 15, height: 15, collected: false, animation: 0 },
            { x: 900, y: 100, width: 15, height: 15, collected: false, animation: 0 },
            { x: 1050, y: 150, width: 15, height: 15, collected: false, animation: 0 },
            { x: 1200, y: 200, width: 15, height: 15, collected: false, animation: 0 },
            { x: 1350, y: 250, width: 15, height: 15, collected: false, animation: 0 }
        ],
        enemies: [
            { x: 150, y: 310, width: 25, height: 25, velocityX: -1, direction: -1 },
            { x: 450, y: 310, width: 25, height: 25, velocityX: 1, direction: 1 },
            { x: 750, y: 310, width: 25, height: 25, velocityX: -1, direction: -1 },
            { x: 1050, y: 310, width: 25, height: 25, velocityX: 1, direction: 1 }
        ],
        trampolines: [
            new Trampoline(200, 330, 60, 10),
            new Trampoline(500, 330, 60, 10),
            new Trampoline(800, 330, 60, 10),
            new Trampoline(1100, 330, 60, 10)
        ],
        deathPits: [
            new DeathPit(200, 350, 40, 50), // Fixed positioning
            new DeathPit(500, 350, 40, 50), // Fixed positioning
            new DeathPit(800, 350, 40, 50), // Fixed positioning
            new DeathPit(1100, 350, 40, 50) // Fixed positioning
        ]
    }
];

// Current level data
let currentLevelData = levels[currentLevel - 1];

// Particle effects
const particles = [];

// Input handling
const keys = {};

// Touch control state
const touchControls = {
    left: false,
    right: false,
    jump: false,
    attack: false,
    shield: false
};

// Touch attack cooldown to prevent rapid-fire
let touchAttackCooldown = 0;

// Physics constants
const gravity = 0.5;
const friction = 0.8;

// Draw functions
function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.width/2, player.y + player.height/2);
    ctx.scale(player.direction, 1);
    
    // Add shadow effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(-15, 35, 30, 8);
    
    // Body (green polo shirt) with gradient
    const bodyGradient = ctx.createLinearGradient(-15, -10, 15, 15);
    bodyGradient.addColorStop(0, '#32CD32'); // Lime green
    bodyGradient.addColorStop(1, '#228B22'); // Forest green
    ctx.fillStyle = bodyGradient;
    ctx.fillRect(-15, -10, 30, 25);
    
    // Shirt details
    ctx.fillStyle = '#228B22';
    ctx.fillRect(-15, -5, 30, 3); // Horizontal line
    ctx.fillRect(-5, -10, 10, 15); // Vertical line
    
    // Arms (no shirt sleeves) with skin tone gradient
    const skinGradient = ctx.createLinearGradient(-20, -5, -12, 10);
    skinGradient.addColorStop(0, '#FFE4B5');
    skinGradient.addColorStop(1, '#F4A460');
    ctx.fillStyle = skinGradient;
    ctx.fillRect(-20, -5, 8, 15);
    ctx.fillRect(12, -5, 8, 15);
    
    // Head with skin tone gradient
    ctx.fillStyle = skinGradient;
    ctx.fillRect(-12, -25, 24, 25);
    
    // Dark hair with gradient
    const hairGradient = ctx.createLinearGradient(-12, -35, 12, -25);
    hairGradient.addColorStop(0, '#2F1B14');
    hairGradient.addColorStop(1, '#8B4513');
    ctx.fillStyle = hairGradient;
    ctx.fillRect(-12, -30, 24, 8);
    ctx.fillRect(-8, -35, 16, 8);
    
    // Eyes with more detail
    ctx.fillStyle = '#000';
    ctx.fillRect(-8, -20, 4, 4);
    ctx.fillRect(4, -20, 4, 4);
    
    // Eye highlights
    ctx.fillStyle = '#FFF';
    ctx.fillRect(-7, -21, 2, 2);
    ctx.fillRect(5, -21, 2, 2);
    
    // Mouth with more detail
    ctx.fillStyle = '#FF6B6B';
    ctx.fillRect(-4, -12, 8, 2);
    
    // Cheeks
    ctx.fillStyle = 'rgba(255, 182, 193, 0.5)';
    ctx.fillRect(-15, -15, 4, 4);
    ctx.fillRect(11, -15, 4, 4);
    
    // Black shorts with gradient
    const shortsGradient = ctx.createLinearGradient(-15, 15, 15, 30);
    shortsGradient.addColorStop(0, '#333');
    shortsGradient.addColorStop(1, '#000');
    ctx.fillStyle = shortsGradient;
    ctx.fillRect(-15, 15, 30, 15);
    
    // Legs with skin tone gradient
    ctx.fillStyle = skinGradient;
    ctx.fillRect(-12, 30, 8, 10);
    ctx.fillRect(4, 30, 8, 10);
    
    // Shoes with more detail
    const shoeGradient = ctx.createLinearGradient(-15, 40, -5, 45);
    shoeGradient.addColorStop(0, '#8B4513');
    shoeGradient.addColorStop(1, '#654321');
    ctx.fillStyle = shoeGradient;
    ctx.fillRect(-15, 40, 10, 5);
    ctx.fillRect(5, 40, 10, 5);
    
    // Shoe details
    ctx.fillStyle = '#654321';
    ctx.fillRect(-15, 42, 10, 2);
    ctx.fillRect(5, 42, 10, 2);
    
    // Draw Sword (in right hand)
    if (player.hasSword) {
        // Sword handle
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(15, -15, 4, 20);
        
        // Sword blade
        const swordGradient = ctx.createLinearGradient(19, -15, 25, -15);
        swordGradient.addColorStop(0, '#C0C0C0');
        swordGradient.addColorStop(1, '#FFFFFF');
        ctx.fillStyle = swordGradient;
        ctx.fillRect(19, -15, 15, 4);
        
        // Sword tip
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(34, -15);
        ctx.lineTo(40, -13);
        ctx.lineTo(34, -11);
        ctx.closePath();
        ctx.fill();
        
        // Sword guard
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(17, -20, 8, 10);
    }
    
    // Draw Shield (in left hand)
    if (player.hasShield) {
        // Shield body
        const shieldGradient = ctx.createRadialGradient(-25, -10, 0, -25, -10, 12);
        shieldGradient.addColorStop(0, '#FF6B6B');
        shieldGradient.addColorStop(1, '#DC143C');
        ctx.fillStyle = shieldGradient;
        ctx.fillRect(-37, -12, 24, 20);
        
        // Shield border
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-37, -12, 24, 20);
        
        // Shield design
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-32, -7, 14, 10);
        
        // Shield center
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-30, -5, 10, 6);
    }
    
    ctx.restore();
}

function drawPlatforms() {
    currentLevelData.platforms.forEach(platform => {
        // Enhanced platform body with better gradient
        const platformGradient = ctx.createLinearGradient(platform.x, platform.y, platform.x, platform.y + platform.height);
        platformGradient.addColorStop(0, '#8B4513');
        platformGradient.addColorStop(0.3, '#A0522D');
        platformGradient.addColorStop(0.7, '#CD853F');
        platformGradient.addColorStop(1, '#654321');
        
        ctx.fillStyle = platformGradient;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        // Platform top edge highlight for 3D effect
        const topGradient = ctx.createLinearGradient(platform.x, platform.y, platform.x, platform.y + 5);
        topGradient.addColorStop(0, '#DEB887');
        topGradient.addColorStop(1, '#D2B48C');
        ctx.fillStyle = topGradient;
        ctx.fillRect(platform.x, platform.y, platform.width, 5);
        
        // Platform shadow for depth
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(platform.x + 2, platform.y + platform.height - 2, platform.width - 4, 2);
        
        // Wood grain texture effect
        ctx.strokeStyle = 'rgba(139, 69, 19, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < platform.width; i += 20) {
            ctx.beginPath();
            ctx.moveTo(platform.x + i, platform.y);
            ctx.lineTo(platform.x + i, platform.y + platform.height);
            ctx.stroke();
        }
        
        // Platform border
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    });
}

function drawCoins() {
    currentLevelData.coins.forEach(coin => {
        if (!coin.collected) {
            coin.animation += 0.1;
            const scale = 1 + Math.sin(coin.animation) * 0.2;
            
            ctx.save();
            ctx.translate(coin.x + coin.width/2, coin.y + coin.height/2);
            ctx.scale(scale, scale);
            
            // Diamond-shaped emerald
            ctx.fillStyle = '#00C957';
            ctx.beginPath();
            // Draw diamond shape
            ctx.moveTo(0, -coin.height/2);
            ctx.lineTo(coin.width/2, 0);
            ctx.lineTo(0, coin.height/2);
            ctx.lineTo(-coin.width/2, 0);
            ctx.closePath();
            ctx.fill();
            
            // Diamond outline
            ctx.strokeStyle = '#008B45';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Add shine effect
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.moveTo(-coin.width/6, -coin.height/6);
            ctx.lineTo(coin.width/6, -coin.height/6);
            ctx.lineTo(0, coin.height/6);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }
    });
}

function drawHugeEmerald() {
    if (!hugeEmerald.collected) {
        ctx.save();
        ctx.translate(hugeEmerald.x + hugeEmerald.width/2, hugeEmerald.y + hugeEmerald.height/2);
        
        // Diamond-shaped huge emerald with gradient
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, hugeEmerald.width/2);
        gradient.addColorStop(0, '#00FF7F');
        gradient.addColorStop(0.7, '#00C957');
        gradient.addColorStop(1, '#008B45');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        // Draw diamond shape
        ctx.moveTo(0, -hugeEmerald.height/2);
        ctx.lineTo(hugeEmerald.width/2, 0);
        ctx.lineTo(0, hugeEmerald.height/2);
        ctx.lineTo(-hugeEmerald.width/2, 0);
        ctx.closePath();
        ctx.fill();
        
        // Diamond outline
        ctx.strokeStyle = '#008B45';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Enhanced shine effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.moveTo(-hugeEmerald.width/4, -hugeEmerald.height/4);
        ctx.lineTo(hugeEmerald.width/4, -hugeEmerald.height/4);
        ctx.lineTo(0, hugeEmerald.height/4);
        ctx.closePath();
        ctx.fill();
        
        // Second shine effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(-hugeEmerald.width/6, -hugeEmerald.height/6);
        ctx.lineTo(hugeEmerald.width/6, -hugeEmerald.height/6);
        ctx.lineTo(0, hugeEmerald.height/6);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}

function drawEnemies() {
    currentLevelData.enemies.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
        
        // Enemy shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(-enemy.width/2, enemy.height/2, enemy.width, 5);
        
        // Enemy body with gradient
        const enemyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, enemy.width/2);
        enemyGradient.addColorStop(0, '#FF6B6B');
        enemyGradient.addColorStop(1, '#DC143C');
        ctx.fillStyle = enemyGradient;
        ctx.fillRect(-enemy.width/2, -enemy.height/2, enemy.width, enemy.height);
        
        // Enemy outline
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-enemy.width/2, -enemy.height/2, enemy.width, enemy.height);
        
        // Enemy eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(-8, -8, 4, 4);
        ctx.fillRect(4, -8, 4, 4);
        
        // Eye highlights
        ctx.fillStyle = '#FFF';
        ctx.fillRect(-7, -9, 2, 2);
        ctx.fillRect(5, -9, 2, 2);
        
        // Enemy mouth (angry)
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(-4, 2, 8, 2);
        
        // Enemy horns/spikes
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(-enemy.width/2 + 2, -enemy.height/2 - 5, 4, 8);
        ctx.fillRect(enemy.width/2 - 6, -enemy.height/2 - 5, 4, 8);
        
        ctx.restore();
    });
}

function drawBoss() {
    if (!boss.isAlive) return;
    
    ctx.save();
    ctx.translate(boss.x + boss.width/2, boss.y + boss.height/2);
    ctx.scale(boss.direction, 1);
    
    // Boss body (orange shirt as requested)
    ctx.fillStyle = '#FF8C00'; // Orange shirt
    ctx.fillRect(-25, -30, 50, 40);
    
    // Boss arms
    ctx.fillStyle = '#FFE4B5';
    ctx.fillRect(-35, -20, 12, 20);
    ctx.fillRect(23, -20, 12, 20);
    
    // Boss head
    ctx.fillStyle = '#FFE4B5';
    ctx.fillRect(-20, -50, 40, 30);
    
    // Boss hair
    ctx.fillStyle = '#2F1B14';
    ctx.fillRect(-20, -55, 40, 8);
    ctx.fillRect(-15, -60, 30, 8);
    
    // Boss eyes (angry)
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(-15, -40, 8, 6);
    ctx.fillRect(7, -40, 8, 6);
    
    // Boss pupils
    ctx.fillStyle = '#000';
    ctx.fillRect(-12, -38, 3, 3);
    ctx.fillRect(9, -38, 3, 3);
    
    // Boss mouth (angry)
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(-8, -25, 16, 4);
    
    // Boss legs
    ctx.fillStyle = '#000';
    ctx.fillRect(-20, 10, 15, 25);
    ctx.fillRect(5, 10, 15, 25);
    
    // Boss shoes
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-25, 35, 20, 8);
    ctx.fillRect(5, 35, 20, 8);
    
    // Draw Microphone Weapon (in right hand)
    if (boss.hasMicrophone) {
        // Microphone handle
        ctx.fillStyle = '#333';
        ctx.fillRect(25, -15, 6, 15);
        
        // Microphone head
        const micGradient = ctx.createRadialGradient(28, -15, 0, 28, -15, 8);
        micGradient.addColorStop(0, '#C0C0C0');
        micGradient.addColorStop(1, '#808080');
        ctx.fillStyle = micGradient;
        ctx.fillRect(20, -23, 16, 16);
        
        // Microphone grill
        ctx.fillStyle = '#000';
        ctx.fillRect(22, -21, 12, 12);
        
        // Microphone stand
        ctx.fillStyle = '#666';
        ctx.fillRect(27, -8, 2, 8);
    }
    
    // Health bar - always show for boss
    const healthBarWidth = 60;
    const healthBarHeight = 8;
    const healthPercentage = boss.health / boss.maxHealth;
    
    // Health bar background
    ctx.fillStyle = '#333';
    ctx.fillRect(-healthBarWidth/2, -70, healthBarWidth, healthBarHeight);
    
    // Health bar fill
    ctx.fillStyle = healthPercentage > 0.5 ? '#00FF00' : healthPercentage > 0.25 ? '#FFFF00' : '#FF0000';
    ctx.fillRect(-healthBarWidth/2, -70, healthBarWidth * healthPercentage, healthBarHeight);
    
    // Health bar border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(-healthBarWidth/2, -70, healthBarWidth, healthBarHeight);
    
    // Show invulnerability indicator
    if (bossInvulnerable) {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.fillRect(-25, -30, 50, 60);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeRect(-25, -30, 50, 60);
    }
    
    ctx.restore();
}

function drawParticles() {
    particles.forEach((particle, index) => {
        particle.life -= 1;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.1; // gravity
        
        if (particle.life > 0) {
            ctx.fillStyle = `rgba(0, 201, 87, ${particle.life / 30})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            particles.splice(index, 1);
        }
    });
}

function drawTrampolines() {
    if (!currentLevelData.trampolines) return;
    
    currentLevelData.trampolines.forEach(trampoline => {
        trampoline.animation += 0.1;
        const bounce = Math.sin(trampoline.animation) * 2;
        
        ctx.save();
        ctx.translate(trampoline.x + trampoline.width/2, trampoline.y + trampoline.height/2 + bounce);
        
        // Trampoline base
        const trampGradient = ctx.createLinearGradient(-trampoline.width/2, -trampoline.height/2, trampoline.width/2, trampoline.height/2);
        trampGradient.addColorStop(0, '#4169E1');
        trampGradient.addColorStop(0.5, '#1E90FF');
        trampGradient.addColorStop(1, '#00BFFF');
        
        ctx.fillStyle = trampGradient;
        ctx.fillRect(-trampoline.width/2, -trampoline.height/2, trampoline.width, trampoline.height);
        
        // Trampoline border
        ctx.strokeStyle = '#191970';
        ctx.lineWidth = 2;
        ctx.strokeRect(-trampoline.width/2, -trampoline.height/2, trampoline.width, trampoline.height);
        
        // Trampoline springs
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        for (let i = -trampoline.width/2 + 10; i < trampoline.width/2 - 10; i += 15) {
            ctx.beginPath();
            ctx.moveTo(i, trampoline.height/2);
            ctx.lineTo(i, trampoline.height/2 + 8);
            ctx.stroke();
        }
        
        // Bounce effect
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(trampoline.animation * 2) * 0.2})`;
        ctx.fillRect(-trampoline.width/2 + 2, -trampoline.height/2 + 2, trampoline.width - 4, trampoline.height - 4);
        
        ctx.restore();
    });
}

function drawDeathPits() {
    if (!currentLevelData.deathPits) return;
    
    currentLevelData.deathPits.forEach(pit => {
        pit.animation += 0.15;
        
        ctx.save();
        ctx.translate(pit.x + pit.width/2, pit.y + pit.height/2);
        
        // Dark pit background
        const pitGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, pit.width/2);
        pitGradient.addColorStop(0, '#000000');
        pitGradient.addColorStop(0.7, '#1a1a1a');
        pitGradient.addColorStop(1, '#2d2d2d');
        
        ctx.fillStyle = pitGradient;
        ctx.fillRect(-pit.width/2, -pit.height/2, pit.width, pit.height);
        
        // Animated spikes
        ctx.fillStyle = '#800000';
        for (let i = 0; i < 5; i++) {
            const spikeOffset = Math.sin(pit.animation + i) * 3;
            ctx.beginPath();
            ctx.moveTo(-pit.width/2 + i * 8 - 20 + spikeOffset, -pit.height/2);
            ctx.lineTo(-pit.width/2 + i * 8 - 16 + spikeOffset, -pit.height/2 - 8);
            ctx.lineTo(-pit.width/2 + i * 8 - 12 + spikeOffset, -pit.height/2);
            ctx.closePath();
            ctx.fill();
        }
        
        // Glowing effect
        ctx.fillStyle = `rgba(255, 0, 0, ${0.3 + Math.sin(pit.animation) * 0.2})`;
        ctx.fillRect(-pit.width/2, -pit.height/2, pit.width, pit.height);
        
        // Warning border
        ctx.strokeStyle = `rgba(255, 0, 0, ${0.8 + Math.sin(pit.animation) * 0.2})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(-pit.width/2, -pit.height/2, pit.width, pit.height);
        
        ctx.restore();
    });
}

function drawMusicNotes() {
    for (let i = playerProjectiles.length - 1; i >= 0; i--) {
        const note = playerProjectiles[i];
        note.life -= 1;
        note.x += note.direction * note.speed;
        note.animation += 0.2;
        
        if (note.life > 0) {
            ctx.save();
            ctx.translate(note.x, note.y);
            
            // Music note shape
            ctx.fillStyle = '#FFD700';
            
            // Note head
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Note stem
            ctx.fillRect(2, -8, 2, 8);
            
            // Note flag
            ctx.beginPath();
            ctx.arc(4, -8, 3, 0, Math.PI);
            ctx.fill();
            
            // Sparkle effect
            ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(note.animation) * 0.3})`;
            ctx.beginPath();
            ctx.arc(-6, -4, 2, 0, Math.PI * 2);
            ctx.arc(6, -4, 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        } else {
            playerProjectiles.splice(i, 1);
        }
    }
}

function drawFireProjectiles() {
    for (let i = bossProjectiles.length - 1; i >= 0; i--) {
        const fire = bossProjectiles[i];
        fire.life -= 1;
        fire.x += fire.directionX * fire.speed;
        fire.y += fire.directionY * fire.speed;
        fire.animation += 0.3;
        
        if (fire.life > 0) {
            ctx.save();
            ctx.translate(fire.x, fire.y);
            
            // Fire projectile
            const fireGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, fire.width/2);
            fireGradient.addColorStop(0, '#FFFFFF');
            fireGradient.addColorStop(0.3, '#FFFF00');
            fireGradient.addColorStop(0.7, '#FF8C00');
            fireGradient.addColorStop(1, '#FF0000');
            
            ctx.fillStyle = fireGradient;
            ctx.beginPath();
            ctx.arc(0, 0, fire.width/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Fire animation
            ctx.fillStyle = `rgba(255, 255, 0, ${0.5 + Math.sin(fire.animation) * 0.3})`;
            ctx.beginPath();
            ctx.arc(0 + Math.sin(fire.animation) * 3, 0 + Math.cos(fire.animation) * 3, 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        } else {
            bossProjectiles.splice(i, 1);
        }
    }
}

function drawBackground() {
    // Enhanced sky gradient with multiple color stops
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB'); // Light sky blue
    gradient.addColorStop(0.3, '#98FB98'); // Pale green
    gradient.addColorStop(0.7, '#90EE90'); // Light green
    gradient.addColorStop(1, '#228B22'); // Forest green
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Enhanced clouds with multiple layers and better detail
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    
    // Cloud 1 - larger and more detailed
    ctx.beginPath();
    ctx.arc(100, 50, 25, 0, Math.PI * 2);
    ctx.arc(125, 50, 30, 0, Math.PI * 2);
    ctx.arc(150, 50, 25, 0, Math.PI * 2);
    ctx.arc(112, 40, 20, 0, Math.PI * 2);
    ctx.arc(138, 40, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Cloud 2 - different position
    ctx.beginPath();
    ctx.arc(600, 80, 20, 0, Math.PI * 2);
    ctx.arc(620, 80, 25, 0, Math.PI * 2);
    ctx.arc(640, 80, 20, 0, Math.PI * 2);
    ctx.arc(610, 70, 15, 0, Math.PI * 2);
    ctx.arc(630, 70, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Cloud 3 - small fluffy cloud
    ctx.beginPath();
    ctx.arc(300, 30, 15, 0, Math.PI * 2);
    ctx.arc(315, 30, 18, 0, Math.PI * 2);
    ctx.arc(330, 30, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Floating particles for atmosphere
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 20; i++) {
        const x = (Date.now() * 0.001 + i * 50) % canvas.width;
        const y = (Math.sin(Date.now() * 0.001 + i) * 20 + i * 30) % canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Sun/moon effect
    const timeOfDay = (Date.now() * 0.0001) % 1;
    const sunX = canvas.width * 0.8;
    const sunY = 50 + Math.sin(timeOfDay * Math.PI) * 20;
    
    // Sun glow
    const sunGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 40);
    sunGradient.addColorStop(0, 'rgba(255, 255, 0, 1)');
    sunGradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.5)');
    sunGradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
    ctx.fillStyle = sunGradient;
    ctx.fillRect(sunX - 40, sunY - 40, 80, 80);
    
    // Sun core
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Sun rays
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const rayX = sunX + Math.cos(angle) * 25;
        const rayY = sunY + Math.sin(angle) * 25;
        ctx.beginPath();
        ctx.moveTo(sunX, sunY);
        ctx.lineTo(rayX, rayY);
        ctx.stroke();
    }
}

function drawSlide() {
    if (isSliding) {
        // Draw slide background overlay with gradient
        const overlayGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        overlayGradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
        overlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        ctx.fillStyle = overlayGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw slide structure - a curved slide
        const slideX = hugeEmerald.slideX;
        const slideStartY = hugeEmerald.y;
        const slideEndY = canvas.height - 50;
        
        // Slide background
        ctx.fillStyle = '#4A4A4A';
        ctx.fillRect(slideX - 30, slideStartY, 60, canvas.height - slideStartY);
        
        // Slide surface with gradient
        const slideGradient = ctx.createLinearGradient(slideX - 30, slideStartY, slideX + 30, slideEndY);
        slideGradient.addColorStop(0, '#708090');
        slideGradient.addColorStop(0.5, '#C0C0C0');
        slideGradient.addColorStop(1, '#A0A0A0');
        
        ctx.fillStyle = slideGradient;
        ctx.beginPath();
        ctx.moveTo(slideX - 25, slideStartY);
        ctx.lineTo(slideX - 15, slideEndY);
        ctx.lineTo(slideX + 15, slideEndY);
        ctx.lineTo(slideX + 25, slideStartY);
        ctx.closePath();
        ctx.fill();
        
        // Slide edges
        ctx.strokeStyle = '#2F2F2F';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(slideX - 25, slideStartY);
        ctx.lineTo(slideX - 15, slideEndY);
        ctx.moveTo(slideX + 25, slideStartY);
        ctx.lineTo(slideX + 15, slideEndY);
        ctx.stroke();
        
        // Slide rails
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(slideX - 20, slideStartY);
        ctx.lineTo(slideX - 12, slideEndY);
        ctx.moveTo(slideX + 20, slideStartY);
        ctx.lineTo(slideX + 12, slideEndY);
        ctx.stroke();
        
        // Falling emerald with enhanced animation
        ctx.save();
        ctx.translate(slideX, hugeEmerald.y);
        
        // Emerald scaling effect based on fall
        const fallProgress = (hugeEmerald.y - slideStartY) / (canvas.height - slideStartY);
        const scale = 1 + fallProgress * 0.5;
        ctx.scale(scale, scale);
        
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, hugeEmerald.width/2);
        gradient.addColorStop(0, '#00FF7F');
        gradient.addColorStop(0.7, '#00C957');
        gradient.addColorStop(1, '#008B45');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        // Draw diamond shape
        ctx.moveTo(0, -hugeEmerald.height/2);
        ctx.lineTo(hugeEmerald.width/2, 0);
        ctx.lineTo(0, hugeEmerald.height/2);
        ctx.lineTo(-hugeEmerald.width/2, 0);
        ctx.closePath();
        ctx.fill();
        
        // Enhanced shine effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.moveTo(-hugeEmerald.width/4, -hugeEmerald.height/4);
        ctx.lineTo(hugeEmerald.width/4, -hugeEmerald.height/4);
        ctx.lineTo(0, hugeEmerald.height/4);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        
        // Draw sliding player with realistic positioning
        const slideY = hugeEmerald.y + (canvas.height - hugeEmerald.y) * slideProgress;
        
        // Player positioning on slide
        ctx.save();
        ctx.translate(slideX, slideY + player.height/2);
        ctx.scale(0.8, 0.8); // Slightly smaller for slide effect
        
        // Enhanced player drawing for slide
        // Body (green polo shirt)
        const bodyGradient = ctx.createLinearGradient(-15, -10, 15, 15);
        bodyGradient.addColorStop(0, '#32CD32');
        bodyGradient.addColorStop(1, '#228B22');
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(-15, -10, 30, 25);
        
        // Arms
        ctx.fillStyle = '#FFE4B5';
        ctx.fillRect(-20, -5, 8, 15);
        ctx.fillRect(12, -5, 8, 15);
        
        // Head
        ctx.fillStyle = '#FFE4B5';
        ctx.fillRect(-12, -25, 24, 25);
        
        // Hair
        ctx.fillStyle = '#2F1B14';
        ctx.fillRect(-12, -30, 24, 8);
        ctx.fillRect(-8, -35, 16, 8);
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(-8, -20, 4, 4);
        ctx.fillRect(4, -20, 4, 4);
        
        // Mouth
        ctx.fillStyle = '#FF6B6B';
        ctx.fillRect(-4, -12, 8, 2);
        
        // Shorts
        ctx.fillStyle = '#000';
        ctx.fillRect(-15, 15, 30, 15);
        
        // Legs
        ctx.fillStyle = '#FFE4B5';
        ctx.fillRect(-12, 30, 8, 10);
        ctx.fillRect(4, 30, 8, 10);
        
        ctx.restore();
        
        // Add slide particles
        if (Math.random() < 0.3) {
            particles.push({
                x: slideX + (Math.random() - 0.5) * 40,
                y: slideY + player.height,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 2,
                life: 15
            });
        }
    }
}

// Collision detection
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function checkPlatformCollision() {
    player.onGround = false;
    currentLevelData.platforms.forEach(platform => {
        if (checkCollision(player, platform)) {
            if (player.velocityY > 0 && player.y < platform.y) {
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.onGround = true;
                player.isJumping = false;
            }
        }
    });
    
    // Check trampoline collisions
    if (currentLevelData.trampolines) {
        currentLevelData.trampolines.forEach(trampoline => {
            if (checkCollision(player, trampoline)) {
                if (player.velocityY > 0 && player.y < trampoline.y) {
                    player.y = trampoline.y - player.height;
                    player.velocityY = -trampoline.bouncePower;
                    player.onGround = false;
                    player.isJumping = true;
                    playJumpSound();
                    
                    // Create bounce particles
                    for (let i = 0; i < 8; i++) {
                        particles.push({
                            x: player.x + player.width/2,
                            y: player.y + player.height,
                            vx: (Math.random() - 0.5) * 6,
                            vy: -Math.random() * 8 - 2,
                            life: 20
                        });
                    }
                }
            }
        });
    }
    
    // Check death pit collisions
    if (currentLevelData.deathPits) {
        currentLevelData.deathPits.forEach(pit => {
            // More precise collision detection for death pits
            if (player.x < pit.x + pit.width &&
                player.x + player.width > pit.x &&
                player.y < pit.y + pit.height &&
                player.y + player.height > pit.y) {
                
                lives--;
                player.x = 50;
                player.y = 300;
                player.velocityX = 0;
                player.velocityY = 0;
                
                if (lives <= 0) {
                    gameRunning = false;
                    playGameOverSound();
                } else {
                    playEnemyHitSound();
                }
            }
        });
    }
}

// Game logic
function updatePlayer() {
    if (isSliding || levelComplete) return;
    
    // Handle input (keyboard + touch)
    if (keys['ArrowLeft'] || keys['KeyA'] || touchControls.left) {
        player.velocityX = -player.speed;
        player.direction = -1;
    } else if (keys['ArrowRight'] || keys['KeyD'] || touchControls.right) {
        player.velocityX = player.speed;
        player.direction = 1;
    } else {
        player.velocityX *= friction;
    }
    
    // Jumping
    if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space'] || touchControls.jump) && player.onGround) {
        player.velocityY = -player.jumpPower;
        player.onGround = false;
        player.isJumping = true;
        playJumpSound();
    }
    
    // Sword attack (Space, X key, or touch)
    if ((keys['KeyX'] || keys['KeyZ'] || (touchControls.attack && touchAttackCooldown === 0)) && player.attackCooldown === 0 && player.hasSword) {
        // Create music note projectile
        const projectileX = player.x + (player.direction === 1 ? player.width : 0);
        const projectileY = player.y + player.height/2;
        playerProjectiles.push(new MusicNote(projectileX, projectileY, player.direction));
        
        player.attackCooldown = 30; // 0.5 seconds at 60fps (doubled cooldown)
        touchAttackCooldown = 10; // Small delay for touch attacks
        player.isAttacking = true;
        
        // Play attack sound
        playCoinSound();
    }
    
    // Shield block (S key or touch)
    if (keys['KeyS'] || touchControls.shield) {
        player.shieldActive = true;
    } else {
        player.shieldActive = false;
    }
    
    // Update attack cooldown
    if (player.attackCooldown > 0) {
        player.attackCooldown--;
    }
    
    // Apply gravity
    player.velocityY += gravity;
    
    // Update position
    player.x += player.velocityX;
    player.y += player.velocityY;
    
    // Check platform collisions
    checkPlatformCollision();
    
    // Check boundaries
    if (player.x < 0) {
        player.x = 0;
        player.velocityX = 0;
    } else if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
        player.velocityX = 0;
    }
    
    // Check if player fell off the screen
    if (player.y > canvas.height + 50) {
        lives--;
        player.x = 50;
        player.y = 300;
        player.velocityX = 0;
        player.velocityY = 0;
        
        if (lives <= 0) {
            gameRunning = false;
            playGameOverSound();
        } else {
            playEnemyHitSound();
        }
    }
}

function updateEnemies() {
    if (isSliding || levelComplete) return;
    
    currentLevelData.enemies.forEach(enemy => {
        enemy.x += enemy.velocityX;
        
        // Bounce off walls
        if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width) {
            enemy.velocityX *= -1;
            enemy.direction *= -1;
        }
        
        // Check collision with player
        if (checkCollision(player, enemy)) {
            lives--;
            player.x = 50;
            player.y = 300;
            if (lives <= 0) {
                gameRunning = false;
                playGameOverSound();
            } else {
                playEnemyHitSound();
            }
        }
    });
}

function updateBoss() {
    if (!boss.isAlive || isSliding || levelComplete) return;
    
    // Update boss position with better movement
    boss.x += boss.velocityX;
    
    // Boss AI - improved movement and targeting
    const distanceToPlayer = Math.abs(player.x - boss.x);
    const playerDirection = player.x < boss.x ? -1 : 1;
    
    if (distanceToPlayer < boss.attackRange) {
        // Move towards player with smoother movement
        if (player.x < boss.x - 50) {
            boss.velocityX = Math.max(-2, boss.velocityX - 0.2);
            boss.direction = -1;
        } else if (player.x > boss.x + 50) {
            boss.velocityX = Math.min(2, boss.velocityX + 0.2);
            boss.direction = 1;
        } else {
            // Close to player - slow down
            boss.velocityX *= 0.8;
        }
    } else {
        // Patrol behavior - smoother back and forth
        if (boss.x <= 100) {
            boss.velocityX = Math.max(0, boss.velocityX + 0.1);
            boss.direction = 1;
        } else if (boss.x >= 700) {
            boss.velocityX = Math.min(0, boss.velocityX - 0.1);
            boss.direction = -1;
        }
    }
    
    // Keep boss in bounds
    if (boss.x < 50) boss.x = 50;
    if (boss.x > 750) boss.x = 750;
    
    // Attack cooldowns
    if (boss.attackCooldown > 0) {
        boss.attackCooldown--;
    }
    if (boss.fireAttackCooldown > 0) {
        boss.fireAttackCooldown--;
    }
    
    // Fire projectile attack from microphone - shoot in multiple directions
    if (boss.hasMicrophone && boss.fireAttackCooldown === 0 && distanceToPlayer < boss.attackRange) {
        const fireX = boss.x + (boss.direction === 1 ? boss.width : 0);
        const fireY = boss.y + boss.height/2;
        
        // Shoot in multiple directions: horizontal, diagonal up, diagonal down
        const directions = [
            { x: boss.direction, y: 0 },           // Horizontal
            { x: boss.direction * 0.7, y: -0.7 }, // Diagonal up
            { x: boss.direction * 0.7, y: 0.7 }   // Diagonal down
        ];
        
        directions.forEach(dir => {
            bossProjectiles.push(new FireProjectile(fireX, fireY, dir.x, dir.y));
        });
        
        boss.fireAttackCooldown = 90; // 1.5 seconds at 60fps (increased cooldown)
        
        // Play fire attack sound
        playEnemyHitSound();
    }
    
    // Check collision with player
    if (checkCollision(player, boss) && !bossInvulnerable) {
        // Check if player is attacking from above (jumping on boss)
        if (player.velocityY > 0 && player.y < boss.y - 10) {
            // Player is attacking the boss
            boss.health--;
            player.velocityY = -8; // Bounce back
            
            if (boss.health <= 0) {
                boss.isAlive = false;
                score += 500; // Bonus points for defeating boss
                playVictoryFanfare(); // Play special sound for boss defeat
            } else {
                playEnemyHitSound();
            }
        } else if (boss.attackCooldown === 0 && !player.shieldActive) {
            // Boss is attacking the player (only if shield is not active)
            lives--;
            player.x = 50;
            player.y = 300;
            boss.attackCooldown = 60; // 1 second cooldown at 60fps
            
            if (lives <= 0) {
                gameRunning = false;
                playGameOverSound();
            } else {
                playEnemyHitSound();
            }
        }
    }
    
    // Update animation
    boss.animationFrame += boss.animationSpeed;
}

function updateCoins() {
    if (isSliding || levelComplete) return;
    
    currentLevelData.coins.forEach(coin => {
        if (!coin.collected && checkCollision(player, coin)) {
            coin.collected = true;
            score += 100;
            
            // Play coin sound
            playCoinSound();
            
            // Create particle effect
            for (let i = 0; i < 8; i++) {
                particles.push({
                    x: coin.x + coin.width/2,
                    y: coin.y + coin.height/2,
                    vx: (Math.random() - 0.5) * 8,
                    vy: (Math.random() - 0.5) * 8,
                    life: 30
                });
            }
        }
    });
}

function updateHugeEmerald() {
    if (isSliding) {
        slideProgress += slideSpeed;
        hugeEmerald.y += hugeEmerald.fallSpeed;
        hugeEmerald.fallSpeed += 0.5;
        
        // Move player along with the slide to the next level's beginning
        if (slideProgress < 1) {
            // Calculate target position (next level's beginning)
            const targetX = 50;
            const targetY = 300;
            
            // Smoothly move player to the target position during slide
            const easeProgress = slideProgress * slideProgress * (3 - 2 * slideProgress); // Smooth easing
            player.x = player.x + (targetX - player.x) * 0.1;
            player.y = player.y + (targetY - player.y) * 0.1;
        }
        
        if (slideProgress >= 1) {
            // Level complete!
            levelComplete = true;
            isSliding = false;
            slideProgress = 0;
            
            // Ensure player is exactly at the next level's starting position
            player.x = 50;
            player.y = 300;
            player.velocityX = 0;
            player.velocityY = 0;
            
            // Keep boss invulnerable for a short time after slide
            setTimeout(() => {
                bossInvulnerable = false;
            }, 2000); // 2 seconds of invulnerability after slide
            
            // Play level complete sound
            playLevelCompleteSound();
            
            // Move to next level immediately after slide completes
            if (currentLevel < levels.length) {
                currentLevel++;
                loadLevel(currentLevel);
            } else {
                // Game completed!
                setTimeout(() => {
                    gameRunning = false;
                    stopBackgroundMusic();
                    playVictoryFanfare();
                }, 1000);
            }
        }
    } else if (!hugeEmerald.collected && checkCollision(player, hugeEmerald)) {
        // Start sliding sequence
        isSliding = true;
        hugeEmerald.falling = true;
        hugeEmerald.slideX = hugeEmerald.x + hugeEmerald.width/2;
        hugeEmerald.fallSpeed = 2;
        
        // Make boss invulnerable during slide transition
        bossInvulnerable = true;
        
        // Play emerald collect sound
        playEmeraldCollectSound();
        
        // Create celebration particles
        for (let i = 0; i < 20; i++) {
            particles.push({
                x: hugeEmerald.x + hugeEmerald.width/2,
                y: hugeEmerald.y + hugeEmerald.height/2,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                life: 60
            });
        }
    }
}

function loadLevel(levelNumber) {
    currentLevel = levelNumber;
    currentLevelData = levels[currentLevel - 1];
    
    // Only reset player position if not coming from a slide transition
    if (!isSliding && !levelComplete) {
        player.x = 50;
        player.y = 300;
        player.velocityX = 0;
        player.velocityY = 0;
    }
    
    // Reset huge emerald - position it based on the highest platform or a good location
    let highestPlatform = { y: 350 };
    currentLevelData.platforms.forEach(platform => {
        if (platform.y < highestPlatform.y) {
            highestPlatform = platform;
        }
    });
    
    // Position huge emerald above the highest platform or at a good level
    hugeEmerald.x = 750;
    hugeEmerald.y = Math.max(50, highestPlatform.y - 100);
    hugeEmerald.collected = false;
    hugeEmerald.falling = false;
    hugeEmerald.fallSpeed = 0;
    
    // Initialize boss for each level
    boss.x = 700;
    boss.y = 300;
    boss.velocityX = -1;
    boss.direction = -1;
    boss.health = Math.min(3 + Math.floor(currentLevel / 3), 8); // Health increases with level
    boss.maxHealth = boss.health;
    boss.isAlive = true;
    boss.attackCooldown = 0;
    boss.fireAttackCooldown = 0;
    boss.animationFrame = 0;
    
    // Reset level state
    isSliding = false;
    slideProgress = 0;
    levelComplete = false;
    bossInvulnerable = false; // Reset boss invulnerability
    
    // Clear particles and projectiles
    particles.length = 0;
    playerProjectiles.length = 0;
    bossProjectiles.length = 0;
    
    // Start background music for new level
    startBackgroundMusic();
}

function updateScore() {
    scoreElement.textContent = `Level: ${currentLevel} | Score: ${score} | Lives: ${lives}`;
}

function updateProjectiles() {
    // Update music note projectiles and check collisions with enemies
    for (let i = playerProjectiles.length - 1; i >= 0; i--) {
        const note = playerProjectiles[i];
        let shouldRemoveNote = false;
        
        // Check collision with enemies
        for (let j = currentLevelData.enemies.length - 1; j >= 0; j--) {
            const enemy = currentLevelData.enemies[j];
            if (checkCollision(note, enemy)) {
                // Remove enemy and mark note for removal
                currentLevelData.enemies.splice(j, 1);
                shouldRemoveNote = true;
                score += 50;
                playEnemyHitSound();
                
                // Create particle effect
                for (let k = 0; k < 5; k++) {
                    particles.push({
                        x: enemy.x + enemy.width/2,
                        y: enemy.y + enemy.height/2,
                        vx: (Math.random() - 0.5) * 8,
                        vy: (Math.random() - 0.5) * 8,
                        life: 30
                    });
                }
                break;
            }
        }
        
        // Check collision with boss
        if (!shouldRemoveNote && boss.isAlive && checkCollision(note, boss)) {
            boss.health--;
            shouldRemoveNote = true;
            score += 100;
            playEnemyHitSound();
            
            if (boss.health <= 0) {
                boss.isAlive = false;
                score += 500;
                playVictoryFanfare();
            }
        }
        
        // Remove note if needed
        if (shouldRemoveNote) {
            playerProjectiles.splice(i, 1);
        }
    }
    
    // Update fire projectiles and check collisions with player
    for (let i = bossProjectiles.length - 1; i >= 0; i--) {
        const fire = bossProjectiles[i];
        if (checkCollision(fire, player) && !player.shieldActive) {
            // Player hit by fire
            lives--;
            player.x = 50;
            player.y = 300;
            bossProjectiles.splice(i, 1);
            
            if (lives <= 0) {
                gameRunning = false;
                playGameOverSound();
            } else {
                playEnemyHitSound();
            }
        }
    }
}

// Game loop
function gameLoop() {
    if (!gameRunning) {
        // Game over or completion screen with enhanced graphics
        const overlayGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        overlayGradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
        overlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        ctx.fillStyle = overlayGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Enhanced completion screen
        const textGradient = ctx.createLinearGradient(canvas.width/2 - 100, 0, canvas.width/2 + 100, 0);
        textGradient.addColorStop(0, '#00C957');
        textGradient.addColorStop(0.5, '#32CD32');
        textGradient.addColorStop(1, '#00C957');
        
        if (currentLevel > levels.length) {
            ctx.fillStyle = textGradient;
            ctx.font = 'bold 48px Comic Sans MS';
            ctx.textAlign = 'center';
            ctx.fillText('🎉 Congratulations! 🎉', canvas.width/2, canvas.height/2 - 50);
            ctx.font = '24px Comic Sans MS';
            ctx.fillText(`You completed all ${levels.length} levels!`, canvas.width/2, canvas.height/2);
            ctx.fillText(`Final Score: ${score}`, canvas.width/2, canvas.height/2 + 30);
            ctx.fillStyle = '#00C957';
            ctx.fillText('You are a true Käärijä master!', canvas.width/2, canvas.height/2 + 60);
        } else {
            ctx.fillStyle = textGradient;
            ctx.fillText('Game Over!', canvas.width/2, canvas.height/2 - 50);
            ctx.font = '24px Comic Sans MS';
            ctx.fillText(`Final Score: ${score}`, canvas.width/2, canvas.height/2);
            ctx.fillText(`Level Reached: ${currentLevel}`, canvas.width/2, canvas.height/2 + 30);
        }
        
        ctx.fillStyle = '#FF6B6B';
        ctx.font = '18px Comic Sans MS';
        ctx.fillText('Press F5 to restart', canvas.width/2, canvas.height/2 + 80);
        return;
    }
    
    // Clear canvas with smooth clearing
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background first
    drawBackground();
    
    // Update game objects
    updatePlayer();
    updateEnemies();
    updateBoss();
    updateCoins();
    updateHugeEmerald();
    updateProjectiles();
    updateScore();
    
    // Reset touch controls to prevent stuck states
    resetTouchControls();
    
    // Draw game objects in proper order
    drawPlatforms();
    drawTrampolines();
    drawDeathPits();
    drawCoins();
    drawEnemies();
    drawBoss();
    drawHugeEmerald();
    drawParticles();
    drawMusicNotes();
    drawFireProjectiles();
    drawSlide();
    if (!isSliding) {
        drawPlayer();
    }
    
    // Continue game loop
    requestAnimationFrame(gameLoop);
}

// Enhanced input handling with audio controls
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    // Start audio context on first interaction
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    // Mute/unmute with M key
    if (e.code === 'KeyM') {
        toggleMute();
    }
});
document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Touch control event handlers
function setupTouchControls() {
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    const jumpBtn = document.getElementById('jumpBtn');
    const attackBtn = document.getElementById('attackBtn');
    const shieldBtn = document.getElementById('shieldBtn');
    
    // Left button
    leftBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchControls.left = true;
        leftBtn.style.transform = 'scale(0.9)';
    });
    leftBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchControls.left = false;
        leftBtn.style.transform = 'scale(1)';
    });
    
    // Right button
    rightBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchControls.right = true;
        rightBtn.style.transform = 'scale(0.9)';
    });
    rightBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchControls.right = false;
        rightBtn.style.transform = 'scale(1)';
    });
    
    // Jump button
    jumpBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchControls.jump = true;
        jumpBtn.style.transform = 'scale(0.9)';
    });
    jumpBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchControls.jump = false;
        jumpBtn.style.transform = 'scale(1)';
    });
    
    // Attack button
    attackBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchControls.attack = true;
        attackBtn.style.transform = 'scale(0.9)';
    });
    attackBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchControls.attack = false;
        attackBtn.style.transform = 'scale(1)';
    });
    
    // Shield button
    shieldBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchControls.shield = true;
        shieldBtn.style.transform = 'scale(0.9)';
    });
    shieldBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchControls.shield = false;
        shieldBtn.style.transform = 'scale(1)';
    });
    
    // Mouse events for desktop testing
    leftBtn.addEventListener('mousedown', () => {
        touchControls.left = true;
        leftBtn.style.transform = 'scale(0.9)';
    });
    leftBtn.addEventListener('mouseup', () => {
        touchControls.left = false;
        leftBtn.style.transform = 'scale(1)';
    });
    leftBtn.addEventListener('mouseleave', () => {
        touchControls.left = false;
        leftBtn.style.transform = 'scale(1)';
    });
    
    rightBtn.addEventListener('mousedown', () => {
        touchControls.right = true;
        rightBtn.style.transform = 'scale(0.9)';
    });
    rightBtn.addEventListener('mouseup', () => {
        touchControls.right = false;
        rightBtn.style.transform = 'scale(1)';
    });
    rightBtn.addEventListener('mouseleave', () => {
        touchControls.right = false;
        rightBtn.style.transform = 'scale(1)';
    });
    
    jumpBtn.addEventListener('mousedown', () => {
        touchControls.jump = true;
        jumpBtn.style.transform = 'scale(0.9)';
    });
    jumpBtn.addEventListener('mouseup', () => {
        touchControls.jump = false;
        jumpBtn.style.transform = 'scale(1)';
    });
    jumpBtn.addEventListener('mouseleave', () => {
        touchControls.jump = false;
        jumpBtn.style.transform = 'scale(1)';
    });
    
    attackBtn.addEventListener('mousedown', () => {
        touchControls.attack = true;
        attackBtn.style.transform = 'scale(0.9)';
    });
    attackBtn.addEventListener('mouseup', () => {
        touchControls.attack = false;
        attackBtn.style.transform = 'scale(1)';
    });
    attackBtn.addEventListener('mouseleave', () => {
        touchControls.attack = false;
        attackBtn.style.transform = 'scale(1)';
    });
    
    shieldBtn.addEventListener('mousedown', () => {
        touchControls.shield = true;
        shieldBtn.style.transform = 'scale(1.1)';
    });
    shieldBtn.addEventListener('mouseup', () => {
        touchControls.shield = false;
        shieldBtn.style.transform = 'scale(1)';
    });
    shieldBtn.addEventListener('mouseleave', () => {
        touchControls.shield = false;
        shieldBtn.style.transform = 'scale(1)';
    });
}

// Reset touch controls to prevent stuck states
function resetTouchControls() {
    // Reset attack and shield to prevent them from getting stuck
    touchControls.attack = false;
    touchControls.shield = false;
    
    // Update touch attack cooldown
    if (touchAttackCooldown > 0) {
        touchAttackCooldown--;
    }
}

// Start the game
loadLevel(1);
startBackgroundMusic();
setupTouchControls();
gameLoop();
