export async function loadPrompts() {
    const [initialContext, intentPrompt, schedulerPrompt, messageGeneratorPrompt] = await Promise.all([
        fetchPrompt('/prompts/initialContext.md'),
        fetchPrompt('/prompts/identifyIntents.md'),
        fetchPrompt('/prompts/scheduler.md'),
        fetchPrompt('/prompts/messageGenerator.md'),
    ]);

    return {
        initialContext,
        intentPrompt: intentPrompt.replaceAll('{{today}}', new Date().toISOString()),
        schedulerPrompt,
        messageGeneratorPrompt
    };
}

async function fetchPrompt(url) {
    const baseUrl = window.location.href
    const response = await fetch(`${baseUrl}${url}`);
    return response.text();
}