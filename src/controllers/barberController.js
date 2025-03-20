
export class BarberController {
    constructor({ promptService, barberService, schedulerPrompt, speechManager, translatorService, logger }) {
        this.promptService = promptService;
        this.barberService = barberService;
        this.schedulerPrompt = schedulerPrompt;
        this.speechManager = speechManager;
        this.translatorService = translatorService;
        this.logger = logger;

        this.intents =  {
            availability: async (text, question) => {
                this.logger.updateText(`checking availability...`, true);
                const prompt = await this.handleAvailabilityRequest(text, question);
                const intent = await this.translateAndPrompt(prompt);
                console.log('availability', intent);
                this.speakIfText(intent);

                return intent;
            },
            check: 'check',
            cancel: async (intent, question) => {
                this.logger.updateText(`cancelling...`, true);
                console.log('cancelling', intent);
                return 'ok';
            },
            giveup: async (intent, question) => {
                this.logger.updateText(`giving up...`, true);
                console.log('giveup', intent);
                return 'ok';
            },
            schedule: async (intent, question) => {
                try {
                    this.logger.updateText(`scheduling appointment...`, true);
                    const res = await this.barberService.scheduleAppointment(intent);
                    this.logger.updateText(`appointment scheduled!`, true);
                    this.speakIfText(`the appointment was scheduled, do I help in anything else?`);
                    return 'ok';
                } catch (error) {
                    this.logger.updateText(`error scheduling appointment: ${error.message}`, true);
                    this.speakIfText(`I'm sorry, I couldn't schedule the appointment. Please try again later.`);
                    return 'error'; 
                }
              
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

    async translateAndPrompt(transcript) {
        const languageCode = this.speechManager.getSelectedLanguageCode().toLowerCase();
        const transcriptWithDate = this.addCurrentDate(transcript);
        const text = `the message is in [${languageCode.toUpperCase()}] and ${languageCode !== 'en' ? 'will be translated to english' : 'does not need translation'}.`;
        this.logger.updateText(text, true);

        if (languageCode === 'en') {
            return this.promptService.prompt(transcriptWithDate);
        }

        const translatedText = await this.translateText(transcript, languageCode);
        this.logger.updateText(`text was translated...`, true)

        return this.promptService.prompt(
            transcriptWithDate.replace(transcript, translatedText)
        );
    }

    addCurrentDate(transcript) {
        const currentDate = new Date().toISOString();
        return `Today is ${currentDate}.\n\nUser: ${transcript}`;
    }

    async translateText(text, fromLanguage, toLanguage = 'en') {
        const translatedText = await this.translatorService.translate({
            text,
            toLanguage,
            fromLanguage
        });

        console.log('Translated text:', translatedText);
        return translatedText;
    }

    async speakIfText(text) {
        const message = text.message;
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