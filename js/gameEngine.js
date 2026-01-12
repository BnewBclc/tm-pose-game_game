/**
 * gameEngine.js
 * Lane-based Fruit Catcher Game Logic
 */

class GameEngine {
  constructor() {
    // Game State
    this.isGameActive = false;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.combo = 0; // New: Combo Counter
    this.isFever = false; // New: Fever Mode
    this.feverTimer = 0;

    // Lane Configuration
    this.lanes = [100, 300, 500];
    this.laneLabels = ['Left', 'Center', 'Right'];

    // Game Objects
    this.basket = { laneIndex: 1, y: 0, width: 100, height: 60, color: '#FF9800' };
    this.items = [];

    // Configuration
    this.canvasWidth = 600;
    this.canvasHeight = 500;
    this.spawnRate = 60;
    this.frameCount = 0;

    // Endless Mode Scaling
    this.baseSpeed = 5; // Reduced from 7 to 5
    this.speedMultiplier = 1;

    // Item Types
    this.itemTypes = [
      { type: 'apple', score: 100, speed: 0, color: 'red', icon: '🍎' },
      { type: 'banana', score: 200, speed: 1, color: 'yellow', icon: '🍌' },
      { type: 'bomb', score: 0, speed: 2, color: 'black', icon: '💣' },
      { type: 'golden', score: 500, speed: 3, color: 'gold', icon: '🌟' },
      { type: 'diamond', score: 1000, speed: 4, color: 'cyan', icon: '💎' }, // New: High Score
      { type: 'rotten', score: -300, speed: 1, color: 'brown', icon: '🤢' }   // New: Penalty
    ];

    // Callbacks
    this.onGameEnd = null;
    this.onScoreUpdate = null;
    this.onLivesUpdate = null;
  }

  /**
   * Start the game
   */
  start() {
    this.isGameActive = true;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.combo = 0;
    this.isFever = false;
    this.items = [];
    this.frameCount = 0;
    this.speedMultiplier = 1;
    this.basket.laneIndex = 1;
    this.basket.y = this.canvasHeight - 80;

    if (this.onScoreUpdate) this.onScoreUpdate(this.score);
    if (this.onLivesUpdate) this.onLivesUpdate(this.lives);
  }

  /**
   * Stop the game
   */
  stop() {
    this.isGameActive = false;
  }

  /**
   * Game Over Logic
   */
  gameOver() {
    this.stop();
    // this.saveScore(this.score); // Handled by Main via dataManager
    if (this.onGameEnd) {
      this.onGameEnd(this.score);
    }
  }

  /**
   * Update game state (called every frame)
   */
  update(detectedPose, canvasWidth, canvasHeight) {
    if (!this.isGameActive) return;

    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    const laneWidth = this.canvasWidth / 3;
    this.lanes = [laneWidth * 0.5, laneWidth * 1.5, laneWidth * 2.5];
    this.basket.y = this.canvasHeight - 80;

    // 1. Update Basket Lane
    if (detectedPose === 'Left') this.basket.laneIndex = 0;
    else if (detectedPose === 'Right') this.basket.laneIndex = 2;
    else if (detectedPose === 'Center') this.basket.laneIndex = 1;

    // 2. Fever Mode Logic
    if (this.isFever) {
      this.feverTimer--;
      if (this.feverTimer <= 0) {
        this.isFever = false; // End Fever
      }
    }

    // 3. Difficulty & Spawning
    this.frameCount++;

    // Score-based Difficulty + Combo Multiplier
    // Adjusted: Even Slower scaling
    const scoreFactor = this.score / 20000; // Slower scaling (was 10000)
    const comboFactor = this.combo * 0.01; // Reduced combo impact (was 0.02)

    // Max Multiplier: 2.0x (was 2.5)
    this.speedMultiplier = Math.min(2.0, 1 + scoreFactor + comboFactor);

    // Spawn Rate: Fast in Fever, else based on score (min 35 frames)
    let currentSpawnRate = this.isFever ? 15 : Math.max(35, 60 - Math.floor(this.score / 1000));

    if (this.frameCount % currentSpawnRate === 0) {
      this.spawnItem();
    }

    // 4. Update Items & Check Collision
    for (let i = this.items.length - 1; i >= 0; i--) {
      let item = this.items[i];

      // Move item
      // Fever items move fast but manageable (8 instead of 12)
      const moveSpeed = this.isFever ? 9 : (this.baseSpeed + item.speed) * this.speedMultiplier;
      item.y += moveSpeed;

      // Collision Check
      if (
        item.laneIndex === this.basket.laneIndex &&
        item.y > this.basket.y - 40 &&
        item.y < this.basket.y + this.basket.height
      ) {
        this.handleItemCollection(item);
        this.items.splice(i, 1);
        continue;
      }

      // Remove if off screen
      if (item.y > this.canvasHeight) {
        this.items.splice(i, 1);
        // Reset combo if fruit missed (ignore bombs)
        if (item.type !== 'bomb') {
          this.combo = 0;
        }
      }
    }
  }

  spawnItem() {
    const laneIndex = Math.floor(Math.random() * 3);

    const rand = Math.random();
    let type;

    if (this.isFever) {
      // Fever Mode: Gold, Diamond, Banana
      if (rand < 0.2) type = this.itemTypes[4]; // Diamond (20%)
      else if (rand < 0.5) type = this.itemTypes[3]; // Golden (30%)
      else type = this.itemTypes[1]; // Banana (50%)
    } else {
      // Normal Mode
      if (rand < 0.05) type = this.itemTypes[4]; // Diamond (5%)
      else if (rand < 0.15) type = this.itemTypes[3]; // Golden (10%)
      else if (rand < 0.40) type = this.itemTypes[2]; // Bomb (25%)
      else if (rand < 0.50) type = this.itemTypes[5]; // Rotten (10%)
      else if (rand < 0.75) type = this.itemTypes[1]; // Banana (25%)
      else type = this.itemTypes[0]; // Apple (25%)
    }

    this.items.push({
      ...type,
      laneIndex: laneIndex,
      y: -50
    });
  }

  handleItemCollection(item) {
    if (item.type === 'bomb') {
      if (!this.isFever) { // Invincible during Fever
        this.lives--;
        this.combo = 0; // Reset combo
        if (this.onLivesUpdate) this.onLivesUpdate(this.lives);
        if (this.lives <= 0) this.gameOver();
      }
    } else {
      // Score calculation with Combo
      const comboBonus = this.combo * 10;
      this.score += item.score + comboBonus;
      this.combo++; // Increase combo

      // Trigger Fever? (Every 10 combos)
      if (this.combo > 0 && this.combo % 10 === 0) {
        this.startFever();
      }

      if (this.onScoreUpdate) this.onScoreUpdate(this.score);
    }
  }

  startFever() {
    this.isFever = true;
    this.feverTimer = 180; // Reduced to 3 seconds (was 300/5s)
  }

  /**
   * Draw game elements
   */
  draw(ctx) {
    if (!this.isGameActive) return;

    // Fever Background Effect
    if (this.isFever) {
      ctx.fillStyle = `rgba(255, 215, 0, ${0.2 + Math.sin(this.frameCount * 0.2) * 0.1})`;
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    // Draw Lanes 
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    const laneWidth = this.canvasWidth / 3;
    ctx.beginPath();
    ctx.moveTo(laneWidth, 0); ctx.lineTo(laneWidth, this.canvasHeight);
    ctx.moveTo(laneWidth * 2, 0); ctx.lineTo(laneWidth * 2, this.canvasHeight);
    ctx.stroke();

    // Draw Basket
    const basketX = this.lanes[this.basket.laneIndex] - (this.basket.width / 2);

    // Shadow
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.isFever ? 'gold' : 'rgba(0,0,0,0.5)';

    ctx.fillStyle = this.basket.color;
    this.roundRect(ctx, basketX, this.basket.y, this.basket.width, this.basket.height, 15);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Basket Icon (Bag)
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🧺', basketX + this.basket.width / 2, this.basket.y + 40);

    // Draw Items
    ctx.font = '40px Arial';
    this.items.forEach(item => {
      const x = this.lanes[item.laneIndex];
      ctx.fillText(item.icon, x, item.y + 30);
    });

    // Draw Combo & Fever Text
    if (this.isFever) {
      ctx.fillStyle = 'yellow';
      ctx.font = 'bold 40px Outfit';
      ctx.shadowColor = 'red';
      ctx.shadowBlur = 10;
      ctx.fillText("🔥 FEVER TIME! 🔥", this.canvasWidth / 2, 100);
      ctx.shadowBlur = 0;
    } else if (this.combo > 1) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 30px Outfit';
      ctx.fillText(`${this.combo} COMBO!`, this.canvasWidth / 2, 80);
    }
  }

  roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }


  // Callbacks
  setGameEndCallback(callback) { this.onGameEnd = callback; }
  setScoreUpdateCallback(callback) { this.onScoreUpdate = callback; }
  setLivesUpdateCallback(callback) { this.onLivesUpdate = callback; }
}

window.GameEngine = GameEngine;
