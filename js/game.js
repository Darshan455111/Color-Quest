class Game {
  constructor() {
    this.players = [];
    this.currentTurn = 0;
    this.board = null;
    this.die = null;
    this.activeTimeouts = [];
    
    this.phase = 'ROLLING';
    this.rolledColor = null;
    this.selectedPawn = null;
    this.remainingPawns = 24;
    this.colorCount = 6;
    
    this.onStateChange = null;
    this.onLog = null;
    this.onMatch = null;
    this.onMismatch = null;
    this.onGameOver = null;
    this.onTurnChange = null;
  }

  scheduleTimeout(callback, delay) {
    const id = setTimeout(() => {
      this.activeTimeouts = this.activeTimeouts.filter(tId => tId !== id);
      callback();
    }, delay);
    this.activeTimeouts.push(id);
    return id;
  }

  clearAllTimeouts() {
    this.activeTimeouts.forEach(id => clearTimeout(id));
    this.activeTimeouts = [];
  }

  startNewGame(playersConfig, colorCount) {
    this.clearAllTimeouts();

    this.colorCount = colorCount || 6;
    this.players = playersConfig.map((config, index) => ({
      id: index,
      name: config.name.trim() || `Player ${index + 1}`,
      isComputer: !!config.isComputer,
      score: 0,
      collectedPawns: [],
      turnStatus: index === 0,
      aiMemory: []
    }));

    this.currentTurn = 0;
    this.phase = 'ROLLING';
    this.rolledColor = null;
    this.selectedPawn = null;
    this.remainingPawns = 24;

    const botCount = this.players.filter(p => p.isComputer).length;
    this.log(`New Game started with ${this.players.length} players! (Difficulty: ${this.colorCount} colors, Bots: ${botCount})`, 'system');

    this.board.initHoles();
    this.shuffleAndPlacePawns();
    this.die.reset();

    this.notifyState();
    this.checkComputerTurn();
  }

  shuffleAndPlacePawns() {
    const allColors = ['Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple'];
    const colors = allColors.slice(0, this.colorCount);
    const pawnPool = [];
    const pawnsPerColor = 24 / this.colorCount;

    colors.forEach(color => {
      for (let i = 0; i < pawnsPerColor; i++) {
        pawnPool.push(color);
      }
    });

    for (let i = pawnPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pawnPool[i], pawnPool[j]] = [pawnPool[j], pawnPool[i]];
    }

    for (let i = 0; i < 24; i++) {
      if (i < pawnPool.length) {
        const pawn = new Pawn(i, pawnPool[i], i);
        this.board.placePawn(pawn, i);
      } else {
        this.board.clearHole(i);
      }
    }

    this.log('The board has been set. The hidden colors are randomized!', 'info');
  }

  rollDie(forcedColor = null, isRemote = false) {
    if (this.phase !== 'ROLLING') return;

    this.phase = 'REVEALING';
    this.notifyState();

    const allColors = ['Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple'];
    const colors = allColors.slice(0, this.colorCount);
    const rollResult = forcedColor || colors[Math.floor(Math.random() * colors.length)];

    if (window.NetworkManager && window.NetworkManager.active && !isRemote) {
      window.NetworkManager.send({
        type: 'ROLL_DIE',
        color: rollResult
      });
    }

    this.die.roll(rollResult, (color) => {
      this.rolledColor = color;
      this.phase = 'CHOOSING';
      this.log(`${this.getActivePlayer().name} rolled ${color}!`, 'turn');
      this.notifyState();

      if (this.getActivePlayer().isComputer) {
        this.makeComputerChoice();
      }
    });
  }

  selectPawn(holeIndex, isRemote = false) {
    if (this.phase !== 'CHOOSING') return;

    if (window.NetworkManager && window.NetworkManager.active && !isRemote) {
      window.NetworkManager.send({
        type: 'SELECT_PAWN',
        holeIndex: holeIndex
      });
    }

    const hole = this.board.holes[holeIndex];
    if (!hole || !hole.occupied || !hole.pawn) return;

    this.phase = 'REVEALING';
    const pawn = hole.pawn;
    this.selectedPawn = pawn;

    pawn.lift();
    this.log(`${this.getActivePlayer().name} selected a pawn...`, 'info');

    this.scheduleTimeout(() => {
      this.checkMatch();
    }, 1000);
  }

  checkMatch() {
    const activePlayer = this.getActivePlayer();
    const pawn = this.selectedPawn;

    if (pawn.color === this.rolledColor) {
      this.log(`MATCH! Found a ${pawn.color} pawn. ${activePlayer.name} gets 1 point and an extra turn!`, 'match');
      
      activePlayer.score += 1;
      activePlayer.collectedPawns.push(pawn.color);
      this.remainingPawns -= 1;

      window.AudioEngine.playMatch();
      this.scheduleTimeout(() => {
        window.AudioEngine.playScore();
      }, 350);

      this.board.clearHole(pawn.holeIndex);

      this.players.forEach(p => {
        if (p.isComputer && p.aiMemory) {
          p.aiMemory = p.aiMemory.filter(mem => mem.holeIndex !== pawn.holeIndex);
        }
      });

      if (this.onMatch) {
        this.onMatch(pawn, activePlayer.id);
      }

      if (this.remainingPawns === 0) {
        this.scheduleTimeout(() => {
          this.endGame();
        }, 1200);
        return;
      }

      this.scheduleTimeout(() => {
        this.phase = 'ROLLING';
        this.rolledColor = null;
        this.selectedPawn = null;
        this.die.reset();
        this.notifyState();
        this.checkComputerTurn();
      }, 1100);

    } else {
      this.log(`MISS! Pawn is ${pawn.color}. Turn passes clockwise.`, 'miss');
      
      window.AudioEngine.playMismatch();

      this.players.forEach(p => {
        if (p.isComputer && p.aiMemory) {
          const existingIdx = p.aiMemory.findIndex(mem => mem.holeIndex === pawn.holeIndex);
          if (existingIdx !== -1) {
            p.aiMemory[existingIdx].color = pawn.color;
          } else {
            p.aiMemory.push({ holeIndex: pawn.holeIndex, color: pawn.color });
          }
          
          if (p.aiMemory.length > 5) {
            p.aiMemory.shift();
          }
        }
      });

      if (this.onMismatch) {
        this.onMismatch(pawn);
      }

      this.scheduleTimeout(() => {
        pawn.lower();
        
        this.scheduleTimeout(() => {
          this.selectedPawn = null;
          this.rolledColor = null;
          this.die.reset();
          this.nextTurn();
        }, 600);
      }, 2000);
    }
  }

  nextTurn() {
    this.players[this.currentTurn].turnStatus = false;
    this.currentTurn = (this.currentTurn + 1) % this.players.length;
    this.players[this.currentTurn].turnStatus = true;
    
    this.phase = 'ROLLING';
    this.log(`It is now ${this.getActivePlayer().name}'s turn.`, 'turn');
    
    window.AudioEngine.playTurnChange();

    if (this.onTurnChange) {
      this.onTurnChange(this.currentTurn);
    }

    this.notifyState();
    this.checkComputerTurn();
  }

  checkComputerTurn() {
    if (this.phase === 'GAME_OVER') return;

    const activePlayer = this.getActivePlayer();
    if (activePlayer && activePlayer.isComputer) {
      if (window.NetworkManager && window.NetworkManager.active && !window.NetworkManager.isHost) {
        return;
      }

      this.phase = 'REVEALING';
      this.notifyState();

      this.scheduleTimeout(() => {
        if (this.phase !== 'REVEALING' || !this.getActivePlayer().isComputer) return;
        this.phase = 'ROLLING';
        this.rollDie();
      }, 1200);
    }
  }

  makeComputerChoice() {
    if (window.NetworkManager && window.NetworkManager.active && !window.NetworkManager.isHost) {
      return;
    }

    this.phase = 'REVEALING';
    this.notifyState();

    const activePlayer = this.getActivePlayer();
    const targetColor = this.rolledColor;
    let chosenHoleIndex = -1;

    const matchingMemory = activePlayer.aiMemory.filter(mem => {
      const hole = this.board.holes[mem.holeIndex];
      return hole && hole.occupied && hole.pawn && hole.pawn.color === targetColor;
    });

    if (matchingMemory.length > 0) {
      chosenHoleIndex = matchingMemory[0].holeIndex;
      this.log(`🤖 Computer ${activePlayer.name} remembered a ${targetColor} pawn in hole #${chosenHoleIndex + 1}!`, 'info');
    } else {
      const occupiedHoles = this.board.holes.filter(h => h.occupied);
      if (occupiedHoles.length > 0) {
        const randomHole = occupiedHoles[Math.floor(Math.random() * occupiedHoles.length)];
        chosenHoleIndex = randomHole.id;
        this.log(`🤖 Computer ${activePlayer.name} searched blindly...`, 'info');
      }
    }

    this.scheduleTimeout(() => {
      if (chosenHoleIndex !== -1 && this.getActivePlayer().isComputer) {
        this.phase = 'CHOOSING';
        this.selectPawn(chosenHoleIndex);
      }
    }, 1500);
  }

  endGame() {
    this.phase = 'GAME_OVER';
    this.log('The board is empty. Game Over!', 'system');
    
    const standings = [...this.players].sort((a, b) => b.score - a.score);
    
    const maxScore = standings[0].score;
    const winners = standings.filter(p => p.score === maxScore);
    
    let winnerText = '';
    if (winners.length > 1) {
      winnerText = `It's a TIE between: ${winners.map(w => w.name).join(' & ')}!`;
    } else {
      winnerText = `${winners[0].name} wins!`;
    }

    this.log(winnerText, 'system');
    window.AudioEngine.playVictory();

    if (this.onGameOver) {
      this.onGameOver(standings, winnerText);
    }

    this.clearSave();
    this.notifyState();
  }

  saveGame() {
    const saveState = {
      players: this.players,
      currentTurn: this.currentTurn,
      phase: this.phase,
      rolledColor: this.rolledColor,
      remainingPawns: this.remainingPawns,
      colorCount: this.colorCount,
      boardLayout: this.board.holes.map(hole => {
        if (hole.occupied && hole.pawn) {
          return {
            id: hole.pawn.id,
            color: hole.pawn.color,
            holeIndex: hole.pawn.holeIndex
          };
        }
        return null;
      })
    };

    localStorage.setItem('color_quest_save_game', JSON.stringify(saveState));
    this.log('Game progress saved successfully.', 'info');
  }

  loadGame() {
    this.clearAllTimeouts();

    const savedStr = localStorage.getItem('color_quest_save_game');
    if (!savedStr) return false;

    try {
      const state = JSON.parse(savedStr);
      
      this.players = state.players.map(p => ({
        ...p,
        isComputer: !!p.isComputer,
        aiMemory: p.aiMemory || []
      }));
      this.currentTurn = state.currentTurn;
      this.phase = state.phase;
      this.rolledColor = state.rolledColor;
      this.remainingPawns = state.remainingPawns;
      this.colorCount = state.colorCount || 6;

      this.board.initHoles();
      state.boardLayout.forEach((pawnData, index) => {
        if (pawnData) {
          const pawn = new Pawn(pawnData.id, pawnData.color, pawnData.holeIndex);
          this.board.placePawn(pawn, index);
        } else {
          this.board.clearHole(index);
        }
      });

      if (this.rolledColor) {
        const targetRot = this.die.rotations[this.rolledColor];
        this.die.currentRotation = { x: targetRot.x, y: targetRot.y, z: 0 };
        this.die.cubeElement.style.transform = `rotateX(${targetRot.x}deg) rotateY(${targetRot.y}deg) rotateZ(0deg)`;
      } else {
        this.die.reset();
      }

      this.log('Resumed game session from auto-save.', 'system');
      this.notifyState();

      this.checkComputerTurn();
      return true;
    } catch (err) {
      console.error('Error loading game state:', err);
      return false;
    }
  }

  hasSavedGame() {
    return localStorage.getItem('color_quest_save_game') !== null;
  }

  clearSave() {
    this.clearAllTimeouts();
    localStorage.removeItem('color_quest_save_game');
  }

  getActivePlayer() {
    return this.players[this.currentTurn];
  }

  log(message, type = 'info') {
    if (this.onLog) {
      this.onLog(message, type);
    }
  }

  notifyState() {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }
}

window.Game = Game;
