export async function loadPrompts() {
    const [initialContext, intentPrompt, schedulerPrompt] = await Promise.all([
        fetchPrompt('/prompts/initialContext.md'),
        fetchPrompt('/prompts/identifyIntents.md'),
        fetchPrompt('/prompts/scheduler.md'),
    ]);

    return {
        initialContext,
        intentPrompt: intentPrompt.replaceAll('{{today}}', new Date().toISOString()),
        schedulerPrompt,
    };
}

async function fetchPrompt(url) {
    const baseUrl = window.location.href
    const response = await fetch(`${baseUrl}${url}`);
    return response.text();
} 