/**
 * Color Quest - User Interface & Particle Engine Manager
 * Coordinates DOM binding, screens swaps, canvas confetti, and board rendering.
 */
class UIManager {
  constructor() {
    this.game = new Game();
    this.board = new Board();
    this.die = new Die();

    // Link engine references
    this.game.board = this.board;
    this.game.die = this.die;

    // Particle system state
    this.canvas = document.getElementById('particle-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animationFrameId = null;
    this.victoryConfettiActive = false;

    // Active player count state (default 3)
    this.playerCount = 3;

    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Bind Game Logic callbacks
    this.game.onStateChange = () => this.updateUIState();
    this.game.onLog = (msg, type) => this.appendLog(msg, type);
    this.game.onMatch = (pawn, playerIndex) => this.handleMatch(pawn, playerIndex);
    this.game.onMismatch = (pawn) => this.handleMismatch(pawn);
    this.game.onGameOver = (standings, text) => this.handleGameOver(standings, text);
    this.game.onTurnChange = (newTurnIndex) => this.handleTurnChange(newTurnIndex);

    // Setup interactive events
    this.bindMenuEvents();
    this.bindGameplayEvents();
    this.bindModalEvents();
    this.checkResumeAvailability();

    // Generate initial name fields
    this.renderNameInputFields(this.playerCount);

    // Start rendering particle ticks
    this.tickParticles();
  }

  /* ==========================================================================
     CANVAS CONFETTI ENGINE
     ========================================================================== */
  resizeCanvas() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }

  /**
   * Spawns particle burst at screen coordinates
   */
  spawnMatchParticles(x, y, color) {
    const count = 40;
    const hex = this.getColorHex(color);
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (1 + Math.random() * 3), // lift factor
        radius: 3 + Math.random() * 5,
        color: hex,
        opacity: 1,
        decay: 0.015 + Math.random() * 0.02,
        gravity: 0.22,
        friction: 0.96
      });
    }
  }

  /**
   * Spawns victory screen shower bursts from left & right corners
   */
  spawnVictoryShower() {
    if (!this.victoryConfettiActive) return;

    const colors = ['#ff4757', '#00d2fc', '#2ed573', '#ffa502', '#ff7f50', '#9b59b6', '#ffd700'];
    
    // Spawn left corner (shooting rightwards)
    if (Math.random() < 0.25) {
      this.particles.push({
        x: 0,
        y: window.innerHeight * 0.8,
        vx: 8 + Math.random() * 12,
        vy: -12 - Math.random() * 12,
        radius: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 1,
        decay: 0.008 + Math.random() * 0.008,
        gravity: 0.25,
        friction: 0.98
      });
    }

    // Spawn right corner (shooting leftwards)
    if (Math.random() < 0.25) {
      this.particles.push({
        x: window.innerWidth,
        y: window.innerHeight * 0.8,
        vx: -8 - Math.random() * 12,
        vy: -12 - Math.random() * 12,
        radius: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 1,
        decay: 0.008 + Math.random() * 0.008,
        gravity: 0.25,
        friction: 0.98
      });
    }

    // Schedule next burst
    requestAnimationFrame(() => this.spawnVictoryShower());
  }

  /**
   * Physics update & render tick (runs constantly at 60fps)
   */
  tickParticles() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Physics calculations
      p.vx *= p.friction;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.opacity -= p.decay;

      // Draw particle
      this.ctx.save();
      this.ctx.globalAlpha = p.opacity;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      // Remove dead particles
      if (p.opacity <= 0 || p.x < 0 || p.x > this.canvas.width || p.y > this.canvas.height) {
        this.particles.splice(i, 1);
      }
    }

    requestAnimationFrame(() => this.tickParticles());
  }

  getColorHex(colorName) {
    const colors = {
      'Red': '#ff0000',
      'Blue': '#0000ff',
      'Green': '#00ff00',
      'Yellow': '#ffff00',
      'Orange': '#ff7f00',
      'Purple': '#800080'
    };
    return colors[colorName] || colorName;
  }

  /* ==========================================================================
     DOM UI BINDINGS
     ========================================================================== */
  
  /**
   * Checks if a local storage save file exists, showing resume buttons
   */
  checkResumeAvailability() {
    const btnMenu = document.getElementById('load-saved-btn');
    if (this.game.hasSavedGame()) {
      btnMenu.classList.remove('hidden');
    } else {
      btnMenu.classList.add('hidden');
    }
  }

  /**
   * Main Menu listeners
   */
  bindMenuEvents() {
    // Player Count Buttons
    const countBtns = document.querySelectorAll('.count-btn');
    countBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        countBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        this.playerCount = parseInt(e.target.getAttribute('data-players'));
        this.renderNameInputFields(this.playerCount);
      });
    });

    // Start Game Button
    document.getElementById('start-game-btn').addEventListener('click', () => {
      // Gather Player Names
      const nameInputs = document.querySelectorAll('.player-name-input');
      const names = Array.from(nameInputs).map(input => input.value || input.placeholder);
      
      // Swap Screen and Launch Game
      this.switchScreen('game-screen');
      this.game.startNewGame(names);
      this.checkResumeAvailability();
    });

    // Resume Save Button
    document.getElementById('load-saved-btn').addEventListener('click', () => {
      this.switchScreen('game-screen');
      const loaded = this.game.loadGame();
      if (!loaded) {
        alert('Could not resume save game. Starting fresh.');
        const names = ['Player 1', 'Player 2', 'Player 3'];
        this.game.startNewGame(names);
      }
    });

    // Rules Menu Trigger
    document.getElementById('rules-btn').addEventListener('click', () => {
      this.showModal('rules-modal');
    });
  }

  /**
   * Gameplay screen controls
   */
  bindGameplayEvents() {
    // Roll Die Button
    document.getElementById('roll-die-btn').addEventListener('click', () => {
      this.game.rollDie();
    });

    // Header Actions
    document.getElementById('pause-btn').addEventListener('click', () => {
      this.showModal('pause-modal');
    });
    
    document.getElementById('game-rules-btn').addEventListener('click', () => {
      this.showModal('rules-modal');
    });

    document.getElementById('restart-game-btn').addEventListener('click', () => {
      if (confirm('Are you sure you want to restart? This resets scores and shuffles pawns.')) {
        this.game.startNewGame(this.game.players.map(p => p.name));
      }
    });

    document.getElementById('quit-game-btn').addEventListener('click', () => {
      if (confirm('Exit current match and return to Main Menu? Unsaved progress will be lost.')) {
        this.switchScreen('main-menu');
        this.checkResumeAvailability();
      }
    });

    // Pawn Board Clicking Event Delegation
    const boardEl = document.getElementById('circular-board');
    boardEl.addEventListener('click', (e) => {
      // Traverse up to find clicked board-hole or pawn-3d
      const hole = e.target.closest('.board-hole');
      if (hole && !hole.classList.contains('empty')) {
        const index = parseInt(hole.getAttribute('data-hole-index'));
        this.game.selectPawn(index);
      }
    });
  }

  /**
   * Modal trigger options
   */
  bindModalEvents() {
    // General closes
    document.getElementById('rules-close-btn').addEventListener('click', () => this.hideModal('rules-modal'));
    document.getElementById('rules-understand-btn').addEventListener('click', () => this.hideModal('rules-modal'));
    
    // Pause Overlay
    document.getElementById('resume-btn').addEventListener('click', () => this.hideModal('pause-modal'));
    
    document.getElementById('save-game-btn').addEventListener('click', () => {
      this.game.saveGame();
      alert('Game progress saved!');
      this.hideModal('pause-modal');
      this.checkResumeAvailability();
    });
    
    document.getElementById('pause-rules-btn').addEventListener('click', () => {
      this.showModal('rules-modal');
    });
    
    document.getElementById('pause-restart-btn').addEventListener('click', () => {
      if (confirm('Restart game from scratch?')) {
        this.hideModal('pause-modal');
        this.game.startNewGame(this.game.players.map(p => p.name));
      }
    });
    
    document.getElementById('pause-quit-btn').addEventListener('click', () => {
      if (confirm('Return to main menu?')) {
        this.hideModal('pause-modal');
        this.switchScreen('main-menu');
        this.checkResumeAvailability();
      }
    });

    // Victory Overlays
    document.getElementById('play-again-btn').addEventListener('click', () => {
      this.hideModal('victory-modal');
      this.victoryConfettiActive = false;
      this.game.startNewGame(this.game.players.map(p => p.name));
    });

    document.getElementById('victory-exit-btn').addEventListener('click', () => {
      this.hideModal('victory-modal');
      this.victoryConfettiActive = false;
      this.switchScreen('main-menu');
      this.checkResumeAvailability();
    });
  }

  /**
   * Helper to switch screens
   */
  switchScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));
    
    const active = document.getElementById(screenId);
    if (active) active.classList.add('active');
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  /**
   * Renders input forms in Main Menu dynamically based on player count
   */
  renderNameInputFields(count) {
    const container = document.getElementById('names-fields-container');
    if (!container) return;
    
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const group = document.createElement('div');
      group.className = 'input-group';
      
      const label = document.createElement('span');
      label.innerText = `Player ${i + 1}`;
      
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 15;
      input.className = 'player-name-input';
      input.placeholder = `Player ${i + 1}`;
      input.id = `input-player-${i}`;
      
      // Auto fill saved settings if any
      const savedName = localStorage.getItem(`color_quest_pname_${i}`);
      if (savedName) {
        input.value = savedName;
      }

      // Track changes to persist names
      input.addEventListener('change', (e) => {
        localStorage.setItem(`color_quest_pname_${i}`, e.target.value);
      });
      
      group.appendChild(label);
      group.appendChild(input);
      container.appendChild(group);
    }
  }

  /* ==========================================================================
     GAMEPLAY STATE GRAPHIC RENDERING
     ========================================================================== */

  /**
   * Redraws scoreboards, turn glows, text descriptions, and disables/enables roll buttons
   */
  updateUIState() {
    const activePlayer = this.game.getActivePlayer();
    
    // 1. Update scoreboard sidebar
    const listContainer = document.getElementById('players-list');
    listContainer.innerHTML = '';

    this.game.players.forEach(p => {
      const card = document.createElement('div');
      card.className = `player-panel ${p.turnStatus ? 'active-turn' : ''}`;
      card.id = `player-card-${p.id}`;

      const header = document.createElement('div');
      header.className = 'player-panel-header';

      const name = document.createElement('span');
      name.className = 'player-panel-name';
      name.innerText = p.name;
      name.title = p.name;

      const score = document.createElement('span');
      score.className = 'player-panel-score';
      score.innerText = p.score;

      header.appendChild(name);
      header.appendChild(score);

      const indicator = document.createElement('span');
      indicator.className = 'player-panel-indicator';
      indicator.innerText = 'Turn';

      const collectedBox = document.createElement('div');
      collectedBox.className = 'collected-pawns-box';
      collectedBox.id = `collected-box-${p.id}`;

      // Render dots representing collected pawn colors
      p.collectedPawns.forEach(color => {
        const dot = document.createElement('span');
        dot.className = 'tiny-pawn-dot';
        dot.style.color = this.getColorHex(color);
        dot.style.backgroundColor = this.getColorHex(color);
        collectedBox.appendChild(dot);
      });

      const headerWrapper = document.createElement('div');
      headerWrapper.className = 'player-panel-header';
      headerWrapper.appendChild(name);
      headerWrapper.appendChild(indicator);

      const topRow = document.createElement('div');
      topRow.className = 'player-panel-header';
      topRow.appendChild(headerWrapper);
      topRow.appendChild(score);

      card.appendChild(topRow);
      card.appendChild(collectedBox);
      listContainer.appendChild(card);
    });

    // 2. Update central panel instructions
    const activeNameText = document.getElementById('active-player-name');
    activeNameText.innerText = activePlayer ? activePlayer.name : '-';

    const targetColorText = document.getElementById('target-color-text');
    const targetColorDot = document.getElementById('target-color-preview');
    const diceStatusText = document.getElementById('dice-status');
    const rollBtn = document.getElementById('roll-die-btn');

    if (this.game.rolledColor) {
      targetColorText.innerText = this.game.rolledColor;
      targetColorDot.style.backgroundColor = this.getColorHex(this.game.rolledColor);
      targetColorDot.classList.remove('hidden');
      diceStatusText.innerText = `Rolled: ${this.game.rolledColor}`;
    } else {
      targetColorText.innerText = 'Roll first';
      targetColorDot.classList.add('hidden');
      diceStatusText.innerText = this.game.phase === 'ROLLING' ? 'Roll to start turn' : 'Choosing pawn';
    }

    // 3. Update turn instructions guide
    const instructionsText = document.getElementById('turn-action-instructions');
    if (this.game.phase === 'ROLLING') {
      instructionsText.innerText = `Click the Roll Die button in the center to get your target color.`;
      rollBtn.removeAttribute('disabled');
    } else if (this.game.phase === 'CHOOSING') {
      instructionsText.innerText = `Look at the board! Select a pawn. Try to find the matching hidden ${this.game.rolledColor} base.`;
      rollBtn.setAttribute('disabled', 'true');
    } else if (this.game.phase === 'REVEALING') {
      instructionsText.innerText = `Verifying pawn...`;
      rollBtn.setAttribute('disabled', 'true');
    }

    // Auto-save game details when phases shift (except if victory screen handles it)
    if (this.game.phase !== 'GAME_OVER' && this.game.players.length > 0) {
      this.game.saveGame();
    }
  }

  /**
   * Action match logic: Triggers fly movement to sidebar and pops particles
   */
  handleMatch(pawn, playerIndex) {
    const targetBox = document.getElementById(`collected-box-${playerIndex}`);
    if (!targetBox || !pawn.domElement) return;

    // Get pawn center position on screen
    const rect = pawn.domElement.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // Trigger visual confetti burst
    this.spawnMatchParticles(x, y, pawn.color);

    // Slide pawn element to player score sidebar
    pawn.animateToCollection(targetBox, () => {
      // Re-render state after animation concludes
      this.updateUIState();
    });
  }

  handleMismatch(pawn) {
    // Mismatches display color for 2s (handled by JS state timeouts)
    this.updateUIState();
  }

  handleTurnChange(index) {
    // Plays sound on slide (handled by State nextTurn)
    this.updateUIState();
  }

  /**
   * Show final ranking results and launch screen celebrations
   */
  handleGameOver(standings, winnerText) {
    // Delete save file since game is completed
    this.game.clearSave();
    this.checkResumeAvailability();

    const title = document.getElementById('victory-title');
    title.innerText = winnerText;

    const list = document.getElementById('victory-standings');
    list.innerHTML = '';

    standings.forEach((p, idx) => {
      const row = document.createElement('div');
      row.className = `standing-row rank-${idx + 1}`;

      const left = document.createElement('div');
      left.className = 'standing-left';

      const rankStr = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}th`;
      const rank = document.createElement('span');
      rank.className = 'standing-rank';
      rank.innerText = rankStr;

      const name = document.createElement('span');
      name.className = 'standing-name';
      name.innerText = p.name;

      left.appendChild(rank);
      left.appendChild(name);

      const score = document.createElement('span');
      score.className = 'standing-score';
      score.innerText = `${p.score} pts`;

      row.appendChild(left);
      row.appendChild(score);
      list.appendChild(row);
    });

    // Toggle full screen confetti bursts
    this.victoryConfettiActive = true;
    this.spawnVictoryShower();

    // Show Victory Screen
    setTimeout(() => {
      this.showModal('victory-modal');
    }, 1500);
  }

  appendLog(msg, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${msg}`);
  }
}

// Bind load listener
window.addEventListener('DOMContentLoaded', () => {
  window.App = new UIManager();
});
