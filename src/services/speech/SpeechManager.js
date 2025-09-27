const STORAGE_KEYS = {
    CONTROLS_COLLAPSED: 'controlsPanelCollapsed',
    SELECTED_LANGUAGE: 'selectedLanguage',
    SELECTED_VOICE: 'selectedVoice'
};

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
    this.#setupEventListeners();
    // this.#initializeLanguageSelect();

  }

  #initializeElements() {
    this.#languageSelect = document.getElementById('languageSelect');
    this.#voiceSelect = document.getElementById('voiceSelect');
    this.#controlsPanel = document.getElementById('controls');

    if (!this.#languageSelect || !this.#voiceSelect || !this.#controlsPanel) {
      throw new Error('Required DOM elements not found');
    }
  }


  #initializeLanguageSelect() {
    const languages = this.#speechSynthesisService.getLanguages();
    const savedLanguage = localStorage.getItem(STORAGE_KEYS.SELECTED_LANGUAGE);
    const userLanguage = navigator.language.split('-')[0];

    this.#languageSelect.innerHTML = '';
    languages.sort().forEach(lang => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = new Intl.DisplayNames(['en'], { type: 'language' }).of(lang);

        // Priority: 1. Saved Language, 2. Browser Language, 3. First Available
        if (savedLanguage && lang === savedLanguage) {
            option.selected = true;
        } else if (!savedLanguage && lang === userLanguage) {
            option.selected = true;
        }

        this.#languageSelect.appendChild(option);
    });

    // If no language was selected (neither saved nor browser language matched),
    // select the first available language
    if (!this.#languageSelect.value && this.#languageSelect.options.length > 0) {
        this.#languageSelect.options[0].selected = true;
    }

    // Initial voice list update
    this.#updateVoiceList();
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

    // Add voice selection change listener
    this.#voiceSelect.addEventListener('change', () => {
      this.#saveSelections();
    });

    // Restore controls panel state
    this.#restoreControlsPanelState();
  }

  #updateVoiceList() {
    const selectedLang = this.#languageSelect.value;
    const voices = this.#speechSynthesisService.getVoicesForLanguage(selectedLang);
    const savedVoice = localStorage.getItem(STORAGE_KEYS.SELECTED_VOICE);

    this.#voiceSelect.innerHTML = '';
    voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;

        // Only select saved voice if it matches the current language
        if (savedVoice === voice.name && voice.lang.startsWith(selectedLang)) {
            option.selected = true;
        }
        this.#voiceSelect.appendChild(option);
    });

    // Select first voice only if no saved voice was found or matched
    if (voices.length > 0 && !this.#voiceSelect.value) {
        this.#voiceSelect.options[0].selected = true;
    }

    // Update recognition language
    this.#speechRecognitionService.setLanguage(this.#getSelectedLanguageCode());

    // Save selections only if they changed
    if (this.#languageSelect.value !== localStorage.getItem(STORAGE_KEYS.SELECTED_LANGUAGE) ||
        this.#voiceSelect.value !== localStorage.getItem(STORAGE_KEYS.SELECTED_VOICE)) {
        this.#saveSelections();
    }
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
    localStorage.setItem(
      STORAGE_KEYS.CONTROLS_COLLAPSED,
      this.#controlsPanel.classList.contains('collapsed')
    );
  }

  #restoreControlsPanelState() {
    const wasCollapsed = localStorage.getItem(STORAGE_KEYS.CONTROLS_COLLAPSED) === 'true';
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

  #saveSelections() {
    localStorage.setItem(STORAGE_KEYS.SELECTED_LANGUAGE, this.#getSelectedLanguageCode());
    localStorage.setItem(STORAGE_KEYS.SELECTED_VOICE, this.#voiceSelect.value);
  }
}
