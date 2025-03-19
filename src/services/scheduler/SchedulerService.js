export class SchedulerService {
    constructor(service, schedulerPrompt) {
        this.service = service;
        this.schedulerPrompt = schedulerPrompt;
    }

    async handleAvailabilityRequest(text, question) {
        const res = await this.service.getAgenda(text);
        const schedulerData = this.createSchedulerData(res, question);
        
        const prompt = this.createPrompt(schedulerData, question, res.professional);
        return prompt;
    }

    createSchedulerData(res, question) {
        return JSON.stringify({
            question,
            available: !!res.chosen,
            otherTime: res.otherTime,
            professional: res.professional,
        });
    }

    createPrompt(schedulerData, question, professional) {
        return this.schedulerPrompt
            .replaceAll('{{data}}', schedulerData)
            .replaceAll('{{question}}', question)
            .replaceAll('{{professional}}', professional);
    }
} 