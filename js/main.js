/**
 * main.js
 * Entry point for Fruit Catcher Game
 */

// Global Variables
let poseEngine;
let gameEngine;
let stabilizer;
let ctx;
let labelContainer;

// Constants
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;

/**
 * Initialize Application
 */
async function init() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  startBtn.disabled = true;

  try {
    // 1. Initialize PoseEngine
    poseEngine = new PoseEngine("./my_model/");
    // Initialize with larger size for better visibility, flip for mirror effect
    const { maxPredictions, webcam } = await poseEngine.init({
      size: CANVAS_WIDTH, // Use larger size
      flip: true
    });

    // 2. Initialize Stabilizer
    stabilizer = new PredictionStabilizer({
      threshold: 0.8, // Slightly higher threshold for stability
      smoothingFrames: 5 // Smoother movement
    });

    // 3. Initialize GameEngine
    gameEngine = new GameEngine();
    gameEngine.setGameEndCallback((score) => {
      alert(`GAME OVER! Score: ${score}`);
      stop();
    });

    // 4. Setup Canvas
    const canvas = document.getElementById("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx = canvas.getContext("2d");

    // 5. Setup Label Container
    labelContainer = document.getElementById("label-container");
    labelContainer.style.display = 'none'; // Hide debug labels for cleaner UI

    // 6. Setup PoseEngine Callbacks
    poseEngine.setPredictionCallback(handlePrediction);
    poseEngine.setDrawCallback(drawPose);

    // 7. Start
    poseEngine.start();

    // Start Game immediately or wait for button? 
    // For now, let's start game immediately when Start is clicked
    gameEngine.start({ timeLimit: 60 });

    stopBtn.disabled = false;
  } catch (error) {
    console.error("Initialization Error:", error);
    alert("Failed to initialize. Check console.");
    startBtn.disabled = false;
  }
}

/**
 * Stop Application
 */
function stop() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  if (poseEngine) {
    poseEngine.stop();
  }

  if (gameEngine) {
    gameEngine.stop();
  }

  if (stabilizer) {
    stabilizer.reset();
  }

  startBtn.disabled = false;
  stopBtn.disabled = true;
}

/**
 * Handle Predictions
 * @param {Array} predictions 
 * @param {Object} pose 
 */
function handlePrediction(predictions, pose) {
  // 1. Stabilize
  const stabilized = stabilizer.stabilize(predictions);

  // 2. Debug Display (Optional)
  const maxPredictionDiv = document.getElementById("max-prediction");
  if (maxPredictionDiv) {
    maxPredictionDiv.innerHTML = `Pose: ${stabilized.className || "-"}`;
  }

  // 3. Update Game Logic
  // We pass the canvas dimensions in case window resizes (though fixed for now)
  if (gameEngine && gameEngine.isGameActive && stabilized.className) {
    gameEngine.update(stabilized.className, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else if (gameEngine && gameEngine.isGameActive) {
    // Even if no pose detected, update game (for items falling)
    gameEngine.update(null, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

/**
 * Draw Loop
 * @param {Object} pose 
 */
function drawPose(pose) {
  // 1. Draw Webcam Feed
  if (poseEngine.webcam && poseEngine.webcam.canvas) {
    // Draw webcam image stretched to fit canvas
    ctx.drawImage(poseEngine.webcam.canvas, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  // 2. Draw Skeleton (Optional - maybe distracts from game?)
  // Let's keep it semi-transparent
  if (pose) {
    ctx.globalAlpha = 0.3;
    const minPartConfidence = 0.5;
    tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
    tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
    ctx.globalAlpha = 1.0;
  }

  // 3. Draw Game Elements
  if (gameEngine && gameEngine.isGameActive) {
    gameEngine.draw(ctx);
  }
}

// remove startGameMode as it is integreted into init

