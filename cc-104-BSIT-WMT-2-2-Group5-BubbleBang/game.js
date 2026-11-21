const START_SIZE = 32;
const MAX_SIZE = 116;
const MAX_LIVES = 3;
const SCORE_STORAGE_KEY = "bubble-bang-high-scores-v1";
const SETTINGS_STORAGE_KEY = "bubble-bang-settings-v1";

const MODES = {
    relaxed: {
        label: "Relaxed",
        lives: 3,
        growth: 10,
        spawnDelay: 1750,
        minimumDelay: 1050,
        maximumBubbles: 6
    },
    classic: {
        label: "Classic",
        lives: 3,
        growth: 13,
        spawnDelay: 1450,
        minimumDelay: 760,
        maximumBubbles: 8
    },
    challenge: {
        label: "Challenge",
        lives: 3,
        growth: 17,
        spawnDelay: 1060,
        minimumDelay: 540,
        maximumBubbles: 10
    }
};

const BUBBLE_TYPES = {
    normal: { label: "bubble", points: 10, color: "#7eeeff", icon: "" },
    gold: { label: "gold bubble", points: 30, color: "#ffe26f", icon: "★" },
    freeze: { label: "freeze bubble", points: 15, color: "#a8eaff", icon: "❄" },
    heart: { label: "heart bubble", points: 10, color: "#ff91b1", icon: "♥" }
};

const LEVEL_NAMES = ["CALM", "SWIFT", "WILD", "STORM", "FRENZY", "ELECTRIC", "UNSTOPPABLE"];

// Smooth ramp: speed keeps rising between levels as you pop and as time passes.
const RAMP_PER_POP = 0.18;
const RAMP_PER_10_SECONDS = 0.35;
const RAMP_CAP = 10;

// Special bubbles now arrive at score milestones instead of at random.
const HEART_MILESTONE = 1000;
const FREEZE_MILESTONE = 600;

// ---------------------------------------------------------------------------
// Audio settings: music and sound effects are controlled separately.
// ---------------------------------------------------------------------------
const DEFAULT_SETTINGS = { musicOn: true, sfxOn: true, musicVolume: 0.55, sfxVolume: 0.8 };

function loadSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)) || {};
        const loaded = { ...DEFAULT_SETTINGS, ...saved };
        // Old saves used a single "muted" flag.
        if (saved.muted === true && saved.musicOn === undefined) {
            loaded.musicOn = false;
            loaded.sfxOn = false;
        }
        return loaded;
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // The game remains playable when browser storage is disabled.
    }
}

let settings = loadSettings();

// The sound panel (switches + volume sliders) is built here so only game.js needs to change.
function buildAudioPanel() {
    const style = document.createElement("style");
    style.textContent = `
        .audio-settings { width: 100%; margin: 12px 0 16px; text-align: left; }
        .audio-settings h3 { margin: 0 0 10px; font-size: 1rem; }
        .audio-row { margin-bottom: 14px; }
        .audio-row-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
        .audio-row-volume { display: flex; align-items: center; gap: 10px; }
        .audio-row-volume input[type="range"] { flex: 1; accent-color: #7eeeff; }
        .audio-row-volume input[type="range"]:disabled { opacity: 0.4; }
        .audio-row-volume output { min-width: 42px; text-align: right; font-variant-numeric: tabular-nums; }
        .switch { position: relative; display: inline-block; width: 48px; height: 26px; flex-shrink: 0; }
        .switch input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; z-index: 1; }
        .switch-track { position: absolute; inset: 0; border-radius: 999px; background: #5b6475; transition: background 0.2s; }
        .switch-track::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform 0.2s; }
        .switch input:checked + .switch-track { background: #2fbfd6; }
        .switch input:checked + .switch-track::after { transform: translateX(22px); }
        .switch input:focus-visible + .switch-track { outline: 3px solid #ffe26f; outline-offset: 2px; }
    `;
    document.head.appendChild(style);

    const panel = document.createElement("div");
    panel.className = "audio-settings";
    panel.innerHTML = `
        <h3>Sound</h3>
        <div class="audio-row">
            <div class="audio-row-head">
                <span>Background music</span>
                <label class="switch">
                    <input type="checkbox" id="musicToggle" role="switch" aria-label="Background music">
                    <span class="switch-track"></span>
                </label>
            </div>
            <div class="audio-row-volume">
                <input type="range" id="musicVolume" min="0" max="100" step="1" aria-label="Background music volume">
                <output id="musicVolumeValue" for="musicVolume"></output>
            </div>
        </div>
        <div class="audio-row">
            <div class="audio-row-head">
                <span>Sound effects (bubble pops)</span>
                <label class="switch">
                    <input type="checkbox" id="sfxToggle" role="switch" aria-label="Sound effects">
                    <span class="switch-track"></span>
                </label>
            </div>
            <div class="audio-row-volume">
                <input type="range" id="sfxVolume" min="0" max="100" step="1" aria-label="Sound effects volume">
                <output id="sfxVolumeValue" for="sfxVolume"></output>
            </div>
        </div>
    `;

    const resumeButton = document.getElementById("resumeButton");
    if (resumeButton && resumeButton.parentElement) {
        resumeButton.parentElement.insertBefore(panel, resumeButton);
    } else {
        document.getElementById("pauseOverlay").appendChild(panel);
    }
}

buildAudioPanel();

// The top-bar mute button is no longer used; sound is controlled from the pause menu.
document.getElementById("soundButton")?.remove();

const elements = {
    menuScreen: document.getElementById("menuScreen"),
    gameScreen: document.getElementById("gameScreen"),
    playerName: document.getElementById("playerName"),
    startButton: document.getElementById("startButton"),
    clearScoresButton: document.getElementById("clearScoresButton"),
    highScores: document.getElementById("highScores"),
    gameArea: document.getElementById("gameArea"),
    effectLayer: document.getElementById("effectLayer"),
    score: document.getElementById("score"),
    time: document.getElementById("time"),
    lives: document.getElementById("lives"),
    levelBadge: document.getElementById("levelBadge"),
    gameMessage: document.getElementById("gameMessage"),
    pauseButton: document.getElementById("pauseButton"),
    pauseOverlay: document.getElementById("pauseOverlay"),
    gameOverOverlay: document.getElementById("gameOverOverlay"),
    resumeButton: document.getElementById("resumeButton"),
    quitButton: document.getElementById("quitButton"),
    playAgainButton: document.getElementById("playAgainButton"),
    menuButton: document.getElementById("menuButton"),
    restartButton: document.getElementById("restartButton"),
    leaveButton: document.getElementById("leaveButton"),
    finalSummary: document.getElementById("finalSummary"),
    newRecord: document.getElementById("newRecord"),
    musicToggle: document.getElementById("musicToggle"),
    sfxToggle: document.getElementById("sfxToggle"),
    musicVolume: document.getElementById("musicVolume"),
    sfxVolume: document.getElementById("sfxVolume"),
    musicVolumeValue: document.getElementById("musicVolumeValue"),
    sfxVolumeValue: document.getElementById("sfxVolumeValue")
};

let gameState = "menu";
let currentModeKey = "classic";
let currentPlayer = "Player";
let bubbles = [];
let nextBubbleId = 1;
let score = 0;
let lives = MODES.classic.lives;
let successfulPops = 0;
let specialQueue = [];
let lastHeartMilestone = 0;
let lastFreezeMilestone = 0;
let frozenUntil = 0;
let frozenRemaining = 0;
let startedAt = 0;
let elapsedBeforePause = 0;
let spawnRemaining = 0;
let nextSpawnAt = 0;
let lastFrameAt = 0;
let frameId = null;
let audioContext = null;

function getSavedScores() {
    try {
        const saved = JSON.parse(localStorage.getItem(SCORE_STORAGE_KEY));
        if (!Array.isArray(saved)) return [];
        return saved.filter((entry) => entry && typeof entry === "object" && Number.isFinite(entry.score));
    } catch {
        return [];
    }
}

function writeSavedScores(scores) {
    try {
        localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(scores));
    } catch {
        // Scores are optional; do not interrupt a game if storage is unavailable.
    }
}

let scoreModeLabel = null;

function getSelectedModeKey() {
    return document.querySelector('input[name="mode"]:checked')?.value || "classic";
}

function matchesSavedMode(entry, modeKey) {
    if (!entry || typeof entry !== "object") return false;
    if (entry.modeKey) return entry.modeKey === modeKey;
    const label = (MODES[modeKey] || MODES.classic).label;
    return typeof entry.mode === "string" && entry.mode.toLowerCase() === label.toLowerCase();
}

function ensureScoreModeLabel() {
    if (scoreModeLabel) return;
    scoreModeLabel = document.createElement("p");
    scoreModeLabel.className = "field-hint";
    scoreModeLabel.id = "scoreModeLabel";
    elements.highScores.insertAdjacentElement("beforebegin", scoreModeLabel);
}

function renderHighScores() {
    ensureScoreModeLabel();

    const modeKey = getSelectedModeKey();
    const modeLabel = (MODES[modeKey] || MODES.classic).label;
    scoreModeLabel.textContent = `${modeLabel} mode — top 5 on this device`;

    const scores = getSavedScores()
        .filter((entry) => matchesSavedMode(entry, modeKey))
        .sort((first, second) => second.score - first.score)
        .slice(0, 5);
    elements.highScores.replaceChildren();

    if (scores.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty-score";
        empty.textContent = `No ${modeLabel} scores yet — your first great run will appear here.`;
        elements.highScores.appendChild(empty);
        return;
    }

    scores.forEach((entry, index) => {
        const item = document.createElement("li");
        item.className = "score-card";
        item.title = `${entry.name} — ${entry.score} points, ${modeLabel}`;

        const rank = document.createElement("small");
        rank.textContent = `#${index + 1}`;
        const name = document.createElement("strong");
        name.textContent = entry.name;
        const value = document.createElement("span");
        value.textContent = formatNumber(entry.score);

        item.append(rank, name, value);
        elements.highScores.appendChild(item);
    });
}

function saveScore() {
    if (score <= 0) return false;

    const previousScores = getSavedScores();
    const entry = {
        name: currentPlayer,
        score,
        mode: MODES[currentModeKey].label,
        modeKey: currentModeKey,
        duration: getElapsedTime(performance.now()),
        createdAt: Date.now()
    };
    const sameMode = [...previousScores.filter((candidate) => matchesSavedMode(candidate, currentModeKey)), entry]
        .sort((first, second) => second.score - first.score || second.createdAt - first.createdAt)
        .slice(0, 5);
    const otherModes = previousScores.filter((candidate) => !matchesSavedMode(candidate, currentModeKey));

    writeSavedScores([...otherModes, ...sameMode]);
    renderHighScores();
    return sameMode.includes(entry);
}

function getLevel() {
    return Math.floor(score / 150) + 1;
}

function getLevelName(level = getLevel()) {
    return LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)];
}

function getBalance() {
    const mode = MODES[currentModeKey];
    const levelPace = Math.min(getLevel() - 1, 12);
    const elapsedSeconds = getElapsedTime(performance.now()) / 1000;
    const continuousPace = Math.min(
        RAMP_CAP,
        successfulPops * RAMP_PER_POP + (elapsedSeconds / 10) * RAMP_PER_10_SECONDS
    );
    const pace = levelPace + continuousPace;

    return {
        growthPerSecond: mode.growth + pace * 1.25,
        spawnDelay: Math.max(mode.minimumDelay, mode.spawnDelay - levelPace * 58 - continuousPace * 8),
        maximumBubbles: mode.maximumBubbles + Math.floor(pace / 3)
    };
}

function queueMilestoneSpecials() {
    const heartMilestone = Math.floor(score / HEART_MILESTONE);
    while (lastHeartMilestone < heartMilestone) {
        lastHeartMilestone += 1;
        specialQueue.push("heart");
    }

    const freezeMilestone = Math.floor(score / FREEZE_MILESTONE);
    while (lastFreezeMilestone < freezeMilestone) {
        lastFreezeMilestone += 1;
        specialQueue.push("freeze");
    }
}

function chooseBubbleType() {
    const guaranteed = specialQueue.shift();
    if (guaranteed) return guaranteed;
    return Math.random() < 0.82 ? "normal" : "gold";
}

function findPosition(size) {
    const bounds = elements.gameArea.getBoundingClientRect();
    const leftBoundary = Math.max(0, bounds.width - MAX_SIZE);
    const topBoundary = Math.max(46, bounds.height - MAX_SIZE);

    for (let attempt = 0; attempt < 18; attempt += 1) {
        const x = Math.random() * leftBoundary;
        const y = 44 + Math.random() * Math.max(0, topBoundary - 44);
        const hasRoom = bubbles.every((bubble) => {
            const distance = Math.hypot((x + size / 2) - (bubble.x + bubble.size / 2), (y + size / 2) - (bubble.y + bubble.size / 2));
            return distance > (size + bubble.size) / 2 + 14;
        });

        if (hasRoom) return { x, y };
    }

    return {
        x: Math.random() * leftBoundary,
        y: 44 + Math.random() * Math.max(0, topBoundary - 44)
    };
}

function spawnBubble() {
    if (gameState !== "playing") return;

    const type = chooseBubbleType();
    const definition = BUBBLE_TYPES[type];
    const size = START_SIZE + Math.random() * 6;
    const { x, y } = findPosition(size);
    const bubble = {
        id: nextBubbleId++,
        type,
        size,
        x,
        y,
        element: null
    };

    const element = document.createElement("button");
    element.type = "button";
    element.className = `bubble bubble--${type}`;
    element.style.setProperty("--size", `${size}px`);
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    element.setAttribute("aria-label", `Pop ${definition.label}`);
    element.title = `Pop ${definition.label}`;

    if (definition.icon) {
        const icon = document.createElement("span");
        icon.className = "bubble-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = definition.icon;
        element.appendChild(icon);
    }

    element.addEventListener("click", () => popBubble(bubble.id));
    bubble.element = element;
    bubbles.push(bubble);
    elements.gameArea.appendChild(element);
}

function removeBubble(bubble) {
    const index = bubbles.indexOf(bubble);
    if (index !== -1) bubbles.splice(index, 1);
    bubble.element?.remove();
}

function popBubble(id) {
    if (gameState !== "playing") return;

    const bubble = bubbles.find((candidate) => candidate.id === id);
    if (!bubble) return;

    const now = performance.now();
    const oldLevel = getLevel();
    const earnedPoints = BUBBLE_TYPES[bubble.type].points;
    createBurst(bubble.x + bubble.size / 2, bubble.y + bubble.size / 2, BUBBLE_TYPES[bubble.type].color);
    removeBubble(bubble);

    if (bubble.type === "freeze") {
        frozenUntil = now + 4600;
        frozenRemaining = 0;
        createFreezeWash();
        announce("Freeze active — bubbles have stopped growing.");
        playSound("freeze");
    } else if (bubble.type === "heart") {
        const previousLives = lives;
        lives = Math.min(MAX_LIVES, lives + 1);
        announce(lives > previousLives ? "Extra life collected!" : "Lives are already full.");
        playSound("heart");
    } else {
        playSound(bubble.type === "gold" ? "gold" : "pop");
    }

    score += earnedPoints;
    successfulPops += 1;
    queueMilestoneSpecials();
    if (specialQueue.length > 0) spawnBubble();
    createScoreFloat(bubble.x + bubble.size / 2, bubble.y + bubble.size / 2, `+${earnedPoints}`, BUBBLE_TYPES[bubble.type].color);
    updateHUD(now);

    if (getLevel() > oldLevel) {
        announce(`Level ${getLevel()} — ${getLevelName()}. The pace has increased!`);
        playSound("level");
    }
}

function growBubbles(deltaMs, now) {
    if (now < frozenUntil) return;

    const increase = getBalance().growthPerSecond * (deltaMs / 1000);
    const bursting = [];

    bubbles.forEach((bubble) => {
        bubble.size += increase;
        bubble.element.style.setProperty("--size", `${bubble.size}px`);
        if (bubble.size >= MAX_SIZE) bursting.push(bubble);
    });

    if (bursting.length === 0) return;

    bursting.forEach((bubble) => {
        createBurst(bubble.x + bubble.size / 2, bubble.y + bubble.size / 2, "#ff6e93");
        removeBubble(bubble);
    });

    lives = Math.max(0, lives - bursting.length);
    announce(`${bursting.length} bubble${bursting.length === 1 ? "" : "s"} burst! ${lives} life${lives === 1 ? "" : "s"} left.`);
    playSound("miss");
    updateHUD(now);

    if (lives === 0) endGame();
}

function createBurst(x, y, color) {
    for (let particle = 0; particle < 7; particle += 1) {
        const dot = document.createElement("span");
        dot.className = "burst";
        dot.style.left = `${x}px`;
        dot.style.top = `${y}px`;
        dot.style.setProperty("--burst-color", color);
        dot.style.setProperty("--x", `${(Math.random() - 0.5) * 78}px`);
        dot.style.setProperty("--y", `${(Math.random() - 0.5) * 78}px`);
        dot.addEventListener("animationend", () => dot.remove(), { once: true });
        elements.effectLayer.appendChild(dot);
    }
}

function createScoreFloat(x, y, text, color) {
    const label = document.createElement("span");
    label.className = "score-float";
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
    label.style.setProperty("--float-color", color);
    label.textContent = text;
    label.addEventListener("animationend", () => label.remove(), { once: true });
    elements.effectLayer.appendChild(label);
}

function createFreezeWash() {
    const wash = document.createElement("div");
    wash.className = "freeze-wash";
    wash.addEventListener("animationend", () => wash.remove(), { once: true });
    elements.effectLayer.appendChild(wash);
}

function updateHUD(now = performance.now()) {
    const level = getLevel();
    elements.score.textContent = formatNumber(score);
    elements.time.textContent = formatTime(getElapsedTime(now));
    elements.lives.textContent = "♥".repeat(lives) || "—";
    elements.lives.setAttribute("aria-label", `${lives} ${lives === 1 ? "life" : "lives"} remaining`);
    elements.levelBadge.textContent = `LEVEL ${level} · ${getLevelName(level)}`;
}

function getElapsedTime(now) {
    const liveElapsed = gameState === "playing" && startedAt ? now - startedAt : 0;
    return Math.max(0, elapsedBeforePause + liveElapsed);
}

function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatNumber(number) {
    return new Intl.NumberFormat().format(number);
}

function announce(message) {
    elements.gameMessage.textContent = message;
}

function gameLoop(now) {
    if (gameState !== "playing") return;

    const elapsed = Math.min(80, now - lastFrameAt);
    lastFrameAt = now;

    if (now >= frozenUntil && frozenUntil !== 0) {
        frozenUntil = 0;
        announce("Freeze ended — bubbles are growing again.");
    }

    growBubbles(elapsed, now);
    if (gameState !== "playing") return;

    if (now >= nextSpawnAt && bubbles.length < getBalance().maximumBubbles) {
        spawnBubble();
        nextSpawnAt = now + getBalance().spawnDelay;
    }

    updateHUD(now);
    frameId = requestAnimationFrame(gameLoop);
}

function startGame() {
    const selectedMode = document.querySelector('input[name="mode"]:checked');
    currentModeKey = selectedMode?.value || "classic";
    currentPlayer = normaliseName(elements.playerName.value);
    elements.playerName.value = currentPlayer;

    stopLoop();
    clearBubbles();
    score = 0;
    lives = MODES[currentModeKey].lives;
    successfulPops = 0;
    specialQueue = [];
    lastHeartMilestone = 0;
    lastFreezeMilestone = 0;
    frozenUntil = 0;
    frozenRemaining = 0;
    elapsedBeforePause = 0;
    nextBubbleId = 1;

    elements.menuScreen.hidden = true;
    elements.gameScreen.hidden = false;
    elements.pauseOverlay.hidden = true;
    elements.gameOverOverlay.hidden = true;
    elements.pauseButton.setAttribute("aria-pressed", "false");
    elements.pauseButton.setAttribute("aria-label", "Pause game");
    elements.pauseButton.textContent = "Ⅱ";
    announce(`${MODES[currentModeKey].label} mode — pop the bubbles.`);

    const now = performance.now();
    gameState = "playing";
    startedAt = now;
    lastFrameAt = now;
    spawnBubble();
    nextSpawnAt = now + getBalance().spawnDelay;
    updateHUD(now);
    frameId = requestAnimationFrame(gameLoop);
    elements.gameArea.focus({ preventScroll: true });
    startMusic(true);
}

function pauseGame(focusResumeButton = true) {
    if (gameState !== "playing") return;

    const now = performance.now();
    elapsedBeforePause += now - startedAt;
    spawnRemaining = Math.max(250, nextSpawnAt - now);
    frozenRemaining = frozenUntil > now ? frozenUntil - now : 0;
    frozenUntil = 0;
    gameState = "paused";
    stopLoop();
    stopMusic();
    elements.pauseOverlay.hidden = false;
    elements.pauseButton.setAttribute("aria-pressed", "true");
    elements.pauseButton.setAttribute("aria-label", "Resume game");
    elements.pauseButton.textContent = "▶";
    announce("Game paused.");
    updateHUD(now);
    if (focusResumeButton) elements.resumeButton.focus({ preventScroll: true });
}

function resumeGame() {
    if (gameState !== "paused") return;

    const now = performance.now();
    gameState = "playing";
    startedAt = now;
    lastFrameAt = now;
    nextSpawnAt = now + spawnRemaining;
    frozenUntil = frozenRemaining ? now + frozenRemaining : 0;
    frozenRemaining = 0;
    elements.pauseOverlay.hidden = true;
    elements.pauseButton.setAttribute("aria-pressed", "false");
    elements.pauseButton.setAttribute("aria-label", "Pause game");
    elements.pauseButton.textContent = "Ⅱ";
    announce("Game resumed.");
    frameId = requestAnimationFrame(gameLoop);
    elements.gameArea.focus({ preventScroll: true });
    startMusic(false);
}

function togglePause() {
    if (gameState === "playing") pauseGame();
    else if (gameState === "paused") resumeGame();
}

function endGame() {
    if (gameState !== "playing") return;

    const now = performance.now();
    elapsedBeforePause += now - startedAt;
    gameState = "gameover";
    stopLoop();
    clearBubbles();

    const wasHighScore = saveScore();
    elements.finalSummary.textContent = `Final score: ${formatNumber(score)} · ${formatTime(elapsedBeforePause)}`;
    elements.newRecord.hidden = !wasHighScore;
    elements.gameOverOverlay.hidden = false;
    announce(`Game over. Final score: ${formatNumber(score)}.`);
    stopMusic();
    playSound("gameover");
    elements.playAgainButton.focus({ preventScroll: true });
}

function returnToMenu() {
    stopLoop();
    stopMusic();
    gameState = "menu";
    clearBubbles();
    elements.pauseOverlay.hidden = true;
    elements.gameOverOverlay.hidden = true;
    elements.gameScreen.hidden = true;
    elements.menuScreen.hidden = false;
    renderHighScores();
    elements.startButton.focus({ preventScroll: true });
}

function clearBubbles() {
    bubbles.forEach((bubble) => bubble.element?.remove());
    bubbles = [];
    elements.effectLayer.replaceChildren();
}

function stopLoop() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
}

function normaliseName(name) {
    return name.trim().replace(/\s+/g, " ").slice(0, 16) || "Player";
}

// Background music is synthesised in JavaScript, so no audio files are needed.
const MUSIC_BPM = 112;
const MUSIC_STEP = 60 / MUSIC_BPM / 4;
const MUSIC_MELODY = [
    69, null, 72, 76, 79, null, 76, 72,
    69, null, 72, 74, 76, null, 74, 72,
    67, null, 71, 74, 79, null, 74, 71,
    67, null, 69, 71, 72, null, 69, 67
];
const MUSIC_BASS = [
    45, null, null, null, 45, null, null, null,
    41, null, null, null, 41, null, null, null,
    43, null, null, null, 43, null, null, null,
    40, null, null, null, 40, null, null, null
];

let musicTimer = null;
let musicStep = 0;
let musicNextTime = 0;
let musicGainNode = null;

function midiToFrequency(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
}

function ensureAudioContext() {
    if (!window.AudioContext) return null;
    try {
        audioContext ||= new AudioContext();
        if (audioContext.state === "suspended") audioContext.resume();
        return audioContext;
    } catch {
        return null;
    }
}

function ensureMusicGain() {
    if (!musicGainNode && audioContext) {
        musicGainNode = audioContext.createGain();
        musicGainNode.gain.value = settings.musicVolume;
        musicGainNode.connect(audioContext.destination);
    }
    return musicGainNode;
}

function fadeMusic(volume) {
    if (!audioContext || !musicGainNode) return;
    const now = audioContext.currentTime;
    musicGainNode.gain.cancelScheduledValues(now);
    musicGainNode.gain.setValueAtTime(musicGainNode.gain.value, now);
    musicGainNode.gain.linearRampToValueAtTime(volume, now + 0.15);
}

function scheduleMusicNote(frequency, time, duration, wave, volume) {
    const destination = ensureMusicGain();
    if (!destination) return;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(gain).connect(destination);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.03);
}

function scheduleMusic() {
    if (gameState !== "playing" || !settings.musicOn || !audioContext) return;

    while (musicNextTime < audioContext.currentTime + 0.2) {
        const index = musicStep % MUSIC_MELODY.length;
        const melodyNote = MUSIC_MELODY[index];
        const bassNote = MUSIC_BASS[index];

        if (melodyNote) scheduleMusicNote(midiToFrequency(melodyNote), musicNextTime, MUSIC_STEP * 0.9, "triangle", 0.045);
        if (bassNote) scheduleMusicNote(midiToFrequency(bassNote), musicNextTime, MUSIC_STEP * 1.5, "sine", 0.06);
        if (index % 4 === 2) scheduleMusicNote(1800, musicNextTime, 0.03, "square", 0.006);

        musicNextTime += MUSIC_STEP;
        musicStep += 1;
    }
}

function stopMusicScheduler() {
    if (musicTimer !== null) {
        window.clearInterval(musicTimer);
        musicTimer = null;
    }
}

function startMusic(restart = true) {
    if (!settings.musicOn || !ensureAudioContext()) return;

    stopMusicScheduler();
    if (restart) musicStep = 0;
    musicNextTime = audioContext.currentTime + 0.06;
    ensureMusicGain();
    fadeMusic(settings.musicVolume);
    musicTimer = window.setInterval(scheduleMusic, 25);
    scheduleMusic();
}

function stopMusic() {
    stopMusicScheduler();
    fadeMusic(0);
}

// ---------------------------------------------------------------------------
// Sound controls (pause menu switches, sliders, and the top-bar mute button)
// ---------------------------------------------------------------------------
function syncAudioUI() {
    elements.musicToggle.checked = settings.musicOn;
    elements.sfxToggle.checked = settings.sfxOn;
    elements.musicVolume.value = Math.round(settings.musicVolume * 100);
    elements.sfxVolume.value = Math.round(settings.sfxVolume * 100);
    elements.musicVolume.disabled = !settings.musicOn;
    elements.sfxVolume.disabled = !settings.sfxOn;
    elements.musicVolumeValue.textContent = `${elements.musicVolume.value}%`;
    elements.sfxVolumeValue.textContent = `${elements.sfxVolume.value}%`;
}

function setMusicOn(value) {
    settings.musicOn = value;
    saveSettings();
    syncAudioUI();

    if (!value) stopMusic();
    else if (gameState === "playing") startMusic(false);
}

function setSfxOn(value) {
    settings.sfxOn = value;
    saveSettings();
    syncAudioUI();
    if (value) playSound("pop");
}

function setMusicVolume(value) {
    settings.musicVolume = value;
    saveSettings();
    syncAudioUI();
    if (gameState === "playing" && settings.musicOn) fadeMusic(value);
}

function setSfxVolume(value) {
    settings.sfxVolume = value;
    saveSettings();
    syncAudioUI();
}

function toggleMuteAll() {
    const shouldMute = settings.musicOn || settings.sfxOn;
    setMusicOn(!shouldMute);
    setSfxOn(!shouldMute);
}

function playSound(type) {
    if (!settings.sfxOn || settings.sfxVolume < 0.01 || !window.AudioContext) return;

    try {
        if (!ensureAudioContext()) return;

        const tones = {
            pop: [440, 0.07, "sine", 0.035],
            gold: [760, 0.12, "triangle", 0.045],
            freeze: [590, 0.22, "sine", 0.04],
            heart: [650, 0.18, "triangle", 0.045],
            miss: [150, 0.15, "square", 0.025],
            level: [880, 0.15, "sine", 0.04],
            gameover: [120, 0.35, "sine", 0.045]
        };
        const [frequency, duration, wave, baseVolume] = tones[type] || tones.pop;
        const volume = baseVolume * settings.sfxVolume * 1.25; // 80% = original loudness
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = wave;
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gain.gain.setValueAtTime(volume, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    } catch {
        // Sound is enhancement only; silent play is always supported.
    }
}

elements.startButton.addEventListener("click", startGame);
elements.pauseButton.addEventListener("click", togglePause);
elements.resumeButton.addEventListener("click", resumeGame);
elements.quitButton.addEventListener("click", returnToMenu);
elements.playAgainButton.addEventListener("click", startGame);
elements.menuButton.addEventListener("click", returnToMenu);
elements.restartButton.addEventListener("click", startGame);
elements.leaveButton.addEventListener("click", returnToMenu);
elements.musicToggle.addEventListener("change", () => setMusicOn(elements.musicToggle.checked));
elements.sfxToggle.addEventListener("change", () => setSfxOn(elements.sfxToggle.checked));
elements.musicVolume.addEventListener("input", () => setMusicVolume(Number(elements.musicVolume.value) / 100));
elements.sfxVolume.addEventListener("input", () => setSfxVolume(Number(elements.sfxVolume.value) / 100));
elements.sfxVolume.addEventListener("change", () => playSound("pop")); // preview when you let go
elements.clearScoresButton.addEventListener("click", () => {
    if (window.confirm("Clear all Bubble Bang high scores stored in this browser?")) {
        try {
            localStorage.removeItem(SCORE_STORAGE_KEY);
        } catch {
            // Nothing else is required if browser storage cannot be changed.
        }
        renderHighScores();
    }
});

// Pause automatically so hidden or unfocused tabs cannot cost time or lives.
document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseGame(false);
});

window.addEventListener("blur", () => {
    pauseGame(false);
});

// The leaderboard follows the mode selected on the menu.
document.querySelectorAll('input[name="mode"]').forEach((radio) => {
    radio.addEventListener("change", renderHighScores);
});


document.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement) return;

    if (event.code === "Space") {
        event.preventDefault();

        if (!event.repeat && (gameState === "playing" || gameState === "paused")) {
            togglePause();
        }

        return;
    }

    if (event.code === "Enter") {
        event.preventDefault();
        return;
    }

    if (event.key.toLowerCase() === "m") {
        toggleMuteAll();
    }

    if (event.key.toLowerCase() === "r" && gameState === "gameover") {
        startGame();
    }

    if (event.key === "Escape" && gameState === "playing") {
        pauseGame();
    }
});

syncAudioUI();
renderHighScores();
