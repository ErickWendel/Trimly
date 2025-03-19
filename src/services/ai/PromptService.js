export default class PromptService {
    #session = null;
    #initialContext = null;
    #intentPrompt = null;
    #attempts = 3;
    constructor({ initialContext, intentPrompt }) {
        this.#initialContext = initialContext;
        this.#intentPrompt = intentPrompt;
    }
    async init() {
        this.#session = await ai.languageModel.create({
            systemPrompt: this.#initialContext.concat('\n', this.#intentPrompt),
            expectedInputLanguages: ["en"],
        });
    }

    async prompt(text, attempts = this.#attempts) {
        const response = await this.#session.prompt(text);
        const result = this.#sanitizeJsonResponse(response, attempts)  ;
        if(!result && attempts > 0) {
            console.warn(`Failed to get a valid response from the AI, retrying... ${attempts} attempts left`, response );
            return this.prompt(text, attempts - 1);
        }

        if(attempts === 0) {
            console.error('Failed to get a valid response from the AI', response );
            return null;
        }

        return result;
    }
    
    #sanitizeJsonResponse(text) {
        const json = text.replaceAll('json', '').replaceAll('`', '')
        try {
            const item = JSON.parse(json);
            if(item.datetime) { item.datetime = new Date(item.datetime) }
            return item;
        } catch (error) {
            return null;
        }
    }
}   