/**
 * Color Quest - Board Class
 * Manages the circular board representation and hole position trigonometry.
 */
class Board {
  constructor() {
    this.boardElement = document.getElementById('circular-board');
    this.holes = []; // Array of hole objects: { id, occupied, pawn, element }
    this.totalHoles = 24;
    this.radius = 215; // Radius of the circular path in pixels (for 540px board)
    
    this.initHoles();
  }

  /**
   * Initializes the 24 circular hole elements and positions them using trigonometry
   */
  initHoles() {
    if (!this.boardElement) return;

    // Remove existing hole elements if restarting
    const existingHoles = this.boardElement.querySelectorAll('.board-hole');
    existingHoles.forEach(h => h.remove());

    this.holes = [];
    const boardWidth = 540; // Base size matching style.css (widescreen)
    const boardHeight = 540;
    const centerX = boardWidth / 2;
    const centerY = boardHeight / 2;

    for (let i = 0; i < this.totalHoles; i++) {
      const angle = (i * 2 * Math.PI) / this.totalHoles - Math.PI / 2; // Start from the top (12 o'clock)
      
      // Alternate radius between 220px (outer circle) and 165px (inner circle)
      const currentRadius = (i % 2 === 0) ? 220 : 165;
      
      // Calculate center position for the hole using staggered radius
      const x = centerX + currentRadius * Math.cos(angle);
      const y = centerY + currentRadius * Math.sin(angle);
      
      // Create hole element
      const holeElement = document.createElement('div');
      holeElement.className = 'board-hole';
      holeElement.setAttribute('data-hole-index', i);
      holeElement.id = `hole-${i}`;
      
      // Set absolute positioning (will be scaled on smaller screens via CSS)
      // Subtract half hole width (46px / 2 = 23px)
      holeElement.style.left = `${x - 23}px`;
      holeElement.style.top = `${y - 23}px`;

      this.boardElement.appendChild(holeElement);

      this.holes.push({
        id: i,
        occupied: false,
        pawn: null,
        element: holeElement
      });
    }
  }

  /**
   * Places a pawn inside a specific hole index
   * @param {Pawn} pawn 
   * @param {number} holeIndex 
   */
  placePawn(pawn, holeIndex) {
    if (holeIndex < 0 || holeIndex >= this.totalHoles) return;

    const hole = this.holes[holeIndex];
    hole.occupied = true;
    hole.pawn = pawn;

    // Clear existing contents in the hole DOM
    hole.element.innerHTML = '';
    hole.element.classList.remove('empty');

    // Render and append pawn
    const pawnDOM = pawn.render();
    hole.element.appendChild(pawnDOM);
  }

  /**
   * Empty a hole, removing the pawn and updating class styles
   * @param {number} holeIndex 
   */
  clearHole(holeIndex) {
    if (holeIndex < 0 || holeIndex >= this.totalHoles) return;

    const hole = this.holes[holeIndex];
    hole.occupied = false;
    hole.pawn = null;
    hole.element.classList.add('empty');
  }

  /**
   * Resets all holes to unoccupied
   */
  reset() {
    this.holes.forEach(hole => {
      hole.occupied = false;
      hole.pawn = null;
      hole.element.innerHTML = '';
      hole.element.classList.remove('empty');
    });
  }
}

// Bind to window
window.Board = Board;
