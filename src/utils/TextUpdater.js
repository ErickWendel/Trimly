// Constants for text display configuration
const TEXT_CONFIG = {
    CHAR_DELAY: 20,         // Milliseconds between each character
    CHARS_PER_LINE: 30,     // Maximum characters per line
    LINE_HEIGHT: 0.1,       // Height adjustment for each new line
    MAX_CHARS: 200,         // Maximum total characters before reset
    INITIAL_DELAY: 0        // Initial delay before starting animation
};

export class TextUpdater {
    constructor({ textElement, tvElement } = { textElement: '#screenText', tvElement: '#tv' }) {
        this.textElement = document.querySelector(textElement);
        this.tvElement = document.querySelector(tvElement);
        this.messageQueue = [];
        this.isProcessing = false;
        this.initializePosition();
    }

    initializePosition() {
        const [x, y, z] = this.textElement.attributes.position.value
            .split(' ')
            .map(Number);
        this.initialPosition = { x, y, z };
        this.currentPosition = { ...this.initialPosition };
    }

    toggleVisibility() {
        const toggleAttribute = (element) => {
            const isVisible = !element.getAttribute('visible');
            element.setAttribute('visible', isVisible);
        };

        toggleAttribute(this.tvElement);
        toggleAttribute(this.textElement);
    }

    async updateText(text, shouldConcat = false) {
        this.messageQueue.push({ text, shouldConcat });

        if (!this.isProcessing) {
            await this.processQueue();
        }
    }

    async processQueue() {
        if (this.messageQueue.length === 0) {
            this.isProcessing = false;
            return;
        }

        this.isProcessing = true;
        const { text, shouldConcat } = this.messageQueue.shift();
        
        const shouldResetText = this.shouldResetText(shouldConcat);
        const baseText = this.getBaseText(shouldResetText);
        
        this.updateTextPosition(shouldResetText);
        await this.animateText(text, baseText);
        
        return this.processQueue();
    }

    shouldResetText(shouldConcat) {
        if (!shouldConcat) return true;

        const currentText = this.textElement.getAttribute('value') || '';
        const totalLength = currentText.length + currentText.split('\n').length;
        return totalLength > TEXT_CONFIG.MAX_CHARS;
    }

    getBaseText(shouldReset) {
        if (shouldReset) return '';
        const currentValue = this.textElement.getAttribute('value') || '';
        return `${currentValue}\n`;
    }

    updateTextPosition(shouldReset) {
        const position = this.keepInThePosition(shouldReset);
        this.textElement.setAttribute('position', position);
    }

    async animateText(text, baseText) {
        const characters = text.split('');
        let currentText = baseText;
        let charCount = 0;

        for (const char of characters) {
            currentText += char;
            this.textElement.setAttribute('value', currentText);

            if (this.shouldAdjustPosition(char, charCount)) {
                this.updateTextPosition(false);
                charCount = 0;
            }

            charCount++;
            await this.delay(TEXT_CONFIG.CHAR_DELAY);
        }
    }

    shouldAdjustPosition(char, charCount) {
        return charCount > TEXT_CONFIG.CHARS_PER_LINE || char === '\n';
    }

    keepInThePosition(reset = false) {
        if (reset) {
            this.currentPosition = { ...this.initialPosition };
            return this.currentPosition;
        }

        this.currentPosition.y -= TEXT_CONFIG.LINE_HEIGHT;
        return this.currentPosition;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
} 