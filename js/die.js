/**
 * Color Quest - Die Class
 * Manages the 3D CSS Cube rendering and roll spin transitions.
 */
class Die {
  constructor() {
    this.container = document.getElementById('die-container-3d');
    this.cubeElement = null;
    this.colors = ['Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple'];
    
    // Map colors to the rotation angles required to display that face in front
    this.rotations = {
      'Red':    { x: 0,   y: 0 },    // Front Face
      'Blue':   { x: 0,   y: 180 },  // Back Face
      'Green':  { x: 0,   y: -90 },  // Right Face
      'Yellow': { x: 0,   y: 90 },   // Left Face
      'Orange': { x: -90, y: 0 },    // Top Face
      'Purple': { x: 90,  y: 0 }     // Bottom Face
    };

    // Tracks current base rotation to prevent snap-back during subsequent rolls
    this.currentRotation = { x: 0, y: 0, z: 0 };
    this.render();
  }

  /**
   * Builds the 3D cube markup inside the container
   */
  render() {
    if (!this.container) return;
    this.container.innerHTML = '';

    const cube = document.createElement('div');
    cube.className = 'die-cube';

    const faces = [
      { class: 'face-red', color: 'Red' },
      { class: 'face-blue', color: 'Blue' },
      { class: 'face-green', color: 'Green' },
      { class: 'face-yellow', color: 'Yellow' },
      { class: 'face-orange', color: 'Orange' },
      { class: 'face-purple', color: 'Purple' }
    ];

    faces.forEach(f => {
      const face = document.createElement('div');
      face.className = `die-face ${f.class}`;
      face.setAttribute('data-color', f.color);
      cube.appendChild(face);
    });

    this.container.appendChild(cube);
    this.cubeElement = cube;
  }

  /**
   * Rolls the die to a specific color
   * @param {string} targetColor - The color to land on (Red, Blue, Green, Yellow, Orange, Purple)
   * @param {Function} onComplete - Callback triggered when rolling stops
   */
  roll(targetColor, onComplete) {
    if (!this.cubeElement || !this.rotations[targetColor]) {
      if (onComplete) onComplete();
      return;
    }

    // Play rolling sound via sound engine
    window.AudioEngine.playRoll();

    const target = this.rotations[targetColor];
    
    // Add multiple full revolutions to make the spin look chaotic
    // We add at least 3-4 full turns (1080 - 1440 degrees) and rotate X, Y, and Z
    const turnsX = 3 + Math.floor(Math.random() * 3);
    const turnsY = 3 + Math.floor(Math.random() * 3);
    const turnsZ = 2 + Math.floor(Math.random() * 2);

    const targetX = target.x + (turnsX * 360);
    const targetY = target.y + (turnsY * 360);
    const targetZ = (turnsZ * 360) + (Math.random() > 0.5 ? 90 : 0); // extra Z twist

    // Keep accumulating rotations to always spin forward
    this.currentRotation.x = targetX;
    this.currentRotation.y = targetY;
    this.currentRotation.z = targetZ;

    // Apply CSS 3D Transform
    this.cubeElement.style.transform = `rotateX(${this.currentRotation.x}deg) rotateY(${this.currentRotation.y}deg) rotateZ(${this.currentRotation.z}deg)`;

    // Wait for the transition to finish (1.5s in CSS)
    setTimeout(() => {
      if (onComplete) onComplete(targetColor);
    }, 1550);
  }
  
  /**
   * Resets die back to default orientation (Red face forward)
   */
  reset() {
    if (!this.cubeElement) return;
    this.currentRotation = { x: 0, y: 0, z: 0 };
    this.cubeElement.style.transform = `rotateX(0deg) rotateY(0deg) rotateZ(0deg)`;
  }
}

// Bind to window
window.Die = Die;
