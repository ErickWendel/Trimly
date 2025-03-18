import characterAnimationController from './characterAnimationController.js';
import PromptService from './services/ai/PromptService.js';
import TranslatorService from './services/ai/TranslatorService.js';
import { speechManager } from './services/speech/SpeechManager.js';
import { SPEECH_EVENTS } from './services/speech/constants.js';

AFRAME.registerComponent('character-animation-controller', characterAnimationController);

// Get references to DOM elements
const animationSelect = document.getElementById('animationSelect');
const playButton = document.getElementById('playAnimation');
const initialContext = await (await fetch('/prompts/initialContext.md')).text()
const intentPrompt = (await (await fetch('/prompts/identifyIntents.md')).text())
    .replaceAll('{{today}}', new Date().toString())
const schedulerPrompt = (await (await fetch('/prompts/scheduler.md')).text())
const schedulerConfirmationPrompt = (await (await fetch('/prompts/schedulerConfirmation.md')).text())

const promptService = new PromptService({
    initialContext: initialContext,
    intentPrompt: intentPrompt
});
await promptService.init()


const translatedText = await TranslatorService.translate({
    text: 'Olá, como vai você',
    toLanguage: 'en',
    fromLanguage: 'pt'
});
console.log('translatedText', translatedText)

// Listen for speech recognition results
window.addEventListener(SPEECH_EVENTS.SPEECH_RECOGNIZED, async (event) => {
    const { transcript } = event.detail;
    console.log('Processing speech:', transcript);
    const languageCode = speechManager.getSelectedLanguageCode().toLowerCase();
    if (languageCode === 'en-us') {
        const response = await promptService.prompt(transcript);
        console.log('Response:', response);
        await speechManager.speak(transcript);
        return;
    }


    const translatedText = await TranslatorService.translate({
        text: transcript,
        toLanguage: 'en',
        fromLanguage: languageCode
    });
    console.log('Translated text:', translatedText);
    // Here you can add your logic to handle the speech input
    // For example, sending it to your AI processing pipeline

    // Example: Echo the transcript back using text-to-speech
    // await speechManager.speak(transcript);
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
