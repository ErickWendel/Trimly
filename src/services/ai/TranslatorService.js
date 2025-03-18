export default class TranslatorService {
  currentTranslator = null;
  currentLanguage = 'pt';
  
  static  async translate({ text, toLanguage, fromLanguage }) {
    if (this.currentTranslator && this.currentLanguage === toLanguage ) {
      return this.currentTranslator.translate(text);
    }

    this.currentLanguage = toLanguage;
    this.currentTranslator = await ai.translator.create({
      sourceLanguage: fromLanguage,
      targetLanguage: toLanguage,
    }); 
    return this.currentTranslator.translate(text);
  }
  
}

