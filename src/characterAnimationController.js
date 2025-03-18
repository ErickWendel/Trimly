// components/characterAnimationController.js


export default {
    schema: {
        idleAnimation: { type: 'string', default: 'Idle_B' },
        crossFadeDuration: { type: 'number', default: 0.3 }
    },

    init() {
        this.mixer = null;
        this.actions = {};
        this.currentAction = null;
        this.animationQueue = [];
        
        this.el.addEventListener('model-loaded', this.onModelLoaded.bind(this));
        window.addEventListener('play-animation', this.handlePlayAnimation.bind(this));
    },

    remove() {
        window.removeEventListener('play-animation', this.handlePlayAnimation.bind(this));
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer = null;
        }
    },

    handlePlayAnimation(event) {
        const { animations } = event.detail;
        this.playAnimationSequence(animations);
    },

    onModelLoaded(event) {
        const model = this.el.getObject3D('mesh');
        if (!model) return;

        this.mixer = new THREE.AnimationMixer(model);
        
        // Initialize all available animations
        model.animations.forEach(clip => {
            this.actions[clip.name] = this.mixer.clipAction(clip);
        });

        // Start with idle animation
        this.playAnimation(this.data.idleAnimation, true);
    },

    playAnimationSequence(animations) {
        if (!Array.isArray(animations)) {
            animations = [animations];
        }

        // Stop current sequence
        if (this.currentAction) {
            this.currentAction.fadeOut(this.data.crossFadeDuration);
        }

        // Play the sequence
        animations.forEach((animName, index) => {
            const isLast = index === animations.length - 1;
            this.playAnimation(animName, isLast);
        });
    },

    playAnimation(animationName, shouldLoop = false) {
        if (!this.mixer || !animationName || !this.actions[animationName]) return;

        const action = this.actions[animationName];
        
        action.reset()
            .setLoop(shouldLoop ? THREE.LoopPingPong : THREE.LoopOnce)
            .setEffectiveWeight(1)
            .fadeIn(this.data.crossFadeDuration)
            .play();

        this.currentAction = action;
    },

    tick(time, delta) {
        if (this.mixer) {
            this.mixer.update(delta / 1000);
        }
    }
};
