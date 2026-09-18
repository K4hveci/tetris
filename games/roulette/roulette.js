/**
 * European Roulette Engine
 */
(function() {
  const CANVAS = document.getElementById('roulette-wheel-canvas');
  const CTX = CANVAS.getContext('2d');

  // Standard European wheel pocket sequence (37 slots)
  const WHEEL_NUMBERS = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];

  const RED_NUMS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

  let chips = parseInt(localStorage.getItem('roulette_chips') || '1000', 10);
  let selectedChip = 5;
  let activeBets = {}; // betKey -> amount
  let totalWager = 0;
  let isSpinning = false;
  let history = [];

  // Wheel animation variables
  let wheelAngle = 0;
  let ballAngle = 0;
  let ballRadius = 140;

  // DOM
  const winningNumBadge = document.getElementById('winning-num-badge');
  const historyList = document.getElementById('history-list');
  const outcomeMsg = document.getElementById('round-outcome-msg');
  const totalWagerEl = document.getElementById('total-wager-val');
  const numbersGrid = document.getElementById('numbers-grid');
  const btnSpin = document.getElementById('btn-spin-wheel');
  const btnClear = document.getElementById('btn-clear-bets');
  const btnDouble = document.getElementById('btn-double-bets');

  function saveChips() {
    localStorage.setItem('roulette_chips', chips.toString());
    if (window.updateNavChipsDisplay) {
      window.updateNavChipsDisplay(chips);
    }
  }

  window.onChipsRefilled = function(newAmt) {
    chips = newAmt;
    saveChips();
  };

  function getNumberColor(num) {
    if (num === 0) return 'green';
    return RED_NUMS.has(num) ? 'red' : 'black';
  }

  function renderBettingBoard() {
    // 3 rows:
    // row 0: 3, 6, 9, 12 ... 36
    // row 1: 2, 5, 8, 11 ... 35
    // row 2: 1, 4, 7, 10 ... 34
    numbersGrid.innerHTML = '';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 12; c++) {
        const num = (12 - c - 1) * 3 + (3 - r); // correctly orders 1..36
        // Actually European standard layout: col 0 has 3, 2, 1; col 1 has 6, 5, 4...
        const actualNum = (c * 3) + (3 - r);
        const cell = document.createElement('div');
        const color = getNumberColor(actualNum);
        cell.className = `bet-cell cell-num ${color}`;
        cell.setAttribute('data-bet', `num-${actualNum}`);
        cell.textContent = actualNum;
        numbersGrid.appendChild(cell);
      }
    }

    // Attach click listener to all cells
    document.querySelectorAll('.bet-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        if (isSpinning) return;
        const betKey = cell.getAttribute('data-bet');
        placeBet(betKey, selectedChip, cell);
      });
    });
  }

  function placeBet(betKey, amount, cellEl) {
    if (chips < amount) {
      if (window.showArcadeToast) window.showArcadeToast('Not enough chips! Click "+ Refill"', '⚠️');
      return;
    }

    chips -= amount;
    saveChips();

    activeBets[betKey] = (activeBets[betKey] || 0) + amount;
    totalWager += amount;
    totalWagerEl.textContent = totalWager.toLocaleString();

    if (window.arcadeAudio) window.arcadeAudio.playChip();
    renderChipMarkers();
  }

  function renderChipMarkers() {
    // Clear old markers
    document.querySelectorAll('.chip-marker').forEach(m => m.remove());

    for (let betKey in activeBets) {
      const amt = activeBets[betKey];
      if (amt <= 0) continue;

      const cell = document.querySelector(`[data-bet="${betKey}"]`);
      if (cell) {
        const marker = document.createElement('div');
        marker.className = 'chip-marker';
        marker.textContent = amt >= 1000 ? `${Math.floor(amt / 1000)}k` : amt;
        cell.appendChild(marker);
      }
    }
  }

  function clearBets() {
    if (isSpinning) return;
    chips += totalWager;
    saveChips();
    activeBets = {};
    totalWager = 0;
    totalWagerEl.textContent = '0';
    renderChipMarkers();
    if (window.arcadeAudio) window.arcadeAudio.playChip();
  }

  function doubleBets() {
    if (isSpinning || totalWager === 0) return;
    if (chips < totalWager) {
      if (window.showArcadeToast) window.showArcadeToast('Not enough chips to double!', '⚠️');
      return;
    }

    chips -= totalWager;
    saveChips();

    for (let k in activeBets) {
      activeBets[k] *= 2;
    }
    totalWager *= 2;
    totalWagerEl.textContent = totalWager.toLocaleString();
    renderChipMarkers();
    if (window.arcadeAudio) window.arcadeAudio.playChip();
  }

  function spinWheel() {
    if (isSpinning) return;
    if (totalWager === 0) {
      outcomeMsg.textContent = 'Please place a bet first!';
      return;
    }

    isSpinning = true;
    btnSpin.disabled = true;
    outcomeMsg.textContent = 'Spinning... Good luck!';
    winningNumBadge.textContent = '...';

    // Pick random winning pocket
    const winningIndex = Math.floor(Math.random() * WHEEL_NUMBERS.length);
    const winningNumber = WHEEL_NUMBERS[winningIndex];

    const sliceAngle = (Math.PI * 2) / WHEEL_NUMBERS.length;
    // Calculate target wheel rotation so pocket aligns with ball
    const spinDuration = 3800; // ms
    const startTime = performance.now();

    const startWheelAngle = wheelAngle;
    const extraSpins = 5 + Math.random() * 2;
    const targetWheelAngle = startWheelAngle + extraSpins * Math.PI * 2;

    const startBallAngle = ballAngle;
    const targetBallAngle = startBallAngle - (extraSpins + 3) * Math.PI * 2 - (winningIndex * sliceAngle);

    let lastTickTime = 0;

    function animate(time) {
      const elapsed = time - startTime;
      const progress = Math.min(1, elapsed / spinDuration);
      const ease = 1 - Math.pow(1 - progress, 3); // ease out cubic

      wheelAngle = startWheelAngle + (targetWheelAngle - startWheelAngle) * ease;
      ballAngle = startBallAngle + (targetBallAngle - startBallAngle) * ease;
      ballRadius = 142 - ease * 24; // drops down into track

      // Ticking sound
      if (time - lastTickTime > 120 * (1 + ease * 2)) {
        lastTickTime = time;
        if (window.arcadeAudio) window.arcadeAudio.playSpin();
      }

      drawWheel();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        finishSpin(winningNumber);
      }
    }

    requestAnimationFrame(animate);
  }

  function finishSpin(winningNumber) {
    isSpinning = false;
    btnSpin.disabled = false;

    const color = getNumberColor(winningNumber);
    winningNumBadge.textContent = winningNumber;
    winningNumBadge.style.color = color === 'green' ? '#22c55e' : (color === 'red' ? '#ef4444' : '#ffffff');

    // Add to history
    history.unshift({ num: winningNumber, color });
    if (history.length > 10) history.pop();
    renderHistory();

    // Evaluate payouts
    let totalPayout = 0;

    for (let betKey in activeBets) {
      const betAmt = activeBets[betKey];
      if (betAmt <= 0) continue;

      // Single Number
      if (betKey === `num-${winningNumber}`) {
        totalPayout += betAmt * 36; // 35:1 + original
      }
      // Red / Black
      else if (betKey === 'red' && color === 'red') {
        totalPayout += betAmt * 2;
      } else if (betKey === 'black' && color === 'black') {
        totalPayout += betAmt * 2;
      }
      // Even / Odd
      else if (betKey === 'even' && winningNumber !== 0 && winningNumber % 2 === 0) {
        totalPayout += betAmt * 2;
      } else if (betKey === 'odd' && winningNumber % 2 === 1) {
        totalPayout += betAmt * 2;
      }
      // Low (1-18) / High (19-36)
      else if (betKey === 'low' && winningNumber >= 1 && winningNumber <= 18) {
        totalPayout += betAmt * 2;
      } else if (betKey === 'high' && winningNumber >= 19 && winningNumber <= 36) {
        totalPayout += betAmt * 2;
      }
      // Dozens
      else if (betKey === 'doz-1' && winningNumber >= 1 && winningNumber <= 12) {
        totalPayout += betAmt * 3;
      } else if (betKey === 'doz-2' && winningNumber >= 13 && winningNumber <= 24) {
        totalPayout += betAmt * 3;
      } else if (betKey === 'doz-3' && winningNumber >= 25 && winningNumber <= 36) {
        totalPayout += betAmt * 3;
      }
      // Columns
      else if (betKey === 'col-1' && winningNumber > 0 && winningNumber % 3 === 1) {
        totalPayout += betAmt * 3;
      } else if (betKey === 'col-2' && winningNumber > 0 && winningNumber % 3 === 2) {
        totalPayout += betAmt * 3;
      } else if (betKey === 'col-3' && winningNumber > 0 && winningNumber % 3 === 0) {
        totalPayout += betAmt * 3;
      }
    }

    if (totalPayout > 0) {
      chips += totalPayout;
      saveChips();
      outcomeMsg.textContent = `Won $${totalPayout.toLocaleString()}! (${winningNumber} ${color.toUpperCase()})`;
      if (window.arcadeAudio) window.arcadeAudio.playWin();
    } else {
      outcomeMsg.textContent = `${winningNumber} ${color.toUpperCase()} - No win this round`;
      if (window.arcadeAudio) window.arcadeAudio.playHit();
    }

    activeBets = {};
    totalWager = 0;
    totalWagerEl.textContent = '0';
    renderChipMarkers();
  }

  function renderHistory() {
    historyList.innerHTML = '';
    history.forEach(item => {
      const pill = document.createElement('div');
      pill.className = `history-pill ${item.color}`;
      pill.textContent = item.num;
      historyList.appendChild(pill);
    });
  }

  function drawWheel() {
    const cx = CANVAS.width / 2;
    const cy = CANVAS.height / 2;
    const outerRadius = 158;
    const sliceAngle = (Math.PI * 2) / WHEEL_NUMBERS.length;

    CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);

    CTX.save();
    CTX.translate(cx, cy);
    CTX.rotate(wheelAngle);

    // Draw Slices
    WHEEL_NUMBERS.forEach((num, idx) => {
      const angle = idx * sliceAngle;
      const color = getNumberColor(num);

      CTX.beginPath();
      CTX.moveTo(0, 0);
      CTX.arc(0, 0, outerRadius, angle, angle + sliceAngle);
      CTX.closePath();

      CTX.fillStyle = color === 'green' ? '#16a34a' : (color === 'red' ? '#b91c1c' : '#18181b');
      CTX.fill();
      CTX.strokeStyle = '#d97706';
      CTX.lineWidth = 1;
      CTX.stroke();

      // Number text
      CTX.save();
      CTX.rotate(angle + sliceAngle / 2);
      CTX.fillStyle = '#ffffff';
      CTX.font = 'bold 11px Outfit, sans-serif';
      CTX.textAlign = 'right';
      CTX.fillText(num.toString(), outerRadius - 12, 4);
      CTX.restore();
    });

    CTX.restore();

    // Draw Ball
    const bx = cx + Math.cos(ballAngle) * ballRadius;
    const by = cy + Math.sin(ballAngle) * ballRadius;

    CTX.fillStyle = '#ffffff';
    CTX.shadowColor = '#ffffff';
    CTX.shadowBlur = 8;
    CTX.beginPath();
    CTX.arc(bx, by, 6.5, 0, Math.PI * 2);
    CTX.fill();
    CTX.shadowBlur = 0;
  }

  // Chip selection
  document.querySelectorAll('.casino-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.casino-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedChip = parseInt(btn.getAttribute('data-val'), 10);
      if (window.arcadeAudio) window.arcadeAudio.playChip();
    });
  });

  btnSpin.addEventListener('click', spinWheel);
  btnClear.addEventListener('click', clearBets);
  btnDouble.addEventListener('click', doubleBets);

  renderBettingBoard();
  drawWheel();
  saveChips();
})();
