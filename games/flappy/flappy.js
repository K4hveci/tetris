/**
 * Flappy Bird Game Engine
 */
(function() {
  const CANVAS = document.getElementById('flappy-canvas');
  const CTX = CANVAS.getContext('2d');

  const WIDTH = CANVAS.width;
  const HEIGHT = CANVAS.height;
  const GROUND_Y = 500;
  const PIPE_WIDTH = 64;
  const PIPE_GAP = 135;

  let isRunning = false;
  let isGameOver = false;
  let score = 0;
  let highScore = parseInt(localStorage.getItem('flappy_highscore') || '0', 10);

  // Bird
  const bird = {
    x: 90,
    y: 240,
    radius: 14,
    vy: 0,
    gravity: 0.38,
    jumpForce: -7.6,
    rotation: 0,
    wingFrame: 0,
    wingTimer: 0
  };

  let pipes = [];
  let spawnTimer = 0;
  let groundOffset = 0;

  // DOM
  const liveScoreEl = document.getElementById('flappy-live-score');
  const overlay = document.getElementById('flappy-overlay');
  const overlayTitle = document.getElementById('flappy-overlay-title');
  const overlaySub = document.getElementById('flappy-overlay-sub');
  const scoreboard = document.getElementById('flappy-scoreboard');
  const finalScoreEl = document.getElementById('final-score');
  const finalBestEl = document.getElementById('final-best');
  const medalIconEl = document.getElementById('medal-icon');
  const btnAction = document.getElementById('btn-flappy-action');

  function initGame() {
    bird.x = 90;
    bird.y = 240;
    bird.vy = 0;
    bird.rotation = 0;

    pipes = [];
    spawnTimer = 60;
    score = 0;
    isRunning = true;
    isGameOver = false;

    liveScoreEl.textContent = '0';
    scoreboard.style.display = 'none';
    overlay.classList.add('hidden');

    flap();
  }

  function flap() {
    if (!isRunning || isGameOver) return;
    bird.vy = bird.jumpForce;
    if (window.arcadeAudio) window.arcadeAudio.playJump();
  }

  function spawnPipe() {
    // Gap Y center between 120 and GROUND_Y - 120
    const minY = 120;
    const maxY = GROUND_Y - 120;
    const gapCenter = minY + Math.random() * (maxY - minY);

    pipes.push({
      x: WIDTH + 10,
      topH: gapCenter - (PIPE_GAP / 2),
      bottomY: gapCenter + (PIPE_GAP / 2),
      passed: false
    });
  }

  function checkCollisions() {
    // Ground or Ceiling collision
    if (bird.y + bird.radius >= GROUND_Y || bird.y - bird.radius <= 0) {
      gameOver();
      return;
    }

    // Pipe collision
    for (let pipe of pipes) {
      // Check X range
      if (bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + PIPE_WIDTH) {
        // Check if hitting top pipe or bottom pipe
        if (bird.y - bird.radius < pipe.topH || bird.y + bird.radius > pipe.bottomY) {
          gameOver();
          return;
        }
      }
    }
  }

  function gameOver() {
    isRunning = false;
    isGameOver = true;
    if (window.arcadeAudio) window.arcadeAudio.playGameOver();

    if (score > highScore) {
      highScore = score;
      localStorage.setItem('flappy_highscore', highScore.toString());
    }

    overlayTitle.textContent = 'GAME OVER';
    finalScoreEl.textContent = score;
    finalBestEl.textContent = highScore;

    // Medals
    if (score >= 40) medalIconEl.textContent = '💎';
    else if (score >= 30) medalIconEl.textContent = '🥇';
    else if (score >= 20) medalIconEl.textContent = '🥈';
    else if (score >= 10) medalIconEl.textContent = '🥉';
    else medalIconEl.textContent = '⚪';

    scoreboard.style.display = 'flex';
    overlaySub.textContent = 'Tap to fly again!';
    btnAction.textContent = 'Fly Again';
    overlay.classList.remove('hidden');
  }

  function update() {
    // Animate ground whether flying or not
    groundOffset = (groundOffset + 2.4) % 24;

    if (!isRunning || isGameOver) return;

    // Bird physics
    bird.vy += bird.gravity;
    bird.y += bird.vy;

    // Bird rotation
    if (bird.vy < 0) {
      bird.rotation = -0.35;
    } else {
      bird.rotation = Math.min(Math.PI / 2.2, bird.rotation + 0.05);
    }

    // Wing flapping
    bird.wingTimer++;
    if (bird.wingTimer > 5) {
      bird.wingFrame = (bird.wingFrame + 1) % 3;
      bird.wingTimer = 0;
    }

    // Move pipes
    pipes.forEach(pipe => {
      pipe.x -= 2.4;

      // Score check
      if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
        pipe.passed = true;
        score++;
        liveScoreEl.textContent = score;
        if (window.arcadeAudio) window.arcadeAudio.playScore();
      }
    });

    pipes = pipes.filter(pipe => pipe.x > -PIPE_WIDTH - 20);

    // Spawn pipes
    spawnTimer--;
    if (spawnTimer <= 0) {
      spawnPipe();
      spawnTimer = 95;
    }

    checkCollisions();
  }

  function draw() {
    CTX.clearRect(0, 0, WIDTH, HEIGHT);

    // Sky Background
    CTX.fillStyle = '#4ec0ca';
    CTX.fillRect(0, 0, WIDTH, HEIGHT);

    // Distant clouds
    CTX.fillStyle = 'rgba(255, 255, 255, 0.7)';
    [60, 220, 340].forEach((cx, idx) => {
      CTX.beginPath();
      CTX.arc(cx, 380 + (idx % 2) * 15, 30, 0, Math.PI * 2);
      CTX.arc(cx + 25, 370 + (idx % 2) * 15, 38, 0, Math.PI * 2);
      CTX.arc(cx + 50, 380 + (idx % 2) * 15, 26, 0, Math.PI * 2);
      CTX.fill();
    });

    // Distant city silhouette
    CTX.fillStyle = '#9fe28d';
    for (let i = 0; i < 10; i++) {
      CTX.fillRect(i * 45, GROUND_Y - 50 - (i % 3) * 15, 36, 60);
    }

    // Draw Pipes
    pipes.forEach(pipe => {
      // Pipe Color
      CTX.fillStyle = '#73be2e';
      CTX.strokeStyle = '#543847';
      CTX.lineWidth = 3;

      // Top Pipe body
      CTX.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topH);
      CTX.strokeRect(pipe.x, -4, PIPE_WIDTH, pipe.topH + 4);

      // Top Pipe Rim
      CTX.fillRect(pipe.x - 3, pipe.topH - 24, PIPE_WIDTH + 6, 24);
      CTX.strokeRect(pipe.x - 3, pipe.topH - 24, PIPE_WIDTH + 6, 24);

      // Bottom Pipe body
      const botH = GROUND_Y - pipe.bottomY;
      CTX.fillRect(pipe.x, pipe.bottomY, PIPE_WIDTH, botH);
      CTX.strokeRect(pipe.x, pipe.bottomY, PIPE_WIDTH, botH);

      // Bottom Pipe Rim
      CTX.fillRect(pipe.x - 3, pipe.bottomY, PIPE_WIDTH + 6, 24);
      CTX.strokeRect(pipe.x - 3, pipe.bottomY, PIPE_WIDTH + 6, 24);

      // Highlights
      CTX.fillStyle = '#9fe855';
      CTX.fillRect(pipe.x + 4, 0, 8, pipe.topH - 24);
      CTX.fillRect(pipe.x + 4, pipe.bottomY + 24, 8, botH - 24);
    });

    // Draw Ground
    CTX.fillStyle = '#ded895';
    CTX.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);
    CTX.fillStyle = '#73be2e';
    CTX.fillRect(0, GROUND_Y, WIDTH, 16);
    CTX.fillStyle = '#9fe855';
    CTX.fillRect(0, GROUND_Y, WIDTH, 4);

    // Ground line texture
    CTX.strokeStyle = '#d0b868';
    CTX.lineWidth = 3;
    for (let x = -groundOffset; x < WIDTH + 24; x += 24) {
      CTX.beginPath();
      CTX.moveTo(x, GROUND_Y + 16);
      CTX.lineTo(x - 12, HEIGHT);
      CTX.stroke();
    }

    // Draw Bird
    drawBird();
  }

  function drawBird() {
    CTX.save();
    CTX.translate(bird.x, bird.y);
    CTX.rotate(bird.rotation);

    // Bird Body (Yellow Oval)
    CTX.fillStyle = '#facc15';
    CTX.strokeStyle = '#543847';
    CTX.lineWidth = 2.5;
    CTX.beginPath();
    CTX.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
    CTX.fill();
    CTX.stroke();

    // Belly (Lighter Yellow)
    CTX.fillStyle = '#fef08a';
    CTX.beginPath();
    CTX.ellipse(-2, 4, 10, 6, 0, 0, Math.PI * 2);
    CTX.fill();

    // Eye (Big Cartoon Eye)
    CTX.fillStyle = '#ffffff';
    CTX.beginPath();
    CTX.arc(7, -5, 6, 0, Math.PI * 2);
    CTX.fill();
    CTX.stroke();

    // Pupil
    CTX.fillStyle = '#000000';
    CTX.beginPath();
    CTX.arc(9, -5, 2.5, 0, Math.PI * 2);
    CTX.fill();

    // Orange Beak
    CTX.fillStyle = '#f97316';
    CTX.beginPath();
    CTX.moveTo(10, -1);
    CTX.lineTo(19, 3);
    CTX.lineTo(10, 7);
    CTX.closePath();
    CTX.fill();
    CTX.stroke();

    // Wing (Animated)
    CTX.fillStyle = '#ffffff';
    const wingY = bird.wingFrame === 1 ? -4 : (bird.wingFrame === 2 ? 3 : 0);
    CTX.beginPath();
    CTX.ellipse(-7, wingY, 8, 5, -0.3, 0, Math.PI * 2);
    CTX.fill();
    CTX.stroke();

    CTX.restore();
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  // Input
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      if (!isRunning) initGame();
      else flap();
    }
  });

  CANVAS.addEventListener('click', () => {
    if (!isRunning) initGame();
    else flap();
  });

  CANVAS.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!isRunning) initGame();
    else flap();
  }, { passive: false });

  btnAction.addEventListener('click', initGame);

  requestAnimationFrame(loop);
})();
