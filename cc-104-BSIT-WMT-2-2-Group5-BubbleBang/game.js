const START_SIZE = 20;
const MAX_SIZE = 100;
const GROW_AMOUNT = 2;
const MAX_LIVES = 3;
const POP_POINTS = 10;

let bubbles = [];
let nextId = 1;
let score = 0;
let lives = MAX_LIVES;

let growthTimer = null;
let spawnTimer = null;

const gameArea = document.getElementById("gameArea");
const scoreDisplay = document.getElementById("score");
const livesDisplay = document.getElementById("lives");
const gameMessage = document.getElementById("gameMessage");
const resetButton = document.getElementById("resetButton");

function getDifficulty() {
    if (score >= 1000) {
        return { name: "MASTER", amount: 7, maxAmount: 8, delay: 850, growth: 2 };
    } else if (score >= 800) {
        return { name: "INSANE", amount: 6, maxAmount: 7, delay: 1000, growth: 2 };
    } else if (score >= 600) {
        return { name: "EXTREME", amount: 5, maxAmount: 6, delay: 1150, growth: 2 };
    } else if (score >= 400) {
        return { name: "VERY HARD", amount: 4, maxAmount: 5, delay: 1300, growth: 2 };
    } else if (score >= 200) {
        return { name: "HARD", amount: 3, maxAmount: 4, delay: 1500, growth: 2 };
    } else if (score >= 100) {
        return { name: "MEDIUM", amount: 2, maxAmount: 3, delay: 1700, growth: 2 };
    } else if (score >= 50) {
        return { name: "NORMAL", amount: 2, maxAmount: 2, delay: 2000, growth: 2 };
    } else {
        return { name: "EASY", amount: 1, maxAmount: 1, delay: 2400, growth: 2 };
    }
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

function spawnBubble() {
    if (lives <= 0) return;

    const difficulty = getDifficulty();

    const amount = Math.floor(
        Math.random() * (difficulty.maxAmount - difficulty.amount + 1)
    ) + difficulty.amount;

    const maxX = Math.max(0, gameArea.clientWidth - MAX_SIZE);
    const maxY = Math.max(0, gameArea.clientHeight - MAX_SIZE);

    for (let i = 0; i < amount; i++) {
        const bubble = {
            id: nextId++,
            size: START_SIZE,
            x: Math.random() * maxX,
            y: Math.random() * maxY
        };

        bubbles.push(bubble);
        gameArea.appendChild(createBubbleElement(bubble));
    }
}

function createBubbleElement(bubble) {
    const element = document.createElement("div");

    element.className = "bubble";
    element.dataset.id = bubble.id;

    element.style.width = bubble.size + "px";
    element.style.height = bubble.size + "px";
    element.style.left = bubble.x + "px";
    element.style.top = bubble.y + "px";

    return element;
}

function growBubbles() {
    const difficulty = getDifficulty();
    const burstIds = [];

    bubbles.forEach(function (bubble) {
        bubble.size += difficulty.growth;

        const element = gameArea.querySelector(
            '.bubble[data-id="' + bubble.id + '"]'
        );

        if (element) {
            element.style.width = bubble.size + "px";
            element.style.height = bubble.size + "px";
        }

        if (bubble.size > MAX_SIZE) {
            burstIds.push(bubble.id);
        }
    });
  
    if (burstIds.length > 0) {
        bubbles = bubbles.filter(function (bubble) {
            return !burstIds.includes(bubble.id);
        });

        burstIds.forEach(function (id) {
            const element = gameArea.querySelector(
                '.bubble[data-id="' + id + '"]'
            );

            if (element) element.remove();
        });

        lives = Math.max(0, lives - burstIds.length);
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
        bubbles.splice(index, 1);
        element.remove();

        score += POP_POINTS;
        updateHUD();
        updateSpawnSpeed();
    }
});

function updateSpawnSpeed() {
    if (spawnTimer) {
        clearInterval(spawnTimer);
    }

    const difficulty = getDifficulty();

    spawnTimer = setInterval(
        spawnBubble,
        difficulty.delay
    );

    gameMessage.textContent =
        "Difficulty: " + difficulty.name;
}

function endGame() {
    clearInterval(growthTimer);
    clearInterval(spawnTimer);

    bubbles = [];

    gameArea.querySelectorAll(".bubble").forEach(function (element) {
        element.remove();
    });

    gameMessage.textContent =
        "GAME OVER! Final Score: " + score;
}

function startGame() {
    clearInterval(growthTimer);
    clearInterval(spawnTimer);

    bubbles = [];
    nextId = 1;
    score = 0;
    lives = MAX_LIVES;

    gameArea.querySelectorAll(".bubble").forEach(function (element) {
        element.remove();
    });

    gameMessage.textContent = "Difficulty: EASY";

    updateHUD();

    spawnBubble();

    growthTimer = setInterval(growBubbles, 100);

    updateSpawnSpeed();
}

resetButton.addEventListener("click", startGame);

startGame();
