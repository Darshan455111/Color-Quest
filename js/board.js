class Board {
  constructor() {
    this.boardElement = document.getElementById('circular-board');
    this.holes = [];
    this.totalHoles = 24;
    this.radius = 215;
    this.initHoles();
  }

  initHoles() {
    if (!this.boardElement) return;

    const existingHoles = this.boardElement.querySelectorAll('.board-hole');
    existingHoles.forEach(h => h.remove());

    this.holes = [];
    const boardWidth = 660;
    const boardHeight = 660;
    const centerX = boardWidth / 2;
    const centerY = boardHeight / 2;

    for (let i = 0; i < this.totalHoles; i++) {
      const angle = (i * 2 * Math.PI) / this.totalHoles - Math.PI / 2;
      const currentRadiusPercent = (i % 2 === 0) ? 41.67 : 31.82;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      const holeElement = document.createElement('div');
      holeElement.className = 'board-hole';
      holeElement.setAttribute('data-hole-index', i);
      holeElement.id = `hole-${i}`;
      
      holeElement.style.left = `calc(50% + ${currentRadiusPercent * cos}% - (var(--hole-size) / 2))`;
      holeElement.style.top = `calc(50% + ${currentRadiusPercent * sin}% - (var(--hole-size) / 2))`;

      this.boardElement.appendChild(holeElement);

      this.holes.push({
        id: i,
        occupied: false,
        pawn: null,
        element: holeElement
      });
    }
  }

  placePawn(pawn, holeIndex) {
    if (holeIndex < 0 || holeIndex >= this.totalHoles) return;

    const hole = this.holes[holeIndex];
    hole.occupied = true;
    hole.pawn = pawn;

    hole.element.innerHTML = '';
    hole.element.classList.remove('empty');

    const pawnDOM = pawn.render();
    hole.element.appendChild(pawnDOM);
  }

  clearHole(holeIndex) {
    if (holeIndex < 0 || holeIndex >= this.totalHoles) return;

    const hole = this.holes[holeIndex];
    hole.occupied = false;
    hole.pawn = null;
    hole.element.classList.add('empty');
  }

  reset() {
    this.holes.forEach(hole => {
      hole.occupied = false;
      hole.pawn = null;
      hole.element.innerHTML = '';
      hole.element.classList.remove('empty');
    });
  }
}

window.Board = Board;
