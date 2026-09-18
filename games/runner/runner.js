/**
 * Subway Runner 3D Engine
 */
(function() {
  const CANVAS = document.getElementById('runner-canvas');
  const CTX = CANVAS.getContext('2d');

  const WIDTH = CANVAS.width;
  const HEIGHT = CANVAS.height;
  const HORIZON_Y = 140;
  const ROAD_BOTTOM_WIDTH = 380;
  const ROAD_TOP_WIDTH = 70;

  // Game state
  let isRunning = false;
  let isGameOver = false;
  let distance = 0;
  let coins = 0;
  let speed = 420; // units per second
  let highDistance = parseInt(localStorage.getItem('runner_highdist') || '0', 10);

  // Player
  const player = {
    lane: 0, // -1, 0, 1
    visualLane: 0,
    y: 0,
    vy: 0,
    isJumping: false,
    isSliding: false,
    slideTimer: 0,
    animTick: 0
  };

  // Power-ups
  let magnetTime = 0;
  let multiplierTime = 0;

  // World objects
  let obstacles = [];
  let coinPickups = [];
  let powerupPickups = [];
  let spawnTimer = 0;

  // DOM
  const distEl = document.getElementById('runner-dist');
  const coinsEl = document.getElementById('runner-coins');
  const multEl = document.getElementById('runner-mult');
  const highDistEl = document.getElementById('runner-high-dist');
  const overlay = document.getElementById('runner-overlay');
  const overlayTitle = document.getElementById('runner-overlay-title');
  const overlayDesc = document.getElementById('runner-overlay-desc');
  const btnStart = document.getElementById('btn-start-runner');
  const powerupsBar = document.getElementById('powerups-bar');

  function project(lane, z, y = 0) {
    const scale = 1 / (1 + z * 0.0032);
    const bottomLaneSpread = 120;
    const screenX = (WIDTH / 2) + (lane * bottomLaneSpread) * scale;
    const screenY = HORIZON_Y + (HEIGHT - HORIZON_Y - 40) * scale - (y * scale);
    return { x: screenX, y: screenY, scale };
  }

  function startGame() {
    player.lane = 0;
    player.visualLane = 0;
    player.y = 0;
    player.vy = 0;
    player.isJumping = false;
    player.isSliding = false;
    player.slideTimer = 0;

    distance = 0;
    coins = 0;
    speed = 440;
    magnetTime = 0;
    multiplierTime = 0;

    obstacles = [];
    coinPickups = [];
    powerupPickups = [];
    spawnTimer = 0;

    isRunning = true;
    isGameOver = false;

    overlay.classList.add('hidden');
    if (window.arcadeAudio) window.arcadeAudio.playClick();
  }

  function changeLane(dir) {
    if (!isRunning || isGameOver) return;
    const newLane = player.lane + dir;
    if (newLane >= -1 && newLane <= 1) {
      player.lane = newLane;
      if (window.arcadeAudio) window.arcadeAudio.playClick();
    }
  }

  function jump() {
    if (!isRunning || isGameOver) return;
    if (!player.isJumping) {
      player.isJumping = true;
      player.isSliding = false;
      player.vy = 480;
      if (window.arcadeAudio) window.arcadeAudio.playJump();
    }
  }

  function slide() {
    if (!isRunning || isGameOver) return;
    if (player.isJumping) {
      // Fast drop down if jumping
      player.vy = -600;
    }
    player.isSliding = true;
    player.slideTimer = 0.65; // seconds
    if (window.arcadeAudio) window.arcadeAudio.playDuck();
  }

  function spawnWorldObjects() {
    const lanes = [-1, 0, 1];
    // Random obstacle type
    const rand = Math.random();
    const lane = lanes[Math.floor(Math.random() * lanes.length)];

    if (rand < 0.45) {
      // Low Hurdle (must jump)
      obstacles.push({ type: 'HURDLE', lane, z: 900, w: 40, h: 25 });
    } else if (rand < 0.75) {
      // Overhead Warning Sign (must slide)
      obstacles.push({ type: 'OVERHEAD', lane, z: 900, w: 50, h: 65, clearance: 30 });
    } else {
      // Train (must switch lanes)
      obstacles.push({ type: 'TRAIN', lane, z: 900, length: 120, w: 55, h: 70 });
    }

    // Spawn Coins in a clear lane
    const availableLanes = lanes.filter(l => l !== lane);
    if (availableLanes.length > 0 && Math.random() < 0.75) {
      const coinLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
      for (let i = 0; i < 4; i++) {
        coinPickups.push({ lane: coinLane, z: 850 + i * 45, collected: false });
      }
    }

    // Occasional Powerup
    if (Math.random() < 0.12) {
      const powLane = lanes[Math.floor(Math.random() * lanes.length)];
      const pType = Math.random() < 0.5 ? 'MAGNET' : 'MULTIPLIER';
      powerupPickups.push({ type: pType, lane: powLane, z: 950, collected: false });
    }
  }

  function checkCollisions() {
    const pZ = 30; // player simulated Z position

    // 1. Obstacle collision
    for (let obs of obstacles) {
      const zDist = Math.abs(obs.z - pZ);
      const inLane = Math.abs(obs.lane - player.visualLane) < 0.55;

      if (inLane && zDist < 25) {
        if (obs.type === 'HURDLE') {
          // Must be high enough jumping
          if (player.y < 28) {
            gameOver('Hit a low barrier!');
            return;
          }
        } else if (obs.type === 'OVERHEAD') {
          // Must be sliding flat
          if (!player.isSliding) {
            gameOver('Crashed into overhead sign!');
            return;
          }
        } else if (obs.type === 'TRAIN') {
          // Always fatal
          gameOver('Crashed into incoming train!');
          return;
        }
      }
    }

    // 2. Coin collection
    coinPickups.forEach(coin => {
      if (coin.collected) return;
      const zDist = Math.abs(coin.z - pZ);

      // If magnet active, attract coins
      if (magnetTime > 0 && coin.z < 350 && coin.z > -10) {
        coin.lane += (player.visualLane - coin.lane) * 0.15;
      }

      const inLane = Math.abs(coin.lane - player.visualLane) < 0.6;
      if (inLane && zDist < 30) {
        coin.collected = true;
        coins += (multiplierTime > 0 ? 2 : 1);
        if (window.arcadeAudio) window.arcadeAudio.playCoin();
      }
    });

    // 3. Power-up collection
    powerupPickups.forEach(pow => {
      if (pow.collected) return;
      const zDist = Math.abs(pow.z - pZ);
      const inLane = Math.abs(pow.lane - player.visualLane) < 0.6;

      if (inLane && zDist < 30) {
        pow.collected = true;
        if (pow.type === 'MAGNET') {
          magnetTime = 12;
          if (window.showArcadeToast) window.showArcadeToast('🧲 COIN MAGNET ACTIVE!', '⚡');
        } else if (pow.type === 'MULTIPLIER') {
          multiplierTime = 15;
          if (window.showArcadeToast) window.showArcadeToast('⚡ 2X MULTIPLIER ACTIVE!', '✨');
        }
        if (window.arcadeAudio) window.arcadeAudio.playWin();
      }
    });
  }

  function gameOver(reason) {
    isRunning = false;
    isGameOver = true;
    if (window.arcadeAudio) window.arcadeAudio.playGameOver();

    if (distance > highDistance) {
      highDistance = Math.floor(distance);
      localStorage.setItem('runner_highdist', highDistance.toString());
    }

    overlayTitle.textContent = 'CRASH!';
    overlayDesc.innerHTML = `${reason}<br><strong>Distance:</strong> ${Math.floor(distance)}m | <strong>Coins:</strong> ${coins}`;
    btnStart.textContent = 'Run Again';
    overlay.classList.remove('hidden');
  }

  function update(dt) {
    if (!isRunning || isGameOver) return;

    // Advance distance & speed
    const mult = multiplierTime > 0 ? 2 : 1;
    distance += (speed * 0.05 * mult) * dt;
    speed = Math.min(850, 440 + distance * 0.25);

    // Power-up timers
    if (magnetTime > 0) magnetTime = Math.max(0, magnetTime - dt);
    if (multiplierTime > 0) multiplierTime = Math.max(0, multiplierTime - dt);

    // Smooth visual lane movement
    player.visualLane += (player.lane - player.visualLane) * Math.min(1, dt * 14);

    // Player Jump Physics
    if (player.isJumping) {
      player.y += player.vy * dt;
      player.vy -= 1200 * dt; // gravity
      if (player.y <= 0) {
        player.y = 0;
        player.vy = 0;
        player.isJumping = false;
      }
    }

    // Player Slide Timer
    if (player.isSliding) {
      player.slideTimer -= dt;
      if (player.slideTimer <= 0) {
        player.isSliding = false;
      }
    }

    player.animTick += dt * (speed / 70);

    // Move obstacles towards player
    obstacles.forEach(obs => obs.z -= speed * dt);
    coinPickups.forEach(coin => coin.z -= speed * dt);
    powerupPickups.forEach(pow => pow.z -= speed * dt);

    // Despawn passed objects
    obstacles = obstacles.filter(obs => obs.z > -60);
    coinPickups = coinPickups.filter(coin => coin.z > -60 && !coin.collected);
    powerupPickups = powerupPickups.filter(pow => pow.z > -60 && !pow.collected);

    // Spawn new obstacles
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnWorldObjects();
      spawnTimer = Math.max(0.65, 1.4 - (distance / 3000));
    }

    checkCollisions();
    updateHUD();
  }

  function updateHUD() {
    distEl.textContent = `${Math.floor(distance)}m`;
    coinsEl.textContent = coins;
    multEl.textContent = multiplierTime > 0 ? '2x ⚡' : '1x';
    highDistEl.textContent = `${highDistance}m`;

    let pills = '';
    if (magnetTime > 0) pills += `<div class="powerup-pill">🧲 Magnet ${Math.ceil(magnetTime)}s</div>`;
    if (multiplierTime > 0) pills += `<div class="powerup-pill">⚡ 2X Boost ${Math.ceil(multiplierTime)}s</div>`;
    powerupsBar.innerHTML = pills;
  }

  function draw() {
    CTX.clearRect(0, 0, WIDTH, HEIGHT);

    // Sky gradient & horizon
    const skyGrad = CTX.createLinearGradient(0, 0, 0, HORIZON_Y);
    skyGrad.addColorStop(0, '#090a18');
    skyGrad.addColorStop(1, '#1b1a3d');
    CTX.fillStyle = skyGrad;
    CTX.fillRect(0, 0, WIDTH, HORIZON_Y);

    // Distant futuristic city skyline
    CTX.fillStyle = '#161936';
    for (let i = 0; i < 15; i++) {
      const bx = i * 36;
      const bw = 28;
      const bh = 25 + (i * 17) % 55;
      CTX.fillRect(bx, HORIZON_Y - bh, bw, bh);
      // Windows
      CTX.fillStyle = '#38bdf8';
      CTX.fillRect(bx + 4, HORIZON_Y - bh + 6, 4, 4);
      CTX.fillRect(bx + 14, HORIZON_Y - bh + 14, 4, 4);
      CTX.fillStyle = '#161936';
    }

    // 3D Road / Railway Track
    CTX.fillStyle = '#0f172a';
    CTX.beginPath();
    CTX.moveTo((WIDTH - ROAD_TOP_WIDTH) / 2, HORIZON_Y);
    CTX.lineTo((WIDTH + ROAD_TOP_WIDTH) / 2, HORIZON_Y);
    CTX.lineTo((WIDTH + ROAD_BOTTOM_WIDTH) / 2, HEIGHT);
    CTX.lineTo((WIDTH - ROAD_BOTTOM_WIDTH) / 2, HEIGHT);
    CTX.closePath();
    CTX.fill();

    // Railway ties / sleepers moving
    const tieOffset = (distance * 4) % 40;
    CTX.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    CTX.lineWidth = 2;
    for (let z = 20 + tieOffset; z < 800; z += 40) {
      const pLeft = project(-1.4, z);
      const pRight = project(1.4, z);
      CTX.beginPath();
      CTX.moveTo(pLeft.x, pLeft.y);
      CTX.lineTo(pRight.x, pRight.y);
      CTX.stroke();
    }

    // Lane dividing lines
    [-0.5, 0.5].forEach(laneDiv => {
      const pTop = project(laneDiv, 800);
      const pBottom = project(laneDiv, 0);
      CTX.strokeStyle = 'rgba(6, 182, 212, 0.3)';
      CTX.lineWidth = 1.5;
      CTX.beginPath();
      CTX.moveTo(pTop.x, pTop.y);
      CTX.lineTo(pBottom.x, pBottom.y);
      CTX.stroke();
    });

    // Sort world objects by Z descending (draw furthest first)
    const renderQueue = [];
    obstacles.forEach(o => renderQueue.push({ type: 'obstacle', data: o, z: o.z }));
    coinPickups.forEach(c => {
      if (!c.collected) renderQueue.push({ type: 'coin', data: c, z: c.z });
    });
    powerupPickups.forEach(p => {
      if (!p.collected) renderQueue.push({ type: 'powerup', data: p, z: p.z });
    });

    renderQueue.sort((a, b) => b.z - a.z);

    renderQueue.forEach(item => {
      if (item.type === 'coin') {
        drawCoin(item.data);
      } else if (item.type === 'powerup') {
        drawPowerup(item.data);
      } else if (item.type === 'obstacle') {
        drawObstacle(item.data);
      }
    });

    // Draw Player
    drawPlayer();
  }

  function drawObstacle(obs) {
    const p = project(obs.lane, obs.z);
    if (p.scale <= 0) return;

    if (obs.type === 'HURDLE') {
      // Barricade
      const w = obs.w * p.scale;
      const h = obs.h * p.scale;
      CTX.fillStyle = '#f59e0b';
      CTX.fillRect(p.x - w / 2, p.y - h, w, h);
      // Striping
      CTX.fillStyle = '#000000';
      CTX.fillRect(p.x - w / 4, p.y - h, w / 4, h);
    } else if (obs.type === 'OVERHEAD') {
      // Overhead Sign (slide under)
      const w = obs.w * p.scale;
      const h = obs.h * p.scale;
      const poleH = (obs.h + obs.clearance) * p.scale;

      // Poles
      CTX.fillStyle = '#64748b';
      CTX.fillRect(p.x - w / 2, p.y - poleH, 4 * p.scale, poleH);
      CTX.fillRect(p.x + w / 2 - 4 * p.scale, p.y - poleH, 4 * p.scale, poleH);

      // Sign board
      CTX.fillStyle = '#ef4444';
      CTX.fillRect(p.x - w / 2, p.y - poleH, w, h);
      CTX.fillStyle = '#ffffff';
      CTX.font = `${Math.floor(10 * p.scale)}px sans-serif`;
      CTX.textAlign = 'center';
      CTX.fillText('SLIDE', p.x, p.y - poleH + h / 2 + 4);
    } else if (obs.type === 'TRAIN') {
      // Train car
      const w = obs.w * p.scale;
      const h = obs.h * p.scale;
      CTX.fillStyle = '#3b82f6';
      CTX.fillRect(p.x - w / 2, p.y - h, w, h);
      // Windows
      CTX.fillStyle = '#93c5fd';
      CTX.fillRect(p.x - w / 3, p.y - h + 10 * p.scale, (w * 2) / 3, 14 * p.scale);
      // Headlights
      CTX.fillStyle = '#fef08a';
      CTX.fillRect(p.x - w / 2 + 4 * p.scale, p.y - 12 * p.scale, 8 * p.scale, 6 * p.scale);
      CTX.fillRect(p.x + w / 2 - 12 * p.scale, p.y - 12 * p.scale, 8 * p.scale, 6 * p.scale);
    }
  }

  function drawCoin(coin) {
    const p = project(coin.lane, coin.z, 15);
    const size = 16 * p.scale;
    if (size < 2) return;

    CTX.fillStyle = '#fbbf24';
    CTX.shadowColor = '#fbbf24';
    CTX.shadowBlur = 8;
    CTX.beginPath();
    CTX.arc(p.x, p.y, size, 0, Math.PI * 2);
    CTX.fill();
    CTX.shadowBlur = 0;
  }

  function drawPowerup(pow) {
    const p = project(pow.lane, pow.z, 20);
    const size = 20 * p.scale;
    if (size < 2) return;

    CTX.font = `${Math.floor(size * 1.5)}px sans-serif`;
    CTX.textAlign = 'center';
    CTX.textBaseline = 'middle';
    CTX.fillText(pow.type === 'MAGNET' ? '🧲' : '⚡', p.x, p.y);
  }

  function drawPlayer() {
    const p = project(player.visualLane, 30, player.y);
    const scale = p.scale;

    CTX.save();
    CTX.translate(p.x, p.y);

    if (player.isSliding) {
      // Sliding / ducking character
      CTX.fillStyle = '#ec4899';
      CTX.beginPath();
      CTX.ellipse(0, -12 * scale, 24 * scale, 12 * scale, 0, 0, Math.PI * 2);
      CTX.fill();
    } else {
      // Running / jumping character
      const bob = Math.sin(player.animTick) * 4 * scale;

      // Shadow
      CTX.fillStyle = 'rgba(0,0,0,0.35)';
      CTX.beginPath();
      CTX.ellipse(0, 0, 16 * scale, 6 * scale, 0, 0, Math.PI * 2);
      CTX.fill();

      // Body / Hoodie
      CTX.fillStyle = '#ec4899';
      CTX.fillRect(-12 * scale, (-42 + bob) * scale, 24 * scale, 28 * scale);

      // Head
      CTX.fillStyle = '#fed7aa';
      CTX.beginPath();
      CTX.arc(0, (-52 + bob) * scale, 11 * scale, 0, Math.PI * 2);
      CTX.fill();

      // Cap
      CTX.fillStyle = '#06b6d4';
      CTX.fillRect(-12 * scale, (-64 + bob) * scale, 24 * scale, 8 * scale);
      CTX.fillRect(-4 * scale, (-60 + bob) * scale, 20 * scale, 4 * scale); // visor

      // Legs
      CTX.fillStyle = '#1e293b';
      const legSwing = Math.sin(player.animTick) * 10 * scale;
      CTX.fillRect(-10 * scale, (-14 + bob) * scale, 7 * scale, (14 + legSwing) * scale);
      CTX.fillRect(3 * scale, (-14 + bob) * scale, 7 * scale, (14 - legSwing) * scale);
    }

    CTX.restore();
  }

  // Animation Loop
  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // Keyboard
  window.addEventListener('keydown', e => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
      e.preventDefault();
    }

    if (!isRunning && (e.code === 'Space' || e.code === 'Enter')) {
      startGame();
      return;
    }

    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        changeLane(-1);
        break;
      case 'ArrowRight':
      case 'KeyD':
        changeLane(1);
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        jump();
        break;
      case 'ArrowDown':
      case 'KeyS':
        slide();
        break;
    }
  });

  // Touch controls
  let tStartX = 0;
  let tStartY = 0;
  CANVAS.addEventListener('touchstart', e => {
    tStartX = e.touches[0].clientX;
    tStartY = e.touches[0].clientY;
  }, { passive: true });

  CANVAS.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tStartX;
    const dy = e.changedTouches[0].clientY - tStartY;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) changeLane(dx > 0 ? 1 : -1);
    } else {
      if (dy < -30) jump();
      else if (dy > 30) slide();
    }
  }, { passive: true });

  document.getElementById('ctrl-left').addEventListener('click', () => changeLane(-1));
  document.getElementById('ctrl-right').addEventListener('click', () => changeLane(1));
  document.getElementById('ctrl-up').addEventListener('click', jump);
  document.getElementById('ctrl-down').addEventListener('click', slide);

  btnStart.addEventListener('click', startGame);

  updateHUD();
  requestAnimationFrame(loop);
})();
