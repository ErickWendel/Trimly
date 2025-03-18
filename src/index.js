import characterAnimationController from './characterAnimationController.js';
import { speechManager } from './services/speech/SpeechManager.js';
import { SPEECH_EVENTS } from './services/speech/constants.js';

AFRAME.registerComponent('character-animation-controller', characterAnimationController);

// Get references to DOM elements
const animationSelect = document.getElementById('animationSelect');
const playButton = document.getElementById('playAnimation');

// Listen for speech recognition results
window.addEventListener(SPEECH_EVENTS.SPEECH_RECOGNIZED, async (event) => {
    const { transcript } = event.detail;
    console.log('Processing speech:', transcript);
    
    // Here you can add your logic to handle the speech input
    // For example, sending it to your AI processing pipeline
    
    // Example: Echo the transcript back using text-to-speech
    await speechManager.speak(transcript);
});

// Wait for the model to be loaded
document.querySelector('#model').addEventListener('model-loaded', (event) => {
    const model = event.target.getObject3D('mesh');
    if (!model) return;

    // Clear existing options except the first one
    while (animationSelect.options.length > 1) {
        animationSelect.remove(1);
    }

    // Add all available animations to the dropdown
    model.animations.forEach(animation => {
        const option = document.createElement('option');
        option.value = animation.name;
        option.textContent = animation.name;
        animationSelect.appendChild(option);
    });
});

const onChange = () => {
    const selectedAnimation = animationSelect.value;
    if (selectedAnimation) {
        // Dispatch custom event to play the animation
        window.dispatchEvent(new CustomEvent('play-animation', {
            detail: {
                animations: selectedAnimation
            }
        }));
    }
}

// Handle play button click
animationSelect.addEventListener('change', onChange);
playButton.addEventListener('click', onChange);
