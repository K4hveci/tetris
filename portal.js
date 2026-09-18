/**
 * Arcade Portal Hub Controller
 */
(function() {
  const GAMES = [
    {
      id: 'runner',
      title: 'Subway Runner 3D',
      desc: 'Sprint through 3D subway tracks, dodge incoming trains, jump barricades, and slide under signs!',
      icon: '🏃',
      badge: '3D ACTION',
      category: 'arcade',
      theme: 'theme-runner',
      path: './games/runner/index.html',
      controls: '⌨️ 📱 Swipe / Arrows',
      scoreKey: 'runner_highdist',
      scoreSuffix: 'm'
    },
    {
      id: 'tetris',
      title: 'Tetris Deluxe',
      desc: 'Classic 7-tetromino puzzle with ghost piece projection, hold queue, hard drops, and neon visuals.',
      icon: '🧱',
      badge: 'RETRO',
      category: 'arcade',
      theme: 'theme-tetris',
      path: './games/tetris/index.html',
      controls: '⌨️ 📱 Arrows / Touch',
      scoreKey: 'tetris_highscore'
    },
    {
      id: 'blackjack',
      title: 'Blackjack 21',
      desc: 'Authentic casino green felt table with chips betting, double down, split, and instant refill bankroll.',
      icon: '🃏',
      badge: 'CASINO',
      category: 'casino',
      theme: 'theme-blackjack',
      path: './games/blackjack/index.html',
      controls: '🖱️ 📱 Click / Tap',
      chipsKey: 'blackjack_chips'
    },
    {
      id: 'slots',
      title: 'Deluxe Slots 777',
      desc: '5-reel video slot machine with 10 paylines, wild symbols, scatter free spins with 3x multiplier, and jackpot fanfare.',
      icon: '🎰',
      badge: 'CASINO',
      category: 'casino',
      theme: 'theme-slots',
      path: './games/slots/index.html',
      controls: '⌨️ 🖱️ Space / Spin',
      chipsKey: 'slots_chips'
    },
    {
      id: 'poker',
      title: "Texas Hold'em Poker",
      desc: 'Face off against 3 smart AI bots around an oval poker table with blinds, pre-flop/turn/river rounds, and hand evaluator.',
      icon: '♠️',
      badge: 'CASINO',
      category: 'casino',
      theme: 'theme-poker',
      path: './games/poker/index.html',
      controls: '🖱️ 📱 Click / Tap',
      chipsKey: 'poker_chips'
    },
    {
      id: 'roulette',
      title: 'European Roulette',
      desc: 'Canvas animated roulette wheel with physics ball deceleration, interactive betting felt, inside and outside bets.',
      icon: '🎯',
      badge: 'CASINO',
      category: 'casino',
      theme: 'theme-roulette',
      path: './games/roulette/index.html',
      controls: '🖱️ 📱 Click / Tap',
      chipsKey: 'roulette_chips'
    },
    {
      id: 'idle',
      title: 'Idle Coin Tycoon',
      desc: 'Tap for coins, unlock iconic retro arcade cabinets from Pong to VR Pods, collect passive CPS, and renovate your empire!',
      icon: '🪙',
      badge: 'IDLE',
      category: 'idle',
      theme: 'theme-idle',
      path: './games/idle/index.html',
      controls: '🖱️ 📱 Tap / Click'
    },
    {
      id: 'snake',
      title: 'Neon Snake',
      desc: 'Smooth glowing cyber snake on high-speed canvas grid with bonus golden stars, speed boosts, and customizable wall modes.',
      icon: '🐍',
      badge: 'RETRO',
      category: 'arcade',
      theme: 'theme-snake',
      path: './games/snake/index.html',
      controls: '⌨️ 📱 Arrows / D-Pad',
      scoreKey: 'snake_highscore'
    },
    {
      id: 'solitaire',
      title: 'Klondike Solitaire',
      desc: 'Full 7-tableau solitaire card game with draw 1/3 modes, smart 1-click moves, undo, and classic win cascade celebration.',
      icon: '👑',
      badge: 'CARDS',
      category: 'puzzle',
      theme: 'theme-solitaire',
      path: './games/solitaire/index.html',
      controls: '🖱️ 📱 Click / Drag'
    },
    {
      id: 'dino',
      title: 'Chrome Dino Runner',
      desc: 'Classic desert endless runner with cacti obstacles, flying pterodactyls, duck & jump physics, and day/night cycles.',
      icon: '🦖',
      badge: 'RETRO',
      category: 'arcade',
      theme: 'theme-dino',
      path: './games/dino/index.html',
      controls: '⌨️ 📱 Space / Duck',
      scoreKey: 'dino_highscore'
    },
    {
      id: 'flappy',
      title: 'Flappy Bird',
      desc: 'Precision flight with smooth bird gravity physics, green pipe obstacles, medal achievements, and high score tracking.',
      icon: '🐤',
      badge: 'ARCADE',
      category: 'arcade',
      theme: 'theme-flappy',
      path: './games/flappy/index.html',
      controls: '⌨️ 🖱️ Space / Tap',
      scoreKey: 'flappy_highscore'
    },
    {
      id: '2048',
      title: '2048 Deluxe',
      desc: 'Addictive number sliding puzzle with smooth CSS transforms, tile merge animations, undo move option, and endless mode.',
      icon: '🔢',
      badge: 'PUZZLE',
      category: 'puzzle',
      theme: 'theme-2048',
      path: './games/2048/index.html',
      controls: '⌨️ 📱 Arrows / Swipes',
      scoreKey: '2048_highscore'
    },
    {
      id: 'minesweeper',
      title: 'Minesweeper Retro',
      desc: 'Windows-style logic puzzle with yellow smiley face status, Easy/Medium/Hard presets, flags, digital timer, and safe first click.',
      icon: '💣',
      badge: 'PUZZLE',
      category: 'puzzle',
      theme: 'theme-minesweeper',
      path: './games/minesweeper/index.html',
      controls: '🖱️ 📱 Left / Right Click'
    },
    {
      id: 'breakout',
      title: 'Brick Breaker Arcade',
      desc: 'Smash through multi-colored brick walls with multi-ball, laser blaster paddle, paddle angle deflection, and extra lives.',
      icon: '🏓',
      badge: 'ARCADE',
      category: 'arcade',
      theme: 'theme-breakout',
      path: './games/breakout/index.html',
      controls: '⌨️ 🖱️ Mouse / Space',
      scoreKey: 'breakout_highscore'
    }
  ];

  let currentCategory = 'all';
  let searchQuery = '';

  const gridEl = document.getElementById('games-grid');
  const searchInput = document.getElementById('game-search-input');
  const searchClear = document.getElementById('search-clear-btn');
  const catTabs = document.getElementById('category-tabs');
  const btnRandom = document.getElementById('btn-random-game');

  function getScorePreview(game) {
    if (game.chipsKey) {
      const chips = localStorage.getItem(game.chipsKey) || '1,000';
      return `Chips: <strong>$${parseInt(chips, 10).toLocaleString()}</strong>`;
    }
    if (game.scoreKey) {
      const score = localStorage.getItem(game.scoreKey) || '0';
      const suffix = game.scoreSuffix || '';
      return `Best: <strong>${parseInt(score, 10).toLocaleString()}${suffix}</strong>`;
    }
    return `Controls: <span>${game.controls}</span>`;
  }

  function renderGames() {
    gridEl.innerHTML = '';

    const filtered = GAMES.filter(game => {
      const matchCat = currentCategory === 'all' || game.category === currentCategory;
      const matchSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          game.desc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 12px;">🔍</div>
          <h3 style="color: var(--text-primary); font-family: var(--font-display);">No Games Found</h3>
          <p>Try searching for something else or clear the filter!</p>
        </div>
      `;
      return;
    }

    filtered.forEach(game => {
      const card = document.createElement('a');
      card.href = game.path;
      card.className = 'game-card';
      card.innerHTML = `
        <div class="card-banner ${game.theme}">
          <span class="card-banner-icon">${game.icon}</span>
          <span class="card-badge">${game.badge}</span>
        </div>
        <div class="card-body">
          <h2 class="card-title">${game.title}</h2>
          <p class="card-desc">${game.desc}</p>
          <div class="card-meta">
            <span class="card-high-score">${getScorePreview(game)}</span>
          </div>
          <div class="card-play-btn">
            <span>PLAY NOW</span>
            <span>→</span>
          </div>
        </div>
      `;
      card.addEventListener('click', () => {
        if (window.arcadeAudio) window.arcadeAudio.playClick();
      });
      gridEl.appendChild(card);
    });
  }

  // Category Filtering
  catTabs.querySelectorAll('.cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      catTabs.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-cat');
      if (window.arcadeAudio) window.arcadeAudio.playClick();
      renderGames();
    });
  });

  // Search Input
  searchInput.addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    searchClear.classList.toggle('hidden', searchQuery.length === 0);
    renderGames();
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClear.classList.add('hidden');
    renderGames();
  });

  // Random Game Button
  btnRandom.addEventListener('click', () => {
    if (window.arcadeAudio) window.arcadeAudio.playCoin();
    const randGame = GAMES[Math.floor(Math.random() * GAMES.length)];
    if (window.showArcadeToast) {
      window.showArcadeToast(`Launching ${randGame.title}...`, randGame.icon);
    }
    setTimeout(() => {
      window.location.href = randGame.path;
    }, 450);
  });

  // Sound Toggle on Portal Header
  const soundBtn = document.getElementById('portal-btn-sound');
  const soundIcon = document.getElementById('portal-sound-icon');
  if (soundBtn && window.arcadeAudio) {
    const isMuted = window.arcadeAudio.isMuted();
    soundIcon.textContent = isMuted ? '🔇' : '🔊';
    soundBtn.classList.toggle('active', !isMuted);

    soundBtn.addEventListener('click', () => {
      const muted = window.arcadeAudio.toggleMute();
      soundIcon.textContent = muted ? '🔇' : '🔊';
      soundBtn.classList.toggle('active', !muted);
      if (!muted) window.arcadeAudio.playClick();
    });
  }

  // Fullscreen Toggle
  const fsBtn = document.getElementById('portal-btn-fullscreen');
  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
  }

  renderGames();
})();
