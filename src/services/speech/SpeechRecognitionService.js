import { SPEECH_EVENTS } from '../constants.js';

export default class SpeechRecognitionService {
  #recognition;
  #isRecording = false;
  #currentLanguage = '';

  constructor() {
    this.#initializeRecognition();
  }

  #initializeRecognition() {
    if (!('webkitSpeechRecognition' in window)) {
      throw new Error('Speech recognition is not supported in this browser');
    }

    this.#recognition = new webkitSpeechRecognition();
    this.#setupRecognitionConfig();
    this.#setupRecognitionEvents();
  }

  #setupRecognitionConfig() {
    this.#recognition.interimResults = false;
    this.#recognition.maxAlternatives = 5;
    this.#recognition.continuous = false;
  }

  #setupRecognitionEvents() {
    this.#recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.SPEECH_RECOGNIZED, {
        detail: { transcript }
      }));
    };

    this.#recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.#isRecording = false;
      window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.SPEECH_ERROR, {
        detail: { error: event.error }
      }));
    };

    this.#recognition.onend = () => {
      this.#isRecording = false;
      window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.SPEECH_END));
    };
  }

  startRecording() {
    // Prevent starting if already recording
    if (this.#isRecording) {
      console.warn('Speech recognition is already active');
      return;
    }

    try {
      this.#recognition.start();
      this.#isRecording = true;
      window.dispatchEvent(new CustomEvent('speech-recognition-started'));
      window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.SPEECH_START));
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.#isRecording = false;
      window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.SPEECH_ERROR, {
        detail: { error: error.message }
      }));
    }
  }

  stopRecording() {
    if (!this.#isRecording) {
      console.warn('Speech recognition is not active');
      return;
    }

    try {
      this.#recognition.stop();
      window.dispatchEvent(new CustomEvent('speech-recognition-stopped'));
      // Note: #isRecording will be set to false in the onend event handler
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
      this.#isRecording = false;
      window.dispatchEvent(new CustomEvent(SPEECH_EVENTS.SPEECH_ERROR, {
        detail: { error: error.message }
      }));
    }
  }

  setLanguage(languageCode) {
    if (!languageCode) return;
    
    if (this.#currentLanguage !== languageCode) {
      this.#currentLanguage = languageCode;
      this.#recognition.lang = languageCode;
    }
  }

  get isRecording() {
    return this.#isRecording;
  }
}