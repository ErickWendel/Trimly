import { SPEECH_EVENTS } from '../constants.js';
import { speechManager } from './SpeechManager.js';
import TranslatorService from '../ai/TranslatorService.js';

export class SpeechRecognitionHandler {
    constructor(promptService) {
        this.promptService = promptService;
    }

    setupEventListener() {
        window.addEventListener(SPEECH_EVENTS.SPEECH_RECOGNIZED, 
            async (event) => this.handleSpeechRecognition(event));
    }

    async handleSpeechRecognition(event) {
        const { transcript } = event.detail;
        console.log('Processing speech:', transcript);
        return this.understandSpeech(transcript);
    }

    async understandSpeech(transcript) {
        const languageCode = speechManager.getSelectedLanguageCode().toLowerCase();
        const transcriptWithDate = this.addCurrentDate(transcript);

        if (languageCode === 'en-us') {
            return this.promptService.prompt(transcriptWithDate);
        }

        const translatedText = await this.translateText(transcript, languageCode);
        return this.promptService.prompt(
            transcriptWithDate.replace(transcript, translatedText)
        );
    }

    addCurrentDate(transcript) {
        const currentDate = new Date().toISOString();
        return `Today is ${currentDate}.\n\nUser: ${transcript}`;
    }

    async translateText(text, fromLanguage) {
        const translatedText = await TranslatorService.translate({
            text,
            toLanguage: 'en',
            fromLanguage
        });
        console.log('Translated text:', translatedText);
        return translatedText;
    }
} 