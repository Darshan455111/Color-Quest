class Pawn {
  constructor(id, color, holeIndex) {
    this.id = id;
    this.color = color;
    this.holeIndex = holeIndex;
    this.collected = false;
    this.owner = null;
    this.domElement = null;
  }

  render() {
    const container = document.createElement('div');
    container.className = 'pawn-container';
    container.setAttribute('data-pawn-id', this.id);
    container.style.display = 'block';

    const pawn3d = document.createElement('div');
    pawn3d.className = 'pawn-3d';

    const stem = document.createElement('div');
    stem.className = 'pawn-stem';

    const bulb = document.createElement('div');
    bulb.className = 'pawn-bulb';

    const body3d = document.createElement('div');
    body3d.className = 'pawn-body-3d';

    const baseRim = document.createElement('div');
    baseRim.className = 'pawn-base-rim';

    stem.appendChild(bulb);
    stem.appendChild(body3d);
    stem.appendChild(baseRim);

    const baseColor = document.createElement('div');
    baseColor.className = 'pawn-base-color';
    baseColor.style.backgroundColor = this.getColorHex(this.color);
    baseColor.style.boxShadow = 'inset 0 0 8px rgba(0, 0, 0, 0.4)';

    pawn3d.appendChild(stem);
    pawn3d.appendChild(baseColor);

    const shadow = document.createElement('div');
    shadow.className = 'pawn-shadow';

    container.appendChild(pawn3d);
    container.appendChild(shadow);

    this.domElement = container;
    return container;
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

  lift() {
    if (!this.domElement) return;
    const pawn3d = this.domElement.querySelector('.pawn-3d');
    if (pawn3d) {
      pawn3d.classList.add('lifted');
      window.AudioEngine.playLift();
    }
  }

  lower() {
    if (!this.domElement) return;
    const pawn3d = this.domElement.querySelector('.pawn-3d');
    if (pawn3d) {
      pawn3d.classList.remove('lifted');
    }
  }

  animateToCollection(targetElement, onComplete) {
    if (!this.domElement) {
      if (onComplete) onComplete();
      return;
    }

    const pawn3d = this.domElement.querySelector('.pawn-3d');
    
    if (pawn3d) {
      pawn3d.classList.remove('lifted');
    }
    
    const startRect = this.domElement.getBoundingClientRect();
    const endRect = targetElement.getBoundingClientRect();

    const flyClone = this.domElement.cloneNode(true);
    flyClone.style.position = 'fixed';
    flyClone.style.zIndex = '9999';
    flyClone.style.top = `${startRect.top}px`;
    flyClone.style.left = `${startRect.left}px`;
    flyClone.style.width = `${startRect.width}px`;
    flyClone.style.height = `${startRect.height}px`;
    flyClone.style.margin = '0';
    flyClone.style.pointerEvents = 'none';
    
    const inner3d = flyClone.querySelector('.pawn-3d');
    if (inner3d) {
      inner3d.style.transition = 'none';
      inner3d.style.transform = 'rotateX(160deg) scale(1.1)';
    }

    document.body.appendChild(flyClone);

    this.domElement.style.opacity = '0';
    this.domElement.style.pointerEvents = 'none';

    const deltaX = (endRect.left + endRect.width/2) - (startRect.left + startRect.width/2);
    const deltaY = (endRect.top + endRect.height/2) - (startRect.top + startRect.height/2);

    setTimeout(() => {
      flyClone.style.transition = 'transform 0.85s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.8s ease';
      flyClone.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.3)`;
      flyClone.style.opacity = '0.3';
    }, 50);

    setTimeout(() => {
      if (flyClone.parentNode) {
        flyClone.parentNode.removeChild(flyClone);
      }
      this.collected = true;
      if (onComplete) onComplete();
    }, 900);
  }
}

window.Pawn = Pawn;
