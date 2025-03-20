export class TextUpdater {
    constructor({ textElement, tvElement } = { textElement: '#screenText', tvElement: '#tv' }) {
        this.textElement = document.querySelector(textElement);
        this.tvElement = document.querySelector(tvElement);

        this.messageQueue = [];
        this.isProcessing = false;
        const [x, y, z] = this.textElement.attributes.position.value.split(' ').map(Number);
        this.initialPosition = { x, y, z };
        this.currentPosition = { x, y, z };
    }

    toggleVisibility() {
        this.tvElement.setAttribute('visible', !this.tvElement.getAttribute('visible'));
        this.textElement.setAttribute('visible', !this.textElement.getAttribute('visible'));
    } 

    async updateText(text, shouldConcat = false) {
              
        // Add message to queue
        this.messageQueue.push({
            text,
            shouldConcat
        });

        // Process queue if not already processing
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
        let concat = shouldConcat;
         // Add line count check
         const currentText = this.textElement.getAttribute('value') || '';
         const currentLines = currentText.length + currentText.split('\n').length;
         
         if (currentLines > 200) {
            concat = false;
         }


        const currentValue = this.textElement.getAttribute('value') || '';
        const baseText = concat ? `${currentValue}\n` : '';
        this.textElement.setAttribute('position', this.keepInThePosition(!concat));
        

        await this.animateText(text, baseText);

        // Process next message in queue
        return this.processQueue();
    }

    async animateText(text, baseText) {
        const characters = text.split('');
        let currentText = baseText;
        let charCount = 0
        for (const char of characters) {
            currentText += char;
            
            this.textElement.setAttribute('value', currentText);
            if (charCount > 30 || char === '\n') {
                this.textElement.setAttribute('position', this.keepInThePosition());
                charCount = 0;
            }
            charCount += 1;
            await this.delay(20);
        }
    }

    keepInThePosition(reset = false) {
        if (!reset) {
            this.currentPosition.y -= 0.1;
            return this.currentPosition;
        }

        this.currentPosition = { ...this.initialPosition };
        return this.currentPosition;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

} 