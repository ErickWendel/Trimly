import characterAnimationController from './characterAnimationController.js';
import PromptService from './services/ai/PromptService.js';
import TranslatorService from './services/ai/TranslatorService.js';
import { speechManager } from './services/speech/SpeechManager.js';
import { SPEECH_EVENTS } from './services/constants.js';
import { APIStatusChecker } from './services/APIStatusChecker.js';
import Service from './services/service.js';

const service = new Service()
AFRAME.registerComponent('character-animation-controller', characterAnimationController);

async function understandSpeech(transcript) {
    // await updateTextContent(`processing text...\n${transcript}`, true)
    const languageCode = speechManager.getSelectedLanguageCode().toLowerCase();

    // await updateTextContent(`Language set to${languageCode}...`, true)

    // Add current date to the transcript
    const currentDate = new Date().toISOString();
    const transcriptWithDate = `Today is ${currentDate}.\n\nUser: ${transcript}`;

    if (languageCode === 'en-us') {
        const response = await promptService.prompt(transcriptWithDate);
        return response;
    }

    const translatedText = await TranslatorService.translate({
        text: transcript,
        toLanguage: 'en',
        fromLanguage: languageCode
    });
    console.log('Translated text:', translatedText);
    const response = await promptService.prompt(transcriptWithDate.replace(transcript, translatedText));

    return response;
}

// Listen for speech recognition results
window.addEventListener(SPEECH_EVENTS.SPEECH_RECOGNIZED, async (event) => {
    const { transcript } = event.detail;
    console.log('Processing speech:', transcript);
    await understandSpeech(transcript);
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


const animationSelect = document.getElementById('animationSelect');
const playButton = document.getElementById('playAnimation');
const textElement = document.querySelector('#screenText');

animationSelect.addEventListener('change', onChange);
playButton.addEventListener('click', onChange);
// Check API availability
logAvailability(APIStatusChecker.checkAvailability());


const initialContext = await (await fetch('/prompts/initialContext.md')).text()
const intentPrompt = (await (await fetch('/prompts/identifyIntents.md')).text())
    .replaceAll('{{today}}', new Date().toISOString())
const schedulerPrompt = (await (await fetch('/prompts/scheduler.md')).text())
const schedulerConfirmationPrompt = (await (await fetch('/prompts/schedulerConfirmation.md')).text())

const promptService = new PromptService({
    initialContext: initialContext,
    intentPrompt: intentPrompt
});

await promptService.init()

{
    // Test different date scenarios
    const scenarios = [
        'will Luciano be available on 20th of march at 11am?',
        // 'is Luciano available for the next friday at 9am?',
        // 'book me with João tomorrow at 2pm',
        // 'what is Kauan\'s next availability?'
    ];
    const requests = {
        availability: async (text, question) => {
            const res = await service.getAgenda(text)
            const schedulerData = JSON.stringify({
                question,
                available: !!res.chosen,
                otherTime: res.otherTime,
                professional: res.professional,
            })
            console.log('barber', res, res.professional)

            const prompt = schedulerPrompt
                .replaceAll('{{data}}', schedulerData)
                .replaceAll('{{question}}', question)
                .replaceAll('{{professional}}', res.professional)

            const result = await understandSpeech(prompt)
            return result
        },
        check: 'check',
        cancel: 'cancel',
        schedule: async (intent, question) => {
            console.log('scheduling for', intent)
            
            return intent
        },
        change: 'change'
    }


    for (const transcript of scenarios) {
        const intent = await understandSpeech(transcript)
        await updateTextContent(`Intent is [${intent.request}]`, true)
        console.log('intent', intent)

        const result = await requests[intent.request](intent, transcript)
        console.log('result', result)
        const re = await understandSpeech('yes please!');
        const result2 = await requests[re.request](re, transcript)
        // console.log('re', re, result2)

    }

}

// const translatedText = await TranslatorService.translate({
//     text: 'Olá, como vai você',
//     toLanguage: 'en',
//     fromLanguage: 'pt'
// });
// console.log('translatedText', translatedText)



async function logAvailability(apis) {
    for (const [key, value] of Object.entries(apis)) {
        if (value) continue;
        await updateTextContent(`[X] The ${key} API is not available`, true);
    }

    if (textElement.getAttribute('value')) {
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