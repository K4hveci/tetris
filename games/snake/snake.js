/**
 * Neon Snake Game Engine
 */
(function() {
  const CANVAS = document.getElementById('snake-canvas');
  const CTX = CANVAS.getContext('2d');

  const GRID_SIZE = 20;
  const TILE_SIZE = CANVAS.width / GRID_SIZE;

  let snake = [];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let food = { x: 5, y: 5 };
  let goldenStar = null;
  let goldenStarTimer = null;

  let score = 0;
  let highScore = parseInt(localStorage.getItem('snake_highscore') || '0', 10);
  let isRunning = false;
  let isGameOver = false;
  let speedMs = 110;
  let lastTick = 0;
  let wrapWalls = true;

  // DOM
  const scoreEl = document.getElementById('snake-score');
  const highscoreEl = document.getElementById('snake-highscore');
  const lengthEl = document.getElementById('snake-length');
  const overlay = document.getElementById('snake-overlay');
  const overlayTitle = document.getElementById('snake-overlay-title');
  const overlayDesc = document.getElementById('snake-overlay-desc');
  const btnStart = document.getElementById('btn-start-snake');
  const chkWallMode = document.getElementById('chk-wall-mode');
  const wallModeText = document.getElementById('wall-mode-text');

  function initGame() {
    snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    speedMs = 110;
    isGameOver = false;
    isRunning = true;
    goldenStar = null;

    spawnFood();
    scheduleGoldenStar();
    updateStatsUI();

    overlay.classList.add('hidden');
    if (window.arcadeAudio) window.arcadeAudio.playClick();
  }

  function spawnFood() {
    let valid = false;
    while (!valid) {
      food = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      valid = !snake.some(seg => seg.x === food.x && seg.y === food.y);
    }
  }

  function scheduleGoldenStar() {
    clearTimeout(goldenStarTimer);
    const delay = (15 + Math.random() * 15) * 1000;
    goldenStarTimer = setTimeout(() => {
      if (!isRunning || isGameOver) return;
      let valid = false;
      let pos = { x: 0, y: 0 };
      while (!valid) {
        pos = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE)
        };
        valid = !snake.some(seg => seg.x === pos.x && seg.y === pos.y) &&
                (pos.x !== food.x || pos.y !== food.y);
      }
      goldenStar = pos;

      // Despawn in 7 seconds
      setTimeout(() => {
        goldenStar = null;
        scheduleGoldenStar();
      }, 7000);
    }, delay);
  }

  function updateStatsUI() {
    scoreEl.textContent = score;
    highscoreEl.textContent = highScore;
    lengthEl.textContent = snake.length;
  }

  function setDirection(dx, dy) {
    if (!isRunning || isGameOver) return;
    // Prevent 180-degree self reversal
    if (dx !== 0 && dir.x !== 0) return;
    if (dy !== 0 && dir.y !== 0) return;
    nextDir = { x: dx, y: dy };
  }

  function step() {
    dir = nextDir;
    let head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (wrapWalls) {
      head.x = (head.x + GRID_SIZE) % GRID_SIZE;
      head.y = (head.y + GRID_SIZE) % GRID_SIZE;
    } else {
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        gameOver();
        return;
      }
    }

    // Check self collision
    if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
      gameOver();
      return;
    }

    snake.unshift(head);

    // Check food collision
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      if (window.arcadeAudio) window.arcadeAudio.playEat();
      spawnFood();
      // Increase speed slightly
      speedMs = Math.max(65, 110 - Math.floor(snake.length / 3) * 2);
    } else if (goldenStar && head.x === goldenStar.x && head.y === goldenStar.y) {
      score += 50;
      goldenStar = null;
      if (window.arcadeAudio) window.arcadeAudio.playCoin();
      if (window.showArcadeToast) window.showArcadeToast('+50 Golden Bonus!', '⭐');
      scheduleGoldenStar();
    } else {
      snake.pop();
    }

    if (score > highScore) {
      highScore = score;
      localStorage.setItem('snake_highscore', highScore.toString());
    }

    updateStatsUI();
  }

  function gameOver() {
    isRunning = false;
    isGameOver = true;
    clearTimeout(goldenStarTimer);

    if (window.arcadeAudio) window.arcadeAudio.playGameOver();

    overlayTitle.textContent = 'CRASH!';
    overlayTitle.style.color = 'var(--accent-red)';
    overlayDesc.textContent = `Score: ${score} | Best: ${highScore}`;
    btnStart.textContent = 'Play Again';
    overlay.classList.remove('hidden');
  }

  function draw() {
    CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);

    // Grid pattern
    CTX.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    CTX.lineWidth = 1;
    for (let i = 0; i < GRID_SIZE; i++) {
      CTX.beginPath();
      CTX.moveTo(i * TILE_SIZE, 0);
      CTX.lineTo(i * TILE_SIZE, CANVAS.height);
      CTX.stroke();

      CTX.beginPath();
      CTX.moveTo(0, i * TILE_SIZE);
      CTX.lineTo(CANVAS.width, i * TILE_SIZE);
      CTX.stroke();
    }

    // Draw regular food
    const fx = food.x * TILE_SIZE + TILE_SIZE / 2;
    const fy = food.y * TILE_SIZE + TILE_SIZE / 2;
    CTX.fillStyle = '#ef4444';
    CTX.shadowColor = '#ef4444';
    CTX.shadowBlur = 12;
    CTX.beginPath();
    CTX.arc(fx, fy, TILE_SIZE / 2 - 3, 0, Math.PI * 2);
    CTX.fill();
    CTX.shadowBlur = 0;

    // Draw Golden Star
    if (goldenStar) {
      const gx = goldenStar.x * TILE_SIZE + TILE_SIZE / 2;
      const gy = goldenStar.y * TILE_SIZE + TILE_SIZE / 2;
      CTX.fillStyle = '#fbbf24';
      CTX.shadowColor = '#fbbf24';
      CTX.shadowBlur = 18;
      CTX.font = '16px sans-serif';
      CTX.textAlign = 'center';
      CTX.textBaseline = 'middle';
      CTX.fillText('⭐', gx, gy);
      CTX.shadowBlur = 0;
    }

    // Draw Snake
    snake.forEach((seg, idx) => {
      const sx = seg.x * TILE_SIZE + 2;
      const sy = seg.y * TILE_SIZE + 2;
      const size = TILE_SIZE - 4;

      if (idx === 0) {
        // Snake Head
        CTX.fillStyle = '#06b6d4';
        CTX.shadowColor = '#06b6d4';
        CTX.shadowBlur = 15;
        CTX.beginPath();
        CTX.roundRect(sx, sy, size, size, 6);
        CTX.fill();
        CTX.shadowBlur = 0;

        // Eyes
        CTX.fillStyle = '#ffffff';
        const eyeOffX = dir.x === 1 ? 14 : dir.x === -1 ? 4 : 6;
        const eyeOffY = dir.y === 1 ? 14 : dir.y === -1 ? 4 : 6;
        CTX.fillRect(sx + eyeOffX, sy + eyeOffY, 3, 3);
        if (dir.x !== 0) {
          CTX.fillRect(sx + eyeOffX, sy + eyeOffY + 8, 3, 3);
        } else {
          CTX.fillRect(sx + eyeOffX + 8, sy + eyeOffY, 3, 3);
        }
      } else {
        // Snake Body gradient from cyan to purple
        const ratio = idx / snake.length;
        CTX.fillStyle = ratio > 0.5 ? '#8b5cf6' : '#3b82f6';
        CTX.beginPath();
        CTX.roundRect(sx, sy, size, size, 4);
        CTX.fill();
      }
    });
  }

  function gameLoop(time) {
    if (isRunning && time - lastTick > speedMs) {
      lastTick = time;
      step();
    }
    draw();
    requestAnimationFrame(gameLoop);
  }

  // Keyboard controls
  window.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }

    if (!isRunning && (e.code === 'Space' || e.code === 'Enter')) {
      initGame();
      return;
    }

    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        setDirection(0, -1);
        break;
      case 'ArrowDown':
      case 'KeyS':
        setDirection(0, 1);
        break;
      case 'ArrowLeft':
      case 'KeyA':
        setDirection(-1, 0);
        break;
      case 'ArrowRight':
      case 'KeyD':
        setDirection(1, 0);
        break;
    }
  });

  // Touch Swipes on canvas
  let touchStartX = 0;
  let touchStartY = 0;
  CANVAS.addEventListener('touchstart', e => {
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }, { passive: true });

  CANVAS.addEventListener('touchend', e => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 25) setDirection(dx > 0 ? 1 : -1, 0);
    } else {
      if (Math.abs(dy) > 25) setDirection(0, dy > 0 ? 1 : -1);
    }
  }, { passive: true });

  // D-Pad buttons
  document.getElementById('dpad-up').addEventListener('click', () => setDirection(0, -1));
  document.getElementById('dpad-down').addEventListener('click', () => setDirection(0, 1));
  document.getElementById('dpad-left').addEventListener('click', () => setDirection(-1, 0));
  document.getElementById('dpad-right').addEventListener('click', () => setDirection(1, 0));

  // Wall mode toggle
  chkWallMode.addEventListener('change', () => {
    wrapWalls = !chkWallMode.checked;
    wallModeText.textContent = wrapWalls ? 'Wrap Walls' : 'Solid Walls';
  });

  btnStart.addEventListener('click', initGame);

  updateStatsUI();
  requestAnimationFrame(gameLoop);
})();
