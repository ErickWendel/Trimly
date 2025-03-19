import characterAnimationController from './characterAnimationController.js';
import PromptService from './services/ai/PromptService.js';
import TranslatorService from './services/ai/TranslatorService.js';
import { speechManager } from './services/speech/SpeechManager.js';
import { SPEECH_EVENTS } from './services/constants.js';
import { APIStatusChecker } from './services/APIStatusChecker.js';
AFRAME.registerComponent('character-animation-controller', characterAnimationController);


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


// Get references to DOM elements
const animationSelect = document.getElementById('animationSelect');
const playButton = document.getElementById('playAnimation');
const textElement = document.querySelector('#screenText');

// Check API availability
(async () => {
    await logAvailability(APIStatusChecker.checkAvailability());
})();

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

// Handle play button click
animationSelect.addEventListener('change', onChange);
playButton.addEventListener('click', onChange);

async function logAvailability(apis) {
    for (const [key, value] of Object.entries(apis)) {
        if(value) continue;
        await updateTextContent(`[X] The ${key} API is not available`, true);
    }
    
    if(textElement.getAttribute('value')) {
        await updateTextContent('\nTry using Chrome Canary and make sure to enable the experimental features.', true);
        await updateTextContent('\nYou can still move the character around using the WASD keys.', true);
        return;
    }
    
    await updateTextContent('Hold enter to talk to AI...', false);
    await updateTextContent('\nYou may also choose the language you want \nto use as well as the voice you wanna hear \nin the controls menu.', true);
}

// Function to update the text element content with typewriter effect
async function updateTextContent(text, shouldConcat = false) {
    const textElement = document.querySelector('#screenText');
    if (!textElement) return;

    const currentValue = textElement.getAttribute('value') || '';
    const baseText = shouldConcat ? `${currentValue}\n` : '';
    
    // Split the text into characters and animate them
    const characters = text.split('');
    let currentText = baseText;
    
    for (const char of characters) {
        currentText += char;
        textElement.setAttribute('value', currentText);
        // Add a small delay between each character
        await new Promise(resolve => setTimeout(resolve, 50));
    }
}