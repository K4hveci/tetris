/**
 * Brick Breaker Arcade Engine
 */
(function() {
  const CANVAS = document.getElementById('breakout-canvas');
  const CTX = CANVAS.getContext('2d');

  const WIDTH = CANVAS.width;
  const HEIGHT = CANVAS.height;

  let isRunning = false;
  let isGameOver = false;
  let score = 0;
  let highScore = parseInt(localStorage.getItem('breakout_highscore') || '0', 10);
  let lives = 3;

  // Paddle
  const paddle = {
    x: WIDTH / 2 - 45,
    y: HEIGHT - 35,
    w: 90,
    h: 14,
    speed: 9,
    isWide: false,
    hasLaser: false,
    laserTimer: 0
  };

  let balls = [];
  let bricks = [];
  let powerups = [];
  let lasers = [];

  const BRICK_ROWS = 5;
  const BRICK_COLS = 8;
  const BRICK_W = 66;
  const BRICK_H = 22;
  const BRICK_PAD = 6;
  const BRICK_OFFSET_TOP = 50;
  const BRICK_OFFSET_LEFT = 15;

  const ROW_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

  // DOM
  const scoreEl = document.getElementById('breakout-score');
  const highEl = document.getElementById('breakout-high');
  const livesEl = document.getElementById('breakout-lives');
  const overlay = document.getElementById('breakout-overlay');
  const overlayTitle = document.getElementById('breakout-overlay-title');
  const overlayDesc = document.getElementById('breakout-overlay-desc');
  const btnStart = document.getElementById('btn-start-breakout');

  function initBricks() {
    bricks = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        bricks.push({
          x: BRICK_OFFSET_LEFT + c * (BRICK_W + BRICK_PAD),
          y: BRICK_OFFSET_TOP + r * (BRICK_H + BRICK_PAD),
          w: BRICK_W,
          h: BRICK_H,
          color: ROW_COLORS[r],
          points: (BRICK_ROWS - r) * 10,
          alive: true
        });
      }
    }
  }

  function resetBallOnPaddle() {
    balls = [{
      x: paddle.x + paddle.w / 2,
      y: paddle.y - 10,
      radius: 6,
      vx: (Math.random() - 0.5) * 4,
      vy: -6,
      stuck: true
    }];
  }

  function startGame() {
    score = 0;
    lives = 3;
    isGameOver = false;
    isRunning = true;
    paddle.w = 90;
    paddle.hasLaser = false;
    paddle.laserTimer = 0;
    powerups = [];
    lasers = [];

    initBricks();
    resetBallOnPaddle();
    updateHUD();

    overlay.classList.add('hidden');
    if (window.arcadeAudio) window.arcadeAudio.playClick();
  }

  function launchBall() {
    if (balls.length > 0 && balls[0].stuck) {
      balls[0].stuck = false;
      balls[0].vy = -6.5;
      balls[0].vx = (Math.random() - 0.5) * 5;
      if (window.arcadeAudio) window.arcadeAudio.playJump();
    }
  }

  function fireLasers() {
    if (!paddle.hasLaser || !isRunning || isGameOver) return;
    lasers.push({ x: paddle.x + 10, y: paddle.y - 6, vy: -10 });
    lasers.push({ x: paddle.x + paddle.w - 10, y: paddle.y - 6, vy: -10 });
    if (window.arcadeAudio) window.arcadeAudio.playLaser();
  }

  function spawnPowerup(x, y) {
    if (Math.random() > 0.35) return;
    const types = ['MULTIBALL', 'WIDE', 'LASER', 'LIFE'];
    const type = types[Math.floor(Math.random() * types.length)];
    powerups.push({ x, y, type, vy: 2.2 });
  }

  function applyPowerup(p) {
    if (p.type === 'MULTIBALL') {
      const b = balls[0] || { x: paddle.x + paddle.w / 2, y: paddle.y - 10 };
      balls.push(
        { x: b.x, y: b.y, radius: 6, vx: -4.5, vy: -5, stuck: false },
        { x: b.x, y: b.y, radius: 6, vx: 4.5, vy: -5, stuck: false }
      );
      if (window.showArcadeToast) window.showArcadeToast('💥 MULTI-BALL!', '⚡');
    } else if (p.type === 'WIDE') {
      paddle.w = 140;
      setTimeout(() => paddle.w = 90, 12000);
      if (window.showArcadeToast) window.showArcadeToast('🏓 WIDE PADDLE!', '✨');
    } else if (p.type === 'LASER') {
      paddle.hasLaser = true;
      paddle.laserTimer = 10; // seconds
      if (window.showArcadeToast) window.showArcadeToast('⚡ LASER PADDLE!', '🔥');
    } else if (p.type === 'LIFE') {
      lives = Math.min(5, lives + 1);
      updateHUD();
      if (window.showArcadeToast) window.showArcadeToast('❤️ EXTRA LIFE!', '💖');
    }

    if (window.arcadeAudio) window.arcadeAudio.playWin();
  }

  function update(dt) {
    if (!isRunning || isGameOver) return;

    // Laser timer
    if (paddle.hasLaser) {
      paddle.laserTimer -= dt;
      if (paddle.laserTimer <= 0) paddle.hasLaser = false;
    }

    // Move Lasers
    lasers.forEach(l => l.y += l.vy);
    lasers.forEach(l => {
      bricks.forEach(b => {
        if (b.alive && l.x > b.x && l.x < b.x + b.w && l.y > b.y && l.y < b.y + b.h) {
          b.alive = false;
          l.y = -100; // destroy laser
          score += b.points;
          spawnPowerup(b.x + b.w / 2, b.y + b.h / 2);
          if (window.arcadeAudio) window.arcadeAudio.playHit();
        }
      });
    });
    lasers = lasers.filter(l => l.y > 0);

    // Move Power-ups
    powerups.forEach(p => {
      p.y += p.vy;
      // Paddle catch
      if (p.y >= paddle.y && p.y <= paddle.y + paddle.h && p.x >= paddle.x && p.x <= paddle.x + paddle.w) {
        applyPowerup(p);
        p.y = HEIGHT + 100; // collected
      }
    });
    powerups = powerups.filter(p => p.y < HEIGHT);

    // Move Balls
    balls.forEach(ball => {
      if (ball.stuck) {
        ball.x = paddle.x + paddle.w / 2;
        ball.y = paddle.y - 10;
        return;
      }

      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall bounces
      if (ball.x - ball.radius <= 0) {
        ball.x = ball.radius;
        ball.vx = Math.abs(ball.vx);
        if (window.arcadeAudio) window.arcadeAudio.playClick();
      } else if (ball.x + ball.radius >= WIDTH) {
        ball.x = WIDTH - ball.radius;
        ball.vx = -Math.abs(ball.vx);
        if (window.arcadeAudio) window.arcadeAudio.playClick();
      }

      if (ball.y - ball.radius <= 0) {
        ball.y = ball.radius;
        ball.vy = Math.abs(ball.vy);
        if (window.arcadeAudio) window.arcadeAudio.playClick();
      }

      // Paddle collision
      if (ball.y + ball.radius >= paddle.y && ball.y - ball.radius <= paddle.y + paddle.h) {
        if (ball.x >= paddle.x && ball.x <= paddle.x + paddle.w) {
          ball.vy = -Math.abs(ball.vy);
          // Angle deflection based on hit position
          const hitPos = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
          ball.vx = hitPos * 6.5;
          if (window.arcadeAudio) window.arcadeAudio.playDrop();
        }
      }

      // Brick collisions
      bricks.forEach(b => {
        if (!b.alive) return;
        if (ball.x + ball.radius > b.x && ball.x - ball.radius < b.x + b.w &&
            ball.y + ball.radius > b.y && ball.y - ball.radius < b.y + b.h) {
          b.alive = false;
          ball.vy = -ball.vy;
          score += b.points;
          spawnPowerup(b.x + b.w / 2, b.y + b.h / 2);
          if (window.arcadeAudio) window.arcadeAudio.playHit();
        }
      });
    });

    // Remove balls that fell through bottom
    balls = balls.filter(b => b.y - b.radius < HEIGHT);

    if (balls.length === 0) {
      lives--;
      updateHUD();
      if (lives > 0) {
        resetBallOnPaddle();
      } else {
        gameOver(false);
      }
    }

    // Check Victory (all bricks destroyed)
    if (bricks.every(b => !b.alive)) {
      gameOver(true);
    }

    updateHUD();
  }

  function gameOver(isVictory) {
    isRunning = false;
    isGameOver = true;

    if (score > highScore) {
      highScore = score;
      localStorage.setItem('breakout_highscore', highScore.toString());
    }

    if (isVictory) {
      if (window.arcadeAudio) window.arcadeAudio.playJackpot();
      overlayTitle.textContent = 'STAGE CLEARED!';
      overlayTitle.style.color = '#10b981';
      overlayDesc.textContent = `Magnificent! Final Score: ${score.toLocaleString()}`;
    } else {
      if (window.arcadeAudio) window.arcadeAudio.playGameOver();
      overlayTitle.textContent = 'GAME OVER';
      overlayTitle.style.color = '#ef4444';
      overlayDesc.textContent = `Score: ${score.toLocaleString()} | Best: ${highScore.toLocaleString()}`;
    }

    btnStart.textContent = 'Play Again';
    overlay.classList.remove('hidden');
  }

  function updateHUD() {
    scoreEl.textContent = score.toLocaleString();
    highEl.textContent = highScore.toLocaleString();
    livesEl.textContent = '❤️'.repeat(Math.max(0, lives));
  }

  function draw() {
    CTX.clearRect(0, 0, WIDTH, HEIGHT);

    // Draw Bricks
    bricks.forEach(b => {
      if (!b.alive) return;
      CTX.fillStyle = b.color;
      CTX.shadowColor = b.color;
      CTX.shadowBlur = 6;
      CTX.beginPath();
      CTX.roundRect(b.x, b.y, b.w, b.h, 4);
      CTX.fill();
      CTX.shadowBlur = 0;
    });

    // Draw Lasers
    CTX.fillStyle = '#ef4444';
    CTX.shadowColor = '#ef4444';
    CTX.shadowBlur = 10;
    lasers.forEach(l => {
      CTX.fillRect(l.x - 2, l.y, 4, 14);
    });
    CTX.shadowBlur = 0;

    // Draw Power-ups
    powerups.forEach(p => {
      CTX.font = '18px sans-serif';
      CTX.textAlign = 'center';
      const icon = p.type === 'MULTIBALL' ? '💥' : (p.type === 'WIDE' ? '🏓' : (p.type === 'LASER' ? '⚡' : '❤️'));
      CTX.fillText(icon, p.x, p.y);
    });

    // Draw Paddle
    CTX.fillStyle = paddle.hasLaser ? '#ef4444' : '#06b6d4';
    CTX.shadowColor = paddle.hasLaser ? '#ef4444' : '#06b6d4';
    CTX.shadowBlur = 12;
    CTX.beginPath();
    CTX.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6);
    CTX.fill();
    CTX.shadowBlur = 0;

    // Draw Balls
    balls.forEach(ball => {
      CTX.fillStyle = '#ffffff';
      CTX.shadowColor = '#ffffff';
      CTX.shadowBlur = 8;
      CTX.beginPath();
      CTX.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      CTX.fill();
      CTX.shadowBlur = 0;
    });
  }

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // Controls: Mouse move
  CANVAS.addEventListener('mousemove', e => {
    const rect = CANVAS.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    paddle.x = Math.max(0, Math.min(WIDTH - paddle.w, mx - paddle.w / 2));
  });

  // Touch move
  CANVAS.addEventListener('touchmove', e => {
    const rect = CANVAS.getBoundingClientRect();
    const tx = e.touches[0].clientX - rect.left;
    paddle.x = Math.max(0, Math.min(WIDTH - paddle.w, tx - paddle.w / 2));
  }, { passive: true });

  // Click / Space to launch or shoot
  CANVAS.addEventListener('click', () => {
    if (!isRunning) return;
    launchBall();
    fireLasers();
  });

  window.addEventListener('keydown', e => {
    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }

    if (e.code === 'ArrowLeft') {
      paddle.x = Math.max(0, paddle.x - 28);
    } else if (e.code === 'ArrowRight') {
      paddle.x = Math.min(WIDTH - paddle.w, paddle.x + 28);
    } else if (e.code === 'Space') {
      if (!isRunning && isGameOver) startGame();
      else {
        launchBall();
        fireLasers();
      }
    }
  });

  btnStart.addEventListener('click', startGame);

  updateHUD();
  requestAnimationFrame(loop);
})();
