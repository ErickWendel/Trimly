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
    const isTTSAvailable = 'speechSynthesis' in window;
    const isSTTAvailable = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    const isPromptAvailable = window.ai?.languageModel;
    const isTranslatorAvailable = window.ai?.translator;

    this.#checkAPI(tts, isTTSAvailable);
    this.#checkAPI(stt, isSTTAvailable);
    this.#checkAPI(prompt, isPromptAvailable);
    this.#checkAPI(translator, isTranslatorAvailable);

    return {
      tts: isTTSAvailable,
      stt: isSTTAvailable,
      prompt: isPromptAvailable,
      translator: isTranslatorAvailable
    }
  }
} 