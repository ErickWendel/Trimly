export default class PromptService {
    #session = null;
    #initialContext = null;
    #intentPrompt = null;
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

    async prompt(text) {
        const response = await this.#session.prompt(text);
        return this.#sanitizeJsonResponse(response)  ;
    }
    
    #sanitizeJsonResponse(text) {
        const json = text.replaceAll('json', '').replaceAll('`', '')
        try {
            const item = JSON.parse(json);
            if(item.datetime) { item.datetime = new Date(item.datetime) }
            return item;
        } catch (error) {
            return json;
        }
    }
}   