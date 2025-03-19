export class AnimationController {
    constructor() {
        this.animationSelect = document.getElementById('animationSelect');
        this.playButton = document.getElementById('playAnimation');
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.animationSelect.addEventListener('change', () => this.onChange());
        this.playButton.addEventListener('click', () => this.onChange());
    }

    onChange() {
        const selectedAnimation = this.animationSelect.value;
        if (selectedAnimation) {
            window.dispatchEvent(new CustomEvent('play-animation', {
                detail: { animations: selectedAnimation }
            }));
        }
    }
} 