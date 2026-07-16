/**
 * Color Quest - Game Logic Controller
 * Manages the state machine, turns, matching rules, and save/load state.
 */
class Game {
  constructor() {
    this.players = [];          // Array of player objects
    this.currentTurn = 0;       // Index of the current player
    this.board = null;          // Board controller instance
    this.die = null;            // Die controller instance
    
    // State machine properties
    this.phase = 'ROLLING';     // 'ROLLING', 'CHOOSING', 'REVEALING', 'GAME_OVER'
    this.rolledColor = null;    // Color of the die roll: Red, Blue, etc.
    this.selectedPawn = null;   // The currently selected Pawn object
    this.remainingPawns = 24;
    
    // Callback event hooks bound by UI manager
    this.onStateChange = null;
    this.onLog = null;
    this.onMatch = null;
    this.onMismatch = null;
    this.onGameOver = null;
    this.onTurnChange = null;
  }

  /**
   * Initializes a brand new game
   * @param {Array<string>} playerNames - Array of user names
   */
  startNewGame(playerNames) {
    this.players = playerNames.map((name, index) => ({
      id: index,
      name: name.trim() || `Player ${index + 1}`,
      score: 0,
      collectedPawns: [],
      turnStatus: index === 0
    }));

    this.currentTurn = 0;
    this.phase = 'ROLLING';
    this.rolledColor = null;
    this.selectedPawn = null;
    this.remainingPawns = 24;

    this.log(`New Game started with ${this.players.length} players!`, 'system');

    // Create a fresh board and shuffle pawns
    this.board.initHoles();
    this.shuffleAndPlacePawns();
    this.die.reset();

    this.notifyState();
  }

  /**
   * Fisher-Yates Shuffling of 24 pawns (4 of each of the 6 colors)
   * Places them in the board's 24 holes
   */
  shuffleAndPlacePawns() {
    const colors = ['Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple'];
    const pawnPool = [];

    // Create 24 colors
    colors.forEach(color => {
      for (let i = 0; i < 4; i++) {
        pawnPool.push(color);
      }
    });

    // Fisher-Yates shuffle
    for (let i = pawnPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pawnPool[i], pawnPool[j]] = [pawnPool[j], pawnPool[i]];
    }

    // Place them into holes
    pawnPool.forEach((color, index) => {
      const pawn = new Pawn(index, color, index);
      this.board.placePawn(pawn, index);
    });

    this.log('The board has been set. The hidden colors are randomized!', 'info');
  }

  /**
   * Rolls the color die to start the player's choice phase
   */
  rollDie() {
    if (this.phase !== 'ROLLING') return;

    this.phase = 'REVEALING'; // Temporary lock clicking during spin
    this.notifyState();

    const colors = ['Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple'];
    const rollResult = colors[Math.floor(Math.random() * colors.length)];

    this.die.roll(rollResult, (color) => {
      this.rolledColor = color;
      this.phase = 'CHOOSING';
      this.log(`${this.getActivePlayer().name} rolled ${color}!`, 'turn');
      this.notifyState();
    });
  }

  /**
   * Handles user selecting/lifting a pawn
   * @param {number} holeIndex - Index of the clicked hole
   */
  selectPawn(holeIndex) {
    if (this.phase !== 'CHOOSING') return;

    const hole = this.board.holes[holeIndex];
    if (!hole || !hole.occupied || !hole.pawn) return;

    this.phase = 'REVEALING'; // Lock other interactions
    const pawn = hole.pawn;
    this.selectedPawn = pawn;

    // Animate lifting
    pawn.lift();
    this.log(`${this.getActivePlayer().name} selected a pawn...`, 'info');

    // Run check rule after the lift animation settles (e.g. 800ms)
    setTimeout(() => {
      this.checkMatch();
    }, 1000);
  }

  /**
   * Verifies if the revealed pawn matches the target die color
   */
  checkMatch() {
    const activePlayer = this.getActivePlayer();
    const pawn = this.selectedPawn;

    if (pawn.color === this.rolledColor) {
      // 1. Success Match!
      this.log(`MATCH! Found a ${pawn.color} pawn. ${activePlayer.name} gets 1 point and an extra turn!`, 'match');
      
      activePlayer.score += 1;
      activePlayer.collectedPawns.push(pawn.color);
      this.remainingPawns -= 1;

      // Trigger success sound (score / match combination)
      window.AudioEngine.playMatch();
      setTimeout(() => {
        window.AudioEngine.playScore();
      }, 350);

      // Remove from board logic
      this.board.clearHole(pawn.holeIndex);

      // Trigger UI flying animations hook
      if (this.onMatch) {
        this.onMatch(pawn, activePlayer.id);
      }

      // Check for Game Over
      if (this.remainingPawns === 0) {
        setTimeout(() => {
          this.endGame();
        }, 1200);
        return;
      }

      // Setup for Extra Turn
      setTimeout(() => {
        this.phase = 'ROLLING';
        this.rolledColor = null;
        this.selectedPawn = null;
        this.die.reset();
        this.notifyState();
      }, 1100);

    } else {
      // 2. Failed Match!
      this.log(`MISS! Pawn is ${pawn.color}. Turn passes clockwise.`, 'miss');
      
      window.AudioEngine.playMismatch();

      // Trigger mismatch visual alert or UI hook if any
      if (this.onMismatch) {
        this.onMismatch(pawn);
      }

      // Wait 2 seconds with pawn revealed, then return it and swap turn
      setTimeout(() => {
        pawn.lower();
        
        setTimeout(() => {
          this.selectedPawn = null;
          this.rolledColor = null;
          this.die.reset();
          this.nextTurn();
        }, 600); // Wait for pawn descent transition to complete
      }, 2000);
    }
  }

  /**
   * Pass turn clockwise to the next player
   */
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
  }

  /**
   * Trigger victory calculations and rankings
   */
  endGame() {
    this.phase = 'GAME_OVER';
    this.log('The board is empty. Game Over!', 'system');
    
    // Sort players by score descending
    const standings = [...this.players].sort((a, b) => b.score - a.score);
    
    // Check if there's a tie
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

    this.notifyState();
  }

  /**
   * Save the current game state to localStorage
   */
  saveGame() {
    const saveState = {
      players: this.players,
      currentTurn: this.currentTurn,
      phase: this.phase,
      rolledColor: this.rolledColor,
      remainingPawns: this.remainingPawns,
      boardLayout: this.board.holes.map(hole => {
        if (hole.occupied && hole.pawn) {
          return {
            id: hole.pawn.id,
            color: hole.pawn.color,
            holeIndex: hole.pawn.holeIndex
          };
        }
        return null; // Empty
      })
    };

    localStorage.setItem('color_quest_save_game', JSON.stringify(saveState));
    this.log('Game progress saved successfully.', 'info');
  }

  /**
   * Loads game state from localStorage
   * @returns {boolean} - Success flag
   */
  loadGame() {
    const savedStr = localStorage.getItem('color_quest_save_game');
    if (!savedStr) return false;

    try {
      const state = JSON.parse(savedStr);
      
      this.players = state.players;
      this.currentTurn = state.currentTurn;
      this.phase = state.phase;
      this.rolledColor = state.rolledColor;
      this.remainingPawns = state.remainingPawns;

      // Rebuild board holes
      this.board.initHoles();
      state.boardLayout.forEach((pawnData, index) => {
        if (pawnData) {
          const pawn = new Pawn(pawnData.id, pawnData.color, pawnData.holeIndex);
          this.board.placePawn(pawn, index);
        } else {
          this.board.clearHole(index);
        }
      });

      // Synchronize die face orientation
      if (this.rolledColor) {
        const targetRot = this.die.rotations[this.rolledColor];
        this.die.currentRotation = { x: targetRot.x, y: targetRot.y, z: 0 };
        this.die.cubeElement.style.transform = `rotateX(${targetRot.x}deg) rotateY(${targetRot.y}deg) rotateZ(0deg)`;
      } else {
        this.die.reset();
      }

      this.log('Resumed game session from auto-save.', 'system');
      this.notifyState();
      return true;
    } catch (err) {
      console.error('Error loading game state:', err);
      return false;
    }
  }

  /**
   * Helper to check if save exists
   */
  hasSavedGame() {
    return localStorage.getItem('color_quest_save_game') !== null;
  }

  /**
   * Deletes save game from storage
   */
  clearSave() {
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

// Bind to window
window.Game = Game;
