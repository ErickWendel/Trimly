// components/characterAnimationController.js

export default {
    schema: {
        idleAnimation: { type: 'string', default: 'Idle_B' },
        walkingAnimation: { type: 'string', default: 'Walking_A' },
        walkingBackwardsAnimation: { type: 'string', default: 'Walking_A' },
        walkingLeftAnimation: { type: 'string', default: 'Walking_A' },
        walkingRightAnimation: { type: 'string', default: 'Walking_A' },
        crossFadeDuration: { type: 'number', default: 0.3 },
        movementSpeed: { type: 'number', default: 0.1 },
        rotationSpeed: { type: 'number', default: 10 }, // Degrees per frame
        maxZ: { type: 'number', default: 5 },
        minZ: { type: 'number', default: -5 },
        maxX: { type: 'number', default: 5 },
        minX: { type: 'number', default: -5 },
        cameraDistance: { type: 'number', default: 2 },
        cameraHeight: { type: 'number', default: 1.6 }
    },

    init() {
        this.mixer = null;
        this.actions = {};
        this.currentAction = null;
        this.animationQueue = [];
        this.isMoving = false;
        this.moveDirection = { x: 0, z: 0 };
        this.targetRotation = 0;
        this.cameraRig = document.getElementById('rig');
        
        if (!this.cameraRig) {
            console.error('Camera rig not found! Make sure you have an entity with id="rig"');
            return;
        }

        // Initialize camera position
        this.updateCameraPosition();
        
        this.el.addEventListener('model-loaded', this.onModelLoaded.bind(this));
        window.addEventListener('play-animation', this.handlePlayAnimation.bind(this));
        
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    },

    remove() {
        window.removeEventListener('play-animation', this.handlePlayAnimation.bind(this));
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer = null;
        }
    },

    updateCameraPosition() {
        if (!this.cameraRig) return;

        const characterPosition = this.el.object3D.position;
        
        // Calculate camera position to maintain constant distance
        this.cameraRig.object3D.position.set(
            characterPosition.x,
            0,
            characterPosition.z + this.data.cameraDistance
        );
    },

    updateCharacterRotation() {
        const currentRotation = this.el.object3D.rotation.y * (180 / Math.PI);
        let rotationDiff = this.targetRotation - currentRotation;

        // Normalize the difference to be between -180 and 180 degrees
        if (rotationDiff > 180) rotationDiff -= 360;
        if (rotationDiff < -180) rotationDiff += 360;

        // Apply rotation with smooth interpolation
        if (Math.abs(rotationDiff) > 0.1) {
            const step = Math.sign(rotationDiff) * Math.min(Math.abs(rotationDiff), this.data.rotationSpeed);
            this.el.object3D.rotation.y = ((currentRotation + step) * Math.PI) / 180;
        }
    },

    onKeyDown(event) {
        if (event.repeat) return;
        
        switch(event.key.toLowerCase()) {
            case 'w':
                this.moveDirection.z = 1;
                this.targetRotation = 0;
                this.playAnimation(this.data.walkingAnimation, true);
                break;
            case 's':
                this.moveDirection.z = -1;
                this.targetRotation = 180;
                this.playAnimation(this.data.walkingAnimation, true);
                break;
            case 'a':
                this.moveDirection.x = -1;
                this.targetRotation = -90;
                this.playAnimation(this.data.walkingAnimation, true);
                break;
            case 'd':
                this.moveDirection.x = 1;
                this.targetRotation = 90;
                this.playAnimation(this.data.walkingAnimation, true);
                break;
        }
    },

    onKeyUp(event) {
        switch(event.key.toLowerCase()) {
            case 'w':
                if (this.moveDirection.z === 1) {
                    this.moveDirection.z = 0;
                    if (this.moveDirection.x === 0) {
                        this.playAnimation(this.data.idleAnimation, true);
                    }
                }
                break;
            case 's':
                if (this.moveDirection.z === -1) {
                    this.moveDirection.z = 0;
                    if (this.moveDirection.x === 0) {
                        this.playAnimation(this.data.idleAnimation, true);
                    }
                }
                break;
            case 'a':
                if (this.moveDirection.x === -1) {
                    this.moveDirection.x = 0;
                    if (this.moveDirection.z === 0) {
                        this.playAnimation(this.data.idleAnimation, true);
                    }
                }
                break;
            case 'd':
                if (this.moveDirection.x === 1) {
                    this.moveDirection.x = 0;
                    if (this.moveDirection.z === 0) {
                        this.playAnimation(this.data.idleAnimation, true);
                    }
                }
                break;
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

        // Dispatch event to notify animations are available
        window.dispatchEvent(new CustomEvent('animations-ready', {
            detail: {
                animations: model.animations.map(a => a.name)
            }
        }));
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

        // If we're already playing this animation, don't restart it
        if (this.currentAction && this.currentAction._clip.name === animationName) return;

        const action = this.actions[animationName];
        
        // Fade out current action if it exists
        if (this.currentAction) {
            this.currentAction.fadeOut(this.data.crossFadeDuration);
        }

        action.reset()
            .setLoop(shouldLoop ? THREE.LoopRepeat : THREE.LoopOnce)
            .setEffectiveWeight(1)
            .fadeIn(this.data.crossFadeDuration)
            .play();

        this.currentAction = action;
    },

    tick(time, delta) {
        if (this.mixer) {
            this.mixer.update(delta / 1000);
        }

        // Update character rotation
        this.updateCharacterRotation();

        // Handle movement
        if (this.moveDirection.x !== 0 || this.moveDirection.z !== 0) {
            const currentPosition = this.el.object3D.position;
            
            // Calculate new position
            const newX = currentPosition.x + (this.moveDirection.x * this.data.movementSpeed);
            const newZ = currentPosition.z + (this.moveDirection.z * this.data.movementSpeed);

            // Check boundaries
            if (newX <= this.data.maxX && newX >= this.data.minX) {
                this.el.object3D.position.x = newX;
            }
            if (newZ <= this.data.maxZ && newZ >= this.data.minZ) {
                this.el.object3D.position.z = newZ;
            }

            // Update camera position after any movement
            this.updateCameraPosition();
        }
    }
};
