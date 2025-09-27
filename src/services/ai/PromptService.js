export default class PromptService {
    #session = null;
    #attempts = 3;
    #logger = null;
    constructor({ logger }) {
        this.#logger = logger;
    }
    async init(systemPrompt) {
        this.#session = await window.LanguageModel.create({
            initialPrompts: [
                { role: 'system', content: systemPrompt },
            ],
            expectedInputs: [{
                type: "text",
                languages: ["en"]
            }],
            // See below section
            expectedOutputs: [{
                type: "text",
                languages: ["en"]
            }],
        });
    }

    async prompt(text, schema, attempts = this.#attempts) {
        this.#logger.updateText(`prompting...`, true);
        console.log('text', text);
        const response = await this.#session.prompt(text, {
            responseConstraint: schema
        });
        console.log('AI response:', response);
        const result = this.#sanitizeJsonResponse(response, attempts);
        if (!result && attempts > 0) {
            this.#logger.updateText(`Failed to get a valid response from the AI, retrying... ${attempts} attempts left`, true);
            console.warn(`Failed to get a valid response from the AI, retrying... ${attempts} attempts left`, response);
            return this.prompt(text, schema, attempts - 1);
        }

        if (attempts === 0) {
            this.#logger.updateText(`Failed to get a valid response from the AI`, true);
            console.error('Failed to get a valid response from the AI', response);
            return null;
        }
        this.#logger.updateText(`got correct response from the AI...`, true);

        return result;
    }

    #sanitizeJsonResponse(text) {
        const json = text;
        try {
            const item = JSON.parse(json);
            if (item.datetime) { item.datetime = new Date(item.datetime) }
            return item;
        } catch (error) {
            return null;
        }
    }
}