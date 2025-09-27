export default class TranslatorService {

  async translate({text, fromLanguage, toLanguage}) {
    try {
      // If languages are the same, no translation needed
      if (fromLanguage === toLanguage) {
        return text;
      }

      // Create a new translator instance with the correct language pair
      const translator = await window.Translator.create({
        sourceLanguage: fromLanguage,
        targetLanguage: toLanguage,
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            console.log(`Downloaded ${e.loaded * 100}%`);
          });
        },
      });

      // Use the translation API
      const { text: response } = await translator.translate(text);

      return response;
    } catch (error) {
      console.error('Chrome translation error:', error);
      return null;
    }
  }
}

