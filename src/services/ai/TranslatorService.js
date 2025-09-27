export default class TranslatorService {

  async translate({text, fromLanguage, toLanguage}) {

      // If languages are the same, no translation needed
      if (fromLanguage === toLanguage) {
        return text;
      }

      // Create a new translator instance with the correct language pair
      const translator = await window.Translator.create({
        sourceLanguage: fromLanguage,
        targetLanguage: toLanguage,

      });

      return translator.translate(text)
  }
}

