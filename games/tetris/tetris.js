/**
 * Tetris Deluxe Game Engine
 */
(function() {
  const COLS = 10;
  const ROWS = 20;
  const BLOCK_SIZE = 30;

  const CANVAS = document.getElementById('tetris-canvas');
  const CTX = CANVAS.getContext('2d');
  const NEXT_CANVAS = document.getElementById('next-canvas');
  const NEXT_CTX = NEXT_CANVAS.getContext('2d');
  const HOLD_CANVAS = document.getElementById('hold-canvas');
  const HOLD_CTX = HOLD_CANVAS.getContext('2d');

  const SHAPES = {
    I: [
      [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
      [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
    ],
    O: [
      [[1,1],[1,1]]
    ],
    T: [
      [[0,1,0],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,1],[0,1,0]],
      [[0,1,0],[1,1,0],[0,1,0]]
    ],
    S: [
      [[0,1,1],[1,1,0],[0,0,0]],
      [[0,1,0],[0,1,1],[0,0,1]],
      [[0,0,0],[0,1,1],[1,1,0]],
      [[1,0,0],[1,1,0],[0,1,0]]
    ],
    Z: [
      [[1,1,0],[0,1,1],[0,0,0]],
      [[0,0,1],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,0],[0,1,1]],
      [[0,1,0],[1,1,0],[1,0,0]]
    ],
    J: [
      [[1,0,0],[1,1,1],[0,0,0]],
      [[0,1,1],[0,1,0],[0,1,0]],
      [[0,0,0],[1,1,1],[0,0,1]],
      [[0,1,0],[0,1,0],[1,1,0]]
    ],
    L: [
      [[0,0,1],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,0],[0,1,1]],
      [[0,0,0],[1,1,1],[1,0,0]],
      [[1,1,0],[0,1,0],[0,1,0]]
    ]
  };

  const COLORS = {
    I: '#06b6d4',
    O: '#eab308',
    T: '#a855f7',
    S: '#22c55e',
    Z: '#ef4444',
    J: '#3b82f6',
    L: '#f97316'
  };

  let grid = createGrid();
  let currentPiece = null;
  let nextPiece = null;
  let holdPiece = null;
  let canHold = true;

  let score = 0;
  let lines = 0;
  let level = 1;
  let highScore = parseInt(localStorage.getItem('tetris_highscore') || '0', 10);

  let dropCounter = 0;
  let dropInterval = 1000;
  let lastTime = 0;
  let isGameOver = false;
  let isPaused = false;
  let isStarted = false;
  let bag = [];

  function createGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  function getNextFromBag() {
    if (bag.length === 0) {
      bag = Object.keys(SHAPES);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    const type = bag.pop();
    return {
      type,
      color: COLORS[type],
      rotation: 0,
      matrix: SHAPES[type][0],
      x: Math.floor(COLS / 2) - Math.ceil(SHAPES[type][0][0].length / 2),
      y: 0
    };
  }

  function collide(piece, customX, customY, customMatrix) {
    const mat = customMatrix || piece.matrix;
    const px = customX !== undefined ? customX : piece.x;
    const py = customY !== undefined ? customY : piece.y;

    for (let r = 0; r < mat.length; r++) {
      for (let c = 0; c < mat[r].length; c++) {
        if (mat[r][c] !== 0) {
          const newX = px + c;
          const newY = py + r;
          if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
          if (newY >= 0 && grid[newY][newX] !== 0) return true;
        }
      }
    }
    return false;
  }

  function rotatePiece(dir = 1) {
    if (!currentPiece) return;
    const rotations = SHAPES[currentPiece.type];
    const nextRot = (currentPiece.rotation + dir + rotations.length) % rotations.length;
    const nextMatrix = rotations[nextRot];

    // Wall kick attempts
    const kicks = [0, 1, -1, 2, -2];
    for (let offset of kicks) {
      if (!collide(currentPiece, currentPiece.x + offset, currentPiece.y, nextMatrix)) {
        currentPiece.x += offset;
        currentPiece.rotation = nextRot;
        currentPiece.matrix = nextMatrix;
        if (window.arcadeAudio) window.arcadeAudio.playRotate();
        return;
      }
    }
  }

  function holdCurrentPiece() {
    if (!canHold || !currentPiece || isGameOver || isPaused) return;

    if (window.arcadeAudio) window.arcadeAudio.playClick();
    const currentType = currentPiece.type;

    if (!holdPiece) {
      holdPiece = currentType;
      spawnPiece();
    } else {
      const temp = holdPiece;
      holdPiece = currentType;
      currentPiece = {
        type: temp,
        color: COLORS[temp],
        rotation: 0,
        matrix: SHAPES[temp][0],
        x: Math.floor(COLS / 2) - Math.ceil(SHAPES[temp][0][0].length / 2),
        y: 0
      };
    }
    canHold = false;
    drawMiniPiece(HOLD_CTX, holdPiece, HOLD_CANVAS);
  }

  function spawnPiece() {
    if (!nextPiece) nextPiece = getNextFromBag();
    currentPiece = nextPiece;
    nextPiece = getNextFromBag();
    canHold = true;

    drawMiniPiece(NEXT_CTX, nextPiece.type, NEXT_CANVAS);

    if (collide(currentPiece)) {
      gameOver();
    }
  }

  function mergePiece() {
    const mat = currentPiece.matrix;
    for (let r = 0; r < mat.length; r++) {
      for (let c = 0; c < mat[r].length; c++) {
        if (mat[r][c] !== 0) {
          const y = currentPiece.y + r;
          const x = currentPiece.x + c;
          if (y >= 0) {
            grid[y][x] = currentPiece.color;
          }
        }
      }
    }

    if (window.arcadeAudio) window.arcadeAudio.playDrop();
    clearLines();
    spawnPiece();
  }

  function clearLines() {
    let linesCleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r].every(cell => cell !== 0)) {
        grid.splice(r, 1);
        grid.unshift(Array(COLS).fill(0));
        linesCleared++;
        r++; // check same row again
      }
    }

    if (linesCleared > 0) {
      lines += linesCleared;
      const pts = [0, 100, 300, 500, 800][linesCleared] * level;
      score += pts;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 80);

      if (score > highScore) {
        highScore = score;
        localStorage.setItem('tetris_highscore', highScore.toString());
      }

      if (window.arcadeAudio) {
        if (linesCleared >= 4) window.arcadeAudio.playJackpot();
        else window.arcadeAudio.playClear();
      }

      updateStatsUI();
    }
  }

  function dropPiece() {
    if (!currentPiece || isGameOver || isPaused) return;
    if (!collide(currentPiece, currentPiece.x, currentPiece.y + 1)) {
      currentPiece.y++;
    } else {
      mergePiece();
    }
    dropCounter = 0;
  }

  function hardDrop() {
    if (!currentPiece || isGameOver || isPaused) return;
    while (!collide(currentPiece, currentPiece.x, currentPiece.y + 1)) {
      currentPiece.y++;
      score += 2;
    }
    mergePiece();
    updateStatsUI();
  }

  function getGhostY() {
    if (!currentPiece) return 0;
    let gy = currentPiece.y;
    while (!collide(currentPiece, currentPiece.x, gy + 1)) {
      gy++;
    }
    return gy;
  }

  function drawBlock(ctx, x, y, color, isGhost = false) {
    const px = x * BLOCK_SIZE;
    const py = y * BLOCK_SIZE;

    if (isGhost) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 2, py + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
      return;
    }

    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);

    // subtle top-left bevel highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, 4);
    ctx.fillRect(px + 1, py + 1, 4, BLOCK_SIZE - 2);

    // bottom-right bevel shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(px + 1, py + BLOCK_SIZE - 4, BLOCK_SIZE - 2, 3);
    ctx.fillRect(px + BLOCK_SIZE - 4, py + 1, 3, BLOCK_SIZE - 2);
  }

  function drawGridLines() {
    CTX.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    CTX.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      CTX.beginPath();
      CTX.moveTo(c * BLOCK_SIZE, 0);
      CTX.lineTo(c * BLOCK_SIZE, ROWS * BLOCK_SIZE);
      CTX.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      CTX.beginPath();
      CTX.moveTo(0, r * BLOCK_SIZE);
      CTX.lineTo(COLS * BLOCK_SIZE, r * BLOCK_SIZE);
      CTX.stroke();
    }
  }

  function draw() {
    CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);
    drawGridLines();

    // Draw fixed grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] !== 0) {
          drawBlock(CTX, c, r, grid[r][c]);
        }
      }
    }

    // Draw Ghost
    if (currentPiece && !isGameOver) {
      const ghostY = getGhostY();
      const mat = currentPiece.matrix;
      for (let r = 0; r < mat.length; r++) {
        for (let c = 0; c < mat[r].length; c++) {
          if (mat[r][c] !== 0) {
            drawBlock(CTX, currentPiece.x + c, ghostY + r, currentPiece.color, true);
          }
        }
      }

      // Draw Current Piece
      for (let r = 0; r < mat.length; r++) {
        for (let c = 0; c < mat[r].length; c++) {
          if (mat[r][c] !== 0) {
            drawBlock(CTX, currentPiece.x + c, currentPiece.y + r, currentPiece.color);
          }
        }
      }
    }
  }

  function drawMiniPiece(ctx, type, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!type) return;

    const matrix = SHAPES[type][0];
    const color = COLORS[type];
    const miniSize = 20;
    const offX = (canvas.width - matrix[0].length * miniSize) / 2;
    const offY = (canvas.height - matrix.length * miniSize) / 2;

    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          ctx.fillStyle = color;
          ctx.fillRect(offX + c * miniSize, offY + r * miniSize, miniSize - 2, miniSize - 2);
        }
      }
    }
  }

  function updateStatsUI() {
    document.getElementById('tetris-score').textContent = score.toLocaleString();
    document.getElementById('tetris-high-score').textContent = highScore.toLocaleString();
    document.getElementById('tetris-lines').textContent = lines;
    document.getElementById('tetris-level').textContent = level;
  }

  function gameOver() {
    isGameOver = true;
    isStarted = false;
    if (window.arcadeAudio) window.arcadeAudio.playGameOver();

    const overlay = document.getElementById('tetris-overlay');
    document.getElementById('overlay-title').textContent = 'GAME OVER';
    document.getElementById('overlay-msg').textContent = `Final Score: ${score.toLocaleString()}`;
    document.getElementById('btn-overlay-action').textContent = 'Play Again';
    overlay.classList.remove('hidden');
  }

  function startGame() {
    grid = createGrid();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    isGameOver = false;
    isPaused = false;
    isStarted = true;
    holdPiece = null;
    bag = [];
    currentPiece = null;
    nextPiece = null;

    drawMiniPiece(HOLD_CTX, null, HOLD_CANVAS);
    spawnPiece();
    updateStatsUI();

    document.getElementById('tetris-overlay').classList.add('hidden');
    if (window.arcadeAudio) window.arcadeAudio.playClick();
  }

  function togglePause() {
    if (!isStarted || isGameOver) return;
    isPaused = !isPaused;
    document.getElementById('btn-pause-tetris').textContent = isPaused ? 'Resume' : 'Pause';
  }

  // Main Loop
  function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;

    if (isStarted && !isPaused && !isGameOver) {
      dropCounter += deltaTime;
      if (dropCounter > dropInterval) {
        dropPiece();
      }
    }

    draw();
    requestAnimationFrame(update);
  }

  // Keyboard controls
  window.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }

    if (!isStarted && (e.code === 'Space' || e.code === 'Enter')) {
      startGame();
      return;
    }

    if (!isStarted || isPaused || isGameOver) return;

    switch (e.code) {
      case 'ArrowLeft':
        if (!collide(currentPiece, currentPiece.x - 1)) {
          currentPiece.x--;
          if (window.arcadeAudio) window.arcadeAudio.playClick();
        }
        break;
      case 'ArrowRight':
        if (!collide(currentPiece, currentPiece.x + 1)) {
          currentPiece.x++;
          if (window.arcadeAudio) window.arcadeAudio.playClick();
        }
        break;
      case 'ArrowDown':
        dropPiece();
        score += 1;
        updateStatsUI();
        break;
      case 'ArrowUp':
      case 'KeyX':
        rotatePiece(1);
        break;
      case 'KeyZ':
        rotatePiece(-1);
        break;
      case 'Space':
        hardDrop();
        break;
      case 'KeyC':
      case 'ShiftLeft':
      case 'ShiftRight':
        holdCurrentPiece();
        break;
      case 'KeyP':
        togglePause();
        break;
    }
  });

  // Buttons
  document.getElementById('btn-start-tetris').addEventListener('click', startGame);
  document.getElementById('btn-overlay-action').addEventListener('click', startGame);
  document.getElementById('btn-pause-tetris').addEventListener('click', togglePause);

  // Mobile buttons
  document.getElementById('m-btn-left').addEventListener('click', () => {
    if (currentPiece && !collide(currentPiece, currentPiece.x - 1)) currentPiece.x--;
  });
  document.getElementById('m-btn-right').addEventListener('click', () => {
    if (currentPiece && !collide(currentPiece, currentPiece.x + 1)) currentPiece.x++;
  });
  document.getElementById('m-btn-down').addEventListener('click', dropPiece);
  document.getElementById('m-btn-rotate').addEventListener('click', () => rotatePiece(1));
  document.getElementById('m-btn-drop').addEventListener('click', hardDrop);
  document.getElementById('m-btn-hold').addEventListener('click', holdCurrentPiece);

  updateStatsUI();
  requestAnimationFrame(update);
})();
