/**
 * Retro Minesweeper Engine
 */
(function() {
  const PRESETS = {
    easy: { cols: 9, rows: 9, mines: 10 },
    medium: { cols: 16, rows: 16, mines: 40 },
    hard: { cols: 30, rows: 16, mines: 99 }
  };

  let currentDiff = 'easy';
  let config = PRESETS.easy;
  let board = [];
  let minesPlaced = false;
  let isGameOver = false;
  let isWon = false;
  let flagsCount = 0;
  let timerSecs = 0;
  let timerInterval = null;

  // DOM
  const gridEl = document.getElementById('minefield');
  const lcdMines = document.getElementById('lcd-mines');
  const lcdTimer = document.getElementById('lcd-timer');
  const btnSmiley = document.getElementById('btn-smiley');

  function initGame() {
    config = PRESETS[currentDiff];
    board = [];
    minesPlaced = false;
    isGameOver = false;
    isWon = false;
    flagsCount = 0;
    timerSecs = 0;

    clearInterval(timerInterval);
    timerInterval = null;

    lcdMines.textContent = String(config.mines).padStart(3, '0');
    lcdTimer.textContent = '000';
    btnSmiley.textContent = '🙂';

    // Create board matrix
    for (let r = 0; r < config.rows; r++) {
      board[r] = [];
      for (let c = 0; c < config.cols; c++) {
        board[r][c] = {
          r, c,
          isMine: false,
          adjacent: 0,
          revealed: false,
          flagged: false
        };
      }
    }

    renderGrid();
  }

  function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
      if (!isGameOver && !isWon) {
        timerSecs = Math.min(999, timerSecs + 1);
        lcdTimer.textContent = String(timerSecs).padStart(3, '0');
      }
    }, 1000);
  }

  function placeMines(safeR, safeC) {
    let placed = 0;
    while (placed < config.mines) {
      const r = Math.floor(Math.random() * config.rows);
      const c = Math.floor(Math.random() * config.cols);

      // Avoid placing on or around first clicked tile
      const dist = Math.max(Math.abs(r - safeR), Math.abs(c - safeC));
      if (!board[r][c].isMine && dist > 1) {
        board[r][c].isMine = true;
        placed++;
      }
    }

    // Calculate adjacents
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        if (!board[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols) {
                if (board[nr][nc].isMine) count++;
              }
            }
          }
          board[r][c].adjacent = count;
        }
      }
    }

    minesPlaced = true;
  }

  function renderGrid() {
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = `repeat(${config.cols}, 32px)`;

    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        const cell = board[r][c];
        const cellEl = document.createElement('div');
        cellEl.className = 'mine-cell';
        cellEl.id = `cell-${r}-${c}`;

        cellEl.addEventListener('mousedown', (e) => {
          if (e.button === 0 && !cell.revealed && !isGameOver) {
            btnSmiley.textContent = '😮';
          }
        });

        cellEl.addEventListener('mouseup', () => {
          if (!isGameOver && !isWon) btnSmiley.textContent = '🙂';
        });

        cellEl.addEventListener('click', () => handleCellClick(r, c));
        cellEl.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          toggleFlag(r, c);
        });

        gridEl.appendChild(cellEl);
      }
    }
  }

  function handleCellClick(r, c) {
    if (isGameOver || isWon) return;
    const cell = board[r][c];
    if (cell.flagged || cell.revealed) return;

    if (!minesPlaced) {
      placeMines(r, c);
      startTimer();
    }

    revealCell(r, c);
    checkWin();
  }

  function revealCell(r, c) {
    const cell = board[r][c];
    if (cell.revealed || cell.flagged) return;

    cell.revealed = true;
    const cellEl = document.getElementById(`cell-${r}-${c}`);
    cellEl.classList.add('revealed');

    if (cell.isMine) {
      cellEl.classList.add('exploded');
      cellEl.textContent = '💣';
      triggerGameOver();
      return;
    }

    if (window.arcadeAudio) window.arcadeAudio.playClick();

    if (cell.adjacent > 0) {
      cellEl.textContent = cell.adjacent;
      cellEl.classList.add(`num-${cell.adjacent}`);
    } else {
      // Cascade reveal 8 neighbors
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols) {
            if (!board[nr][nc].revealed) {
              revealCell(nr, nc);
            }
          }
        }
      }
    }
  }

  function toggleFlag(r, c) {
    if (isGameOver || isWon) return;
    const cell = board[r][c];
    if (cell.revealed) return;

    cell.flagged = !cell.flagged;
    flagsCount += cell.flagged ? 1 : -1;

    const cellEl = document.getElementById(`cell-${r}-${c}`);
    if (cell.flagged) {
      cellEl.textContent = '🚩';
      cellEl.classList.add('flagged');
    } else {
      cellEl.textContent = '';
      cellEl.classList.remove('flagged');
    }

    const remaining = Math.max(0, config.mines - flagsCount);
    lcdMines.textContent = String(remaining).padStart(3, '0');

    if (window.arcadeAudio) window.arcadeAudio.playClick();
  }

  function triggerGameOver() {
    isGameOver = true;
    btnSmiley.textContent = '😵';
    if (window.arcadeAudio) window.arcadeAudio.playGameOver();

    // Reveal all mines
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        const cell = board[r][c];
        if (cell.isMine && !cell.revealed) {
          const cellEl = document.getElementById(`cell-${r}-${c}`);
          cellEl.classList.add('revealed');
          cellEl.textContent = '💣';
        }
      }
    }
  }

  function checkWin() {
    let unrevealedSafeCount = 0;
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        const cell = board[r][c];
        if (!cell.isMine && !cell.revealed) {
          unrevealedSafeCount++;
        }
      }
    }

    if (unrevealedSafeCount === 0 && !isGameOver) {
      isWon = true;
      btnSmiley.textContent = '😎';
      if (window.arcadeAudio) window.arcadeAudio.playWin();
      if (window.showArcadeToast) {
        window.showArcadeToast(`🎉 Minefield cleared in ${timerSecs}s!`, '🏆');
      }
    }
  }

  // Difficulty selection
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentDiff = btn.getAttribute('data-diff');
      initGame();
    });
  });

  btnSmiley.addEventListener('click', initGame);

  initGame();
})();
