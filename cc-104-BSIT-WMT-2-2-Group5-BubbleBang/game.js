const START_SIZE = 20;
const MAX_SIZE = 100;
const MAX_LIVES = 3;
const NORMAL_POINTS = 10;
const BASE_GROWTH = 0.7;
const GROWTH_PER_POP = 0.13;
const GROWTH_PER_SCORE_LEVEL = 0.35;
const MAX_GROWTH = 8;
const BASE_SPAWN_DELAY = 2500;
const MIN_SPAWN_DELAY = 550;

let bubbles = [];
let nextId = 1;
let score = 0;
let lives = MAX_LIVES;
let successfulPops = 0;
let gameState = "ready";
let growthTimer = null;
let spawnTimer = null;

const gameArea = document.getElementById("gameArea");
const scoreDisplay = document.getElementById("score");
const livesDisplay = document.getElementById("lives");
const gameMessage = document.getElementById("gameMessage");
const resetButton = document.getElementById("resetButton");

function getPace() {
    const scoreLevel = Math.floor(score / 100);

    return {
        growth: Math.min(
            MAX_GROWTH,
            BASE_GROWTH + successfulPops * GROWTH_PER_POP + scoreLevel * GROWTH_PER_SCORE_LEVEL
        ),
        spawnDelay: Math.max(
            MIN_SPAWN_DELAY,
            BASE_SPAWN_DELAY - successfulPops * 48 - scoreLevel * 140
        ),
        maxBubbles: Math.min(8, 2 + scoreLevel)
    };
}

function getGoldChance() {
    return Math.min(0.38, 0.18 + Math.floor(score / 200) * 0.03);
}

function getGoldBonus(size) {
    if (size >= 75) {
        return { points: 100, label: "HIGH" };
    }

    if (size >= 45) {
        return { points: 50, label: "MEDIUM" };
    }

    return { points: 25, label: "LOW" };
}

function updateHUD() {
    scoreDisplay.textContent = score;
    livesDisplay.innerHTML = "";

    for (let i = 0; i < lives; i += 1) {
        const heart = document.createElement("span");
        heart.className = "heart";
        heart.textContent = "♥";
        livesDisplay.appendChild(heart);
    }
}

function setPlayButton(label) {
    resetButton.textContent = label;
}

function findBubblePosition() {
    const maxX = Math.max(0, gameArea.clientWidth - MAX_SIZE);
    const maxY = Math.max(45, gameArea.clientHeight - MAX_SIZE);

    return {
        x: Math.random() * maxX,
        y: 40 + Math.random() * Math.max(0, maxY - 40)
    };
}

function spawnBubble() {
    if (gameState !== "playing" || bubbles.length >= getPace().maxBubbles) return;

    const position = findBubblePosition();
    const isGold = Math.random() < getGoldChance();
    const bubble = {
        id: nextId++,
        size: START_SIZE,
        x: position.x,
        y: position.y,
        isGold,
        element: null
    };

    const element = document.createElement("div");
    element.className = "bubble";
    element.dataset.id = bubble.id;
    element.style.width = `${bubble.size}px`;
    element.style.height = `${bubble.size}px`;
    element.style.left = `${bubble.x}px`;
    element.style.top = `${bubble.y}px`;
    element.setAttribute("role", "button");
    element.setAttribute("aria-label", isGold ? "Pop gold bonus bubble" : "Pop bubble");

    if (isGold) {
        styleGoldBubble(element, bubble.size);
    }

    element.addEventListener("click", () => popBubble(bubble.id));
    bubble.element = element;
    bubbles.push(bubble);
    gameArea.appendChild(element);
}

function styleGoldBubble(element, size) {
    element.textContent = "★";
    element.title = "Gold bubble: let it grow for a larger bonus";
    element.style.display = "grid";
    element.style.placeItems = "center";
    element.style.color = "#fff8bd";
    element.style.fontSize = `${Math.max(11, size * 0.46)}px`;
    element.style.fontWeight = "bold";
    element.style.textShadow = "0 1px 5px #7a4c00";
    element.style.background = "radial-gradient(circle at 30% 30%, #fff9c4, #ffd84f 45%, #be7100 75%)";
    element.style.boxShadow = "0 0 12px rgba(255, 215, 71, 0.85), 0 0 24px rgba(255, 183, 0, 0.45)";
}

function removeBubble(bubble, animate) {
    const index = bubbles.indexOf(bubble);
    if (index !== -1) bubbles.splice(index, 1);

    if (!bubble.element) return;

    if (!animate) {
        bubble.element.remove();
        return;
    }

    bubble.element.style.pointerEvents = "none";
    const animation = bubble.element.animate(
        [
            { transform: "scale(1)", opacity: 1 },
            { transform: "scale(1.35)", opacity: 0 }
        ],
        { duration: 150, easing: "ease-out", fill: "forwards" }
    );

    animation.finished.catch(() => {}).then(() => bubble.element?.remove());
}

function popBubble(id) {
    if (gameState !== "playing") return;

    const bubble = bubbles.find((candidate) => candidate.id === id);
    if (!bubble) return;

    let points = NORMAL_POINTS;
    let message = `+${NORMAL_POINTS} points!`;

    if (bubble.isGold) {
        const bonus = getGoldBonus(bubble.size);
        points = bonus.points;
        message = `Gold bubble ${bonus.label} bonus: +${bonus.points} points!`;
    }

    createExplosion(bubble.x + bubble.size / 2, bubble.y + bubble.size / 2, bubble.isGold ? "#ffd84f" : "#7df9ff");
    createPointPopup(bubble.x + bubble.size / 2, bubble.y + bubble.size / 2, `+${points}`, bubble.isGold ? "#ffe77a" : "#d8fbff");
    removeBubble(bubble, true);

    score += points;
    successfulPops += 1;
    updateHUD();
    updateSpawnSpeed();

    const pace = getPace();
    gameMessage.textContent = `${message} Speed: ${pace.growth.toFixed(1)}.`;
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 8; i += 1) {
        const particle = document.createElement("span");
        const size = 4 + Math.random() * 6;
        const distance = 24 + Math.random() * 34;
        const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;

        particle.style.position = "absolute";
        particle.style.left = `${x - size / 2}px`;
        particle.style.top = `${y - size / 2}px`;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.borderRadius = "50%";
        particle.style.background = color;
        particle.style.boxShadow = `0 0 8px ${color}`;
        particle.style.pointerEvents = "none";
        particle.style.zIndex = "20";

        gameArea.appendChild(particle);
        const animation = particle.animate(
            [
                { transform: "translate(0, 0) scale(1)", opacity: 1 },
                { transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0.2)`, opacity: 0 }
            ],
            { duration: 420, easing: "ease-out", fill: "forwards" }
        );

        animation.finished.catch(() => {}).then(() => particle.remove());
    }
}

function createPointPopup(x, y, text, color) {
    const popup = document.createElement("span");
    popup.textContent = text;
    popup.style.position = "absolute";
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.style.color = color;
    popup.style.fontWeight = "bold";
    popup.style.fontSize = "17px";
    popup.style.textShadow = "0 1px 5px #000";
    popup.style.pointerEvents = "none";
    popup.style.zIndex = "21";

    gameArea.appendChild(popup);
    const animation = popup.animate(
        [
            { transform: "translate(-50%, -50%)", opacity: 1 },
            { transform: "translate(-50%, -90px)", opacity: 0 }
        ],
        { duration: 700, easing: "ease-out", fill: "forwards" }
    );

    animation.finished.catch(() => {}).then(() => popup.remove());
}

function growBubbles() {
    if (gameState !== "playing") return;

    const growth = getPace().growth;
    const burstBubbles = [];

    bubbles.forEach((bubble) => {
        bubble.size += growth;
        bubble.element.style.width = `${bubble.size}px`;
        bubble.element.style.height = `${bubble.size}px`;

        if (bubble.isGold) {
            bubble.element.style.fontSize = `${Math.max(11, bubble.size * 0.46)}px`;
        }

        if (bubble.size >= MAX_SIZE) {
            burstBubbles.push(bubble);
        }
    });

    if (burstBubbles.length === 0) return;

    burstBubbles.forEach((bubble) => {
        createExplosion(bubble.x + bubble.size / 2, bubble.y + bubble.size / 2, "#ff5873");
        removeBubble(bubble, true);
    });

    lives = Math.max(0, lives - burstBubbles.length);
    updateHUD();

    if (lives <= 0) {
        endGame();
        return;
    }

    gameMessage.textContent = `${burstBubbles.length} bubble${burstBubbles.length === 1 ? "" : "s"} burst! Keep popping.`;
}

function updateSpawnSpeed() {
    if (spawnTimer) clearInterval(spawnTimer);

    spawnTimer = setInterval(() => {
        if (bubbles.length < getPace().maxBubbles) {
            spawnBubble();
        }
    }, getPace().spawnDelay);
}

function clearGameArea() {
    bubbles = [];
    gameArea.querySelectorAll(".bubble").forEach((element) => element.remove());
    gameArea.querySelectorAll('span[style*="pointer-events: none"]').forEach((element) => element.remove());
}

function endGame() {
    gameState = "gameover";
    clearInterval(growthTimer);
    clearInterval(spawnTimer);
    growthTimer = null;
    spawnTimer = null;
    gameMessage.textContent = `GAME OVER! Final score: ${score}. Press Play Again to try again.`;
    setPlayButton("Play Again");
}

function startGame() {
    clearInterval(growthTimer);
    clearInterval(spawnTimer);
    clearGameArea();

    score = 0;
    lives = MAX_LIVES;
    successfulPops = 0;
    nextId = 1;
    gameState = "playing";

    updateHUD();
    setPlayButton("Play Again");
    gameMessage.textContent = "Game started slowly. Every pop makes the bubbles faster!";

    spawnBubble();
    growthTimer = setInterval(growBubbles, 100);
    updateSpawnSpeed();
}

function prepareGame() {
    clearInterval(growthTimer);
    clearInterval(spawnTimer);
    clearGameArea();
    score = 0;
    lives = MAX_LIVES;
    successfulPops = 0;
    gameState = "ready";
    updateHUD();
    setPlayButton("Play");
    gameMessage.textContent = "Press Play to begin.";
}

resetButton.addEventListener("click", startGame);

prepareGame();
