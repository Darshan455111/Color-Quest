class NetworkManager {
  constructor(ui) {
    this.ui = ui;
    this.game = ui.game;
    this.peer = null;
    this.conn = null;
    
    this.active = false;
    this.isHost = false;
    this.roomCode = null;
    this.localName = '';
    this.remoteName = '';
  }

  createRoom(playerName) {
    this.isHost = true;
    this.localName = playerName || 'Host';
    this.generateRoomAndConnect();
  }

  generateRoomAndConnect() {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    this.roomCode = code;
    
    const peerId = 'cquest-' + code;
    
    if (this.peer) {
      this.peer.destroy();
    }

    this.peer = new Peer(peerId);

    this.peer.on('open', () => {
      document.getElementById('room-code-display').classList.remove('hidden');
      document.getElementById('val-room-code').innerText = this.roomCode;
      const statusEl = document.getElementById('host-lobby-status');
      statusEl.innerText = 'Waiting for player to connect...';
      statusEl.classList.remove('hidden');
    });

    this.peer.on('connection', (conn) => {
      this.conn = conn;
      this.setupConnection();
    });

    this.peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        this.generateRoomAndConnect();
      } else {
        console.error('Peer error:', err);
        alert('Lobby signaling error. Try again.');
      }
    });
  }

  joinRoom(code, playerName) {
    this.isHost = false;
    this.roomCode = code.trim();
    this.localName = playerName || 'Guest';

    const statusEl = document.getElementById('join-lobby-status');
    statusEl.innerText = 'Connecting to Lobby...';
    statusEl.classList.remove('hidden');

    if (this.peer) {
      this.peer.destroy();
    }

    this.peer = new Peer();

    this.peer.on('open', () => {
      this.conn = this.peer.connect('cquest-' + this.roomCode);
      this.setupConnection();
    });

    this.peer.on('error', (err) => {
      console.error('Peer connection error:', err);
      statusEl.innerText = 'Failed to connect. Verify code.';
    });
  }

  setupConnection() {
    this.conn.on('open', () => {
      this.active = true;
      document.getElementById('connection-status-dot').classList.remove('hidden');
      document.getElementById('connection-status-dot').style.backgroundColor = '#27ae60';

      if (!this.isHost) {
        this.send({
          type: 'GUEST_INFO',
          name: this.localName
        });
        document.getElementById('join-lobby-status').innerText = 'Connected! Waiting for host to start...';
      } else {
        document.getElementById('host-lobby-status').innerText = 'Player connected! Press Start Online Match.';
        const startBtn = document.getElementById('btn-start-online');
        startBtn.classList.remove('hidden');
        startBtn.removeAttribute('disabled');
      }
    });

    this.conn.on('data', (data) => {
      this.handleIncomingData(data);
    });

    this.conn.on('close', () => {
      this.handleDisconnect();
    });

    this.conn.on('error', (err) => {
      console.error('Connection error:', err);
      this.handleDisconnect();
    });
  }

  send(data) {
    if (this.conn && this.conn.open) {
      this.conn.send(data);
    }
  }

  handleIncomingData(data) {
    switch (data.type) {
      case 'GUEST_INFO':
        this.remoteName = data.name;
        break;

      case 'HOST_INFO':
        this.remoteName = data.name;
        this.game.colorCount = data.colorCount;
        break;

      case 'START_MATCH':
        this.ui.switchScreen('game-screen');
        this.game.clearAllTimeouts();
        this.game.colorCount = data.colorCount;
        this.game.remainingPawns = 24;
        this.game.currentTurn = 0;
        this.game.phase = 'ROLLING';
        this.game.rolledColor = null;
        this.game.selectedPawn = null;

        this.game.players = data.players.map((p, idx) => ({
          ...p,
          turnStatus: idx === 0
        }));

        this.game.board.initHoles();
        data.boardLayout.forEach((pData, index) => {
          if (pData) {
            const pawn = new Pawn(pData.id, pData.color, index);
            this.game.board.placePawn(pawn, index);
          } else {
            this.game.board.clearHole(index);
          }
        });

        this.game.die.reset();
        this.game.notifyState();
        this.game.checkComputerTurn();
        break;

      case 'ROLL_DIE':
        this.game.rollDie(data.color, true);
        break;

      case 'SELECT_PAWN':
        this.game.selectPawn(data.holeIndex, true);
        break;

      case 'RESTART_GAME':
        this.game.startNewGame(this.game.players.map(p => ({
          name: p.name,
          isComputer: p.isComputer
        })), this.game.colorCount);
        break;
    }
  }

  isLocalTurn() {
    if (!this.active) return true;
    const activePlayerIdx = this.game.currentTurn;
    if (this.isHost) {
      return activePlayerIdx === 0;
    } else {
      return activePlayerIdx === 1;
    }
  }

  handleDisconnect() {
    this.active = false;
    document.getElementById('connection-status-dot').style.backgroundColor = '#d63031';
    alert('Friend disconnected. Match ended.');
    this.ui.switchScreen('main-menu');
    this.ui.checkResumeAvailability();
  }

  disconnect() {
    this.active = false;
    if (this.conn) {
      this.conn.close();
    }
    if (this.peer) {
      this.peer.destroy();
    }
  }
}

window.NetworkManagerClass = NetworkManager;
