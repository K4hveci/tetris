/**
 * Klondike Solitaire Engine
 */
(function() {
  const SUITS = [
    { name: 'spades', symbol: '♠', color: 'black' },
    { name: 'hearts', symbol: '♥', color: 'red' },
    { name: 'clubs', symbol: '♣', color: 'black' },
    { name: 'diamonds', symbol: '♦', color: 'red' }
  ];

  const RANKS = [
    { value: 1, label: 'A' },
    { value: 2, label: '2' },
    { value: 3, label: '3' },
    { value: 4, label: '4' },
    { value: 5, label: '5' },
    { value: 6, label: '6' },
    { value: 7, label: '7' },
    { value: 8, label: '8' },
    { value: 9, label: '9' },
    { value: 10, label: '10' },
    { value: 11, label: 'J' },
    { value: 12, label: 'Q' },
    { value: 13, label: 'K' }
  ];

  let stock = [];
  let waste = [];
  let foundations = [[], [], [], []];
  let tableau = [[], [], [], [], [], [], []];
  let drawCount = 1;
  let history = [];

  let moves = 0;
  let score = 0;
  let timerSecs = 0;
  let timerInterval = null;
  let isWon = false;

  // DOM
  const slotStock = document.getElementById('slot-stock');
  const slotWaste = document.getElementById('slot-waste');
  const foundEls = [0, 1, 2, 3].map(i => document.getElementById(`found-${i}`));
  const tabEls = [0, 1, 2, 3, 4, 5, 6].map(i => document.getElementById(`tab-${i}`));
  const movesEl = document.getElementById('sol-moves');
  const scoreEl = document.getElementById('sol-score');
  const timerEl = document.getElementById('sol-timer');
  const btnUndo = document.getElementById('btn-undo');
  const btnAutoComplete = document.getElementById('btn-autocomplete');
  const winCanvas = document.getElementById('sol-win-canvas');

  function createDeck() {
    const deck = [];
    SUITS.forEach(s => {
      RANKS.forEach(r => {
        deck.push({
          id: `${s.name}_${r.value}`,
          suit: s.symbol,
          suitName: s.name,
          color: s.color,
          value: r.value,
          label: r.label,
          faceUp: false
        });
      });
    });
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function saveHistory() {
    const snapshot = {
      stock: JSON.parse(JSON.stringify(stock)),
      waste: JSON.parse(JSON.stringify(waste)),
      foundations: JSON.parse(JSON.stringify(foundations)),
      tableau: JSON.parse(JSON.stringify(tableau)),
      score,
      moves
    };
    history.push(snapshot);
    if (history.length > 30) history.shift();
    btnUndo.disabled = false;
  }

  function undo() {
    if (history.length === 0 || isWon) return;
    const prev = history.pop();
    stock = prev.stock;
    waste = prev.waste;
    foundations = prev.foundations;
    tableau = prev.tableau;
    score = prev.score;
    moves = prev.moves;

    if (history.length === 0) btnUndo.disabled = true;
    if (window.arcadeAudio) window.arcadeAudio.playClick();
    renderBoard();
    updateUI();
  }

  function startNewGame() {
    const deck = createDeck();
    stock = [];
    waste = [];
    foundations = [[], [], [], []];
    tableau = [[], [], [], [], [], [], []];
    history = [];
    btnUndo.disabled = true;
    moves = 0;
    score = 0;
    timerSecs = 0;
    isWon = false;
    winCanvas.classList.add('hidden');
    btnAutoComplete.style.display = 'none';

    // Deal Tableau
    for (let i = 0; i < 7; i++) {
      for (let j = i; j < 7; j++) {
        const card = deck.pop();
        if (i === j) card.faceUp = true;
        tableau[j].push(card);
      }
    }
    stock = deck; // remaining cards go to stock

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!isWon) {
        timerSecs++;
        const mins = String(Math.floor(timerSecs / 60)).padStart(2, '0');
        const secs = String(timerSecs % 60).padStart(2, '0');
        timerEl.textContent = `${mins}:${secs}`;
      }
    }, 1000);

    if (window.arcadeAudio) window.arcadeAudio.playCard();
    renderBoard();
    updateUI();
  }

  function drawFromStock() {
    if (isWon) return;
    saveHistory();
    moves++;

    if (stock.length === 0) {
      // Recycle waste to stock
      while (waste.length > 0) {
        const card = waste.pop();
        card.faceUp = false;
        stock.push(card);
      }
      if (window.arcadeAudio) window.arcadeAudio.playCard();
    } else {
      for (let i = 0; i < drawCount && stock.length > 0; i++) {
        const card = stock.pop();
        card.faceUp = true;
        waste.push(card);
      }
      if (window.arcadeAudio) window.arcadeAudio.playCard();
    }

    renderBoard();
    updateUI();
  }

  function createCardElement(card) {
    const el = document.createElement('div');
    el.className = `sol-card ${card.faceUp ? card.color : 'face-down'}`;
    el.setAttribute('data-id', card.id);

    if (!card.faceUp) {
      el.innerHTML = `<div class="sol-card-back-pattern">♠</div>`;
    } else {
      el.innerHTML = `
        <div class="sol-card-top">
          <span class="sol-card-val">${card.label}</span>
          <span class="sol-card-suit">${card.suit}</span>
        </div>
        <div class="sol-card-center-suit">${card.suit}</div>
        <div class="sol-card-bottom">
          <span class="sol-card-val">${card.label}</span>
          <span class="sol-card-suit">${card.suit}</span>
        </div>
      `;
    }
    return el;
  }

  function renderBoard() {
    // Render Stock
    slotStock.innerHTML = '';
    if (stock.length > 0) {
      const topCardEl = createCardElement({ faceUp: false });
      slotStock.appendChild(topCardEl);
    } else {
      slotStock.innerHTML = `<span class="slot-placeholder">🔄</span>`;
    }

    // Render Waste
    slotWaste.innerHTML = '';
    if (waste.length > 0) {
      const topWaste = waste[waste.length - 1];
      const cardEl = createCardElement(topWaste);
      cardEl.addEventListener('click', () => trySmartMove(topWaste, 'waste'));
      slotWaste.appendChild(cardEl);
    }

    // Render Foundations
    foundations.forEach((fPile, idx) => {
      const fSlot = foundEls[idx];
      fSlot.innerHTML = '';
      if (fPile.length > 0) {
        const topCard = fPile[fPile.length - 1];
        const cardEl = createCardElement(topCard);
        fSlot.appendChild(cardEl);
      } else {
        const suitsIcons = ['♠', '♥', '♣', '♦'];
        fSlot.innerHTML = `<span class="slot-placeholder">${suitsIcons[idx]}</span>`;
      }
    });

    // Render Tableau
    tableau.forEach((col, colIdx) => {
      const colEl = tabEls[colIdx];
      colEl.innerHTML = '';

      col.forEach((card, cardIdx) => {
        const cardEl = createCardElement(card);
        const yOffset = cardIdx * (window.innerWidth < 800 ? 18 : 26);
        cardEl.style.top = `${yOffset}px`;

        if (card.faceUp) {
          cardEl.addEventListener('click', (e) => {
            e.stopPropagation();
            trySmartMove(card, 'tableau', colIdx, cardIdx);
          });
        }
        colEl.appendChild(cardEl);
      });

      // Allow clicking empty column to move Kings
      colEl.onclick = () => {
        if (col.length === 0) {
          // If top waste card is King, move it
          if (waste.length > 0 && waste[waste.length - 1].value === 13) {
            saveHistory();
            col.push(waste.pop());
            moves++;
            score += 5;
            if (window.arcadeAudio) window.arcadeAudio.playCard();
            renderBoard();
            updateUI();
          }
        }
      };
    });

    checkAutoCompleteAvailable();
  }

  function trySmartMove(card, source, colIdx = -1, cardIdx = -1) {
    if (isWon) return;

    // 1. Try moving to Foundation
    // Only possible if this card is top of its sequence
    const isTopCard = source === 'waste' ? true : (cardIdx === tableau[colIdx].length - 1);
    if (isTopCard) {
      for (let fIdx = 0; fIdx < 4; fIdx++) {
        const fPile = foundations[fIdx];
        const targetValue = fPile.length === 0 ? 1 : fPile[fPile.length - 1].value + 1;
        const targetSuit = fPile.length === 0 ? null : fPile[fPile.length - 1].suitName;

        if (card.value === targetValue && (targetSuit === null || card.suitName === targetSuit)) {
          saveHistory();
          if (source === 'waste') waste.pop();
          else {
            tableau[colIdx].pop();
            revealTopCard(colIdx);
          }
          foundations[fIdx].push(card);
          moves++;
          score += 15;
          if (window.arcadeAudio) window.arcadeAudio.playCard();
          renderBoard();
          updateUI();
          checkWin();
          return;
        }
      }
    }

    // 2. Try moving to another Tableau column
    let movingCards = [];
    if (source === 'waste') {
      movingCards = [card];
    } else {
      movingCards = tableau[colIdx].slice(cardIdx);
    }

    for (let targetCol = 0; targetCol < 7; targetCol++) {
      if (source === 'tableau' && targetCol === colIdx) continue;
      const col = tableau[targetCol];

      if (col.length === 0) {
        // Can only move King (value 13) to empty column
        if (card.value === 13) {
          saveHistory();
          if (source === 'waste') waste.pop();
          else {
            tableau[colIdx].splice(cardIdx);
            revealTopCard(colIdx);
          }
          tableau[targetCol].push(...movingCards);
          moves++;
          score += 5;
          if (window.arcadeAudio) window.arcadeAudio.playCard();
          renderBoard();
          updateUI();
          return;
        }
      } else {
        const topTarget = col[col.length - 1];
        if (topTarget.faceUp && topTarget.color !== card.color && topTarget.value === card.value + 1) {
          saveHistory();
          if (source === 'waste') waste.pop();
          else {
            tableau[colIdx].splice(cardIdx);
            revealTopCard(colIdx);
          }
          tableau[targetCol].push(...movingCards);
          moves++;
          score += 5;
          if (window.arcadeAudio) window.arcadeAudio.playCard();
          renderBoard();
          updateUI();
          return;
        }
      }
    }
  }

  function revealTopCard(colIdx) {
    const col = tableau[colIdx];
    if (col.length > 0 && !col[col.length - 1].faceUp) {
      col[col.length - 1].faceUp = true;
      score += 10;
    }
  }

  function checkAutoCompleteAvailable() {
    // If all cards in tableau are faceUp, and stock/waste are empty, auto-complete is guaranteed!
    const allTableauFaceUp = tableau.every(col => col.every(c => c.faceUp));
    const stockEmpty = stock.length === 0 && waste.length === 0;

    if (allTableauFaceUp && stockEmpty && !isWon) {
      btnAutoComplete.style.display = 'inline-flex';
    } else {
      btnAutoComplete.style.display = 'none';
    }
  }

  function runAutoComplete() {
    const interval = setInterval(() => {
      let moved = false;
      for (let colIdx = 0; colIdx < 7; colIdx++) {
        const col = tableau[colIdx];
        if (col.length > 0) {
          const card = col[col.length - 1];
          for (let fIdx = 0; fIdx < 4; fIdx++) {
            const fPile = foundations[fIdx];
            const targetVal = fPile.length === 0 ? 1 : fPile[fPile.length - 1].value + 1;
            const targetSuit = fPile.length === 0 ? null : fPile[fPile.length - 1].suitName;

            if (card.value === targetVal && (targetSuit === null || card.suitName === targetSuit)) {
              col.pop();
              fPile.push(card);
              moved = true;
              if (window.arcadeAudio) window.arcadeAudio.playCard();
              renderBoard();
              updateUI();
              break;
            }
          }
        }
        if (moved) break;
      }

      if (!moved) {
        clearInterval(interval);
        checkWin();
      }
    }, 80);
  }

  function checkWin() {
    const totalFound = foundations.reduce((acc, pile) => acc + pile.length, 0);
    if (totalFound === 52) {
      isWon = true;
      if (window.arcadeAudio) window.arcadeAudio.playJackpot();
      if (window.showArcadeToast) window.showArcadeToast('🎉 VICTORY! Solitaire Complete!', '👑');
      startWinCascadeAnimation();
    }
  }

  function startWinCascadeAnimation() {
    winCanvas.classList.remove('hidden');
    winCanvas.width = window.innerWidth;
    winCanvas.height = window.innerHeight;
    const ctx = winCanvas.getContext('2d');

    const particles = [];
    const suits = ['♠', '♥', '♣', '♦'];
    const colors = ['#0f172a', '#dc2626', '#0f172a', '#dc2626'];

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * winCanvas.width,
        y: Math.random() * (winCanvas.height / 2),
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * 4 + 2,
        suit: suits[i % 4],
        color: colors[i % 4],
        w: 60,
        h: 90
      });
    }

    function animate() {
      if (!isWon) return;
      ctx.clearRect(0, 0, winCanvas.width, winCanvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity

        if (p.y + p.h >= winCanvas.height) {
          p.y = winCanvas.height - p.h;
          p.vy = -p.vy * 0.85; // bounce
        }
        if (p.x <= 0 || p.x + p.w >= winCanvas.width) {
          p.vx = -p.vx;
        }

        // Draw bouncing card
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 8;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeStyle = '#e2e8f0';
        ctx.strokeRect(p.x, p.y, p.w, p.h);

        ctx.fillStyle = p.color;
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.suit, p.x + p.w / 2, p.y + p.h / 2 + 8);
      });

      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  function updateUI() {
    movesEl.textContent = moves;
    scoreEl.textContent = score;
  }

  // Event Listeners
  slotStock.addEventListener('click', drawFromStock);
  document.getElementById('btn-new-game').addEventListener('click', startNewGame);
  btnUndo.addEventListener('click', undo);
  btnAutoComplete.addEventListener('click', runAutoComplete);

  document.getElementById('btn-draw-1').addEventListener('click', () => {
    drawCount = 1;
    document.getElementById('btn-draw-1').classList.add('active');
    document.getElementById('btn-draw-3').classList.remove('active');
  });

  document.getElementById('btn-draw-3').addEventListener('click', () => {
    drawCount = 3;
    document.getElementById('btn-draw-3').classList.add('active');
    document.getElementById('btn-draw-1').classList.remove('active');
  });

  startNewGame();
})();
