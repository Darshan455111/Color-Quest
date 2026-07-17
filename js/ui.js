class UIManager {
  constructor() {
    this.game = new Game();
    this.board = new Board();
    this.die = new Die();

    this.game.board = this.board;
    this.game.die = this.die;

    this.canvas = document.getElementById('particle-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animationFrameId = null;
    this.victoryConfettiActive = false;

    this.playerCount = 3;
    this.colorCount = 6;

    this.networkManager = new NetworkManagerClass(this);
    window.NetworkManager = this.networkManager;

    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    if (window.AudioEngine) {
      window.AudioEngine.setupToggleUI();
    }

    this.game.onStateChange = () => this.updateUIState();
    this.game.onLog = (msg, type) => this.appendLog(msg, type);
    this.game.onMatch = (pawn, playerIndex) => this.handleMatch(pawn, playerIndex);
    this.game.onMismatch = (pawn) => this.handleMismatch(pawn);
    this.game.onGameOver = (standings, text) => this.handleGameOver(standings, text);
    this.game.onTurnChange = (newTurnIndex) => this.handleTurnChange(newTurnIndex);

    this.bindMenuEvents();
    this.bindGameplayEvents();
    this.bindModalEvents();
    this.checkResumeAvailability();
    this.initTheme();

    this.renderNameInputFields(this.playerCount);
    this.tickParticles();
  }

  initTheme() {
    const savedTheme = localStorage.getItem('color_quest_theme') || 'dark';
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    this.updateThemeButtonsUI();
  }

  toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('color_quest_theme', isDark ? 'dark' : 'light');
    this.updateThemeButtonsUI();
  }

  updateThemeButtonsUI() {
    const isDark = document.body.classList.contains('dark-theme');
    const label = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.innerText = label;
    });
  }

  resizeCanvas() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }

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
        vy: Math.sin(angle) * speed - (1 + Math.random() * 3),
        radius: 3 + Math.random() * 5,
        color: hex,
        opacity: 1,
        decay: 0.015 + Math.random() * 0.02,
        gravity: 0.22,
        friction: 0.96
      });
    }
  }

  spawnVictoryShower() {
    if (!this.victoryConfettiActive) return;

    const colors = ['#ff4757', '#00d2fc', '#2ed573', '#ffa502', '#ff7f50', '#9b59b6', '#ffd700'];
    
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

    requestAnimationFrame(() => this.spawnVictoryShower());
  }

  tickParticles() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      p.vx *= p.friction;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.opacity -= p.decay;

      this.ctx.save();
      this.ctx.globalAlpha = p.opacity;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

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
      'Green': '#00aa00',
      'Yellow': '#ffff00',
      'Pink': '#ff00ff',
      'Purple': '#800080'
    };
    return colors[colorName] || colorName;
  }

  checkResumeAvailability() {
    const btnMenu = document.getElementById('load-saved-btn');
    if (this.game.hasSavedGame()) {
      btnMenu.classList.remove('hidden');
    } else {
      btnMenu.classList.add('hidden');
    }
  }

  bindMenuEvents() {
    // Mode selector buttons (Pass & Play vs Play Online)
    document.getElementById('mode-local-btn').addEventListener('click', (e) => {
      document.getElementById('mode-online-btn').classList.remove('active');
      e.target.classList.add('active');
      document.getElementById('local-setup-container').classList.remove('hidden');
      document.getElementById('online-setup-container').classList.add('hidden');
    });

    document.getElementById('mode-online-btn').addEventListener('click', (e) => {
      document.getElementById('mode-local-btn').classList.remove('active');
      e.target.classList.add('active');
      document.getElementById('local-setup-container').classList.add('hidden');
      document.getElementById('online-setup-container').classList.remove('hidden');
    });

    // Online Choice selector buttons (Create vs Join)
    document.getElementById('btn-choice-create').addEventListener('click', (e) => {
      document.getElementById('btn-choice-join').classList.remove('active');
      e.target.classList.add('active');
      document.getElementById('panel-create-room').classList.remove('hidden');
      document.getElementById('panel-join-room').classList.add('hidden');
      document.getElementById('btn-start-online').classList.add('hidden');
    });

    document.getElementById('btn-choice-join').addEventListener('click', (e) => {
      document.getElementById('btn-choice-create').classList.remove('active');
      e.target.classList.add('active');
      document.getElementById('panel-join-room').classList.remove('hidden');
      document.getElementById('panel-create-room').classList.add('hidden');
      document.getElementById('btn-start-online').classList.add('hidden');
    });

    // Create Room button clicks
    document.getElementById('btn-generate-room').addEventListener('click', () => {
      const name = document.getElementById('online-player-name').value.trim() || 'Host';
      this.networkManager.createRoom(name);
      document.getElementById('btn-generate-room').classList.add('hidden');
    });

    // Copy Code button clicks
    document.getElementById('btn-copy-code').addEventListener('click', () => {
      const code = document.getElementById('val-room-code').innerText;
      if (code && code !== '-') {
        navigator.clipboard.writeText(code).then(() => {
          const btn = document.getElementById('btn-copy-code');
          const oldText = btn.innerText;
          btn.innerText = '✔️ Copied!';
          setTimeout(() => {
            btn.innerText = oldText;
          }, 1000);
        });
      }
    });

    // Join Room button clicks
    document.getElementById('btn-connect-room').addEventListener('click', () => {
      const name = document.getElementById('online-player-name').value.trim() || 'Guest';
      const code = document.getElementById('input-room-code').value.trim();
      if (!code) {
        alert('Please enter a room code.');
        return;
      }
      this.networkManager.joinRoom(code, name);
    });

    // Start Online Game (Host button)
    document.getElementById('btn-start-online').addEventListener('click', () => {
      const players = [
        { id: 0, name: this.networkManager.localName, isComputer: false, score: 0, collectedPawns: [] },
        { id: 1, name: this.networkManager.remoteName, isComputer: false, score: 0, collectedPawns: [] }
      ];
      
      const boardLayout = this.game.board.holes.map(hole => {
        if (hole.occupied && hole.pawn) {
          return { id: hole.pawn.id, color: hole.pawn.color };
        }
        return null;
      });

      const startPayload = {
        type: 'START_MATCH',
        colorCount: this.colorCount,
        players: players,
        boardLayout: boardLayout
      };

      this.networkManager.send(startPayload);
      this.networkManager.handleIncomingData(startPayload);
    });

    const countBtns = document.querySelectorAll('.count-btn');
    countBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (e.target.id === 'mode-local-btn' || e.target.id === 'mode-online-btn' || 
            e.target.id === 'btn-choice-create' || e.target.id === 'btn-choice-join') {
          return;
        }
        countBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        this.playerCount = parseInt(e.target.getAttribute('data-players'));
        this.renderNameInputFields(this.playerCount);
      });
    });

    const diffBtns = document.querySelectorAll('.diff-btn');
    diffBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        diffBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.colorCount = parseInt(e.target.getAttribute('data-colors'));
      });
    });

    document.getElementById('start-game-btn').addEventListener('click', () => {
      const nameInputs = document.querySelectorAll('.player-name-input');
      const configs = Array.from(nameInputs).map((input, i) => {
        const isBot = document.getElementById(`checkbox-bot-${i}`).checked;
        return {
          name: input.value || input.placeholder,
          isComputer: isBot
        };
      });
      
      this.switchScreen('game-screen');
      this.game.startNewGame(configs, this.colorCount);
      this.checkResumeAvailability();
    });

    document.getElementById('load-saved-btn').addEventListener('click', () => {
      this.switchScreen('game-screen');
      const loaded = this.game.loadGame();
      if (!loaded) {
        alert('Could not resume save game. Starting fresh.');
        const names = ['Player 1', 'Player 2', 'Player 3'];
        this.game.startNewGame(names, 6);
      }
    });

    const rulesBtn = document.getElementById('rules-btn');
    if (rulesBtn) {
      rulesBtn.addEventListener('click', () => {
        this.showModal('rules-modal');
      });
    }

    const menuThemeToggle = document.getElementById('menu-theme-toggle');
    if (menuThemeToggle) {
      menuThemeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
  }

  bindGameplayEvents() {
    document.getElementById('roll-die-btn').addEventListener('click', () => {
      if (window.NetworkManager && window.NetworkManager.active) {
        if (!window.NetworkManager.isLocalTurn()) return;
      }
      this.game.rollDie();
    });

    document.getElementById('pause-btn').addEventListener('click', () => {
      this.showModal('pause-modal');
    });
    
    document.getElementById('game-rules-btn').addEventListener('click', () => {
      this.showModal('rules-modal');
    });

    document.getElementById('header-theme-toggle').addEventListener('click', () => {
      this.toggleTheme();
    });

    const makeDraggable = (btn, onTap) => {
      let startX, startY, offsetX, offsetY, dragging = false;

      const onStart = (e) => {
        const touch = e.touches ? e.touches[0] : e;
        const rect = btn.getBoundingClientRect();
        offsetX = touch.clientX - rect.left;
        offsetY = touch.clientY - rect.top;
        startX = touch.clientX;
        startY = touch.clientY;
        dragging = false;
        btn.style.transition = 'none';
      };

      const onMove = (e) => {
        if (startX === undefined) return;
        const touch = e.touches ? e.touches[0] : e;
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragging = true;
        if (dragging) {
          e.preventDefault();
          btn.style.left = (touch.clientX - offsetX) + 'px';
          btn.style.top = (touch.clientY - offsetY) + 'px';
          btn.style.right = 'auto';
          btn.style.bottom = 'auto';
        }
      };

      const onEnd = () => {
        btn.style.transition = '';
        if (!dragging) onTap();
        startX = undefined;
      };

      btn.addEventListener('mousedown', onStart);
      btn.addEventListener('touchstart', onStart, { passive: true });
      document.addEventListener('mousemove', (e) => { if (startX !== undefined) onMove(e); });
      document.addEventListener('touchmove', (e) => { if (startX !== undefined) onMove(e); }, { passive: false });
      document.addEventListener('mouseup', () => { if (startX !== undefined) onEnd(); });
      document.addEventListener('touchend', () => { if (startX !== undefined) onEnd(); });
    };

    makeDraggable(document.getElementById('mobile-players-btn'), () => {
      const leftSidebar = document.querySelector('.left-sidebar');
      leftSidebar.classList.toggle('drawer-open');
      document.querySelector('.right-sidebar').classList.remove('drawer-open');
    });

    makeDraggable(document.getElementById('mobile-status-btn'), () => {
      const rightSidebar = document.querySelector('.right-sidebar');
      rightSidebar.classList.toggle('drawer-open');
      document.querySelector('.left-sidebar').classList.remove('drawer-open');
    });

    document.getElementById('restart-game-btn').addEventListener('click', async () => {
      if (window.NetworkManager && window.NetworkManager.active && !window.NetworkManager.isHost) {
        alert('Only the Host can restart the online match.');
        return;
      }
      const confirmed = await this.showConfirm('Are you sure you want to restart? This resets scores and shuffles pawns.', 'Restart Match?');
      if (confirmed) {
        if (window.NetworkManager && window.NetworkManager.active) {
          window.NetworkManager.send({ type: 'RESTART_GAME' });
        }
        const configs = this.game.players.map(p => ({
          name: p.name,
          isComputer: p.isComputer
        }));
        this.game.startNewGame(configs, this.colorCount);
      }
    });

    document.getElementById('quit-game-btn').addEventListener('click', async () => {
      const confirmed = await this.showConfirm('Exit current match and return to Main Menu? Unsaved progress will be lost.', 'Quit Match?');
      if (confirmed) {
        if (window.NetworkManager && window.NetworkManager.active) {
          window.NetworkManager.disconnect();
        }
        document.getElementById('connection-status-dot').classList.add('hidden');
        this.switchScreen('main-menu');
        this.checkResumeAvailability();
      }
    });

    const boardEl = document.getElementById('circular-board');
    boardEl.addEventListener('click', (e) => {
      document.querySelector('.left-sidebar').classList.remove('drawer-open');
      document.querySelector('.right-sidebar').classList.remove('drawer-open');

      if (window.NetworkManager && window.NetworkManager.active) {
        if (!window.NetworkManager.isLocalTurn()) return;
      }
      const hole = e.target.closest('.board-hole');
      if (hole && !hole.classList.contains('empty')) {
        const index = parseInt(hole.getAttribute('data-hole-index'));
        this.game.selectPawn(index);
      }
    });
  }

  bindModalEvents() {
    document.getElementById('rules-close-btn').addEventListener('click', () => this.hideModal('rules-modal'));
    document.getElementById('rules-understand-btn').addEventListener('click', () => this.hideModal('rules-modal'));
    
    document.getElementById('resume-btn').addEventListener('click', () => this.hideModal('pause-modal'));
    
    document.getElementById('save-game-btn').addEventListener('click', () => {
      this.game.saveGame();
      const saveBtn = document.getElementById('save-game-btn');
      const originalText = saveBtn.innerText;
      saveBtn.innerText = '✔️ Saved!';
      saveBtn.style.background = '#27ae60';
      saveBtn.style.color = '#ffffff';
      saveBtn.disabled = true;
      
      setTimeout(() => {
        saveBtn.innerText = originalText;
        saveBtn.style.background = '';
        saveBtn.style.color = '';
        saveBtn.disabled = false;
        this.hideModal('pause-modal');
        this.checkResumeAvailability();
      }, 1000);
    });
    
    document.getElementById('pause-rules-btn').addEventListener('click', () => {
      this.showModal('rules-modal');
    });
    
    document.getElementById('pause-restart-btn').addEventListener('click', async () => {
      if (window.NetworkManager && window.NetworkManager.active && !window.NetworkManager.isHost) {
        alert('Only the Host can restart the online match.');
        return;
      }
      const confirmed = await this.showConfirm('Restart game from scratch?', 'Restart Match?');
      if (confirmed) {
        this.hideModal('pause-modal');
        if (window.NetworkManager && window.NetworkManager.active) {
          window.NetworkManager.send({ type: 'RESTART_GAME' });
        }
        const configs = this.game.players.map(p => ({
          name: p.name,
          isComputer: p.isComputer
        }));
        this.game.startNewGame(configs, this.colorCount);
      }
    });
    
    document.getElementById('pause-quit-btn').addEventListener('click', async () => {
      const confirmed = await this.showConfirm('Return to main menu?', 'Exit Match?');
      if (confirmed) {
        this.hideModal('pause-modal');
        if (window.NetworkManager && window.NetworkManager.active) {
          window.NetworkManager.disconnect();
        }
        document.getElementById('connection-status-dot').classList.add('hidden');
        this.switchScreen('main-menu');
        this.checkResumeAvailability();
      }
    });

    document.getElementById('play-again-btn').addEventListener('click', () => {
      if (window.NetworkManager && window.NetworkManager.active && !window.NetworkManager.isHost) {
        alert('Only the Host can restart the online match.');
        return;
      }
      this.hideModal('victory-modal');
      this.victoryConfettiActive = false;
      if (window.NetworkManager && window.NetworkManager.active) {
        window.NetworkManager.send({ type: 'RESTART_GAME' });
      }
      const configs = this.game.players.map(p => ({
        name: p.name,
        isComputer: p.isComputer
      }));
      this.game.startNewGame(configs, this.colorCount);
    });

    document.getElementById('victory-exit-btn').addEventListener('click', () => {
      this.game.clearSave();
      if (window.NetworkManager && window.NetworkManager.active) {
        window.NetworkManager.disconnect();
      }
      document.getElementById('connection-status-dot').classList.add('hidden');
      this.hideModal('victory-modal');
      this.victoryConfettiActive = false;
      this.switchScreen('main-menu');
      this.checkResumeAvailability();
    });
  }

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

  showConfirm(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
      document.getElementById('confirm-title').innerText = title;
      document.getElementById('confirm-message').innerText = message;
      
      const modal = document.getElementById('confirm-modal');
      modal.classList.add('active');
      
      const onYes = () => {
        cleanup();
        resolve(true);
      };
      
      const onNo = () => {
        cleanup();
        resolve(false);
      };
      
      const cleanup = () => {
        modal.classList.remove('active');
        document.getElementById('confirm-yes-btn').removeEventListener('click', onYes);
        document.getElementById('confirm-no-btn').removeEventListener('click', onNo);
      };
      
      document.getElementById('confirm-yes-btn').addEventListener('click', onYes);
      document.getElementById('confirm-no-btn').addEventListener('click', onNo);
    });
  }

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
      
      const savedName = localStorage.getItem(`color_quest_pname_${i}`);
      if (savedName) {
        input.value = savedName;
      }

      input.addEventListener('change', (e) => {
        localStorage.setItem(`color_quest_pname_${i}`, e.target.value);
      });

      const cbLabel = document.createElement('label');
      cbLabel.className = 'computer-checkbox-label';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'computer-checkbox';
      checkbox.id = `checkbox-bot-${i}`;

      const savedBot = localStorage.getItem(`color_quest_pbot_${i}`) === 'true';
      checkbox.checked = savedBot;
      if (savedBot) {
        input.value = `Computer ${i + 1}`;
        input.disabled = true;
      }

      checkbox.addEventListener('change', (e) => {
        localStorage.setItem(`color_quest_pbot_${i}`, e.target.checked);
        if (e.target.checked) {
          input.value = `Computer ${i + 1}`;
          input.disabled = true;
        } else {
          input.value = localStorage.getItem(`color_quest_pname_${i}`) || '';
          input.placeholder = `Player ${i + 1}`;
          input.disabled = false;
        }
      });

      const cbText = document.createElement('span');
      cbText.innerText = '🤖 Comp';
      cbText.style.margin = '0';
      cbText.style.width = 'auto';

      cbLabel.appendChild(checkbox);
      cbLabel.appendChild(cbText);
      
      group.appendChild(label);
      group.appendChild(input);
      group.appendChild(cbLabel);
      container.appendChild(group);
    }
  }

  updateUIState() {
    const activePlayer = this.game.getActivePlayer();
    
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
      name.innerText = (p.isComputer ? '🤖 ' : '') + p.name;
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

    if (this.game.phase !== 'GAME_OVER' && this.game.players.length > 0) {
      this.game.saveGame();
    }
  }

  handleMatch(pawn, playerIndex) {
    const targetBox = document.getElementById(`collected-box-${playerIndex}`);
    if (!targetBox || !pawn.domElement) return;

    const rect = pawn.domElement.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    this.spawnMatchParticles(x, y, pawn.color);

    pawn.animateToCollection(targetBox, () => {
      this.updateUIState();
    });
  }

  handleMismatch(pawn) {
    this.updateUIState();
  }

  handleTurnChange(index) {
    this.updateUIState();
  }

  handleGameOver(standings, winnerText) {
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

    this.victoryConfettiActive = true;
    this.spawnVictoryShower();

    setTimeout(() => {
      this.showModal('victory-modal');
    }, 1500);
  }

  appendLog(msg, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${msg}`);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.App = new UIManager();
});
