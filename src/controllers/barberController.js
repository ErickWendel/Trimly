import { intentSchema, schedulerSchema, messageSchema } from '../config/schemas.js';

export class BarberController {
    constructor({ promptService, barberService, schedulerPrompt, messageGeneratorPrompt, speechManager, translatorService, logger }) {
        this.promptService = promptService;
        this.barberService = barberService;
        this.schedulerPrompt = schedulerPrompt;
        this.messageGeneratorPrompt = messageGeneratorPrompt;
        this.speechManager = speechManager;
        this.translatorService = translatorService;
        this.logger = logger;

        this.intents = {
            availability: async (intent, question) => {
                this.logger.updateText(`checking availability...`, true);
                const prompt = await this.handleAvailabilityRequest(intent, question);
                if (!prompt) return;

                const responseIntent = await this.translateAndPrompt(prompt, schedulerSchema);
                this.speakIfText(responseIntent);

                return responseIntent;
            },
            check: async (intent, question) => {
                this.logger.updateText(`Checking your appointments...`, true);
                let appointments = await this.barberService.getAppointments();

                if (!appointments.length) {
                    return this.generateMessage({
                        message: "You have no appointments scheduled."
                    }, question);
                }

                const intentDate = intent.datetime ? new Date(intent.datetime) : null;

                if (intentDate) {
                    appointments = appointments.filter(apt => {
                        const aptDate = new Date(apt.datetime);
                        return aptDate.getFullYear() === intentDate.getFullYear() &&
                            aptDate.getMonth() === intentDate.getMonth() &&
                            aptDate.getDate() === intentDate.getDate();
                    });
                }

                if (intent.professionalId) {
                    appointments = appointments.filter(apt => apt.professional.id === intent.professionalId);
                }

                if (!appointments.length) {
                    return this.generateMessage({
                        message: "I couldn't find any appointments matching your criteria."
                    }, question);
                }

                const appointmentDetails = appointments.map(apt =>
                    `- ${new Date(apt.datetime).toLocaleTimeString()} with ${apt.professional.name}`
                ).join('\n');

                return this.generateMessage({
                    message: `I found the following appointments:\n${appointmentDetails}`
                }, question);
            },
            cancel: async (intent, question) => {
                this.logger.updateText(`Attempting to cancel appointment...`, true);
                const appointments = await this.barberService.getAppointments();

                if (!appointments.length) {
                    return this.generateMessage({
                        message: "You have no appointments to cancel."
                    }, question);
                }

                // Case 1: No date provided at all.
                if (!intent.datetime) {
                    const now = new Date();
                    const upcomingAppointments = appointments
                        .filter(apt => new Date(apt.datetime) > now)
                        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

                    if (!upcomingAppointments.length) {
                        return this.generateMessage({
                            message: "You have no upcoming appointments to cancel."
                        }, question);
                    }
                    const nextAppointment = upcomingAppointments[0];
                    return this.generateMessage({
                        message: `Your next appointment is with ${nextAppointment.professional.name} at ${new Date(nextAppointment.datetime).toLocaleTimeString()}. Would you like to cancel this one?`,
                        suggestion: nextAppointment
                    }, question);
                }

                // Date is provided from here on.
                const intentDate = new Date(intent.datetime);

                let professionalAppointments = appointments;
                if (intent.professionalId) {
                    professionalAppointments = appointments.filter(apt => apt.professional.id === intent.professionalId);
                }

                let dayAppointments = professionalAppointments.filter(apt => {
                    const aptDate = new Date(apt.datetime);
                    return aptDate.getFullYear() === intentDate.getFullYear() &&
                        aptDate.getMonth() === intentDate.getMonth() &&
                        aptDate.getDate() === intentDate.getDate();
                });

                if (!dayAppointments.length) {
                    return this.generateMessage({
                        message: "I couldn't find any appointments for that day."
                    }, question);
                }

                // If time is specified, try to find an exact match.
                const hasTime = intentDate.getHours() !== 0 || intentDate.getMinutes() !== 0 || intentDate.getSeconds() !== 0;
                if (hasTime) {
                    const exactMatch = dayAppointments.find(apt => new Date(apt.datetime).getTime() === intentDate.getTime());
                    if (exactMatch) {
                        try {
                            await this.barberService.cancelAppointment(exactMatch.id);
                            return this.generateMessage({
                                message: `Your appointment with ${exactMatch.professional.name} at ${intentDate.toLocaleTimeString()} has been canceled.`
                            }, question);
                        } catch (error) {
                            return this.generateMessage({
                                message: `I'm sorry, I encountered an error while trying to cancel the appointment. Please try again.`,
                                error: error.message
                            }, question);
                        }
                    }
                }

                // If no exact time match or no time was given, suggest the next appointment on that day.
                const nextAppointmentOnDay = dayAppointments.sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0];

                return this.generateMessage({
                    message: `I found an appointment for ${nextAppointmentOnDay.professional.name} at ${new Date(nextAppointmentOnDay.datetime).toLocaleTimeString()}. Would you like to cancel this one?`,
                    suggestion: nextAppointmentOnDay
                }, question);
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
                    return this.generateMessage({
                        message: `Your appointment for ${res.professional.name} at ${res.datetime.toLocaleTimeString()} is confirmed!`
                    }, question);

                } catch (error) {
                    this.logger.updateText(`error scheduling appointment: ${error.message}`, true);
                    return this.generateMessage({
                        message: `I'm sorry, the chosen time is not available anymore. Please try again.`
                    }, question);
                }

            },
            information: async (intent, question) => {
                this.logger.updateText(`providing information...`, true);
                console.log('information', intent);
                return this.generateMessage({
                    message: intent.message
                }, question);
            },
            unknown: async (intent, question) => {
                this.logger.updateText(`unknown`, true);
                console.log('unknown', intent);
                return this.generateMessage({
                    message: intent.message
                }, question);
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

    async generateMessage(context, question) {

        const prompt = this.messageGeneratorPrompt
            .replaceAll('{{data}}', JSON.stringify(context))
            .replaceAll('{{question}}', question);

        const { message } = await this.translateAndPrompt(prompt, messageSchema);
        this.logger.updateText(message, true);
        this.speakIfText({ message });
    }
}