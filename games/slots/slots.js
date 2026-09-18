/**
 * Deluxe 5-Reel Slot Machine Engine
 */
(function() {
  const SYMBOLS = [
    { id: 'WILD', icon: '🌟', weight: 4 },
    { id: 'SCATTER', icon: '⚡', weight: 4 },
    { id: 'DIAMOND', icon: '💎', weight: 8, pay: [0, 0, 25, 100, 500] },
    { id: 'SEVEN', icon: '7️⃣', weight: 10, pay: [0, 0, 20, 60, 300] },
    { id: 'CROWN', icon: '👑', weight: 12, pay: [0, 0, 15, 40, 200] },
    { id: 'BELL', icon: '🔔', weight: 14, pay: [0, 0, 10, 30, 150] },
    { id: 'CHERRY', icon: '🍒', weight: 16, pay: [0, 0, 8, 20, 100] },
    { id: 'LEMON', icon: '🍋', weight: 18, pay: [0, 0, 5, 15, 60] },
    { id: 'GRAPE', icon: '🍇', weight: 20, pay: [0, 0, 4, 10, 40] }
  ];

  // 10 Paylines (rows 0, 1, 2 across reels 0 to 4)
  const PAYLINES = [
    [1, 1, 1, 1, 1], // Mid row
    [0, 0, 0, 0, 0], // Top row
    [2, 2, 2, 2, 2], // Bot row
    [0, 1, 2, 1, 0], // V-shape
    [2, 1, 0, 1, 2], // Inverted V
    [0, 0, 1, 2, 2],
    [2, 2, 1, 0, 0],
    [1, 2, 2, 2, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 0, 1, 0]
  ];

  const BET_STEPS = [10, 20, 50, 100, 250, 500];
  let betIndex = 0;

  let chips = parseInt(localStorage.getItem('slots_chips') || '1000', 10);
  let isSpinning = false;
  let autoSpin = false;
  let freeSpins = 0;
  let lastWin = 0;

  // Grid state: 5 reels x 3 rows
  let currentGrid = [
    [getRandSymbol(), getRandSymbol(), getRandSymbol()],
    [getRandSymbol(), getRandSymbol(), getRandSymbol()],
    [getRandSymbol(), getRandSymbol(), getRandSymbol()],
    [getRandSymbol(), getRandSymbol(), getRandSymbol()],
    [getRandSymbol(), getRandSymbol(), getRandSymbol()]
  ];

  // DOM
  const reelStrips = [0, 1, 2, 3, 4].map(i => document.getElementById(`strip-${i}`));
  const totalBetEl = document.getElementById('total-bet-val');
  const lastWinEl = document.getElementById('last-win-val');
  const deckChipsEl = document.getElementById('deck-chips-val');
  const betDisplayEl = document.getElementById('bet-step-display');
  const btnSpin = document.getElementById('btn-spin');
  const btnAuto = document.getElementById('btn-auto-spin');
  const winBanner = document.getElementById('win-banner');
  const winBannerTitle = document.getElementById('win-banner-title');
  const winBannerVal = document.getElementById('win-banner-val');
  const fsBadge = document.getElementById('free-spins-badge');
  const fsCountEl = document.getElementById('fs-count');

  function saveChips() {
    localStorage.setItem('slots_chips', chips.toString());
    if (window.updateNavChipsDisplay) {
      window.updateNavChipsDisplay(chips);
    }
    deckChipsEl.textContent = `🪙 ${chips.toLocaleString()}`;
  }

  window.onChipsRefilled = function(newAmt) {
    chips = newAmt;
    saveChips();
  };

  function getRandSymbol() {
    const totalWeight = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
    let rand = Math.random() * totalWeight;
    for (let s of SYMBOLS) {
      if (rand < s.weight) return s;
      rand -= s.weight;
    }
    return SYMBOLS[SYMBOLS.length - 1];
  }

  function renderGrid() {
    for (let col = 0; col < 5; col++) {
      const strip = reelStrips[col];
      strip.innerHTML = '';
      for (let row = 0; row < 3; row++) {
        const cell = document.createElement('div');
        cell.className = 'slot-symbol-cell';
        cell.id = `cell-${col}-${row}`;
        cell.textContent = currentGrid[col][row].icon;
        strip.appendChild(cell);
      }
    }
  }

  function spin() {
    const currentBet = BET_STEPS[betIndex];

    if (freeSpins === 0) {
      if (chips < currentBet) {
        if (window.showArcadeToast) {
          window.showArcadeToast('Not enough chips! Hit "+ Refill" at top.', '⚠️');
        }
        autoSpin = false;
        btnAuto.textContent = 'Auto: OFF';
        return;
      }
      chips -= currentBet;
      saveChips();
    } else {
      freeSpins--;
      updateFreeSpinsUI();
    }

    isSpinning = true;
    btnSpin.disabled = true;
    winBanner.style.display = 'none';

    // Clear highlights
    document.querySelectorAll('.slot-symbol-cell').forEach(c => c.classList.remove('winning'));

    if (window.arcadeAudio) window.arcadeAudio.playSpin();

    // Generate outcome
    const nextGrid = [
      [getRandSymbol(), getRandSymbol(), getRandSymbol()],
      [getRandSymbol(), getRandSymbol(), getRandSymbol()],
      [getRandSymbol(), getRandSymbol(), getRandSymbol()],
      [getRandSymbol(), getRandSymbol(), getRandSymbol()],
      [getRandSymbol(), getRandSymbol(), getRandSymbol()]
    ];

    // Animate reels spinning
    reelStrips.forEach((strip, colIdx) => {
      // Create a rapid blur roll
      let rollTicks = 0;
      const maxTicks = 12 + colIdx * 5;
      const rollInterval = setInterval(() => {
        rollTicks++;
        const randIcons = [getRandSymbol().icon, getRandSymbol().icon, getRandSymbol().icon];
        for (let row = 0; row < 3; row++) {
          const cell = strip.children[row];
          if (cell) cell.textContent = randIcons[row];
        }

        if (rollTicks >= maxTicks) {
          clearInterval(rollInterval);
          // Set final outcome for this column
          for (let row = 0; row < 3; row++) {
            currentGrid[colIdx][row] = nextGrid[colIdx][row];
            if (strip.children[row]) {
              strip.children[row].textContent = nextGrid[colIdx][row].icon;
            }
          }
          if (window.arcadeAudio) window.arcadeAudio.playDrop();

          // If last reel stopped
          if (colIdx === 4) {
            setTimeout(evaluateWin, 250);
          }
        }
      }, 50);
    });
  }

  function evaluateWin() {
    isSpinning = false;
    btnSpin.disabled = false;

    const currentBet = BET_STEPS[betIndex];
    const lineBet = Math.max(1, Math.floor(currentBet / 10));
    let totalWin = 0;
    const winningCells = new Set();

    // Check Paylines
    PAYLINES.forEach(line => {
      // line is [r0, r1, r2, r3, r4]
      const symbolsOnLine = [
        currentGrid[0][line[0]],
        currentGrid[1][line[1]],
        currentGrid[2][line[2]],
        currentGrid[3][line[3]],
        currentGrid[4][line[4]]
      ];

      // Match left to right with WILD substitution
      let firstNormal = symbolsOnLine.find(s => s.id !== 'WILD' && s.id !== 'SCATTER');
      if (!firstNormal) firstNormal = symbolsOnLine[0];

      let matchCount = 0;
      for (let i = 0; i < 5; i++) {
        const s = symbolsOnLine[i];
        if (s.id === firstNormal.id || s.id === 'WILD') {
          matchCount++;
        } else {
          break;
        }
      }

      if (matchCount >= 3 && firstNormal.pay) {
        const payoutMult = firstNormal.pay[matchCount - 1] || 0;
        let lineWin = lineBet * payoutMult;
        if (freeSpins > 0 || freeSpinsAwardedThisRound) {
          lineWin *= 3; // 3x multiplier in Free Spins
        }
        totalWin += lineWin;

        for (let i = 0; i < matchCount; i++) {
          winningCells.add(`cell-${i}-${line[i]}`);
        }
      }
    });

    // Check Scatters anywhere
    let scatterCount = 0;
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 3; r++) {
        if (currentGrid[c][r].id === 'SCATTER') {
          scatterCount++;
          winningCells.add(`cell-${c}-${r}`);
        }
      }
    }

    var freeSpinsAwardedThisRound = false;
    if (scatterCount >= 3) {
      freeSpins += 10;
      freeSpinsAwardedThisRound = true;
      updateFreeSpinsUI();
      if (window.arcadeAudio) window.arcadeAudio.playJackpot();
      if (window.showArcadeToast) {
        window.showArcadeToast('⚡ 10 FREE SPINS TRIGGERED (3X MULTIPLIER)!', '🎉');
      }
    }

    // Highlight winning cells
    winningCells.forEach(cellId => {
      const el = document.getElementById(cellId);
      if (el) el.classList.add('winning');
    });

    lastWin = totalWin;
    lastWinEl.textContent = `🪙 ${totalWin.toLocaleString()}`;

    if (totalWin > 0) {
      chips += totalWin;
      saveChips();

      if (totalWin >= currentBet * 10) {
        // Big Win Banner
        winBannerTitle.textContent = totalWin >= currentBet * 25 ? 'MEGA WIN!' : 'BIG WIN!';
        winBannerVal.textContent = totalWin.toLocaleString();
        winBanner.style.display = 'flex';
        if (window.arcadeAudio) window.arcadeAudio.playJackpot();
        setTimeout(() => {
          winBanner.style.display = 'none';
        }, 2200);
      } else {
        if (window.arcadeAudio) window.arcadeAudio.playWin();
      }
    }

    // Auto-spin logic
    if (autoSpin || freeSpins > 0) {
      setTimeout(() => {
        if (!isSpinning && (autoSpin || freeSpins > 0)) {
          spin();
        }
      }, 1000);
    }
  }

  function updateFreeSpinsUI() {
    if (freeSpins > 0) {
      fsBadge.style.display = 'block';
      fsCountEl.textContent = freeSpins;
    } else {
      fsBadge.style.display = 'none';
    }
  }

  function updateBetDisplay() {
    const val = BET_STEPS[betIndex];
    betDisplayEl.textContent = `$${val}`;
    totalBetEl.textContent = `🪙 ${val.toLocaleString()}`;
  }

  // Bind Buttons
  document.getElementById('btn-bet-up').addEventListener('click', () => {
    if (betIndex < BET_STEPS.length - 1) {
      betIndex++;
      updateBetDisplay();
      if (window.arcadeAudio) window.arcadeAudio.playClick();
    }
  });

  document.getElementById('btn-bet-down').addEventListener('click', () => {
    if (betIndex > 0) {
      betIndex--;
      updateBetDisplay();
      if (window.arcadeAudio) window.arcadeAudio.playClick();
    }
  });

  document.getElementById('btn-max-bet').addEventListener('click', () => {
    betIndex = BET_STEPS.length - 1;
    updateBetDisplay();
    if (window.arcadeAudio) window.arcadeAudio.playChip();
  });

  btnSpin.addEventListener('click', spin);

  btnAuto.addEventListener('click', () => {
    autoSpin = !autoSpin;
    btnAuto.textContent = autoSpin ? 'Auto: ON' : 'Auto: OFF';
    btnAuto.classList.toggle('btn-primary', autoSpin);
    btnAuto.classList.toggle('btn-secondary', !autoSpin);
    if (autoSpin && !isSpinning) spin();
  });

  // Spacebar to spin
  window.addEventListener('keydown', e => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!isSpinning) spin();
    }
  });

  renderGrid();
  updateBetDisplay();
  saveChips();
})();
