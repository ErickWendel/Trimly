export class ModelLoader {
    constructor(animationSelect) {
        this.animationSelect = animationSelect;
        this.setupModelListener();
    }

    setupModelListener() {
        document.querySelector('#model').addEventListener('model-loaded', (event) => {
            this.handleModelLoaded(event);
        });
    }

    handleModelLoaded(event) {
        const model = event.target.getObject3D('mesh');
        if (!model) return;

        this.clearExistingOptions();
        this.addAnimationOptions(model.animations);
    }

    clearExistingOptions() {
        while (this.animationSelect.options.length > 1) {
            this.animationSelect.remove(1);
        }
    }

    addAnimationOptions(animations) {
        animations.forEach(animation => {
            const option = document.createElement('option');
            option.value = animation.name;
            option.textContent = animation.name;
            this.animationSelect.appendChild(option);
        });
    }
} 