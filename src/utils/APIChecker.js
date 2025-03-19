import { TextUpdater } from './TextUpdater.js';

export class APIChecker {
    constructor() {
        this.textUpdater = new TextUpdater();
    }

    async checkAndLogAvailability(apis) {
        await this.logUnavailableAPIs(apis);
        await this.showAppropriateMessage();
    }

    async logUnavailableAPIs(apis) {
        for (const [key, value] of Object.entries(apis)) {
            if (!value) {
                await this.textUpdater.updateText(
                    `[X] The ${key} API is not available`, 
                    true
                );
            }
        }
    }

    async showAppropriateMessage() {
        if (this.textUpdater.textElement.getAttribute('value')) {
            await this.showErrorMessage();
        } else {
            await this.showWelcomeMessage();
        }
    }

    async showErrorMessage() {
        await this.textUpdater.updateText(
            '\nTry using Chrome Canary and make sure to enable the experimental features.',
            true
        );
        await this.textUpdater.updateText(
            '\nYou can still move the character around using the WASD keys.',
            true
        );
    }

    async showWelcomeMessage() {
        await this.textUpdater.updateText('Hold enter to talk to AI...', false);
        await this.textUpdater.updateText(
            '\nYou may also choose the language you want \nto use as well as the voice you wanna hear \nin the controls menu.',
            true
        );
    }
} 