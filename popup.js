document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const sourceText = document.getElementById('sourceText');
  const targetText = document.getElementById('targetText');
  const copyBtn = document.getElementById('copyBtn');
  const notesAction = document.getElementById('notesAction');
  const addToNotesBtn = document.getElementById('addToNotesBtn');
  const clearBtn = document.getElementById('clearBtn');
  const translateBtn = document.getElementById('translateBtn');
  const translateBtnText = document.getElementById('translateBtnText');
  const speakBtn = document.getElementById('speakBtn');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const charCount = document.getElementById('charCount');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const copyIcon = copyBtn.querySelector('.copy-icon');
  const checkIcon = copyBtn.querySelector('.check-icon');
  const copyBtnText = copyBtn.querySelector('.btn-text');

  // Toolbar & OCR Buttons
  const snipBtn = document.getElementById('snipBtn');
  const grabTextBtn = document.getElementById('grabTextBtn');
  const uploadImgBtn = document.getElementById('uploadImgBtn');
  const imageInput = document.getElementById('imageInput');

  // Mode & Suggestion DOM Elements
  const modeEn2SiBtn = document.getElementById('modeEn2Si');
  const modeSinglishBtn = document.getElementById('modeSinglish');
  const sourceLangLabel = document.getElementById('sourceLangLabel');
  const targetLangLabel = document.getElementById('targetLangLabel');
  const suggestionsWrapper = document.getElementById('suggestionsWrapper');
  const suggestionsList = document.getElementById('suggestionsList');
  const identifiedWordWrapper = document.getElementById('identifiedWordWrapper');
  const identifiedWord = document.getElementById('identifiedWord');

  let debounceTimer = null;
  let currentMode = 'en2si'; // 'en2si' or 'singlish'
  let currentTranslation = '';
  let currentIdentifiedSinhala = '';
  let activeAudio = null;

  // Initialize Storage & Pending Actions
  initStorage();

  // Event Listeners
  modeEn2SiBtn.addEventListener('click', () => switchMode('en2si'));
  modeSinglishBtn.addEventListener('click', () => switchMode('singlish'));
  sourceText.addEventListener('input', handleInput);
  translateBtn.addEventListener('click', () => triggerProcess(sourceText.value.trim()));
  clearBtn.addEventListener('click', handleClear);
  copyBtn.addEventListener('click', handleCopy);
  addToNotesBtn.addEventListener('click', handleAddToNotes);
  speakBtn.addEventListener('click', handleSpeak);
  themeToggleBtn.addEventListener('click', toggleTheme);

  // Action Toolbar Listeners
  snipBtn.addEventListener('click', handleStartSnip);
  grabTextBtn.addEventListener('click', handleGrabWebSelection);
  uploadImgBtn.addEventListener('click', () => imageInput.click());
  imageInput.addEventListener('change', handleImageUpload);

  /**
   * Switch translation mode ('en2si' or 'singlish')
   */
  function switchMode(newMode) {
    if (currentMode === newMode) return;

    currentMode = newMode;

    if (newMode === 'en2si') {
      modeEn2SiBtn.classList.add('active');
      modeEn2SiBtn.setAttribute('aria-selected', 'true');
      modeSinglishBtn.classList.remove('active');
      modeSinglishBtn.setAttribute('aria-selected', 'false');

      sourceLangLabel.innerHTML = '<span class="flag-icon">🇬🇧</span> English';
      targetLangLabel.innerHTML = '<span class="flag-icon">🇱🇰</span> Sinhala (සිංහල)';
      sourceText.placeholder = 'Enter English text here...';
      translateBtnText.textContent = 'Translate';

      suggestionsWrapper.classList.add('hidden');
      identifiedWordWrapper.classList.add('hidden');
    } else {
      modeSinglishBtn.classList.add('active');
      modeSinglishBtn.setAttribute('aria-selected', 'true');
      modeEn2SiBtn.classList.remove('active');
      modeEn2SiBtn.setAttribute('aria-selected', 'false');

      sourceLangLabel.innerHTML = '<span class="flag-icon">🗣️</span> Singlish (Phonetic English)';
      targetLangLabel.innerHTML = '<span class="flag-icon">🇬🇧</span> English Meaning';
      sourceText.placeholder = 'Type Sinhala word in English (e.g. kohomada, isthuthi)...';
      translateBtnText.textContent = 'Identify & Translate';
    }

    saveState(sourceText.value, currentMode);
    handleInput();
  }

  /**
   * Input event handler with 300ms debounce
   */
  function handleInput() {
    const text = sourceText.value;
    updateCharCount(text.length);

    if (text.trim().length > 0) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
      resetOutput();
      saveState('', currentMode);
      return;
    }

    saveState(text, currentMode);

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      triggerProcess(text.trim());
    }, 300);
  }

  /**
   * Main router for processing text based on mode
   */
  function triggerProcess(text) {
    if (!text) {
      resetOutput();
      return;
    }

    if (currentMode === 'en2si') {
      performEnglishToSinhala(text);
    } else {
      performSinglishPhonetic(text);
    }
  }

  /**
   * Mode 1: English ➔ Sinhala Standard Translation
   */
  async function performEnglishToSinhala(text) {
    showLoading(true, 'Translating...');
    notesAction.classList.add('hidden');
    suggestionsWrapper.classList.add('hidden');
    identifiedWordWrapper.classList.add('hidden');

    try {
      const apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=si&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);

      const data = await response.json();
      if (data && data[0] && Array.isArray(data[0])) {
        const fullTranslation = data[0]
          .filter(item => item && item[0])
          .map(item => item[0])
          .join('');
        
        currentIdentifiedSinhala = '';
        renderTranslation(fullTranslation);
      } else {
        throw new Error('Invalid structure');
      }
    } catch (error) {
      console.error('Translation Error:', error);
      renderError('Translation failed. Please check network connection.');
    } finally {
      showLoading(false);
    }
  }

  /**
   * Mode 2: Singlish Phonetic ➔ Identify Sinhala Word & Translate to English
   */
  async function performSinglishPhonetic(text) {
    showLoading(true, 'Identifying Sinhala...');

    try {
      // 1. Fetch phonetic suggestions from Google Input Tools
      const inputToolsUrl = `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=si-t-i0-und&num=8`;
      const response = await fetch(inputToolsUrl);
      
      let candidates = [];
      if (response.ok) {
        const data = await response.json();
        if (data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
          candidates = data[1][0][1];
        }
      }

      // Fallback if API fails or yields no candidates
      if (!candidates || candidates.length === 0) {
        candidates = transliterateSinglishOffline(text);
      }

      if (!candidates || candidates.length === 0) {
        renderError('Could not identify Sinhala word.');
        return;
      }

      // Render candidate chips and select top candidate
      renderSuggestions(candidates, text);
      const topCandidate = candidates[0];
      await selectSinhalaCandidate(topCandidate);

    } catch (error) {
      console.error('Singlish Processing Error:', error);
      const fallbackCandidates = transliterateSinglishOffline(text);
      if (fallbackCandidates.length > 0) {
        renderSuggestions(fallbackCandidates, text);
        await selectSinhalaCandidate(fallbackCandidates[0]);
      } else {
        renderError('Failed to process phonetic input.');
      }
    } finally {
      showLoading(false);
    }
  }

  /**
   * Render word candidate suggestion chips
   */
  function renderSuggestions(candidates, originalInput) {
    suggestionsList.innerHTML = '';

    if (candidates.length === 0) {
      suggestionsWrapper.classList.add('hidden');
      return;
    }

    candidates.forEach((cand, idx) => {
      const chip = document.createElement('button');
      chip.className = `suggestion-chip ${idx === 0 ? 'selected' : ''}`;
      chip.textContent = cand;
      chip.type = 'button';

      chip.addEventListener('click', () => {
        const allChips = suggestionsList.querySelectorAll('.suggestion-chip');
        allChips.forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');

        selectSinhalaCandidate(cand);
      });

      suggestionsList.appendChild(chip);
    });

    suggestionsWrapper.classList.remove('hidden');
  }

  /**
   * Translate selected Sinhala candidate word to English
   */
  async function selectSinhalaCandidate(sinhalaWord) {
    currentIdentifiedSinhala = sinhalaWord;
    notesAction.classList.add('hidden');
    identifiedWord.textContent = sinhalaWord;
    identifiedWordWrapper.classList.remove('hidden');

    showLoading(true, 'Translating meaning...');

    try {
      const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=si&tl=en&dt=t&q=${encodeURIComponent(sinhalaWord)}`;
      const res = await fetch(translateUrl);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);

      const data = await res.json();
      if (data && data[0] && Array.isArray(data[0])) {
        const englishMeaning = data[0]
          .filter(item => item && item[0])
          .map(item => item[0])
          .join('');

        renderTranslation(englishMeaning);
      } else {
        renderTranslation(sinhalaWord);
      }
    } catch (err) {
      console.warn('Sinhala -> EN meaning fetch error:', err);
      renderTranslation('Meaning unavailable offline');
    } finally {
      showLoading(false);
    }
  }

  /**
   * Action 1: Trigger Screen Snipper Overlay
   */
  function handleStartSnip() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'START_SNIPPER' }, (res) => {
        if (res && res.success) {
          showToast('Snipping tool activated! Drag box on active tab.');
          window.close(); // Close popup so user can drag selection on active tab
        } else {
          showToast('Failed to start snipper on current tab');
        }
      });
    } else {
      showToast('Screen snipping requires Chrome extension environment');
    }
  }

  /**
   * Action 2: Grab Highlighted Selection from Active Web Tab
   */
  function handleGrabWebSelection() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      showLoading(true, 'Grabbing web selection...');
      chrome.runtime.sendMessage({ action: 'GET_WEB_SELECTION' }, (res) => {
        showLoading(false);
        if (res && res.success && res.text) {
          sourceText.value = res.text;
          showToast('Grabbed selected text!');
          handleInput();
        } else {
          showToast('No text selected on active webpage tab');
        }
      });
    } else {
      showToast('Grab selection requires active web tab');
    }
  }

  /**
   * Action 3: Handle Local Image File Upload for OCR
   */
  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target.result;
      performOcrOnImage(dataUrl);
    };
    reader.readAsDataURL(file);
    imageInput.value = ''; // Reset input
  }

  /**
   * Perform Sinhala / English OCR on image data URL
   */
  async function performOcrOnImage(dataUrl) {
    showLoading(true, 'Recognizing Sinhala text...');

    try {
      let ocrText = '';

      // 1. Client-Side Tesseract.js OCR
      if (typeof Tesseract !== 'undefined') {
        const worker = await Tesseract.createWorker('sin+eng');
        const ret = await worker.recognize(dataUrl);
        ocrText = ret.data.text ? ret.data.text.trim() : '';
        await worker.terminate();
      }

      // 2. OCR API Fallback if client Tesseract yields empty
      if (!ocrText) {
        ocrText = await fetchOcrSpaceApi(dataUrl);
      }

      if (ocrText && ocrText.length > 0) {
        // Clean OCR text
        const cleanedText = ocrText.replace(/[\r\n]+/g, ' ').trim();
        sourceText.value = cleanedText;

        // Auto-detect Sinhala script vs English to pick best mode
        const hasSinhalaScript = /[\u0D80-\u0DFF]/.test(cleanedText);
        if (hasSinhalaScript && currentMode === 'en2si') {
          switchMode('singlish');
        }

        showToast('OCR Text Recognized!');
        handleInput();
      } else {
        renderError('No clear text recognized in image.');
      }
    } catch (err) {
      console.error('OCR Error:', err);
      renderError('OCR failed. Try a clearer image or cropped area.');
    } finally {
      showLoading(false);
    }
  }

  /**
   * OCR.space API Fallback
   */
  async function fetchOcrSpaceApi(dataUrl) {
    try {
      const formData = new FormData();
      formData.append('base64Image', dataUrl);
      formData.append('apikey', 'helloworld');
      formData.append('language', 'sin');

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) return '';
      const data = await response.json();
      if (data && data.ParsedResults && data.ParsedResults[0] && data.ParsedResults[0].ParsedText) {
        return data.ParsedResults[0].ParsedText.trim();
      }
    } catch (err) {
      console.warn('OCR space API fallback error:', err);
    }
    return '';
  }

  /**
   * Render translation in target card
   */
  function renderTranslation(translated) {
    currentTranslation = translated;
    targetText.textContent = translated;
    targetText.classList.remove('placeholder-state');
    copyBtn.disabled = false;
    speakBtn.classList.remove('hidden');
    notesAction.classList.toggle('hidden', !getVocabularyEntry());
  }

  /**
   * Render error state
   */
  function renderError(message) {
    currentTranslation = '';
    currentIdentifiedSinhala = '';
    targetText.textContent = message;
    targetText.classList.add('placeholder-state');
    copyBtn.disabled = true;
    speakBtn.classList.add('hidden');
    notesAction.classList.add('hidden');
    suggestionsWrapper.classList.add('hidden');
    identifiedWordWrapper.classList.add('hidden');
  }

  /**
   * Reset outputs to initial placeholder
   */
  function resetOutput() {
    currentTranslation = '';
    currentIdentifiedSinhala = '';
    targetText.textContent = 'Translation will appear here...';
    targetText.classList.add('placeholder-state');
    copyBtn.disabled = true;
    speakBtn.classList.add('hidden');
    notesAction.classList.add('hidden');
    suggestionsWrapper.classList.add('hidden');
    identifiedWordWrapper.classList.add('hidden');
  }

  /**
   * Copy to clipboard
   */
  async function handleCopy() {
    let copyContent = currentTranslation;
    if (currentMode === 'singlish' && currentIdentifiedSinhala) {
      copyContent = `${currentIdentifiedSinhala} (${currentTranslation})`;
    }

    if (!copyContent) return;

    try {
      await navigator.clipboard.writeText(copyContent);
      showCopySuccessUI();
      showToast('Copied to clipboard!');
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = copyContent;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        showCopySuccessUI();
        showToast('Copied to clipboard!');
      } catch (fallbackErr) {
        showToast('Failed to copy');
      }
      document.body.removeChild(textArea);
    }
  }

  /**
   * Open the Save Sinhala Word shortcut with the current vocabulary pair.
   */
  function handleAddToNotes() {
    const entry = getVocabularyEntry();
    if (!entry) {
      showToast('Translate a word before saving');
      return;
    }

    const shortcutUrl = `shortcuts://run-shortcut?name=Save%20Sinhala%20Word&input=text&text=${encodeURIComponent(entry)}`;

    try {
      window.location.href = shortcutUrl;
    } catch (error) {
      console.error('Could not open Apple Shortcuts:', error);
      showToast('Could not open Apple Shortcuts');
    }
  }

  /**
   * Return the current translation as "Sinhala — English".
   */
  function getVocabularyEntry() {
    if (!currentTranslation) return '';

    if (currentMode === 'singlish' && currentIdentifiedSinhala) {
      return `${currentIdentifiedSinhala} — ${currentTranslation}`;
    }

    const englishText = sourceText.value.trim();
    if (currentMode === 'en2si' && englishText) {
      return `${currentTranslation} — ${englishText}`;
    }

    return '';
  }

  /**
   * Visual feedback for Copy Button
   */
  function showCopySuccessUI() {
    copyBtn.classList.add('copied');
    copyIcon.classList.add('hidden');
    checkIcon.classList.remove('hidden');
    copyBtnText.textContent = 'Copied!';

    setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyIcon.classList.remove('hidden');
      checkIcon.classList.add('hidden');
      copyBtnText.textContent = 'Copy';
    }, 2000);
  }

  /**
   * Handle Audio Pronunciation (Text-To-Speech)
   */
  function handleSpeak() {
    let textToSpeak = currentTranslation;
    let lang = 'si';

    if (currentMode === 'singlish' && currentIdentifiedSinhala) {
      textToSpeak = currentIdentifiedSinhala;
      lang = 'si';
    } else if (currentMode === 'en2si') {
      lang = 'si';
    }

    if (!textToSpeak) return;

    if (activeAudio) {
      activeAudio.pause();
      activeAudio = null;
    }

    speakBtn.classList.add('playing');

    const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSpeak)}&tl=${lang}&client=tw-ob`;
    activeAudio = new Audio(ttsUrl);

    activeAudio.play().then(() => {
      // Audio playing
    }).catch(() => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = lang;
        utterance.rate = 0.9;
        utterance.onend = () => speakBtn.classList.remove('playing');
        utterance.onerror = () => speakBtn.classList.remove('playing');
        window.speechSynthesis.speak(utterance);
      } else {
        speakBtn.classList.remove('playing');
        showToast('Audio playback unavailable');
      }
    });

    activeAudio.onended = () => {
      speakBtn.classList.remove('playing');
      activeAudio = null;
    };

    activeAudio.onerror = () => {
      speakBtn.classList.remove('playing');
      activeAudio = null;
    };
  }

  /**
   * Handle Clear Input
   */
  function handleClear() {
    sourceText.value = '';
    updateCharCount(0);
    clearBtn.classList.add('hidden');
    resetOutput();
    saveState('', currentMode);
    sourceText.focus();
  }

  /**
   * Update character counter
   */
  function updateCharCount(count) {
    charCount.textContent = `${count} / 5000`;
  }

  /**
   * Toggle loading indicator
   */
  function showLoading(isLoading, text = 'Translating...') {
    if (isLoading) {
      statusText.textContent = text;
      statusIndicator.classList.remove('hidden');
    } else {
      statusIndicator.classList.add('hidden');
    }
  }

  /**
   * Show notification toast
   */
  function showToast(msg) {
    toastMessage.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2200);
  }

  /**
   * Toggle dark/light theme
   */
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ theme: newTheme });
    } else {
      localStorage.setItem('theme', newTheme);
    }
  }

  /**
   * Save input state & mode
   */
  function saveState(text, mode) {
    const data = { lastText: text, mode: mode };
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(data);
    } else {
      localStorage.setItem('lastText', text);
      localStorage.setItem('mode', mode);
    }
  }

  /**
   * Restore saved storage on extension load
   */
  function initStorage() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['lastText', 'theme', 'mode', 'pendingSelection', 'pendingOcrImage'], (result) => {
        if (result.theme) {
          document.documentElement.setAttribute('data-theme', result.theme);
        }
        if (result.mode) {
          switchMode(result.mode);
        }

        // Check for pending right-click context menu text selection
        if (result.pendingSelection) {
          sourceText.value = result.pendingSelection;
          chrome.storage.local.remove(['pendingSelection']);
          handleInput();
          return;
        }

        // Check for pending screen snippet image for OCR
        if (result.pendingOcrImage) {
          const imgData = result.pendingOcrImage;
          chrome.storage.local.remove(['pendingOcrImage']);
          performOcrOnImage(imgData);
          return;
        }

        if (result.lastText) {
          sourceText.value = result.lastText;
          handleInput();
        }
      });
    } else {
      const theme = localStorage.getItem('theme');
      const savedMode = localStorage.getItem('mode');
      const lastText = localStorage.getItem('lastText');

      if (theme) document.documentElement.setAttribute('data-theme', theme);
      if (savedMode) switchMode(savedMode);
      if (lastText) {
        sourceText.value = lastText;
        handleInput();
      }
    }
  }

  /**
   * Offline UCSC Singlish phonetic parser engine fallback
   */
  function transliterateSinglishOffline(text) {
    if (!text) return [];

    let input = text.toLowerCase().trim();

    const replacements = [
      ['nng', 'ඟ'], ['mbo', 'ඹො'], ['mba', 'ඹ'], ['nd', 'ඳ'], ['nnd', 'ඬ'], ['jny', 'ඥ'],
      ['sh', 'ශ'], ['ss', 'ෂ'], ['ch', 'ච'], ['kh', 'ඛ'], ['gh', 'ඝ'], ['chh', 'ඡ'],
      ['jh', 'ඣ'], ['th', 'ත'], ['dh', 'ද'], ['ph', 'ඵ'], ['bh', 'භ'], ['ny', 'ඤ'],
      ['aae', 'ෑ'], ['ae', 'ැ'], ['aa', 'ා'], ['ii', 'ී'], ['uu', 'ූ'], ['ee', 'ේ'], ['oo', 'ෝ'], ['ai', 'ෛ'], ['au', 'ෞ'],
      ['k', 'ක'], ['g', 'ග'], ['c', 'ච'], ['j', 'ජ'], ['t', 'ත'], ['d', 'ද'], ['n', 'න'],
      ['p', 'ප'], ['b', 'බ'], ['m', 'ම'], ['y', 'ය'], ['r', 'ර'], ['l', 'ල'], ['v', 'ව'], ['w', 'ව'],
      ['s', 'ස'], ['h', 'හ'], ['f', 'ෆ'], ['a', 'අ'], ['i', 'ඉ'], ['u', 'උ'], ['e', 'එ'], ['o', 'ඔ']
    ];

    for (const [pattern, char] of replacements) {
      input = input.split(pattern).join(char);
    }

    return [input];
  }
});
