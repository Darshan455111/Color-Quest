class Die {
  constructor() {
    this.container = document.getElementById('die-container-3d');
    this.cubeElement = null;
    this.colors = ['Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple'];
    
    this.rotations = {
      'Red':    { x: 0,   y: 0 },
      'Blue':   { x: 0,   y: 180 },
      'Green':  { x: 0,   y: -90 },
      'Yellow': { x: 0,   y: 90 },
      'Pink':   { x: -90, y: 0 },
      'Purple': { x: 90,  y: 0 }
    };

    this.currentRotation = { x: 0, y: 0, z: 0 };
    this.render();
  }

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
      { class: 'face-pink', color: 'Pink' },
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

  roll(targetColor, onComplete) {
    if (!this.cubeElement || !this.rotations[targetColor]) {
      if (onComplete) onComplete();
      return;
    }

    window.AudioEngine.playRoll();

    const target = this.rotations[targetColor];
    
    const turnsX = 3 + Math.floor(Math.random() * 3);
    const turnsY = 3 + Math.floor(Math.random() * 3);
    const turnsZ = 2 + Math.floor(Math.random() * 2);

    const targetX = target.x + (turnsX * 360);
    const targetY = target.y + (turnsY * 360);
    const targetZ = (turnsZ * 360) + (Math.random() > 0.5 ? 90 : 0);

    this.currentRotation.x = targetX;
    this.currentRotation.y = targetY;
    this.currentRotation.z = targetZ;

    this.cubeElement.style.transform = `rotateX(${this.currentRotation.x}deg) rotateY(${this.currentRotation.y}deg) rotateZ(${this.currentRotation.z}deg)`;

    setTimeout(() => {
      if (onComplete) onComplete(targetColor);
    }, 1550);
  }
  
  reset() {
    if (!this.cubeElement) return;
    this.currentRotation = { x: 0, y: 0, z: 0 };
    this.cubeElement.style.transform = `rotateX(0deg) rotateY(0deg) rotateZ(0deg)`;
  }
}

window.Die = Die;
