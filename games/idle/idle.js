/**
 * Idle Coin Tycoon Game Logic
 */
(function() {
  const GENERATORS_CONFIG = [
    { id: 'switch', name: 'Micro Switches', icon: '🕹️', baseCost: 15, baseCps: 0.5 },
    { id: 'pong', name: 'Retro Pong Cabinet', icon: '🏓', baseCost: 100, baseCps: 4 },
    { id: 'invader', name: 'Space Invaders 1978', icon: '👾', baseCost: 1100, baseCps: 32 },
    { id: 'pac', name: 'Chomp Maze Machine', icon: '🟡', baseCost: 12000, baseCps: 260 },
    { id: 'pinball', name: 'Pinball Wizard Table', icon: '🎰', baseCost: 130000, baseCps: 1400 },
    { id: 'fighter', name: 'Turbo Street Brawler', icon: '🥊', baseCost: 1400000, baseCps: 7800 },
    { id: 'dance', name: 'Dance Dance Stage', icon: '💃', baseCost: 20000000, baseCps: 44000 },
    { id: 'vr', name: 'VR Immersion Pod', icon: '🥽', baseCost: 330000000, baseCps: 260000 }
  ];

  let state = {
    coins: 0,
    totalEarned: 0,
    clickPower: 1,
    clickUpgrades: 0,
    generators: {},
    trophies: 0,
    lastSaved: Date.now()
  };

  // Frenzy multiplier state
  let frenzyMultiplier = 1;
  let frenzyTimer = null;

  // Load saved state
  function loadState() {
    const saved = localStorage.getItem('idle_tycoon_save');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
        // calculate offline progress
        const now = Date.now();
        const diffSecs = Math.min(8 * 3600, Math.max(0, (now - (state.lastSaved || now)) / 1000));
        if (diffSecs > 10) {
          const offlineCps = calculateTotalCps();
          const earned = offlineCps * diffSecs;
          if (earned > 0) {
            state.coins += earned;
            state.totalEarned += earned;
            setTimeout(() => {
              if (window.showArcadeToast) {
                window.showArcadeToast(`Welcome back! Earned ${formatNumber(earned)} offline coins!`, '🪙');
              }
            }, 600);
          }
        }
      } catch (e) {
        console.error('Failed to parse save', e);
      }
    }
  }

  function saveState() {
    state.lastSaved = Date.now();
    localStorage.setItem('idle_tycoon_save', JSON.stringify(state));
  }

  function formatNumber(num) {
    if (num < 1000) return Math.floor(num).toLocaleString();
    const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
    const i = Math.floor(Math.log10(num) / 3);
    if (i >= suffixes.length) return num.toExponential(2);
    const scaled = num / Math.pow(10, i * 3);
    return scaled.toFixed(2) + ' ' + suffixes[i];
  }

  function calculateClickCost() {
    return Math.floor(20 * Math.pow(1.35, state.clickUpgrades));
  }

  function calculateClickPower() {
    const base = 1 + state.clickUpgrades * 2;
    const trophyBoost = 1 + (state.trophies * 0.1);
    return Math.floor(base * trophyBoost * frenzyMultiplier);
  }

  function getGenCost(gen) {
    const count = state.generators[gen.id] || 0;
    return Math.floor(gen.baseCost * Math.pow(1.15, count));
  }

  function calculateTotalCps() {
    let rawCps = 0;
    GENERATORS_CONFIG.forEach(gen => {
      const count = state.generators[gen.id] || 0;
      rawCps += count * gen.baseCps;
    });
    const trophyBoost = 1 + (state.trophies * 0.1);
    return rawCps * trophyBoost * frenzyMultiplier;
  }

  // DOM elements
  const coinBalEl = document.getElementById('coin-balance');
  const cpsEl = document.getElementById('coins-per-sec');
  const clickPowerValEl = document.getElementById('click-power-val');
  const trophyCountEl = document.getElementById('trophy-count');
  const tokenBtn = document.getElementById('big-token-btn');
  const particlesContainer = document.getElementById('click-particles-container');
  const clickUpgCostEl = document.getElementById('click-upgrade-cost');
  const clickUpgBoostEl = document.getElementById('click-upgrade-boost');
  const buyClickUpgBtn = document.getElementById('btn-buy-click-upg');
  const genContainer = document.getElementById('generators-container');
  const goldenTokenEl = document.getElementById('golden-token');

  function renderGenerators() {
    genContainer.innerHTML = '';
    GENERATORS_CONFIG.forEach(gen => {
      const count = state.generators[gen.id] || 0;
      const cost = getGenCost(gen);

      const div = document.createElement('div');
      div.className = 'generator-item';
      div.id = `gen-row-${gen.id}`;
      div.innerHTML = `
        <div class="gen-main">
          <div class="gen-icon">${gen.icon}</div>
          <div class="gen-details">
            <div class="gen-title">${gen.name}</div>
            <div class="gen-rate">+${formatNumber(gen.baseCps)}/s per unit</div>
            <div class="gen-count">Owned: <strong id="gen-count-${gen.id}">${count}</strong></div>
          </div>
        </div>
        <div class="gen-action">
          <button class="btn-primary upg-buy-btn" id="btn-buy-${gen.id}">
            🪙 <span id="gen-cost-${gen.id}">${formatNumber(cost)}</span>
          </button>
        </div>
      `;
      genContainer.appendChild(div);

      const btn = div.querySelector(`#btn-buy-${gen.id}`);
      btn.addEventListener('click', () => buyGenerator(gen));
    });
  }

  function buyGenerator(gen) {
    const cost = getGenCost(gen);
    if (state.coins >= cost) {
      state.coins -= cost;
      state.generators[gen.id] = (state.generators[gen.id] || 0) + 1;
      if (window.arcadeAudio) window.arcadeAudio.playCoin();
      updateUI();
    }
  }

  function buyClickUpgrade() {
    const cost = calculateClickCost();
    if (state.coins >= cost) {
      state.coins -= cost;
      state.clickUpgrades++;
      if (window.arcadeAudio) window.arcadeAudio.playCoin();
      updateUI();
    }
  }

  function handleManualClick(e) {
    const power = calculateClickPower();
    state.coins += power;
    state.totalEarned += power;

    if (window.arcadeAudio) window.arcadeAudio.playClick();

    // Floating text particle
    const rect = tokenBtn.getBoundingClientRect();
    const particle = document.createElement('div');
    particle.className = 'click-float-text';
    particle.textContent = `+${formatNumber(power)}`;

    // Place near click position or center
    const x = e ? (e.clientX - rect.left) : (rect.width / 2);
    const y = e ? (e.clientY - rect.top) : (rect.height / 2);
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;

    particlesContainer.appendChild(particle);
    setTimeout(() => particle.remove(), 900);

    updateUI();
  }

  function updateUI() {
    coinBalEl.textContent = formatNumber(state.coins);
    const cps = calculateTotalCps();
    cpsEl.textContent = formatNumber(cps);
    clickPowerValEl.textContent = formatNumber(calculateClickPower());
    trophyCountEl.textContent = state.trophies;

    // Click upgrade button
    const clickCost = calculateClickCost();
    clickUpgCostEl.textContent = formatNumber(clickCost);
    buyClickUpgBtn.disabled = state.coins < clickCost;

    // Generators buttons
    GENERATORS_CONFIG.forEach(gen => {
      const cost = getGenCost(gen);
      const count = state.generators[gen.id] || 0;
      const costEl = document.getElementById(`gen-cost-${gen.id}`);
      const countEl = document.getElementById(`gen-count-${gen.id}`);
      const btn = document.getElementById(`btn-buy-${gen.id}`);

      if (costEl) costEl.textContent = formatNumber(cost);
      if (countEl) countEl.textContent = count;
      if (btn) btn.disabled = state.coins < cost;
    });
  }

  // Golden Token Frenzy
  function spawnGoldenToken() {
    const x = Math.max(20, Math.random() * (window.innerWidth - 180));
    const y = Math.max(80, Math.random() * (window.innerHeight - 120));
    goldenTokenEl.style.left = `${x}px`;
    goldenTokenEl.style.top = `${y}px`;
    goldenTokenEl.classList.remove('hidden');

    const despawnTimeout = setTimeout(() => {
      goldenTokenEl.classList.add('hidden');
      scheduleNextGoldenToken();
    }, 8000);

    goldenTokenEl.onclick = () => {
      clearTimeout(despawnTimeout);
      goldenTokenEl.classList.add('hidden');
      triggerFrenzy();
      scheduleNextGoldenToken();
    };
  }

  function scheduleNextGoldenToken() {
    const delay = (35 + Math.random() * 30) * 1000;
    setTimeout(spawnGoldenToken, delay);
  }

  function triggerFrenzy() {
    frenzyMultiplier = 7;
    if (window.arcadeAudio) window.arcadeAudio.playJackpot();
    if (window.showArcadeToast) {
      window.showArcadeToast('🌟 7X FRENZY ACTIVATED FOR 20 SECONDS!', '⭐');
    }
    clearTimeout(frenzyTimer);
    frenzyTimer = setTimeout(() => {
      frenzyMultiplier = 1;
      updateUI();
      if (window.showArcadeToast) {
        window.showArcadeToast('Frenzy ended.', '⏳');
      }
    }, 20000);
  }

  // Prestige / Renovation
  function prestigeArcade() {
    const reqCoins = 1000000;
    if (state.totalEarned < reqCoins) {
      alert(`You need at least ${formatNumber(reqCoins)} lifetime coins to Renovate! Current: ${formatNumber(state.totalEarned)}`);
      return;
    }
    const newTrophies = Math.floor(Math.sqrt(state.totalEarned / reqCoins));
    if (confirm(`Renovate your Arcade? Reset coins and cabinets to earn ${newTrophies} Golden Trophies (+${newTrophies * 10}% permanent bonus)?`)) {
      state.trophies += newTrophies;
      state.coins = 0;
      state.clickUpgrades = 0;
      state.generators = {};
      saveState();
      updateUI();
      renderGenerators();
      if (window.arcadeAudio) window.arcadeAudio.playWin();
      if (window.showArcadeToast) {
        window.showArcadeToast(`Renovation Complete! +${newTrophies} Trophies awarded!`, '🏆');
      }
    }
  }

  // Game Loop
  let lastTick = performance.now();
  function gameLoop(now) {
    const delta = (now - lastTick) / 1000;
    lastTick = now;

    const cps = calculateTotalCps();
    if (cps > 0 && delta > 0) {
      const gain = cps * delta;
      state.coins += gain;
      state.totalEarned += gain;
      coinBalEl.textContent = formatNumber(state.coins);

      // Light refresh for button states
      const clickCost = calculateClickCost();
      buyClickUpgBtn.disabled = state.coins < clickCost;
      GENERATORS_CONFIG.forEach(gen => {
        const cost = getGenCost(gen);
        const btn = document.getElementById(`btn-buy-${gen.id}`);
        if (btn) btn.disabled = state.coins < cost;
      });
    }

    requestAnimationFrame(gameLoop);
  }

  // Init
  loadState();
  renderGenerators();
  updateUI();

  tokenBtn.addEventListener('click', handleManualClick);
  buyClickUpgBtn.addEventListener('click', buyClickUpgrade);
  document.getElementById('btn-prestige').addEventListener('click', prestigeArcade);
  document.getElementById('btn-save-progress').addEventListener('click', () => {
    saveState();
    if (window.showArcadeToast) window.showArcadeToast('Game saved successfully!', '💾');
    if (window.arcadeAudio) window.arcadeAudio.playClick();
  });
  document.getElementById('btn-reset-idle').addEventListener('click', () => {
    if (confirm('Reset all Idle Tycoon progress? This cannot be undone!')) {
      localStorage.removeItem('idle_tycoon_save');
      location.reload();
    }
  });

  // Auto-save every 5s
  setInterval(saveState, 5000);
  scheduleNextGoldenToken();
  requestAnimationFrame(gameLoop);
})();
