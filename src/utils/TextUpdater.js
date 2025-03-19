export class TextUpdater {
    constructor(selector = '#screenText') {
        this.textElement = document.querySelector(selector);
    }

    async updateText(text, shouldConcat = false) {
        if (!this.textElement) return;

        const currentValue = this.textElement.getAttribute('value') || '';
        const baseText = shouldConcat ? `${currentValue}\n` : '';

        await this.animateText(text, baseText);
    }

    async animateText(text, baseText) {
        const characters = text.split('');
        let currentText = baseText;

        for (const char of characters) {
            currentText += char;
            this.textElement.setAttribute('value', currentText);
            await this.delay(50);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
} 