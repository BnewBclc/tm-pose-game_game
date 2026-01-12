/**
 * main.js
 * Entry point for Fruit Catcher Premium
 */

// Global Variables
let poseEngine;
let gameEngine;
let stabilizer;
let ctx;
let labelContainer;

// Constants
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 500;

/**
 * Initialize Application
 */
async function init() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const restartBtn = document.getElementById("restartBtn");
  const overlay = document.getElementById("game-overlay");

  startBtn.style.display = 'none';
  stopBtn.disabled = false;

  if (restartBtn) restartBtn.onclick = init;
  if (overlay) overlay.classList.add("hidden");

  try {
    // 0. Update Ranking Display First
    updateRankingDisplay();

    // 1. Initialize PoseEngine
    if (!poseEngine) {
      poseEngine = new PoseEngine("./my_model/");
      const { maxPredictions, webcam } = await poseEngine.init({
        size: 200,
        flip: true
      });

      // Append Webcam Canvas content
      const webcamWrapper = document.getElementById("webcam-wrapper");
      webcamWrapper.innerHTML = '';
      webcamWrapper.appendChild(webcam.canvas);

      labelContainer = document.getElementById("label-container");
    } else {
      poseEngine.start();
    }

    // 2. Initialize Stabilizer
    if (!stabilizer) {
      stabilizer = new PredictionStabilizer({
        threshold: 0.85,
        smoothingFrames: 5
      });
    }

    // 3. Initialize GameEngine
    if (!gameEngine) {
      gameEngine = new GameEngine();

      // Game Over Callback
      gameEngine.setGameEndCallback((score) => {
        showGameOver(score);

        // Save Score via DataManager
        if (window.dataManager) {
          window.dataManager.updateScore(score);
        }

        updateRankingDisplay();
        stop(false);
      });

      // Score Update Callback
      gameEngine.setScoreUpdateCallback((score) => {
        const scoreDisplay = document.getElementById("score-display");
        if (scoreDisplay) scoreDisplay.innerText = `Score: ${score}`;
      });

      // Lives Update Callback
      gameEngine.setLivesUpdateCallback((lives) => {
        const livesContainer = document.getElementById("lives-container");
        if (livesContainer) {
          livesContainer.innerText = "❤️".repeat(Math.max(0, lives));
        }
      });
    }

    // 4. Setup Game Canvas
    const canvas = document.getElementById("game-canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx = canvas.getContext("2d");

    // 5. Setup Callbacks
    poseEngine.setPredictionCallback(handlePrediction);

    // 6. Start Engines
    if (!poseEngine.isRunning) poseEngine.start();

    // Start Game
    gameEngine.start();

    // Loop for Game Rendering
    requestAnimationFrame(gameLoop);

  } catch (error) {
    console.error("Initialization Error:", error);
    alert("Error starting game. See console.");
    startBtn.style.display = 'inline-block';
    startBtn.disabled = false;
  }
}

function gameLoop() {
  if (gameEngine && gameEngine.isGameActive) {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gameEngine.draw(ctx);
    requestAnimationFrame(gameLoop);
  }
}

function stop(resetUI = true) {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  if (poseEngine) {
    poseEngine.stop();
  }

  if (gameEngine) {
    gameEngine.stop();
  }

  if (resetUI) {
    startBtn.style.display = 'inline-block';
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

function showGameOver(score) {
  const overlay = document.getElementById("game-overlay");
  const scoreText = document.getElementById("overlay-score");
  scoreText.innerText = `Final Score: ${score}`;
  overlay.classList.remove("hidden");
  // Force high z-index to ensure visibility over canvas
  overlay.style.zIndex = "9999";
}

/* ================= LOGIN & RANKING LOGIC ================= */

// Handle Login Button
function handleLogin() {
  const id = document.getElementById("login-id").value;
  const pw = document.getElementById("login-pw").value;
  const msg = document.getElementById("login-msg");

  if (!id || !pw) {
    msg.innerText = "Please enter ID and Password.";
    return;
  }

  const result = window.dataManager.login(id, pw);
  if (result.success) {
    // Success
    document.getElementById("login-modal").classList.add("hidden");
    // Update Ranking on load
    updateRankingDisplay();
    alert(`Welcome, ${result.user.username}!`);
  } else {
    msg.innerText = result.message;
  }
}

// Handle Signup Button
function handleSignup() {
  const id = document.getElementById("login-id").value;
  const pw = document.getElementById("login-pw").value;
  const msg = document.getElementById("login-msg");

  if (!id || !pw) {
    msg.innerText = "Please enter ID and Password.";
    return;
  }

  const result = window.dataManager.signup(id, pw);
  if (result.success) {
    alert(result.message);
    // Switch to login mode implies they should click login, but we can auto-login or just let them stay on modal
    msg.innerText = "Signup Success! Please Login.";
    msg.style.color = "green";
  } else {
    msg.innerText = result.message;
    msg.style.color = "red";
  }
}

function updateRankingDisplay() {
  const list = document.getElementById("ranking-list");
  if (!window.dataManager) return;

  const rankings = window.dataManager.getRankings();
  list.innerHTML = "";

  if (rankings.length === 0) {
    list.innerHTML = "<li>No records yet.</li>";
    return;
  }

  rankings.forEach((r, index) => {
    const li = document.createElement("li");
    li.innerText = `${index + 1}. ${r.username} : ${r.score}`;
    if (index === 0) li.innerText += " 👑";
    list.appendChild(li);
  });
}

function handlePrediction(predictions, pose) {
  const stabilized = stabilizer.stabilize(predictions);

  const poseLabel = document.getElementById("pose-label");
  if (poseLabel) {
    poseLabel.innerText = stabilized.className || "Waiting...";
    if (stabilized.className === 'Left') poseLabel.style.color = '#ff4757';
    else if (stabilized.className === 'Right') poseLabel.style.color = '#2ed573';
    else poseLabel.style.color = '#ffd700';
  }

  if (gameEngine && gameEngine.isGameActive) {
    gameEngine.update(stabilized.className, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

// Make functions global for HTML buttons
window.init = init;
window.stop = stop;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
