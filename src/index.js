import { loadPrompts } from './config/prompts.js';
import { AnimationController } from './components/animation/AnimationController.js';
import { ModelLoader } from './components/animation/ModelLoader.js';
import { APIChecker } from './utils/APIChecker.js';
import { TextUpdater } from './utils/TextUpdater.js';
import { APIStatusChecker } from './services/APIStatusChecker.js';
import Service from './services/service.js';
import PromptService from './services/ai/PromptService.js';
import characterAnimationController from './components/characterAnimationController.js';
import { BarberService } from './services/barberService.js';
import { SPEECH_EVENTS } from './services/constants.js';
import { BarberController } from './controllers/barberController.js';
import SpeechManager from './services/speech/SpeechManager.js';
import TranslatorService from './services/ai/TranslatorService.js';
import SpeechSynthesisService from './services/speech/SpeechSynthesisService.js';
import SpeechRecognitionService from './services/speech/SpeechRecognitionService.js';

async function initializeApp() {
    // Register A-Frame component
    AFRAME.registerComponent('character-animation-controller', characterAnimationController);
    // Setup API checking
    const apiChecker = new APIChecker();
    apiChecker.checkAndLogAvailability(APIStatusChecker.checkAvailability());

    const speechManager = new SpeechManager({
        speechSynthesisService: new SpeechSynthesisService(),
        speechRecognitionService: new SpeechRecognitionService(),
    });
    const barberService = new BarberService()
    const translatorService = new TranslatorService();
    const prompts = await loadPrompts();
    prompts.intentPrompt = prompts.intentPrompt
    .replaceAll('{{professionals}}', JSON.stringify(await barberService.getProfessionals()));   
    const promptService = new PromptService(prompts);
    await promptService.init();

    // Initialize UI components
    const logElement = new TextUpdater();
    const agendaElement = new TextUpdater({ textElement: '#agendaText', tvElement: '#tv-agenda' });

    const barberController = new BarberController({
        promptService,
        barberService,
        speechManager,
        translatorService,
        schedulerPrompt: prompts.schedulerPrompt,
    });

    const appointments = await barberService.getAppointments()
    const barber = await barberService.getProfessionals()
    agendaElement.toggleVisibility();
    setTimeout(() => {
        agendaElement.toggleVisibility();
        if (appointments.length > 0) {
            agendaElement.updateText('Your agenda:', false);
            appointments.forEach(appointment => {
                agendaElement.updateText(`- ${appointment.datetime} - ${appointment.professional}`, true);
            });
        }
        else {
            agendaElement.updateText('No appointments scheduled for you.\n', false);
            agendaElement.updateText('You can schedule one now with one of the following professionals:', true);
            barber.forEach(professional => {
                agendaElement.updateText(`- ${professional.name}`, true);
            });
        }
    }, 6000);



    const animationController = new AnimationController();
    const modelLoader = new ModelLoader(animationController.animationSelect);
    
    window.addEventListener(SPEECH_EVENTS.SPEECH_RECOGNIZED,
        async (event) => {
            const { transcript } = event.detail;
            console.log('Processing speech:', transcript);
            await barberController.initConversation(transcript);
        });
    
    // runTestScenarios(barberController)
}


 function runTestScenarios() {
    const scenarios = [
        'will Luciano be available on 20th of march at 11am?'
    ];
    window.addEventListener('INTENT-availability', (event) => {
        console.log('availability', event.detail.intent);
        window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.SPEECH_RECOGNIZED, { detail: { transcript: `yes, sure!` } }));   
    }); 

    for (const transcript of scenarios) {
        window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.SPEECH_RECOGNIZED, { detail: { transcript } }    ));   
    }
}

// Initialize the application
initializeApp().catch(console.error);