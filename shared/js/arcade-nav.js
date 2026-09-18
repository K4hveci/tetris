/**
 * Arcade Navigation & Helper Component
 * Injects standard header bar, modal rules popup, and audio/fullscreen controls.
 */
(function() {
  function initArcadeNav() {
    const navPlaceholder = document.getElementById('arcade-nav-mount');
    if (!navPlaceholder) return;

    const gameTitle = navPlaceholder.getAttribute('data-title') || 'Arcade Game';
    const gameIcon = navPlaceholder.getAttribute('data-icon') || '🕹️';
    const homeUrl = navPlaceholder.getAttribute('data-home') || '../../index.html';
    const hasChips = navPlaceholder.getAttribute('data-chips'); // e.g. 'blackjack_chips'
    const defaultChips = parseInt(navPlaceholder.getAttribute('data-default-chips') || '1000', 10);

    let chipsHtml = '';
    if (hasChips) {
      const currentChips = parseInt(localStorage.getItem(hasChips) || defaultChips, 10);
      chipsHtml = `
        <div class="nav-points-pill" id="nav-chips-display">
          <span class="coin-icon">🪙</span>
          <span id="nav-chips-value">${currentChips.toLocaleString()}</span>
          <button class="btn-refill-chips" id="btn-refill-nav-chips" title="Refill chips to ${defaultChips}">+ Refill</button>
        </div>
      `;
    }

    const isMuted = window.arcadeAudio ? window.arcadeAudio.isMuted() : false;

    navPlaceholder.innerHTML = `
      <header class="arcade-nav">
        <div class="arcade-nav-left">
          <a href="${homeUrl}" class="arcade-nav-btn-back" id="nav-btn-back">
            <span>←</span>
            <span>All Games</span>
          </a>
          <div class="game-header-title">
            <span>${gameIcon}</span>
            <span>${gameTitle}</span>
          </div>
        </div>

        <div class="arcade-nav-right">
          ${chipsHtml}
          <button class="nav-icon-btn ${isMuted ? '' : 'active'}" id="nav-btn-sound" title="Toggle Sound">
            <span id="nav-sound-icon">${isMuted ? '🔇' : '🔊'}</span>
          </button>
          <button class="nav-icon-btn" id="nav-btn-help" title="How to Play">
            <span>❓</span>
          </button>
          <button class="nav-icon-btn" id="nav-btn-fullscreen" title="Toggle Fullscreen">
            <span>⛶</span>
          </button>
        </div>
      </header>

      <!-- How to Play Modal -->
      <div class="modal-overlay" id="arcade-rules-modal">
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-title">
              <span>${gameIcon}</span>
              <span>How to Play: ${gameTitle}</span>
            </div>
            <button class="modal-close" id="modal-close-btn">&times;</button>
          </div>
          <div class="modal-body" id="arcade-modal-body-content">
            <!-- Game specific rules injected here or read from element -->
          </div>
        </div>
      </div>

      <div class="arcade-toast" id="arcade-global-toast">
        <span id="toast-icon">✨</span>
        <span id="toast-message">Notification</span>
      </div>
    `;

    // Sound toggle
    const soundBtn = document.getElementById('nav-btn-sound');
    const soundIcon = document.getElementById('nav-sound-icon');
    if (soundBtn && window.arcadeAudio) {
      soundBtn.addEventListener('click', () => {
        const muted = window.arcadeAudio.toggleMute();
        soundIcon.textContent = muted ? '🔇' : '🔊';
        soundBtn.classList.toggle('active', !muted);
        if (!muted) window.arcadeAudio.playClick();
      });
    }

    // Fullscreen toggle
    const fsBtn = document.getElementById('nav-btn-fullscreen');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // Modal
    const helpBtn = document.getElementById('nav-btn-help');
    const modal = document.getElementById('arcade-rules-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    const rulesSource = document.getElementById('game-instructions-template');
    const modalBody = document.getElementById('arcade-modal-body-content');

    if (rulesSource && modalBody) {
      modalBody.innerHTML = rulesSource.innerHTML;
    }

    if (helpBtn && modal) {
      helpBtn.addEventListener('click', () => {
        modal.classList.add('open');
        if (window.arcadeAudio) window.arcadeAudio.playClick();
      });
    }
    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('open');
      });
    }
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });
    }

    // Chips refill
    if (hasChips) {
      const refillBtn = document.getElementById('btn-refill-nav-chips');
      if (refillBtn) {
        refillBtn.addEventListener('click', () => {
          localStorage.setItem(hasChips, defaultChips.toString());
          const display = document.getElementById('nav-chips-value');
          if (display) display.textContent = defaultChips.toLocaleString();
          if (window.onChipsRefilled) window.onChipsRefilled(defaultChips);
          if (window.arcadeAudio) window.arcadeAudio.playCoin();
          window.showArcadeToast(`Refilled chips to ${defaultChips.toLocaleString()}!`);
        });
      }
    }
  }

  // Toast helper
  window.showArcadeToast = function(msg, icon = '✨') {
    const toast = document.getElementById('arcade-global-toast');
    const msgEl = document.getElementById('toast-message');
    const iconEl = document.getElementById('toast-icon');
    if (!toast || !msgEl) return;

    msgEl.textContent = msg;
    if (iconEl) iconEl.textContent = icon;

    toast.classList.add('show');
    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  };

  // Chip update helper
  window.updateNavChipsDisplay = function(chips) {
    const display = document.getElementById('nav-chips-value');
    if (display) {
      display.textContent = Math.floor(chips).toLocaleString();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initArcadeNav);
  } else {
    initArcadeNav();
  }
})();
