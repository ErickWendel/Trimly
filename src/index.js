import Service from "./service.js";

const language = 'pt-BR';
const feats = [
    'speechSynthesis',
    'webkitSpeechRecognition',
    'fetch',
    'ai'
]
if (!feats.every(feat => feat in window)) {
    const msg = `Missing features browser features: ${feats.filter(feat => !(feat in window)).join(', ')}`
    alert(msg);
    throw new Error(msg);
}

const getVoices = () =>
    new Promise((resolve) => {
        let voices = speechSynthesis.getVoices();
        if (voices.length) {
            resolve(voices);
            return;
        }
        speechSynthesis.onvoiceschanged = () => {
            voices = speechSynthesis.getVoices();
            resolve(voices);
        };
    });

const speak = (text, voice) =>
    new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.voice = voice;
        utterance.onend = () => {
            console.log(`Finished speaking with voice: ${voice.name}`);
            resolve();
        };
        utterance.onerror = (error) => {
            console.error('Speech synthesis error:', error);
            resolve(); // Resolve even on error to continue to next voice
        };
        console.log(`Speaking with voice: ${voice.name}`);
        speechSynthesis.speak(utterance);
    });

const textToSpeech = async (text) => {
    const voices = await getVoices();
    const portugueseVoices = voices.filter(
        (voice) => voice.lang === language && voice.name.includes('Luciana')
    );

    if (portugueseVoices.length === 0) {
        console.error("No usable Portuguese voices found.");
        return;
    }

    for (const voice of portugueseVoices) {
        await speak(text, voice);
    }
};

class SpeechToText {
    recognition = null;

    start() {
        if (this.recognition) {
            throw new Error('Already started');
        }
        this.recognition = new webkitSpeechRecognition();
        this.recognition.lang = language;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 5;
        this.recognition.start();
    }

    stop() {
        return new Promise((resolve) => {
            if (!this.recognition) {
                throw new Error('Not started');
            }
            this.recognition.onresult = (event) => {
                resolve(event.results[0][0].transcript);
            };
            this.recognition.stop();
            this.recognition = null;
        });
    }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const speechToTextInstance = new SpeechToText();

const initialContext = await (await fetch('/prompts/initialContext.md')).text()
const intentPrompt = (await (await fetch('/prompts/identifyIntents.md')).text())
    .replaceAll('{{today}}', new Date().toString())
const schedulerPrompt = (await (await fetch('/prompts/scheduler.md')).text())
const schedulerConfirmationPrompt = (await (await fetch('/prompts/schedulerConfirmation.md')).text())

const session = await ai.languageModel.create({
    systemPrompt: initialContext.concat('\n', intentPrompt),
    expectedInputLanguages: ["en"],
});

const ptBrToEnTranslator = await ai.translator.create({
    sourceLanguage: 'pt',
    targetLanguage: "en",
});

const enToPtBrTranslator = await ai.translator.create({
    sourceLanguage: 'en',
    targetLanguage: "pt",
});

const translators = {
    'en': enToPtBrTranslator,
    'pt': ptBrToEnTranslator
}

function sanitizeJsonResponse(text) {
    const json = text.replaceAll('json', '').replaceAll('`', '')
    return JSON.parse(json);
}

async function translateAndPrompt({ text, shouldClone = false, toLanguage = 'pt' }) {
    const sessionObj = shouldClone ? await session.clone() : session;
    if (toLanguage === 'pt') {
        const translatedText = await translators[toLanguage].translate(text);
        const aiResponse = await sessionObj.prompt(translatedText);
        return { aiResponse, translatedText };
    }

    const aiResponse = await sessionObj.prompt(text);
    const translatedText = await translators[toLanguage].translate(aiResponse);

    return { aiResponse: translatedText };

}

async function run({ text, shouldClone = false }) {
    const { aiResponse, translatedText } = await translateAndPrompt({ text, shouldClone });
    const item = sanitizeJsonResponse(aiResponse)
    item.datetime = new Date(item.datetime)

    return { item, translatedText };
}

// console.log('session', await self.ai.languageModel.capabilities());
const service = new Service()


// {
//     const question = `Tenho algum agendamento no barbeiro?`
//     const item = await run({ context: intentPrompt, text: question });;
//         console.log('item', item);
// }
{
    const question = `O João está disponível segunda-feira às 10?`;
    const { item, translatedText } = await run({
        text: question
    });
    // console.log(question, item);
    const res = await service.getAgenda(item)
    const schedulerData = JSON.stringify({
        question: translatedText,
        available: !!res.chosen,
        otherTime: res.otherTime,
    })

    const prompt = schedulerPrompt
        .replaceAll('{{data}}', schedulerData)
        .replaceAll('{{question}}', translatedText)

    const aiResponse = await session.prompt(prompt)
    const translatedAiResponse = await enToPtBrTranslator.translate(aiResponse);
    // console.log('translatedAiResponse', translatedAiResponse);


    // const answer = `Não, que tal na quarta-feira as 10?`
    const answer = `Sim, pode agendar!`
    const translatedText2 = await ptBrToEnTranslator.translate(answer);

    const confirmation = schedulerConfirmationPrompt
        .replaceAll(`{{today}}`, new Date().toString())
        .replaceAll(`{{question}}`, translatedText)
        .replaceAll(`{{input}}`, translatedText2)

    const aiResponse2 = await session.prompt(confirmation)
    const response = sanitizeJsonResponse(aiResponse2)
    console.log('response', response);
    if (response.canSchedule) {
        console.log('Agendamento confirmado!');
        // return
    }
    else {

        console.log('Agendamento cancelado!');
    }

}

// {
//     const question = `Tem horario disponível amanhã as 09`
//     const item = await run({ context: intentPrompt, text: intentPrompt.concat('\n', question), shouldClone: true });;
//     console.log(question, item);
// }

// {
//     const question = `O luciano tem horario disponível quinta-feira as 7 da noite`
//     const item = await run({ context: intentPrompt, text: intentPrompt.concat('\n', question), shouldClone: true });;
//     console.log(question, item);
//     //     const res = await service.getAgenda(item)
//     //     console.log('res', res);
// }



document.getElementById('record').addEventListener('click', async () => {

    speechToTextInstance.start();

    await sleep(2000)
    console.time('speechToText');
    const ptBrText = await speechToTextInstance.stop();
    console.log('Recognized text:', ptBrText);


    const text = await ptBrToEnTranslator.translate(ptBrText);
    console.log('Translated text:', text);

    const cost = await session.countPromptTokens(text);
    console.log('cost:', cost);

    const aiResponse = await session.prompt(text)
    console.log('aiResponse', aiResponse);

    const backToPtBr = await enToPtBrTranslator.translate(aiResponse);
    console.log('backToPtBr', backToPtBr);
    // const stream = await session.promptStreaming(text);
    console.timeEnd('speechToText');

    await textToSpeech(backToPtBr);

    session.destroy();

});



