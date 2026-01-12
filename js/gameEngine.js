/**
 * gameEngine.js
 * Fruit Catcher Game Logic
 */

class GameEngine {
    constructor() {
      // Game State
      this.isGameActive = false;
      this.score = 0;
      this.timeLeft = 60;
      this.level = 1;
      
      // Game Objects
      this.basket = { x: 0, y: 0, width: 80, height: 40, color: '#FF9800' };
      this.items = []; // Falling items { x, y, type, speed, score, color, icon }
      
      // Configuration
      this.canvasWidth = 600;
      this.canvasHeight = 500;
      this.basketSpeed = 10;
      this.spawnRate = 60; // Spawn every 60 frames (approx 1 sec)
      this.frameCount = 0;
  
      // Item Types
      this.itemTypes = [
          { type: 'apple', score: 100, speed: 3, color: 'red', icon: '🍎' },
          { type: 'banana', score: 200, speed: 4, color: 'yellow', icon: '🍌' },
          { type: 'bomb', score: 0, speed: 5, color: 'black', icon: '💣' }, // Game Over
          { type: 'golden', score: 500, speed: 7, color: 'gold', icon: '🌟' }
      ];
  
      // Callbacks
      this.onGameEnd = null;
      this.onScoreUpdate = null;
    }
  
    /**
     * Start the game
     */
    start(config = {}) {
      this.isGameActive = true;
      this.score = 0;
      this.timeLeft = config.timeLimit || 60;
      this.level = 1;
      this.items = [];
      this.frameCount = 0;
      this.basket.x = this.canvasWidth / 2 - this.basket.width / 2;
      this.basket.y = this.canvasHeight - 60;
  
      // Start Timer
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => {
          this.timeLeft--;
          if (this.timeLeft <= 0) {
              this.gameOver();
          }
      }, 1000);
    }
  
    /**
     * Stop the game
     */
    stop() {
      this.isGameActive = false;
      if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
      }
    }
  
    /**
     * Game Over Logic
     */
    gameOver() {
      this.stop();
      if (this.onGameEnd) {
          this.onGameEnd(this.score);
      }
    }
  
    /**
     * Update game state (called every frame)
     * @param {string} detectedPose - Current detected pose (Left, Right, Center)
     * @param {number} canvasWidth 
     * @param {number} canvasHeight 
     */
    update(detectedPose, canvasWidth, canvasHeight) {
      if (!this.isGameActive) return;
  
      this.canvasWidth = canvasWidth;
      this.canvasHeight = canvasHeight;
      this.basket.y = this.canvasHeight - 60; // Keep basket at bottom
  
      // 1. Move Basket based on Pose
      if (detectedPose === 'Left') {
          this.basket.x -= this.basketSpeed;
      } else if (detectedPose === 'Right') {
          this.basket.x += this.basketSpeed;
      }
      // 'Center' maintains current position (or could stop momentum)
  
      // Boundaries
      if (this.basket.x < 0) this.basket.x = 0;
      if (this.basket.x + this.basket.width > this.canvasWidth) {
          this.basket.x = this.canvasWidth - this.basket.width;
      }
  
      // 2. Spawn Items
      this.frameCount++;
      const currentSpawnRate = Math.max(20, this.spawnRate - (this.level * 5)); // Increase difficulty
      
      if (this.frameCount % currentSpawnRate === 0) {
          this.spawnItem();
      }
  
      // 3. Update Items & Check Collision
      for (let i = this.items.length - 1; i >= 0; i--) {
          let item = this.items[i];
          item.y += item.speed + (this.level * 0.5); // Speed increases with level
  
          // Collision with Basket
          if (
              item.x < this.basket.x + this.basket.width &&
              item.x + 30 > this.basket.x && // Assume item width is approx 30
              item.y < this.basket.y + this.basket.height &&
              item.y + 30 > this.basket.y
          ) {
              this.handleItemCollection(item);
              this.items.splice(i, 1);
              continue;
          }
  
          // Remove if off screen
          if (item.y > this.canvasHeight) {
              this.items.splice(i, 1);
          }
      }
  
      // Level Up every 20 seconds passed (rough approximation based on score or just time)
       // Or simple difficulty increase over time
    }
  
    spawnItem() {
      const rand = Math.random();
      let type;
      if (rand < 0.1) type = this.itemTypes[3]; // Golden (10%)
      else if (rand < 0.3) type = this.itemTypes[2]; // Bomb (20%)
      else if (rand < 0.6) type = this.itemTypes[1]; // Banana (30%)
      else type = this.itemTypes[0]; // Apple (40%)
  
      this.items.push({
          ...type,
          x: Math.random() * (this.canvasWidth - 30),
          y: -30
      });
    }
  
    handleItemCollection(item) {
      if (item.type === 'bomb') {
          this.gameOver();
      } else {
          this.score += item.score;
          if (this.onScoreUpdate) this.onScoreUpdate(this.score);
      }
    }
  
    /**
     * Draw game elements
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
      if (!this.isGameActive) return;
  
      // Draw Basket
      ctx.fillStyle = this.basket.color;
      ctx.fillRect(this.basket.x, this.basket.y, this.basket.width, this.basket.height);
      
      // Draw Basket Detail (Handle)
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.basket.x, this.basket.y);
      ctx.quadraticCurveTo(this.basket.x + this.basket.width / 2, this.basket.y - 30, this.basket.x + this.basket.width, this.basket.y);
      ctx.stroke();
  
      // Draw Items
      ctx.font = '30px Arial';
      ctx.textAlign = 'center';
      this.items.forEach(item => {
          ctx.fillText(item.icon, item.x + 15, item.y + 20);
      });
  
      // Draw UI (Score & Time)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(10, 10, 150, 80);
      
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${this.score}`, 20, 40);
      ctx.fillText(`Time: ${this.timeLeft}`, 20, 70);
    }
  
    // Setters for callbacks
    setGameEndCallback(callback) { this.onGameEnd = callback; }
    setScoreUpdateCallback(callback) { this.onScoreUpdate = callback; }
  }
  
  window.GameEngine = GameEngine;
