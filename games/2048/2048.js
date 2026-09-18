/**
 * 2048 Deluxe Game Engine
 */
(function() {
  const SIZE = 4;
  let grid = [];
  let score = 0;
  let bestScore = parseInt(localStorage.getItem('2048_highscore') || '0', 10);
  let previousState = null;
  let hasWon = false;
  let isGameOver = false;

  const boardEl = document.getElementById('board-2048');
  const scoreEl = document.getElementById('puz-score');
  const bestEl = document.getElementById('puz-best');
  const overlay = document.getElementById('puz-overlay');
  const overlayTitle = document.getElementById('puz-overlay-title');
  const overlayMsg = document.getElementById('puz-overlay-msg');
  const btnRestart = document.getElementById('btn-restart-2048');
  const btnUndo = document.getElementById('btn-undo-2048');
  const btnAction = document.getElementById('btn-puz-action');

  function initGame() {
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    score = 0;
    hasWon = false;
    isGameOver = false;
    previousState = null;
    btnUndo.disabled = true;

    spawnTile();
    spawnTile();

    overlay.style.display = 'none';
    renderBoard();
    updateUI();
  }

  function spawnTile() {
    const emptyCells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) emptyCells.push({ r, c });
      }
    }

    if (emptyCells.length > 0) {
      const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  function saveSnapshot() {
    previousState = {
      grid: grid.map(row => [...row]),
      score
    };
    btnUndo.disabled = false;
  }

  function undo() {
    if (!previousState || isGameOver) return;
    grid = previousState.grid.map(row => [...row]);
    score = previousState.score;
    previousState = null;
    btnUndo.disabled = true;

    if (window.arcadeAudio) window.arcadeAudio.playClick();
    renderBoard();
    updateUI();
  }

  function slide(direction) {
    if (isGameOver) return;

    saveSnapshot();
    let moved = false;

    // Helper: slide single line
    function processLine(line) {
      let nonZero = line.filter(val => val !== 0);
      let merged = [];
      let i = 0;
      while (i < nonZero.length) {
        if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
          const newVal = nonZero[i] * 2;
          merged.push(newVal);
          score += newVal;
          if (newVal === 2048 && !hasWon) {
            hasWon = true;
            triggerWin();
          }
          i += 2;
        } else {
          merged.push(nonZero[i]);
          i += 1;
        }
      }
      while (merged.length < SIZE) {
        merged.push(0);
      }
      return merged;
    }

    const oldGridStr = JSON.stringify(grid);

    if (direction === 'LEFT') {
      for (let r = 0; r < SIZE; r++) {
        grid[r] = processLine(grid[r]);
      }
    } else if (direction === 'RIGHT') {
      for (let r = 0; r < SIZE; r++) {
        grid[r] = processLine([...grid[r]].reverse()).reverse();
      }
    } else if (direction === 'UP') {
      for (let c = 0; c < SIZE; c++) {
        let col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
        col = processLine(col);
        for (let r = 0; r < SIZE; r++) grid[r][c] = col[r];
      }
    } else if (direction === 'DOWN') {
      for (let c = 0; c < SIZE; c++) {
        let col = [grid[3][c], grid[2][c], grid[1][c], grid[0][c]];
        col = processLine(col);
        for (let r = 0; r < SIZE; r++) grid[3 - r][c] = col[r];
      }
    }

    if (JSON.stringify(grid) !== oldGridStr) {
      moved = true;
      spawnTile();
      if (window.arcadeAudio) window.arcadeAudio.playClick();
      renderBoard();
      updateUI();
      checkGameOver();
    }
  }

  function checkGameOver() {
    // Check if any empty cell exists
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) return;
        if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return;
        if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return;
      }
    }

    // No moves left
    isGameOver = true;
    if (window.arcadeAudio) window.arcadeAudio.playGameOver();
    overlayTitle.textContent = 'GAME OVER';
    overlayMsg.textContent = `Final Score: ${score.toLocaleString()}`;
    btnAction.textContent = 'Try Again';
    overlay.style.display = 'flex';
  }

  function triggerWin() {
    if (window.arcadeAudio) window.arcadeAudio.playJackpot();
    overlayTitle.textContent = 'YOU WIN!';
    overlayMsg.textContent = 'You made the legendary 2048 tile!';
    btnAction.textContent = 'Keep Playing';
    btnAction.onclick = () => {
      overlay.style.display = 'none';
      btnAction.onclick = initGame;
    };
    overlay.style.display = 'flex';
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const val = grid[r][c];
        const cell = document.createElement('div');
        cell.className = `grid-cell ${val > 0 ? 'tile-' + val : ''}`;
        cell.textContent = val > 0 ? val : '';
        boardEl.appendChild(cell);
      }
    }
  }

  function updateUI() {
    scoreEl.textContent = score.toLocaleString();
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('2048_highscore', bestScore.toString());
    }
    bestEl.textContent = bestScore.toLocaleString();
  }

  // Keyboard controls
  window.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }

    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        slide('LEFT');
        break;
      case 'ArrowRight':
      case 'KeyD':
        slide('RIGHT');
        break;
      case 'ArrowUp':
      case 'KeyW':
        slide('UP');
        break;
      case 'ArrowDown':
      case 'KeyS':
        slide('DOWN');
        break;
    }
  });

  // Touch Swipe
  let startX = 0;
  let startY = 0;
  boardEl.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  boardEl.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) slide(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      if (Math.abs(dy) > 30) slide(dy > 0 ? 'DOWN' : 'UP');
    }
  }, { passive: true });

  btnRestart.addEventListener('click', initGame);
  btnUndo.addEventListener('click', undo);
  btnAction.onclick = initGame;

  initGame();
})();
