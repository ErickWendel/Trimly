export default class SpeechSynthesisService {
  #synthesis;
  #voices = [];
  #languages = new Set();

  constructor() {
    this.#synthesis = window.speechSynthesis;
    this.#loadVoices();
  }

  #loadVoices() {
    // Immediately try to load voices
    this.#updateVoices();

    // Set up listener for voices changed event
    if (this.#synthesis.onvoiceschanged !== undefined) {
      this.#synthesis.addEventListener('voiceschanged', () => {
        this.#updateVoices();
      });
    }
  }

  #updateVoices() {
    this.#voices = this.#synthesis.getVoices();
    this.#languages.clear();
    
    this.#voices.forEach(voice => {
      const langCode = voice.lang.split('-')[0];
      this.#languages.add(langCode);
    });
  }

  getVoicesForLanguage(languageCode) {
    if (!languageCode) return [];
    return this.#voices.filter(voice => 
      voice.lang.toLowerCase().startsWith(languageCode.toLowerCase())
    );
  }

  getVoiceByName(voiceName) {
    return this.#voices.find(voice => voice.name === voiceName);
  }

  getLanguages() {
    return Array.from(this.#languages);
  }

  async speak(text, voice, languageCode) {
    if (!text) return;
    
    if (this.#synthesis.speaking) {
      this.#synthesis.cancel();
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      if (voice) utterance.voice = voice;
      if (languageCode) utterance.lang = languageCode;
      
      utterance.onend = resolve;
      utterance.onerror = reject;
      
      this.#synthesis.speak(utterance);
    });
  }
} 