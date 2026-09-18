/**
 * Chrome Dino Runner Engine
 */
(function() {
  const CANVAS = document.getElementById('dino-canvas');
  const CTX = CANVAS.getContext('2d');
  const WRAP = document.getElementById('dino-wrap');

  const GROUND_Y = 210;

  let isRunning = false;
  let isGameOver = false;
  let score = 0;
  let highScore = parseInt(localStorage.getItem('dino_highscore') || '0', 10);
  let speed = 7;
  let distanceTick = 0;

  // Day / Night state
  let isNight = false;

  // Dino character
  const dino = {
    x: 50,
    y: GROUND_Y - 48,
    w: 44,
    h: 48,
    vy: 0,
    gravity: 0.68,
    jumpForce: -13,
    isJumping: false,
    isDucking: false,
    animFrame: 0,
    animTimer: 0
  };

  let obstacles = [];
  let clouds = [];
  let spawnTimer = 0;

  // DOM
  const scoreEl = document.getElementById('dino-score');
  const highEl = document.getElementById('dino-high');
  const speedEl = document.getElementById('dino-speed');
  const overlay = document.getElementById('dino-overlay');
  const btnStart = document.getElementById('btn-start-dino');

  function initGame() {
    dino.y = GROUND_Y - 48;
    dino.w = 44;
    dino.h = 48;
    dino.vy = 0;
    dino.isJumping = false;
    dino.isDucking = false;

    obstacles = [];
    clouds = [
      { x: 200, y: 40, w: 46 },
      { x: 500, y: 70, w: 46 },
      { x: 750, y: 30, w: 46 }
    ];

    score = 0;
    speed = 7.5;
    distanceTick = 0;
    spawnTimer = 60;
    isRunning = true;
    isGameOver = false;
    isNight = false;
    WRAP.classList.remove('night');

    overlay.classList.add('hidden');
    if (window.arcadeAudio) window.arcadeAudio.playClick();
  }

  function jump() {
    if (!isRunning || isGameOver) return;
    if (!dino.isJumping && !dino.isDucking) {
      dino.isJumping = true;
      dino.vy = dino.jumpForce;
      if (window.arcadeAudio) window.arcadeAudio.playJump();
    }
  }

  function setDuck(ducking) {
    if (!isRunning || isGameOver) return;
    dino.isDucking = ducking;
    if (ducking) {
      dino.h = 28;
      dino.w = 56;
      if (dino.isJumping) {
        dino.vy += 4; // fast drop
      } else {
        dino.y = GROUND_Y - 28;
      }
    } else {
      dino.h = 48;
      dino.w = 44;
      if (!dino.isJumping) {
        dino.y = GROUND_Y - 48;
      }
    }
  }

  function spawnObstacle() {
    const isPtero = score > 250 && Math.random() < 0.35;

    if (isPtero) {
      // Pterodactyl at low, mid, or high altitude
      const heights = [GROUND_Y - 32, GROUND_Y - 55, GROUND_Y - 80];
      const y = heights[Math.floor(Math.random() * heights.length)];
      obstacles.push({
        type: 'PTERO',
        x: CANVAS.width + 20,
        y,
        w: 42,
        h: 30,
        wingFrame: 0,
        wingTimer: 0
      });
    } else {
      // Cactus: small, double, large
      const rand = Math.random();
      if (rand < 0.4) {
        obstacles.push({ type: 'CACTUS', x: CANVAS.width + 20, y: GROUND_Y - 36, w: 18, h: 36 });
      } else if (rand < 0.75) {
        obstacles.push({ type: 'CACTUS', x: CANVAS.width + 20, y: GROUND_Y - 36, w: 34, h: 36 });
      } else {
        obstacles.push({ type: 'CACTUS', x: CANVAS.width + 20, y: GROUND_Y - 50, w: 26, h: 50 });
      }
    }
  }

  function checkCollisions() {
    for (let obs of obstacles) {
      // Padding for hitboxes
      const dLeft = dino.x + 6;
      const dRight = dino.x + dino.w - 6;
      const dTop = dino.y + 4;
      const dBottom = dino.y + dino.h;

      const oLeft = obs.x + 4;
      const oRight = obs.x + obs.w - 4;
      const oTop = obs.y + 4;
      const oBottom = obs.y + obs.h;

      if (dRight > oLeft && dLeft < oRight && dBottom > oTop && dTop < oBottom) {
        gameOver();
        return;
      }
    }
  }

  function gameOver() {
    isRunning = false;
    isGameOver = true;
    if (window.arcadeAudio) window.arcadeAudio.playGameOver();

    if (score > highScore) {
      highScore = score;
      localStorage.setItem('dino_highscore', highScore.toString());
    }

    overlay.querySelector('h2').textContent = 'GAME OVER';
    overlay.querySelector('p').textContent = `Score: ${score} | High Score: ${highScore}`;
    btnStart.textContent = 'Play Again';
    overlay.classList.remove('hidden');
  }

  function update() {
    if (!isRunning || isGameOver) return;

    // Dino Jump
    if (dino.isJumping) {
      dino.y += dino.vy;
      dino.vy += dino.gravity;
      if (dino.y >= GROUND_Y - (dino.isDucking ? 28 : 48)) {
        dino.y = GROUND_Y - (dino.isDucking ? 28 : 48);
        dino.vy = 0;
        dino.isJumping = false;
      }
    }

    // Dino Running animation
    dino.animTimer++;
    if (dino.animTimer > 5) {
      dino.animFrame = (dino.animFrame + 1) % 2;
      dino.animTimer = 0;
    }

    // Score & Speed
    distanceTick++;
    if (distanceTick % 4 === 0) {
      score++;
      if (score % 100 === 0 && window.arcadeAudio) {
        window.arcadeAudio.playScore();
      }
    }

    speed = 7.5 + (score / 350);

    // Day/Night switch every 700 points
    const nightCheck = Math.floor(score / 700) % 2 === 1;
    if (nightCheck !== isNight) {
      isNight = nightCheck;
      WRAP.classList.toggle('night', isNight);
    }

    // Move Clouds
    clouds.forEach(c => {
      c.x -= speed * 0.2;
      if (c.x < -60) {
        c.x = CANVAS.width + Math.random() * 80;
        c.y = 30 + Math.random() * 60;
      }
    });

    // Move Obstacles
    obstacles.forEach(obs => {
      obs.x -= speed;
      if (obs.type === 'PTERO') {
        obs.wingTimer++;
        if (obs.wingTimer > 6) {
          obs.wingFrame = (obs.wingFrame + 1) % 2;
          obs.wingTimer = 0;
        }
      }
    });

    obstacles = obstacles.filter(obs => obs.x > -obs.w - 20);

    // Spawn obstacles
    spawnTimer -= 1;
    if (spawnTimer <= 0) {
      spawnObstacle();
      const minGap = Math.max(35, 75 - Math.floor(score / 200));
      spawnTimer = minGap + Math.floor(Math.random() * 45);
    }

    checkCollisions();
    updateHUD();
  }

  function updateHUD() {
    scoreEl.textContent = String(score).padStart(5, '0');
    highEl.textContent = `HI ${String(highScore).padStart(5, '0')}`;
    speedEl.textContent = `${(speed / 7.5).toFixed(1)}x`;
  }

  function draw() {
    CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);

    const fgColor = isNight ? '#ffffff' : '#535353';

    // Draw Clouds
    CTX.fillStyle = isNight ? '#334155' : '#d1d5db';
    clouds.forEach(c => {
      CTX.beginPath();
      CTX.arc(c.x + 15, c.y + 10, 10, 0, Math.PI * 2);
      CTX.arc(c.x + 28, c.y + 8, 12, 0, Math.PI * 2);
      CTX.arc(c.x + 38, c.y + 12, 8, 0, Math.PI * 2);
      CTX.fill();
    });

    // Ground Line & Texture
    CTX.strokeStyle = fgColor;
    CTX.lineWidth = 2;
    CTX.beginPath();
    CTX.moveTo(0, GROUND_Y);
    CTX.lineTo(CANVAS.width, GROUND_Y);
    CTX.stroke();

    // Ground bumps / pebbles
    CTX.fillStyle = fgColor;
    const bumpOffset = (distanceTick * speed * 0.5) % 80;
    for (let x = -bumpOffset; x < CANVAS.width; x += 80) {
      CTX.fillRect(x + 20, GROUND_Y + 4, 3, 2);
      CTX.fillRect(x + 45, GROUND_Y + 8, 2, 2);
    }

    // Draw Obstacles
    obstacles.forEach(obs => {
      CTX.fillStyle = fgColor;
      if (obs.type === 'CACTUS') {
        // Pixel cactus
        CTX.fillRect(obs.x + obs.w / 2 - 3, obs.y, 6, obs.h); // trunk
        CTX.fillRect(obs.x, obs.y + 10, 5, obs.h - 16); // left arm
        CTX.fillRect(obs.x, obs.y + 10, obs.w / 2, 4);
        if (obs.w > 20) {
          CTX.fillRect(obs.x + obs.w - 5, obs.y + 6, 5, obs.h - 14); // right arm
          CTX.fillRect(obs.x + obs.w / 2, obs.y + 6, obs.w / 2, 4);
        }
      } else if (obs.type === 'PTERO') {
        // Pterodactyl with flapping wings
        CTX.fillRect(obs.x + 10, obs.y + 12, 24, 8); // body
        CTX.fillRect(obs.x, obs.y + 8, 10, 12); // head & beak
        // Eye
        CTX.fillStyle = isNight ? '#181a26' : '#ffffff';
        CTX.fillRect(obs.x + 3, obs.y + 10, 2, 2);
        CTX.fillStyle = fgColor;

        if (obs.wingFrame === 0) {
          // Wings Up
          CTX.fillRect(obs.x + 16, obs.y, 8, 12);
        } else {
          // Wings Down
          CTX.fillRect(obs.x + 16, obs.y + 18, 8, 12);
        }
      }
    });

    // Draw Dino
    drawDino(fgColor);
  }

  function drawDino(color) {
    CTX.fillStyle = color;

    if (dino.isDucking) {
      // Ducking Dino
      const dx = dino.x;
      const dy = dino.y;

      // Long body
      CTX.fillRect(dx, dy + 10, 48, 14);
      // Head
      CTX.fillRect(dx + 38, dy + 6, 18, 14);
      // Eye
      CTX.fillStyle = isNight ? '#181a26' : '#ffffff';
      CTX.fillRect(dx + 48, dy + 8, 3, 3);
      CTX.fillStyle = color;
      // Tail
      CTX.fillRect(dx - 6, dy + 8, 8, 6);
      // Legs (animating)
      if (dino.animFrame === 0) {
        CTX.fillRect(dx + 12, dy + 24, 4, 4);
        CTX.fillRect(dx + 30, dy + 22, 4, 6);
      } else {
        CTX.fillRect(dx + 12, dy + 22, 4, 6);
        CTX.fillRect(dx + 30, dy + 24, 4, 4);
      }
    } else {
      // Standing / Jumping Dino
      const dx = dino.x;
      const dy = dino.y;

      // Body
      CTX.fillRect(dx + 8, dy + 16, 24, 22);
      // Head
      CTX.fillRect(dx + 20, dy, 24, 18);
      // Snout
      CTX.fillRect(dx + 26, dy + 6, 18, 10);
      // Eye
      CTX.fillStyle = isNight ? '#181a26' : '#ffffff';
      CTX.fillRect(dx + 26, dy + 3, 3, 3);
      CTX.fillStyle = color;
      // Tail
      CTX.fillRect(dx, dy + 22, 10, 12);
      CTX.fillRect(dx - 4, dy + 26, 6, 6);
      // Tiny arm
      CTX.fillRect(dx + 32, dy + 24, 6, 4);

      // Legs
      if (dino.isJumping) {
        // Legs tucked
        CTX.fillRect(dx + 14, dy + 38, 4, 6);
        CTX.fillRect(dx + 24, dy + 38, 4, 6);
      } else {
        // Running legs
        if (dino.animFrame === 0) {
          CTX.fillRect(dx + 14, dy + 38, 4, 10);
          CTX.fillRect(dx + 24, dy + 38, 4, 6);
          CTX.fillRect(dx + 14, dy + 46, 6, 2);
        } else {
          CTX.fillRect(dx + 14, dy + 38, 4, 6);
          CTX.fillRect(dx + 24, dy + 38, 4, 10);
          CTX.fillRect(dx + 24, dy + 46, 6, 2);
        }
      }
    }
  }

  function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }

  // Controls
  window.addEventListener('keydown', e => {
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
      e.preventDefault();
    }

    if (!isRunning && (e.code === 'Space' || e.code === 'Enter')) {
      initGame();
      return;
    }

    if (e.code === 'Space' || e.code === 'ArrowUp') {
      jump();
    } else if (e.code === 'ArrowDown') {
      setDuck(true);
    }
  });

  window.addEventListener('keyup', e => {
    if (e.code === 'ArrowDown') {
      setDuck(false);
    }
  });

  // Touch controls
  const touchJumpBtn = document.getElementById('touch-jump');
  const touchDuckBtn = document.getElementById('touch-duck');

  touchJumpBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    if (!isRunning) initGame();
    else jump();
  });

  touchDuckBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    setDuck(true);
  });
  touchDuckBtn.addEventListener('touchend', e => {
    e.preventDefault();
    setDuck(false);
  });

  btnStart.addEventListener('click', initGame);

  updateHUD();
  requestAnimationFrame(gameLoop);
})();
