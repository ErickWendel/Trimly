
export default class SpeechManager {
  #speechSynthesisService;
  #speechRecognitionService;
  #languageSelect;
  #voiceSelect;
  #controlsPanel;

  constructor({ speechSynthesisService, speechRecognitionService }) {
    this.#speechSynthesisService = speechSynthesisService;
    this.#speechRecognitionService = speechRecognitionService;

    this.#initializeElements();
    this.#initializeServices();
    this.#setupEventListeners();
  }

  #initializeElements() {
    this.#languageSelect = document.getElementById('languageSelect');
    this.#voiceSelect = document.getElementById('voiceSelect');
    this.#controlsPanel = document.getElementById('controls');

    if (!this.#languageSelect || !this.#voiceSelect || !this.#controlsPanel) {
      throw new Error('Required DOM elements not found');
    }
  }

  #initializeServices() {
    // Initialize language select when voices are available
    this.#initializeLanguageSelect();
  }

  #initializeLanguageSelect() {
    // Get user's browser language
    const userLanguage = navigator.language.split('-')[0];
    const languages = this.#speechSynthesisService.getLanguages();

    this.#languageSelect.innerHTML = '';
    languages.sort().forEach(lang => {
      const option = document.createElement('option');
      option.value = lang;
      option.textContent = new Intl.DisplayNames(['en'], { type: 'language' }).of(lang);
      
      // Set as selected if it matches user's language
      if (lang === userLanguage) {
        option.selected = true;
      }
      
      this.#languageSelect.appendChild(option);
    });

    // Initial voice list update
    this.#updateVoiceList();
    
    // If no language was automatically selected, select the first available language
    if (!this.#languageSelect.value && this.#languageSelect.options.length > 0) {
      this.#languageSelect.options[0].selected = true;
      this.#updateVoiceList();
    }
  }

  #setupEventListeners() {
    // Language selection change
    this.#languageSelect.addEventListener('change', () => {
      this.#updateVoiceList();
    });

    // Controls panel collapse/expand
    const header = this.#controlsPanel.querySelector('.controls-header');
    if (header) {
      header.addEventListener('click', () => {
        this.#toggleControlsPanel();
      });
    }

    // Speech recognition keyboard controls
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !this.#speechRecognitionService.isRecording) {
        this.#startRecording();
      }
    });

    document.addEventListener('keyup', (event) => {
      if (event.key === 'Enter' && this.#speechRecognitionService.isRecording) {
        this.#stopRecording();
      }
    });

    // Listen for voice list updates
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      this.#initializeLanguageSelect();
    });

    // Restore controls panel state
    this.#restoreControlsPanelState();
  }

  #updateVoiceList() {
    const selectedLang = this.#languageSelect.value;
    const voices = this.#speechSynthesisService.getVoicesForLanguage(selectedLang);
    
    this.#voiceSelect.innerHTML = '';
    voices.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      this.#voiceSelect.appendChild(option);
    });

    // Select first voice by default if none selected
    if (voices.length > 0 && !this.#voiceSelect.value) {
      this.#voiceSelect.options[0].selected = true;
    }

    // Update recognition language
    this.#speechRecognitionService.setLanguage(this.#getSelectedLanguageCode());
  }

  #startRecording() {
    this.#speechRecognitionService.setLanguage(this.#getSelectedLanguageCode());
    this.#speechRecognitionService.startRecording();
  }

  #stopRecording() {
    this.#speechRecognitionService.stopRecording();
  }

  #toggleControlsPanel() {
    this.#controlsPanel.classList.toggle('collapsed');
    localStorage.setItem('controlsPanelCollapsed', 
      this.#controlsPanel.classList.contains('collapsed'));
  }

  #restoreControlsPanelState() {
    const wasCollapsed = localStorage.getItem('controlsPanelCollapsed') === 'true';
    if (wasCollapsed) {
      this.#controlsPanel.classList.add('collapsed');
    }
  }

  #getSelectedLanguageCode() {
    const selectedLang = this.#languageSelect.value;
    return selectedLang;
  }

  async speak(text) {
    const voice = this.#speechSynthesisService.getVoiceByName(this.#voiceSelect.value);
    const languageCode = this.#getSelectedLanguageCode();
    return this.#speechSynthesisService.speak(text, voice, languageCode);
  }

  getSelectedLanguageCode() {
    return this.#getSelectedLanguageCode();
  }
  
}
