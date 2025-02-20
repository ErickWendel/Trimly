import Service from "./service.js";

const language = 'pt-BR';

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

const context = await (await fetch('/prompts/initialContext.md')).text()
const intentPrompt = (await (await fetch('/prompts/identifyIntents.md')).text())
    .replaceAll('{{today}}', new Date().toString())

const session = await window.ai.languageModel.create({
    systemPrompt: context.concat('\n', intentPrompt),
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


function pipe(session) {
    let shouldClone = false
    return {
        async run({ context, text }) {
            const sessionObj = shouldClone ? await session.clone() : session;
            shouldClone = true
            const translatedText = await ptBrToEnTranslator.translate(text);
            const aiResponse = await sessionObj.prompt(translatedText);
            const item = JSON.parse(aiResponse.replaceAll('`', '').replaceAll('json', ''))

            item.datetime = eval(item.datetime)

            return item
        }
    }

}

// console.log('session', await self.ai.languageModel.capabilities());
const service = new Service()

const p = pipe(session)



// {
//     const question = `Tenho algum agendamento no barbeiro?`
//     const item = await p.run({ context: intentPrompt, text: question });;
//         console.log('item', item);
// }
{
    const question = `O João está disponível segunda-feira às 10?`;
    const item = await p.run({ context: intentPrompt, text: question });
    console.log(question, item);
    const res = await service.getAgenda(item)
    console.log('res', question, res.chosen, res.all[0]);

}

// {
//     const question = `Tem horario disponível amanhã as 09`
//     const item = await p.run({ context: intentPrompt, text: question });;
//     //     console.log('item', item);
// }

// {
//     const question = `O luciano tem horario disponível quinta-feira as 7 da noite`
//     const item = await p.run({ context: intentPrompt, text: question });;
//     //     console.log('item', item);
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
