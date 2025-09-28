import { intentSchema, schedulerSchema } from '../config/schemas.js';

export class BarberController {
    constructor({ promptService, barberService, schedulerPrompt, speechManager, translatorService, logger }) {
        this.promptService = promptService;
        this.barberService = barberService;
        this.schedulerPrompt = schedulerPrompt;
        this.speechManager = speechManager;
        this.translatorService = translatorService;
        this.logger = logger;

        this.intents =  {
            availability: async (intent, question) => {
                this.logger.updateText(`checking availability...`, true);
                const prompt = await this.handleAvailabilityRequest(intent, question);
                if (!prompt) return;

                const responseIntent = await this.translateAndPrompt(prompt, schedulerSchema);
                this.speakIfText(responseIntent);

                return responseIntent;
            },
            check: async (intent, question) => {
                this.logger.updateText(`checking wasnt implemented...`, true);
                this.speakIfText({ message: `checking wasnt implemented... Try scheduling instead.` });
                console.log('checking', intent);
                return 'ok';
            },
            cancel: async (intent, question) => {
                this.logger.updateText(`cancelling wasnt implemented...`, true);
                this.speakIfText({ message: `cancelling wasnt implemented... Try scheduling instead.` });
                console.log('cancelling', intent);
                return 'ok';
            },
            giveup: async (intent, question) => {
                this.logger.updateText(`giving up...`, true);
                this.speakIfText({ message: `giving up...` });
                console.log('giveup', intent);
                return 'ok';
            },
            schedule: async (intent, question) => {
                try {
                    this.logger.updateText(`scheduling appointment...`, true);
                    // Ensure datetime is a Date object before passing to services
                    if (typeof intent.datetime === 'string') {
                        intent.datetime = new Date(intent.datetime);
                    }
                    const res = await this.barberService.scheduleAppointment(intent);
                    this.logger.updateText(`appointment scheduled!`, true);
                    this.speakIfText({ message: `Your appointment for ${res.professional.name} at ${res.datetime.toLocaleTimeString()} is confirmed!` });
                    return 'ok';
                } catch (error) {
                    this.logger.updateText(`error scheduling appointment: ${error.message}`, true);
                    this.speakIfText({ message: `I'm sorry, the chosen time is not available anymore. Please try again.` });
                    return 'error';
                }

            },
            information: async (intent, question) => {
                this.logger.updateText(`providing information...`, true);
                console.log('information', intent);
                return 'ok';
            },
            unknown: async (intent, question) => {
                this.logger.updateText(`unknown`, true);
                console.log('unknown', intent);
                return 'ok';
            },
            change: 'change'
        };
    }

    async handleAvailabilityRequest(text, question) {
        if (text.professionalId === 'not_found') {
            this.logger.updateText(text.message, true);
            this.speakIfText(text);
            return;
        }

        const schedulerData = await this.barberService.getAgenda(text);
        this.logger.updateText(`barber ${schedulerData.available ? 'is' : 'is not'} available. Prompting...`, true);
        const prompt = this.createPrompt(schedulerData, question);
        return prompt;
    }

    createPrompt(schedulerData, question) {
        return this.schedulerPrompt
            .replaceAll('{{data}}', JSON.stringify(schedulerData))
            .replaceAll('{{question}}', question)
            .replaceAll('{{professional}}', schedulerData.professional);
    }

    async translateAndPrompt(transcript, schema) {
        const languageCode = this.speechManager.getSelectedLanguageCode().toLowerCase();
        const transcriptWithDate = this.addCurrentDate(transcript);
        const text = `the message is in [${languageCode.toUpperCase()}] and ${languageCode !== 'en' ? 'will be translated to english' : 'does not need translation'}.`;
        this.logger.updateText(text, true);

        if (languageCode === 'en') {
            return this.promptService.prompt(transcriptWithDate, schema);
        }

        const translatedText = await this.translateText(transcript, languageCode);
        this.logger.updateText(`text was translated...`, true)

        return this.promptService.prompt(
            transcriptWithDate.replace(transcript, translatedText),
            schema
        );
    }

    addCurrentDate(transcript) {
        const currentDate = new Date().toString();
        return `Today is ${currentDate}.\n\nUser: ${transcript}`;
    }

    async translateText(text, fromLanguage, toLanguage = 'en') {
        const translatedText = await this.translatorService.translate({
            text,
            toLanguage,
            fromLanguage
        });

        return translatedText;
    }

    async speakIfText(text) {
        const message = text?.message;
        if(!message) return;

        const languageCode = this.speechManager.getSelectedLanguageCode().toLowerCase();

        if(languageCode === 'en') {
            this.speechManager.speak(message);
            return;
        }
        const translatedMessage = await this.translateText(message, 'en',languageCode);
        this.speechManager.speak(translatedMessage);
    }


    async initConversation(transcript) {
        this.logger.updateText(`starting conversation...`, false);
        const intent = await this.translateAndPrompt(transcript, intentSchema);
        console.log('intent', intent);

        await this.intents[intent.request](intent, transcript);
        window.dispatchEvent(new CustomEvent(`INTENT-${intent.request}`, { detail: { intent: intent } }));
    }
}