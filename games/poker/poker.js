/**
 * Texas Hold'em Poker Engine with Hand Evaluator & Bot AI
 */
(function() {
  const SUITS = [
    { name: 'spades', symbol: '♠', color: 'black' },
    { name: 'hearts', symbol: '♥', color: 'red' },
    { name: 'diamonds', symbol: '♦', color: 'red' },
    { name: 'clubs', symbol: '♣', color: 'black' }
  ];

  const RANKS = [
    { val: 2, label: '2' },
    { val: 3, label: '3' },
    { val: 4, label: '4' },
    { val: 5, label: '5' },
    { val: 6, label: '6' },
    { val: 7, label: '7' },
    { val: 8, label: '8' },
    { val: 9, label: '9' },
    { val: 10, label: '10' },
    { val: 11, label: 'J' },
    { val: 12, label: 'Q' },
    { val: 13, label: 'K' },
    { val: 14, label: 'A' }
  ];

  let deck = [];
  let communityCards = [];
  let pot = 0;
  let currentBet = 0;
  let dealerPos = 0;
  let activePlayerIndex = 0;
  let stage = 'IDLE'; // IDLE, PREFLOP, FLOP, TURN, RIVER, SHOWDOWN

  // Players
  let players = [
    { id: 'hero', name: 'You', chips: parseInt(localStorage.getItem('poker_chips') || '1000', 10), cards: [], folded: false, bet: 0, isHuman: true },
    { id: 'bot1', name: 'Bluffing Bob', chips: 1000, cards: [], folded: false, bet: 0, style: 'aggressive' },
    { id: 'bot2', name: 'Tight Tina', chips: 1000, cards: [], folded: false, bet: 0, style: 'tight' },
    { id: 'bot3', name: 'Balanced Ben', chips: 1000, cards: [], folded: false, bet: 0, style: 'balanced' }
  ];

  // DOM
  const tablePotEl = document.getElementById('table-pot-val');
  const communityEl = document.getElementById('community-cards');
  const stageMsgEl = document.getElementById('stage-msg');
  const heroCardsEl = document.getElementById('hero-cards');
  const bot1CardsEl = document.getElementById('bot1-cards');
  const bot2CardsEl = document.getElementById('bot2-cards');
  const bot3CardsEl = document.getElementById('bot3-cards');

  const heroTag = document.getElementById('hero-tag');
  const bot1Tag = document.getElementById('bot1-tag');
  const bot2Tag = document.getElementById('bot2-tag');
  const bot3Tag = document.getElementById('bot3-tag');

  const bot1ChipsEl = document.getElementById('bot1-chips');
  const bot2ChipsEl = document.getElementById('bot2-chips');
  const bot3ChipsEl = document.getElementById('bot3-chips');
  const heroRankEl = document.getElementById('hero-hand-rank');

  const toCallEl = document.getElementById('to-call-val');
  const btnFold = document.getElementById('btn-fold');
  const btnCheckCall = document.getElementById('btn-check-call');
  const btnRaise = document.getElementById('btn-raise');
  const raiseSlider = document.getElementById('raise-slider');
  const raiseAmtVal = document.getElementById('raise-amt-val');
  const btnDealHand = document.getElementById('btn-start-poker-hand');

  function saveHeroChips() {
    localStorage.setItem('poker_chips', players[0].chips.toString());
    if (window.updateNavChipsDisplay) {
      window.updateNavChipsDisplay(players[0].chips);
    }
  }

  window.onChipsRefilled = function(newAmt) {
    players[0].chips = newAmt;
    saveHeroChips();
    updateUI();
  };

  function createDeck() {
    deck = [];
    SUITS.forEach(s => {
      RANKS.forEach(r => {
        deck.push({
          suit: s.symbol,
          color: s.color,
          value: r.val,
          label: r.label
        });
      });
    });
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  function dealCard() {
    return deck.pop();
  }

  function renderCard(card, faceDown = false) {
    const el = document.createElement('div');
    if (faceDown) {
      el.className = 'poker-card facedown';
      el.textContent = '♠';
      return el;
    }

    el.className = `poker-card ${card.color}`;
    el.innerHTML = `
      <div class="p-top">
        <div class="p-val">${card.label}</div>
        <div class="p-suit">${card.suit}</div>
      </div>
      <div class="p-mid-suit">${card.suit}</div>
      <div class="p-bot">
        <div class="p-val">${card.label}</div>
        <div class="p-suit">${card.suit}</div>
      </div>
    `;
    return el;
  }

  function startHand() {
    if (players[0].chips < 20) {
      if (window.showArcadeToast) window.showArcadeToast('Not enough chips for blinds! Hit "+ Refill"', '⚠️');
      return;
    }

    createDeck();
    communityCards = [];
    pot = 0;
    currentBet = 20; // Big blind size
    stage = 'PREFLOP';

    // Clear tags
    [heroTag, bot1Tag, bot2Tag, bot3Tag].forEach(tag => {
      tag.textContent = '';
      tag.className = 'seat-action-tag';
    });

    // Reset player states
    players.forEach((p, idx) => {
      p.cards = [dealCard(), dealCard()];
      p.folded = p.chips <= 0;
      p.bet = 0;
    });

    // Rotate dealer
    dealerPos = (dealerPos + 1) % players.length;

    // Post Blinds (Small Blind = 10, Big Blind = 20)
    const sbPos = (dealerPos + 1) % players.length;
    const bbPos = (dealerPos + 2) % players.length;

    postBet(players[sbPos], 10, 'SB $10');
    postBet(players[bbPos], 20, 'BB $20');

    if (window.arcadeAudio) window.arcadeAudio.playCard();

    stageMsgEl.textContent = 'Pre-Flop Betting';
    btnDealHand.disabled = true;

    renderCommunity();
    renderSeats(false);
    updateUI();

    // Start action with player after BB
    activePlayerIndex = (bbPos + 1) % players.length;
    nextTurn();
  }

  function postBet(player, amt, tagText) {
    const actual = Math.min(player.chips, amt);
    player.chips -= actual;
    player.bet += actual;
    pot += actual;

    const tagEl = getTagElement(player.id);
    if (tagEl) {
      tagEl.textContent = tagText;
      tagEl.className = 'seat-action-tag call';
    }
  }

  function getTagElement(id) {
    if (id === 'hero') return heroTag;
    if (id === 'bot1') return bot1Tag;
    if (id === 'bot2') return bot2Tag;
    if (id === 'bot3') return bot3Tag;
    return null;
  }

  function renderCommunity() {
    communityEl.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      if (i < communityCards.length) {
        communityEl.appendChild(renderCard(communityCards[i]));
      } else {
        const slot = document.createElement('div');
        slot.className = 'community-card-slot';
        communityEl.appendChild(slot);
      }
    }
  }

  function renderSeats(showAll = false) {
    // Hero
    heroCardsEl.innerHTML = '';
    if (players[0].cards.length > 0 && !players[0].folded) {
      heroCardsEl.appendChild(renderCard(players[0].cards[0]));
      heroCardsEl.appendChild(renderCard(players[0].cards[1]));
      const evalRes = evaluate7Cards([...players[0].cards, ...communityCards]);
      heroRankEl.textContent = evalRes.desc;
    } else {
      heroRankEl.textContent = players[0].folded ? 'Folded' : '';
    }

    // Bots
    const botSlots = [bot1CardsEl, bot2CardsEl, bot3CardsEl];
    for (let b = 1; b <= 3; b++) {
      const p = players[b];
      const slot = botSlots[b - 1];
      slot.innerHTML = '';
      if (p.cards.length > 0 && !p.folded) {
        slot.appendChild(renderCard(p.cards[0], !showAll));
        slot.appendChild(renderCard(p.cards[1], !showAll));
      }
    }

    bot1ChipsEl.textContent = players[1].chips.toLocaleString();
    bot2ChipsEl.textContent = players[2].chips.toLocaleString();
    bot3ChipsEl.textContent = players[3].chips.toLocaleString();
    tablePotEl.textContent = pot.toLocaleString();
    saveHeroChips();
  }

  function nextTurn() {
    // Check if only 1 player remains unfolded
    const activePlayers = players.filter(p => !p.folded);
    if (activePlayers.length === 1) {
      endHandWithWinner(activePlayers[0]);
      return;
    }

    // Check if betting round complete (all active players have called currentBet or all-in)
    const roundDone = activePlayers.every(p => p.bet === currentBet || p.chips === 0);
    if (roundDone && hasEveryoneActed()) {
      advanceStage();
      return;
    }

    // Advance to next active player
    const p = players[activePlayerIndex];
    if (p.folded || p.chips === 0) {
      activePlayerIndex = (activePlayerIndex + 1) % players.length;
      nextTurn();
      return;
    }

    if (p.isHuman) {
      enableHumanControls();
    } else {
      disableHumanControls();
      setTimeout(() => botAction(p), 600);
    }
  }

  let actedFlags = [false, false, false, false];

  function hasEveryoneActed() {
    return players.every((p, idx) => p.folded || p.chips === 0 || actedFlags[idx]);
  }

  function resetRoundBets() {
    players.forEach(p => p.bet = 0);
    currentBet = 0;
    actedFlags = [false, false, false, false];
  }

  function advanceStage() {
    resetRoundBets();

    if (stage === 'PREFLOP') {
      stage = 'FLOP';
      communityCards.push(dealCard(), dealCard(), dealCard());
      stageMsgEl.textContent = 'The Flop';
    } else if (stage === 'FLOP') {
      stage = 'TURN';
      communityCards.push(dealCard());
      stageMsgEl.textContent = 'The Turn';
    } else if (stage === 'TURN') {
      stage = 'RIVER';
      communityCards.push(dealCard());
      stageMsgEl.textContent = 'The River';
    } else if (stage === 'RIVER') {
      showdown();
      return;
    }

    if (window.arcadeAudio) window.arcadeAudio.playCard();
    renderCommunity();
    renderSeats(false);

    activePlayerIndex = (dealerPos + 1) % players.length;
    nextTurn();
  }

  function enableHumanControls() {
    const hero = players[0];
    const toCall = currentBet - hero.bet;

    toCallEl.textContent = toCall.toLocaleString();
    btnFold.disabled = false;
    btnCheckCall.disabled = false;
    btnCheckCall.textContent = toCall === 0 ? 'Check' : `Call $${toCall}`;

    const minRaise = currentBet + 20;
    const maxRaise = Math.min(hero.chips + hero.bet, currentBet + 200);

    if (maxRaise > minRaise) {
      btnRaise.disabled = false;
      raiseSlider.disabled = false;
      raiseSlider.min = minRaise;
      raiseSlider.max = maxRaise;
      raiseSlider.value = minRaise;
      raiseAmtVal.textContent = minRaise;
    } else {
      btnRaise.disabled = true;
      raiseSlider.disabled = true;
    }
  }

  function disableHumanControls() {
    btnFold.disabled = true;
    btnCheckCall.disabled = true;
    btnRaise.disabled = true;
    raiseSlider.disabled = true;
  }

  function playerFold(player) {
    player.folded = true;
    const tag = getTagElement(player.id);
    if (tag) {
      tag.textContent = 'Fold';
      tag.className = 'seat-action-tag fold';
    }
    if (window.arcadeAudio) window.arcadeAudio.playClick();
    actedFlags[players.indexOf(player)] = true;
    activePlayerIndex = (activePlayerIndex + 1) % players.length;
    nextTurn();
  }

  function playerCheckOrCall(player) {
    const toCall = currentBet - player.bet;
    const pay = Math.min(player.chips, toCall);
    player.chips -= pay;
    player.bet += pay;
    pot += pay;

    const tag = getTagElement(player.id);
    if (tag) {
      tag.textContent = pay === 0 ? 'Check' : `Call $${pay}`;
      tag.className = `seat-action-tag ${pay === 0 ? 'check' : 'call'}`;
    }

    if (window.arcadeAudio) window.arcadeAudio.playChip();
    actedFlags[players.indexOf(player)] = true;
    activePlayerIndex = (activePlayerIndex + 1) % players.length;
    renderSeats(false);
    nextTurn();
  }

  function playerRaise(player, targetBet) {
    const toPay = targetBet - player.bet;
    const actualPay = Math.min(player.chips, toPay);

    player.chips -= actualPay;
    player.bet += actualPay;
    pot += actualPay;
    currentBet = player.bet;

    const tag = getTagElement(player.id);
    if (tag) {
      tag.textContent = `Raise $${targetBet}`;
      tag.className = 'seat-action-tag raise';
    }

    // Reset others acted flags since bet was raised
    players.forEach((p, idx) => {
      if (p !== player) actedFlags[idx] = false;
    });
    actedFlags[players.indexOf(player)] = true;

    if (window.arcadeAudio) window.arcadeAudio.playChip();
    activePlayerIndex = (activePlayerIndex + 1) % players.length;
    renderSeats(false);
    nextTurn();
  }

  function botAction(bot) {
    const evalRes = evaluate7Cards([...bot.cards, ...communityCards]);
    const toCall = currentBet - bot.bet;
    const rand = Math.random();

    if (bot.style === 'aggressive') {
      if (rand < 0.45 && bot.chips > currentBet + 40) {
        playerRaise(bot, currentBet + 30);
      } else if (toCall > bot.chips * 0.7 && evalRes.score < 2) {
        playerFold(bot);
      } else {
        playerCheckOrCall(bot);
      }
    } else if (bot.style === 'tight') {
      if (evalRes.score >= 3 && bot.chips > currentBet + 40 && rand < 0.35) {
        playerRaise(bot, currentBet + 20);
      } else if (toCall > 40 && evalRes.score < 2) {
        playerFold(bot);
      } else {
        playerCheckOrCall(bot);
      }
    } else {
      // Balanced
      if (evalRes.score >= 2 && rand < 0.3 && bot.chips > currentBet + 30) {
        playerRaise(bot, currentBet + 20);
      } else if (toCall > 60 && evalRes.score < 2) {
        playerFold(bot);
      } else {
        playerCheckOrCall(bot);
      }
    }
  }

  function showdown() {
    stage = 'SHOWDOWN';
    stageMsgEl.textContent = 'Showdown!';
    renderSeats(true);

    const activePlayers = players.filter(p => !p.folded);
    let bestScore = -1;
    let winner = null;

    activePlayers.forEach(p => {
      const res = evaluate7Cards([...p.cards, ...communityCards]);
      p.handEval = res;
      if (res.score > bestScore) {
        bestScore = res.score;
        winner = p;
      }
    });

    endHandWithWinner(winner);
  }

  function endHandWithWinner(winner) {
    stage = 'IDLE';
    winner.chips += pot;
    saveHeroChips();

    const desc = winner.handEval ? ` with ${winner.handEval.desc}` : '';
    stageMsgEl.textContent = `${winner.name} WINS $${pot.toLocaleString()}${desc}! 🎉`;

    if (winner.isHuman) {
      if (window.arcadeAudio) window.arcadeAudio.playJackpot();
      if (window.showArcadeToast) window.showArcadeToast(`You Won $${pot.toLocaleString()} Pot!`, '🏆');
    } else {
      if (window.arcadeAudio) window.arcadeAudio.playGameOver();
    }

    pot = 0;
    btnDealHand.disabled = false;
    disableHumanControls();
    renderSeats(true);
  }

  // Hand Evaluation for 7 Cards
  function evaluate7Cards(cards) {
    if (cards.length < 5) return { score: 0, desc: 'High Card' };

    // Count rank occurrences
    const counts = {};
    const suits = {};
    cards.forEach(c => {
      counts[c.value] = (counts[c.value] || 0) + 1;
      suits[c.suit] = (suits[c.suit] || 0) + 1;
    });

    const hasFlush = Object.values(suits).some(cnt => cnt >= 5);
    const sortedVals = Array.from(new Set(cards.map(c => c.value))).sort((a, b) => b - a);

    // Straight check
    let hasStraight = false;
    for (let i = 0; i <= sortedVals.length - 5; i++) {
      if (sortedVals[i] - sortedVals[i + 4] === 4) {
        hasStraight = true;
        break;
      }
    }

    const countsArr = Object.values(counts).sort((a, b) => b - a);

    if (hasFlush && hasStraight) return { score: 9, desc: 'Straight Flush' };
    if (countsArr[0] === 4) return { score: 8, desc: 'Four of a Kind' };
    if (countsArr[0] === 3 && countsArr[1] >= 2) return { score: 7, desc: 'Full House' };
    if (hasFlush) return { score: 6, desc: 'Flush' };
    if (hasStraight) return { score: 5, desc: 'Straight' };
    if (countsArr[0] === 3) return { score: 4, desc: 'Three of a Kind' };
    if (countsArr[0] === 2 && countsArr[1] === 2) return { score: 3, desc: 'Two Pair' };
    if (countsArr[0] === 2) return { score: 2, desc: 'One Pair' };
    return { score: 1, desc: `High Card (${RANKS.find(r => r.val === sortedVals[0])?.label || ''})` };
  }

  function updateUI() {
    renderCommunity();
    renderSeats(false);
  }

  // Event Listeners
  btnDealHand.addEventListener('click', startHand);
  btnFold.addEventListener('click', () => playerFold(players[0]));
  btnCheckCall.addEventListener('click', () => playerCheckOrCall(players[0]));
  btnRaise.addEventListener('click', () => playerRaise(players[0], parseInt(raiseSlider.value, 10)));

  raiseSlider.addEventListener('input', () => {
    raiseAmtVal.textContent = raiseSlider.value;
  });

  updateUI();
})();
