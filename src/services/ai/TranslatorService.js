export default class TranslatorService {

  async translate({text, fromLanguage, toLanguage}) {
    try {
      // If languages are the same, no translation needed
      if (fromLanguage === toLanguage) {
        return text;
      }

      // Create a new translator instance with the correct language pair
      const translator = await ai.translator.create({
        sourceLanguage: fromLanguage,
        targetLanguage: toLanguage,
      });

      // Use the translation API
      const response = await translator.translate(text);

      return response;
    } catch (error) {
      console.error('Chrome translation error:', error);
      return null;
    }
  }
}

