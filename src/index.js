import { loadPrompts } from './config/prompts.js';
import { AnimationController } from './components/animation/AnimationController.js';
import { ModelLoader } from './components/animation/ModelLoader.js';
import { SpeechRecognitionHandler } from './services/speech/SpeechRecognitionHandler.js';
import { SchedulerService } from './services/scheduler/SchedulerService.js';
import { APIChecker } from './utils/APIChecker.js';
import { TextUpdater } from './utils/TextUpdater.js';
import { APIStatusChecker } from './services/APIStatusChecker.js';
import Service from './services/service.js';
import PromptService from './services/ai/PromptService.js';
import characterAnimationController from './components/characterAnimationController.js';

async function initializeApp() {
    // Register A-Frame component
    AFRAME.registerComponent('character-animation-controller', characterAnimationController);

    // Initialize services
    const service = new Service();
    const prompts = await loadPrompts();
    const promptService = new PromptService(prompts);
    await promptService.init();

    // Initialize UI components
    const textUpdater = new TextUpdater();
    const animationController = new AnimationController();
    const modelLoader = new ModelLoader(animationController.animationSelect);

    // Initialize speech and scheduler services
    const speechHandler = new SpeechRecognitionHandler(promptService);
    const schedulerService = new SchedulerService(service, prompts.schedulerPrompt);

    // Setup API checking
    const apiChecker = new APIChecker();
    apiChecker.checkAndLogAvailability(APIStatusChecker.checkAvailability());

    // Setup speech recognition
    speechHandler.setupEventListener();

    // Run test scenarios
    await runTestScenarios(speechHandler, schedulerService, textUpdater, prompts);
}

async function runTestScenarios(speechHandler, schedulerService, textUpdater ,prompts) {
    const scenarios = [
        'will Luciano be available on 20th of march at 11am?'
    ];

    const requests = {
        availability: async (text, question) => {
            const prompt = await schedulerService.handleAvailabilityRequest(text, question);
            const intent = await speechHandler.understandSpeech(prompt);
            console.log('availability', intent);
            return intent;
        },
        check: 'check',
        cancel: async (intent, question) => {
            console.log('cancelling', intent);
            return 'ok';
        },
        giveup: async (intent, question) => {
            console.log('giveup', intent);
            return 'ok';
        },
        schedule: async (intent, question) => {
            console.log('scheduling for', intent);
            return 'ok';
        },
        change: 'change'
    };

    for (const transcript of scenarios) {
        const intent = await speechHandler.understandSpeech(transcript);
        await textUpdater.updateText(`Intent is [${intent.request}]`, true);
        console.log('intent', intent);

        const result = await requests[intent.request](intent, transcript);
        console.log('result', result);

        // scheduler confirmation
        {
            const otherIntent = await speechHandler.understandSpeech(`sure!`);
            const confirmation = await requests[otherIntent.request](otherIntent, transcript);
            console.log('confirmation', confirmation);  
        }
        {
            // const otherIntent = await speechHandler.understandSpeech(
            //     prompts.intentPrompt.concat(`\nUser: no thanks, what about tomorrow at 11am?`)
            // );
            // if(otherIntent?.request) {
            //     const confirmation = await requests[otherIntent.request](otherIntent, transcript);
            //     console.log('confirmation', confirmation);
            // }
            // const otherIntent2 = await speechHandler.understandSpeech(prompts.intentPrompt.concat(`\nUser: no!`));
            // debugger;
            
        }

    }
}

// Initialize the application
initializeApp().catch(console.error);