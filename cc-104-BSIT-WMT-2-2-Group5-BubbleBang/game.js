const MAX_LIVES = 3;
const POP_POINTS = 10;
const SHINY_POINTS = 50;
const SHINY_CHANCE = 0.12;
const BEST_KEY = "bubbleBangBestScore";
const TICK_MS = 100;

let bubbles = [];
let nextId = 1;
let score = 0;
let lives = MAX_LIVES;

let growthTimer = null;
let spawnTimer = null;
let gameRunning = false;

const gameArea = document.getElementById("gameArea");
const scoreDisplay = document.getElementById("score");
const livesDisplay = document.getElementById("lives");
const gameMessage = document.getElementById("gameMessage");
const resetButton = document.getElementById("resetButton");

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function getDifficulty() {
    if (score >= 1000) {
        return { name: "MASTER",    minDelay: 350,  maxDelay: 900,  minGrowth: 1.4, maxGrowth: 2.6 };
    } else if (score >= 800) {
        return { name: "INSANE",    minDelay: 450,  maxDelay: 1100, minGrowth: 1.3, maxGrowth: 2.4 };
    } else if (score >= 600) {
        return { name: "EXTREME",   minDelay: 550,  maxDelay: 1300, minGrowth: 1.2, maxGrowth: 2.2 };
    } else if (score >= 400) {
        return { name: "VERY HARD", minDelay: 650,  maxDelay: 1500, minGrowth: 1.1, maxGrowth: 2.0 };
    } else if (score >= 200) {
        return { name: "HARD",      minDelay: 800,  maxDelay: 1700, minGrowth: 1.0, maxGrowth: 1.8 };
    } else if (score >= 100) {
        return { name: "MEDIUM",    minDelay: 1000, maxDelay: 2000, minGrowth: 0.9, maxGrowth: 1.6 };
    } else if (score >= 50) {
        return { name: "NORMAL",    minDelay: 1200, maxDelay: 2400, minGrowth: 0.8, maxGrowth: 1.4 };
    } else {
        return { name: "EASY",      minDelay: 1500, maxDelay: 3000, minGrowth: 0.6, maxGrowth: 1.2 };
    }
}

let audioCtx = null;

function playSynthPop() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        const startFreq = rand(450, 750);

        osc.type = "sine";
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(startFreq * 2.2, now + 0.08);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.13);
    } catch (error) {
    }
}

const popAudio = new Audio("pop.wav");

function playPopSound() {
    try {
        const sound = popAudio.cloneNode();
        sound.volume = 0.6;
        const result = sound.play();

        if (result && result.catch) {
            result.catch(playSynthPop);
        }
    } catch (error) {
        playSynthPop();
    }
}

const MUSIC_BPM = 128;
const STEP_TIME = 60 / MUSIC_BPM / 2;

const CHORDS = [
    [60, 64, 67],
    [57, 60, 64],
    [53, 57, 60],
    [55, 59, 62]
];
const BASS_NOTES = [48, 45, 41, 43];
const ARP_PATTERN = [0, 1, 2, 1, 0, 1, 2, 1];
const MELODY = [
    76, null, 79, null, 76, 74, 72, null,
    72, null, 76, null, 81, 79, 76, null,
    77, null, 81, null, 77, 76, 74, null,
    74, 76, 79, null, 83, 79, 74, null
];

let musicEnabled = true;
let musicPlaying = false;
let audioUnlocked = false;
let musicGain = null;
let musicStep = 0;
let nextNoteTime = 0;
let musicTimer = null;
let noiseBuffer = null;
let currentLevel = "EASY";

function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
    return audioCtx;
}

function playTone(freq, time, duration, type, volume, destination) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(destination || audioCtx.destination);

    osc.start(time);
    osc.stop(time + duration + 0.05);
}

function playHat(time) {
    if (!noiseBuffer) {
        const length = Math.floor(audioCtx.sampleRate * 0.05);
        noiseBuffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    }

    const source = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();

    source.buffer = noiseBuffer;
    filter.type = "highpass";
    filter.frequency.value = 7000;

    gain.gain.setValueAtTime(0.04, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);

    source.start(time);
}

function scheduleStep(step, time) {
    const bar = Math.floor(step / 8);
    const beatStep = step % 8;
    const chord = CHORDS[bar];

    playTone(midiToFreq(chord[ARP_PATTERN[beatStep]] + 12), time, STEP_TIME * 0.9, "triangle", 0.05, musicGain);

    if (beatStep === 0 || beatStep === 4) {
        playTone(midiToFreq(BASS_NOTES[bar]), time, STEP_TIME * 3.5, "sine", 0.18, musicGain);
    }

    const lead = MELODY[step];
    if (lead) {
        playTone(midiToFreq(lead), time, STEP_TIME * 1.6, "triangle", 0.07, musicGain);
    }

    if (beatStep % 2 === 1) {
        playHat(time);
    }
}

function musicTick() {
    while (nextNoteTime < audioCtx.currentTime + 0.25) {
        scheduleStep(musicStep, nextNoteTime);
        nextNoteTime += STEP_TIME;
        musicStep = (musicStep + 1) % 32;
    }
}

function startMusicLoop() {
    if (musicPlaying || !musicEnabled) return;

    const ctx = getAudioCtx();

    if (!musicGain) {
        musicGain = ctx.createGain();
        musicGain.gain.value = 0.5;
        musicGain.connect(ctx.destination);
    }

    musicStep = 0;
    nextNoteTime = ctx.currentTime + 0.1;
    musicPlaying = true;
    musicTimer = setInterval(musicTick, 50);
}

function stopMusicLoop() {
    clearInterval(musicTimer);
    musicPlaying = false;
}

function playLevelUp() {
    if (!audioUnlocked) return;

    const ctx = getAudioCtx();
    const t = ctx.currentTime;

    [72, 76, 79, 84].forEach(function (midi, i) {
        playTone(midiToFreq(midi), t + i * 0.08, 0.25, "triangle", 0.15);
    });
}

function playGameOverSound() {
    if (!audioUnlocked) return;

    const ctx = getAudioCtx();
    const t = ctx.currentTime;

    [67, 64, 60, 55].forEach(function (midi, i) {
        playTone(midiToFreq(midi), t + i * 0.22, 0.4, "triangle", 0.18);
    });
}

function unlockAudio() {
    if (audioUnlocked) return;

    audioUnlocked = true;
    getAudioCtx();

    if (musicEnabled && gameRunning) {
        startMusicLoop();
    }
}

document.addEventListener("pointerdown", unlockAudio, { once: true });

const musicButton = document.createElement("button");
musicButton.id = "musicButton";

function updateMusicButton() {
    musicButton.textContent = musicEnabled ? "🎵 Music: ON" : "🔇 Music: OFF";
}

updateMusicButton();
resetButton.insertAdjacentElement("afterend", musicButton);

musicButton.addEventListener("click", function () {
    musicEnabled = !musicEnabled;
    updateMusicButton();

    if (musicEnabled) {
        unlockAudio();
        if (gameRunning) startMusicLoop();
    } else {
        stopMusicLoop();
    }
});

const musicStyle = document.createElement("style");
musicStyle.textContent = `
    #musicButton {
        margin-top: 15px;
        margin-left: 10px;
        padding: 12px 24px;
        background-color: #10141d;
        color: white;
        border: 1px solid #16c5d8;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: 0.3s;
    }

    #musicButton:hover {
        background-color: #16c5d8;
        box-shadow: 0 0 12px rgba(22, 197, 216, 0.4);
    }

    #playButton {
        margin-top: 15px;
        margin-right: 10px;
        padding: 12px 30px;
        background-color: #16c5d8;
        color: #10141d;
        border: 1px solid #16c5d8;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: 0.3s;
        box-shadow: 0 0 12px rgba(22, 197, 216, 0.4);
    }

    #playButton:hover {
        background-color: #7df9ff;
        box-shadow: 0 0 18px rgba(125, 249, 255, 0.6);
    }
`;
document.head.appendChild(musicStyle);

const playButton = document.createElement("button");
playButton.id = "playButton";
playButton.textContent = "▶ Play";
resetButton.insertAdjacentElement("beforebegin", playButton);
playButton.addEventListener("click", startGame);

let bestScore = 0;
let bestAtStart = 0;

try {
    bestScore = Number(localStorage.getItem(BEST_KEY)) || 0;
} catch (error) {
    bestScore = 0;
}

const bestDisplay = document.createElement("div");
bestDisplay.className = "best-display";

const hudElement = gameArea.querySelector(".game-hud");
if (hudElement) {
    hudElement.insertBefore(bestDisplay, hudElement.lastElementChild);
}

function updateBestDisplay() {
    bestDisplay.textContent = "🏆 Best: " + bestScore;
}

function updateBestScore() {
    if (score > bestScore) {
        bestScore = score;

        try {
            localStorage.setItem(BEST_KEY, String(bestScore));
        } catch (error) {
        }

        updateBestDisplay();
    }
}

updateBestDisplay();

const shinyStyle = document.createElement("style");
shinyStyle.textContent = `
    .best-display {
        color: #ffd84a;
        font-size: 18px;
        font-weight: bold;
        padding-top: 4px;
        text-shadow: 0 0 8px rgba(255, 200, 0, 0.6);
    }

    .bubble.shiny {
        background: radial-gradient(circle at 30% 30%, #fffbe0, #ffd84a 45%, #f59e0b 75%);
        box-shadow: 0 0 14px rgba(255, 215, 0, 0.9),
                    0 0 30px rgba(255, 200, 0, 0.6);
        animation: shinyPulse 0.6s ease-in-out infinite alternate;
        z-index: 5;
    }

    @keyframes shinyPulse {
        from { filter: brightness(1); }
        to   { filter: brightness(1.4); }
    }

    .pop-particle.gold {
        background: #ffd84a;
        box-shadow: 0 0 8px rgba(255, 200, 0, 0.9);
    }

    .float-text {
        position: absolute;
        color: #ffd84a;
        font-size: 26px;
        font-weight: bold;
        text-shadow: 0 0 10px rgba(255, 200, 0, 0.9);
        pointer-events: none;
        z-index: 20;
        animation: floatUp 0.9s ease-out forwards;
    }

    @keyframes floatUp {
        0%   { transform: translate(-50%, 0);     opacity: 1; }
        100% { transform: translate(-50%, -50px); opacity: 0; }
    }
`;
document.head.appendChild(shinyStyle);

function playShinySound() {
    if (!audioUnlocked) return;

    const ctx = getAudioCtx();
    const t = ctx.currentTime;

    [79, 83, 86, 91, 95].forEach(function (midi, i) {
        playTone(midiToFreq(midi), t + i * 0.06, 0.3, "sine", 0.12);
    });
}

function showFloatingText(text, bubble) {
    const label = document.createElement("div");
    label.className = "float-text";
    label.textContent = text;
    label.style.left = bubble.cx + "px";
    label.style.top = (bubble.cy - 15) + "px";

    gameArea.appendChild(label);

    setTimeout(function () {
        label.remove();
    }, 900);
}

const popStyle = document.createElement("style");
popStyle.textContent = `
    .bubble.popping {
        pointer-events: none;
        animation: bubblePop 0.25s ease-out forwards;
    }

    @keyframes bubblePop {
        0%   { transform: scale(1);    opacity: 1; }
        40%  { transform: scale(1.25); opacity: 0.8; }
        100% { transform: scale(1.6);  opacity: 0; }
    }

    .pop-particle {
        position: absolute;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #7df9ff;
        box-shadow: 0 0 8px rgba(22, 197, 216, 0.8);
        pointer-events: none;
        animation: particleFly 0.45s ease-out forwards;
    }

    @keyframes particleFly {
        0%   { transform: translate(0, 0) scale(1);   opacity: 1; }
        100% { transform: translate(var(--dx), var(--dy)) scale(0.2); opacity: 0; }
    }
`;
document.head.appendChild(popStyle);

function popBubbleEffect(element, bubble) {
    element.classList.add("popping");

    const count = bubble.shiny ? 16 : 8;
    const radius = bubble.size / 2 + 15;

    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + rand(-0.3, 0.3);
        const distance = rand(radius * 0.8, radius * 1.4);

        const particle = document.createElement("div");
        particle.className = bubble.shiny ? "pop-particle gold" : "pop-particle";
        particle.style.left = (bubble.cx - 4) + "px";
        particle.style.top = (bubble.cy - 4) + "px";
        particle.style.setProperty("--dx", Math.cos(angle) * distance + "px");
        particle.style.setProperty("--dy", Math.sin(angle) * distance + "px");

        gameArea.appendChild(particle);

        setTimeout(function () {
            particle.remove();
        }, 450);
    }

    setTimeout(function () {
        element.remove();
    }, 250);
}

function updateHUD() {
    scoreDisplay.textContent = score;

    livesDisplay.innerHTML = "";

    for (let i = 0; i < lives; i++) {
        const heart = document.createElement("span");
        heart.className = "heart";
        heart.textContent = "♥";
        livesDisplay.appendChild(heart);
    }
}

function updateDifficultyMessage() {
    const name = getDifficulty().name;

    if (name !== currentLevel) {
        currentLevel = name;
        playLevelUp();
    }

    gameMessage.textContent = "Difficulty: " + name;
}

function spawnBubble() {
    if (lives <= 0) return;

    const difficulty = getDifficulty();
    const isShiny = nextId > 3 && Math.random() < SHINY_CHANCE;
    const maxSize = isShiny ? rand(60, 75) : rand(70, 110);

    const bubble = {
        id: nextId++,
        size: rand(15, 35),
        maxSize: maxSize,
        shiny: isShiny,
        growth: rand(difficulty.minGrowth, difficulty.maxGrowth) * (isShiny ? 1.3 : 1),
        cx: rand(maxSize / 2, gameArea.clientWidth - maxSize / 2),
        cy: rand(maxSize / 2, gameArea.clientHeight - maxSize / 2)
    };

    bubbles.push(bubble);
    gameArea.appendChild(createBubbleElement(bubble));

    scheduleNextSpawn();
}

function scheduleNextSpawn() {
    clearTimeout(spawnTimer);

    const difficulty = getDifficulty();
    const delay = rand(difficulty.minDelay, difficulty.maxDelay);

    spawnTimer = setTimeout(spawnBubble, delay);
}

function applyBubbleStyle(element, bubble) {
    element.style.width = bubble.size + "px";
    element.style.height = bubble.size + "px";
    element.style.left = (bubble.cx - bubble.size / 2) + "px";
    element.style.top = (bubble.cy - bubble.size / 2) + "px";
}

function createBubbleElement(bubble) {
    const element = document.createElement("div");

    element.className = bubble.shiny ? "bubble shiny" : "bubble";
    element.dataset.id = bubble.id;

    applyBubbleStyle(element, bubble);

    return element;
}

function growBubbles() {
    const burstIds = [];

    bubbles.forEach(function (bubble) {
        bubble.size += bubble.growth;

        const element = gameArea.querySelector(
            '.bubble[data-id="' + bubble.id + '"]'
        );

        if (element) {
            applyBubbleStyle(element, bubble);
        }

        if (bubble.size > bubble.maxSize) {
            burstIds.push(bubble.id);
        }
    });

    if (burstIds.length > 0) {
        const lostLives = bubbles.filter(function (bubble) {
            return burstIds.includes(bubble.id) && !bubble.shiny;
        }).length;

        bubbles = bubbles.filter(function (bubble) {
            return !burstIds.includes(bubble.id);
        });

        burstIds.forEach(function (id) {
            const element = gameArea.querySelector(
                '.bubble[data-id="' + id + '"]'
            );

            if (element) element.remove();
        });

        lives = Math.max(0, lives - lostLives);
        updateHUD();

        if (lives <= 0) {
            endGame();
        }
    }
}

gameArea.addEventListener("click", function (event) {
    const element = event.target.closest(".bubble");

    if (!element || lives <= 0) return;

    const id = Number(element.dataset.id);

    const index = bubbles.findIndex(function (bubble) {
        return bubble.id === id;
    });

    if (index !== -1) {
        const poppedBubble = bubbles[index];
        bubbles.splice(index, 1);
        popBubbleEffect(element, poppedBubble);

        playPopSound();

        if (poppedBubble.shiny) {
            playShinySound();
            showFloatingText("+" + SHINY_POINTS + "!", poppedBubble);
        }

        score += poppedBubble.shiny ? SHINY_POINTS : POP_POINTS;
        updateHUD();
        updateBestScore();
        updateDifficultyMessage();
    }
});

function endGame() {
    gameRunning = false;
    clearInterval(growthTimer);
    clearTimeout(spawnTimer);

    bubbles = [];

    gameArea.querySelectorAll(".bubble").forEach(function (element) {
        element.remove();
    });

    gameMessage.textContent =
        "GAME OVER! Final Score: " + score +
        (score > bestAtStart && score > 0 ? "  🏆 NEW HIGH SCORE!" : "");

    stopMusicLoop();
    playGameOverSound();
}

function startGame() {
    clearInterval(growthTimer);
    clearTimeout(spawnTimer);

    bubbles = [];
    nextId = 1;
    gameRunning = true;
    playButton.style.display = "none";
    currentLevel = "EASY";
    bestAtStart = bestScore;
    score = 0;
    lives = MAX_LIVES;

    gameArea.querySelectorAll(".bubble").forEach(function (element) {
        element.remove();
    });

    updateHUD();
    updateDifficultyMessage();

    if (audioUnlocked && musicEnabled) {
        stopMusicLoop();
        startMusicLoop();
    }

    spawnBubble();

    growthTimer = setInterval(growBubbles, TICK_MS);
}

function resetGame() {
    gameRunning = false;

    clearInterval(growthTimer);
    clearTimeout(spawnTimer);
    stopMusicLoop();

    bubbles = [];
    nextId = 1;
    currentLevel = "EASY";
    score = 0;
    lives = MAX_LIVES;

    gameArea.querySelectorAll(".bubble, .pop-particle, .float-text").forEach(function (element) {
        element.remove();
    });

    updateHUD();

    playButton.style.display = "";
    gameMessage.textContent = "Press PLAY to start";
}

resetButton.addEventListener("click", resetGame);

resetGame();