import { API_STATUS } from './constants.js';

export class APIStatusChecker {
  static #API_ELEMENTS = Object.freeze({
    tts: 'ttsStatus',
    stt: 'sttStatus',
    prompt: 'promptStatus',
    translator: 'translatorStatus'
  });

  static #checkAPI(elementId, condition) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const status = condition ? API_STATUS.AVAILABLE : API_STATUS.UNAVAILABLE;
    element.classList.add(status);
  }

  static checkAvailability() {
    const { tts, stt, prompt, translator } = this.#API_ELEMENTS;

    this.#checkAPI(tts, 'speechSynthesis' in window);
    this.#checkAPI(stt, 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
    this.#checkAPI(prompt, window.ai?.languageModel);
    this.#checkAPI(translator, window.ai?.translator);
  }
} 