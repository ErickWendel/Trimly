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
const s = new SpeechToText();

const session = await window.ai.languageModel.create({
    systemPrompt: "Pretend to be an fancy receptionist.",
    expectedInputLanguages: ["pt"],
});

const ptBrToEnTranslator = await ai.translator.create({
    sourceLanguage: 'pt',
    targetLanguage: "en",
});

const enToPtBrTranslator = await ai.translator.create({
    sourceLanguage: 'en',
    targetLanguage: "pt",
});

console.log('session', await self.ai.languageModel.capabilities());

document.getElementById('record').addEventListener('click', async () => {

    s.start();

    await sleep(2000)
    console.time('speechToText');
    const ptBrText = await s.stop();
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
