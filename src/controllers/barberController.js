import { INTENTS } from '../services/constants.js';
export class BarberController {
    constructor({ promptService, barberService, schedulerPrompt, speechManager, translatorService }) {
        this.promptService = promptService;
        this.barberService = barberService;
        this.schedulerPrompt = schedulerPrompt;
        this.speechManager = speechManager;
        this.translatorService = translatorService;

        this.intents =  {
            availability: async (text, question) => {
                const prompt = await this.handleAvailabilityRequest(text, question);
                const intent = await this.translateAndPrompt(prompt);
                console.log('availability', intent);
                this.speakIfText(intent);

                return intent;
            },
            check: 'check',
            cancel: async (intent, question) => {
                console.log('cancelling', intent);
                return 'ok';
            },
            giveup: async (intent, question) => {
                console.log('giveup', intent);
                return 'ok';
            },
            schedule: async (intent, question) => {
                console.log('scheduling for', intent);
                return 'ok';
            },
            unknown: async (intent, question) => {
                console.log('unknown', intent);
                return 'ok';
            },  
            change: 'change'
        };
    }

    async handleAvailabilityRequest(text, question) {
        const res = await this.barberService.getAgenda(text);
        const schedulerData = JSON.stringify({
            question,
            available: !!res.chosen,
            otherTime: res.otherTime,
            professional: res.professional,
        });
        
        const prompt = this.createPrompt(schedulerData, question, res.professional);
        return prompt;
    }

    createPrompt(schedulerData, question, professional) {
        return this.schedulerPrompt
            .replaceAll('{{data}}', schedulerData)
            .replaceAll('{{question}}', question)
            .replaceAll('{{professional}}', professional);
    }

    async translateAndPrompt(transcript) {
        const languageCode = this.speechManager.getSelectedLanguageCode().toLowerCase();
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
        const translatedText = await this.translatorService.translate({
            text,
            toLanguage: 'en',
            fromLanguage
        });
        console.log('Translated text:', translatedText);
        return translatedText;
    }

    async speakIfText(text) {
        const message = text.message;
        if(!message) return;

        const languageCode = this.speechManager.getSelectedLanguageCode().toLowerCase();
        if(languageCode === 'en-us') {
            this.speechManager.speak(message);
            return; 
        }
        const translatedMessage = await this.translateText(message, languageCode);
        this.speechManager.speak(translatedMessage);
    }


    async initConversation(transcript) {

        const intent = await this.translateAndPrompt(transcript);
        this.speakIfText(intent);
        console.log('intent', intent);

        await this.intents[intent.request](intent, transcript);
        window.dispatchEvent(new CustomEvent(`INTENT-${intent.request}`, { detail: { intent: intent } }));   

        // scheduler confirmation
        // {
        //     const otherIntent = await this.translateAndPrompt(`sure!`);
        //     const confirmation = await this.intents[otherIntent.request](otherIntent, transcript);
        //     console.log('confirmation', confirmation);
        //     this.speakIfText(confirmation);
        // }
        {
            // const otherIntent = await barberController.translateAndPrompt(
            //     prompts.intentPrompt.concat(`\nUser: no thanks, what about tomorrow at 11am?`)
            // );
            // if(otherIntent?.request) {
            //     const confirmation = await requests[otherIntent.request](otherIntent, transcript);
            //     console.log('confirmation', confirmation);
            // }
            // const otherIntent2 = await barberController.translateAndPrompt(prompts.intentPrompt.concat(`\nUser: no!`));
            // debugger;

        }
    }
} 