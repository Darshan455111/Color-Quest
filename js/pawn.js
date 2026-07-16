/**
 * Color Quest - Pawn Class
 * Manages the state, DOM generation, and animations of individual pawns.
 */
class Pawn {
  /**
   * @param {string|number} id - Unique pawn ID
   * @param {string} color - The hidden color on the bottom face
   * @param {number} holeIndex - Index of the board hole occupied
   */
  constructor(id, color, holeIndex) {
    this.id = id;
    this.color = color;
    this.holeIndex = holeIndex;
    this.collected = false;
    this.owner = null;
    this.domElement = null;
  }

  /**
   * Generates the 3D CSS representation of the pawn
   * @returns {HTMLElement}
   */
  render() {
    const container = document.createElement('div');
    container.className = 'pawn-container';
    container.setAttribute('data-pawn-id', this.id);
    container.style.display = 'block';

    // 3D rotatable core
    const pawn3d = document.createElement('div');
    pawn3d.className = 'pawn-3d';

    // The identical metallic/wooden top handle assembly
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

    // The hidden colored bottom disk (rotated 180 deg)
    const baseColor = document.createElement('div');
    baseColor.className = 'pawn-base-color';
    baseColor.style.backgroundColor = this.getColorHex(this.color);
    baseColor.style.boxShadow = 'inset 0 0 8px rgba(0, 0, 0, 0.4)';

    pawn3d.appendChild(stem);
    pawn3d.appendChild(baseColor);

    // Shadow disk beneath the pawn
    const shadow = document.createElement('div');
    shadow.className = 'pawn-shadow';

    container.appendChild(pawn3d);
    container.appendChild(shadow);

    this.domElement = container;
    return container;
  }

  /**
   * Helper mapping color name to css hex value
   */
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

  /**
   * Plays the lifting and flipping reveal animation
   */
  lift() {
    if (!this.domElement) return;
    const pawn3d = this.domElement.querySelector('.pawn-3d');
    if (pawn3d) {
      pawn3d.classList.add('lifted');
      window.AudioEngine.playLift();
    }
  }

  /**
   * Plays the descent and hiding flip-back animation
   */
  lower() {
    if (!this.domElement) return;
    const pawn3d = this.domElement.querySelector('.pawn-3d');
    if (pawn3d) {
      pawn3d.classList.remove('lifted');
    }
  }

  /**
   * Animates the pawn flying smoothly to the target player's collected sidebar
   * @param {HTMLElement} targetElement - The player collected area element
   * @param {Function} onComplete - Callback executed when fly animation ends
   */
  animateToCollection(targetElement, onComplete) {
    if (!this.domElement) {
      if (onComplete) onComplete();
      return;
    }

    const pawn3d = this.domElement.querySelector('.pawn-3d');
    
    // Add matched class to hide original shadow
    if (pawn3d) {
      pawn3d.classList.remove('lifted');
    }
    
    // Measure bounding boxes
    const startRect = this.domElement.getBoundingClientRect();
    const endRect = targetElement.getBoundingClientRect();

    // Create a clone element to fly across the screen overlay
    const flyClone = this.domElement.cloneNode(true);
    flyClone.style.position = 'fixed';
    flyClone.style.zIndex = '9999';
    flyClone.style.top = `${startRect.top}px`;
    flyClone.style.left = `${startRect.left}px`;
    flyClone.style.width = `${startRect.width}px`;
    flyClone.style.height = `${startRect.height}px`;
    flyClone.style.margin = '0';
    flyClone.style.pointerEvents = 'none';
    
    // Keep base revealed color during fly
    const inner3d = flyClone.querySelector('.pawn-3d');
    if (inner3d) {
      // Force it to remain flipped and scaled during transit
      inner3d.style.transition = 'none';
      inner3d.style.transform = 'rotateX(160deg) scale(1.1)';
    }

    document.body.appendChild(flyClone);

    // Hide original element
    this.domElement.style.opacity = '0';
    this.domElement.style.pointerEvents = 'none';

    // Calculate translations (adjust for center-to-center fly)
    const deltaX = (endRect.left + endRect.width/2) - (startRect.left + startRect.width/2);
    const deltaY = (endRect.top + endRect.height/2) - (startRect.top + startRect.height/2);

    // Trigger smooth slide and shrink transition
    setTimeout(() => {
      flyClone.style.transition = 'transform 0.85s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.8s ease';
      flyClone.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.3)`;
      flyClone.style.opacity = '0.3';
    }, 50);

    // Clean up clone on completion
    setTimeout(() => {
      if (flyClone.parentNode) {
        flyClone.parentNode.removeChild(flyClone);
      }
      this.collected = true;
      if (onComplete) onComplete();
    }, 900);
  }
}

// Bind to window
window.Pawn = Pawn;
