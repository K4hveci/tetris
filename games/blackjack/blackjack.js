/**
 * Casino Blackjack 21 Logic
 */
(function() {
  const SUITS = [
    { name: 'spades', symbol: '♠', color: 'black' },
    { name: 'hearts', symbol: '♥', color: 'red' },
    { name: 'diamonds', symbol: '♦', color: 'red' },
    { name: 'clubs', symbol: '♣', color: 'black' }
  ];

  const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  let deck = [];
  let playerHand = [];
  let dealerHand = [];

  let chips = parseInt(localStorage.getItem('blackjack_chips') || '1000', 10);
  let currentBet = 0;
  let inRound = false;
  let dealerHoleRevealed = false;

  // DOM elements
  const dealerCardsEl = document.getElementById('dealer-cards');
  const playerCardsEl = document.getElementById('player-cards');
  const dealerScoreEl = document.getElementById('dealer-score-badge');
  const playerScoreEl = document.getElementById('player-score-badge');
  const currentBetEl = document.getElementById('current-bet-val');
  const statusMsgEl = document.getElementById('round-status-msg');

  const btnHit = document.getElementById('btn-hit');
  const btnStand = document.getElementById('btn-stand');
  const btnDouble = document.getElementById('btn-double');
  const btnDeal = document.getElementById('btn-deal');
  const btnClearBet = document.getElementById('btn-clear-bet');

  function saveChips() {
    localStorage.setItem('blackjack_chips', chips.toString());
    if (window.updateNavChipsDisplay) {
      window.updateNavChipsDisplay(chips);
    }
  }

  window.onChipsRefilled = function(newAmt) {
    chips = newAmt;
    saveChips();
    updateUI();
  };

  function createDeck() {
    deck = [];
    // 4 standard decks for realistic casino shoe
    for (let d = 0; d < 4; d++) {
      for (let s of SUITS) {
        for (let v of VALUES) {
          deck.push({ value: v, suit: s.symbol, color: s.color });
        }
      }
    }
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  function drawCard() {
    if (deck.length < 15) createDeck();
    return deck.pop();
  }

  function calculateHand(hand, hideSecondCard = false) {
    let score = 0;
    let aces = 0;

    const cardsToCount = hideSecondCard ? [hand[0]] : hand;

    for (let card of cardsToCount) {
      if (!card) continue;
      if (['J', 'Q', 'K'].includes(card.value)) {
        score += 10;
      } else if (card.value === 'A') {
        aces += 1;
        score += 11;
      } else {
        score += parseInt(card.value, 10);
      }
    }

    while (score > 21 && aces > 0) {
      score -= 10;
      aces -= 1;
    }

    return score;
  }

  function renderCard(card, isFacedown = false) {
    const cardEl = document.createElement('div');
    if (isFacedown) {
      cardEl.className = 'playing-card facedown';
      cardEl.innerHTML = `<div class="card-back-pattern">♠</div>`;
      return cardEl;
    }

    cardEl.className = `playing-card ${card.color}`;
    cardEl.innerHTML = `
      <div class="card-top">
        <span class="card-val">${card.value}</span>
        <span class="card-suit">${card.suit}</span>
      </div>
      <div class="card-center-suit">${card.suit}</div>
      <div class="card-bottom">
        <span class="card-val">${card.value}</span>
        <span class="card-suit">${card.suit}</span>
      </div>
    `;
    return cardEl;
  }

  function renderTable() {
    // Render Dealer Cards
    dealerCardsEl.innerHTML = '';
    dealerHand.forEach((card, idx) => {
      const isHole = idx === 1 && !dealerHoleRevealed;
      dealerCardsEl.appendChild(renderCard(card, isHole));
    });

    // Render Player Cards
    playerCardsEl.innerHTML = '';
    playerHand.forEach(card => {
      playerCardsEl.appendChild(renderCard(card, false));
    });

    // Scores
    if (dealerHand.length > 0) {
      dealerScoreEl.textContent = calculateHand(dealerHand, !dealerHoleRevealed);
    } else {
      dealerScoreEl.textContent = '0';
    }

    if (playerHand.length > 0) {
      playerScoreEl.textContent = calculateHand(playerHand);
    } else {
      playerScoreEl.textContent = '0';
    }

    currentBetEl.textContent = currentBet.toLocaleString();
  }

  function addChip(amount) {
    if (inRound) return;
    if (chips < amount) {
      if (window.showArcadeToast) {
        window.showArcadeToast('Not enough chips! Hit "+ Refill" at top.', '⚠️');
      }
      return;
    }
    chips -= amount;
    currentBet += amount;
    if (window.arcadeAudio) window.arcadeAudio.playChip();
    saveChips();
    updateUI();
  }

  function clearBet() {
    if (inRound || currentBet === 0) return;
    chips += currentBet;
    currentBet = 0;
    if (window.arcadeAudio) window.arcadeAudio.playChip();
    saveChips();
    updateUI();
  }

  function deal() {
    if (currentBet === 0) {
      statusMsgEl.textContent = 'Please place a bet first!';
      return;
    }

    inRound = true;
    dealerHoleRevealed = false;
    playerHand = [drawCard(), drawCard()];
    dealerHand = [drawCard(), drawCard()];

    if (window.arcadeAudio) window.arcadeAudio.playCard();
    renderTable();

    const pScore = calculateHand(playerHand);
    const dScore = calculateHand(dealerHand);

    // Natural Blackjack check
    if (pScore === 21) {
      dealerHoleRevealed = true;
      renderTable();
      if (dScore === 21) {
        endRound('Push! Both have Blackjack.', currentBet);
      } else {
        const winAmt = Math.floor(currentBet * 2.5); // 3:2 payout (bet + 1.5x)
        endRound('Natural Blackjack! Pays 3:2! 🎉', winAmt, true);
      }
      return;
    }

    statusMsgEl.textContent = 'Hit or Stand?';
    updateButtons();
  }

  function hit() {
    if (!inRound) return;
    playerHand.push(drawCard());
    if (window.arcadeAudio) window.arcadeAudio.playCard();
    renderTable();

    const score = calculateHand(playerHand);
    if (score > 21) {
      dealerHoleRevealed = true;
      renderTable();
      endRound('Bust! Dealer wins.', 0, false, true);
    } else if (score === 21) {
      stand();
    }
    updateButtons();
  }

  function doubleDown() {
    if (!inRound || playerHand.length !== 2) return;
    if (chips < currentBet) {
      if (window.showArcadeToast) window.showArcadeToast('Not enough chips to double!', '⚠️');
      return;
    }

    chips -= currentBet;
    currentBet *= 2;
    saveChips();

    playerHand.push(drawCard());
    if (window.arcadeAudio) window.arcadeAudio.playCard();
    renderTable();

    const score = calculateHand(playerHand);
    if (score > 21) {
      dealerHoleRevealed = true;
      renderTable();
      endRound('Bust after Double! Dealer wins.', 0, false, true);
    } else {
      stand();
    }
  }

  function stand() {
    if (!inRound) return;
    dealerHoleRevealed = true;
    btnHit.disabled = true;
    btnStand.disabled = true;
    btnDouble.disabled = true;

    if (window.arcadeAudio) window.arcadeAudio.playCard();
    renderTable();

    // Dealer AI turn
    function dealerStep() {
      let dScore = calculateHand(dealerHand);
      if (dScore < 17) {
        dealerHand.push(drawCard());
        if (window.arcadeAudio) window.arcadeAudio.playCard();
        renderTable();
        setTimeout(dealerStep, 450);
      } else {
        determineWinner();
      }
    }

    setTimeout(dealerStep, 400);
  }

  function determineWinner() {
    const pScore = calculateHand(playerHand);
    const dScore = calculateHand(dealerHand);

    if (dScore > 21) {
      endRound(`Dealer Busts (${dScore})! You Win! 🎉`, currentBet * 2, true);
    } else if (pScore > dScore) {
      endRound(`You Win (${pScore} vs ${dScore})! 🎉`, currentBet * 2, true);
    } else if (pScore === dScore) {
      endRound(`Push (${pScore} vs ${dScore}). Bet returned.`, currentBet);
    } else {
      endRound(`Dealer Wins (${dScore} vs ${pScore}).`, 0, false, true);
    }
  }

  function endRound(message, returnPayout, isWin = false, isLoss = false) {
    inRound = false;
    statusMsgEl.textContent = message;

    if (returnPayout > 0) {
      chips += returnPayout;
      saveChips();
    }

    currentBet = 0;
    renderTable();
    updateButtons();

    if (isWin) {
      if (window.arcadeAudio) window.arcadeAudio.playWin();
    } else if (isLoss) {
      if (window.arcadeAudio) window.arcadeAudio.playGameOver();
    }

    if (chips === 0) {
      if (window.showArcadeToast) {
        window.showArcadeToast('You are out of chips! Click "+ Refill" anytime.', '🪙');
      }
    }
  }

  function updateButtons() {
    btnDeal.disabled = inRound || currentBet === 0;
    btnClearBet.disabled = inRound || currentBet === 0;
    btnHit.disabled = !inRound;
    btnStand.disabled = !inRound;
    btnDouble.disabled = !inRound || playerHand.length !== 2 || chips < currentBet;
  }

  function updateUI() {
    renderTable();
    updateButtons();
  }

  // Bind Chip Buttons
  document.querySelectorAll('.casino-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.getAttribute('data-chip'), 10);
      addChip(val);
    });
  });

  btnDeal.addEventListener('click', deal);
  btnHit.addEventListener('click', hit);
  btnStand.addEventListener('click', stand);
  btnDouble.addEventListener('click', doubleDown);
  btnClearBet.addEventListener('click', clearBet);

  createDeck();
  saveChips();
  updateUI();
})();
