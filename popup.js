document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const sourceText = document.getElementById('sourceText');
  const targetText = document.getElementById('targetText');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');
  const translateBtn = document.getElementById('translateBtn');
  const speakBtn = document.getElementById('speakBtn');
  const statusIndicator = document.getElementById('statusIndicator');
  const charCount = document.getElementById('charCount');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const copyIcon = copyBtn.querySelector('.copy-icon');
  const checkIcon = copyBtn.querySelector('.check-icon');
  const copyBtnText = copyBtn.querySelector('.btn-text');

  let debounceTimer = null;
  let currentTranslation = '';

  // Load saved state (Theme & Previous Text)
  initStorage();

  // Event Listeners
  sourceText.addEventListener('input', handleInput);
  translateBtn.addEventListener('click', () => performTranslation(sourceText.value.trim()));
  clearBtn.addEventListener('click', handleClear);
  copyBtn.addEventListener('click', handleCopy);
  speakBtn.addEventListener('click', handleSpeak);
  themeToggleBtn.addEventListener('click', toggleTheme);

  /**
   * Handle user typing with debounce
   */
  function handleInput() {
    const text = sourceText.value;
    updateCharCount(text.length);

    if (text.trim().length > 0) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
      resetOutput();
      saveState('');
      return;
    }

    // Save current input state
    saveState(text);

    // Debounce live translation (350ms)
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      performTranslation(text.trim());
    }, 350);
  }

  /**
   * Perform Google Translate API call
   * @param {string} text 
   */
  async function performTranslation(text) {
    if (!text) {
      resetOutput();
      return;
    }

    showLoading(true);

    try {
      // Google Translate free public endpoint
      const apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=si&dt=t&q=${encodeURIComponent(text)}`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Parse translation segments
      if (data && data[0] && Array.isArray(data[0])) {
        const translatedSegments = data[0]
          .filter(item => item && item[0])
          .map(item => item[0]);
        
        const fullTranslation = translatedSegments.join('');
        renderTranslation(fullTranslation);
      } else {
        throw new Error('Invalid response structure');
      }

    } catch (error) {
      console.error('Translation error:', error);
      renderError('Translation failed. Please check network connection.');
    } finally {
      showLoading(false);
    }
  }

  /**
   * Render translated text in output area
   */
  function renderTranslation(translated) {
    currentTranslation = translated;
    targetText.textContent = translated;
    targetText.classList.remove('placeholder-state');
    copyBtn.disabled = false;
    speakBtn.classList.remove('hidden');
  }

  /**
   * Render error message
   */
  function renderError(message) {
    currentTranslation = '';
    targetText.textContent = message;
    targetText.classList.add('placeholder-state');
    copyBtn.disabled = true;
    speakBtn.classList.add('hidden');
  }

  /**
   * Reset output area to default placeholder
   */
  function resetOutput() {
    currentTranslation = '';
    targetText.textContent = 'Translation will appear here...';
    targetText.classList.add('placeholder-state');
    copyBtn.disabled = true;
    speakBtn.classList.add('hidden');
  }

  /**
   * Handle Copy to Clipboard
   */
  async function handleCopy() {
    if (!currentTranslation) return;

    try {
      await navigator.clipboard.writeText(currentTranslation);
      showCopySuccessUI();
      showToast('Copied to clipboard!');
    } catch (err) {
      // Fallback copy execution
      const textArea = document.createElement('textarea');
      textArea.value = currentTranslation;
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
   * Visual UI feedback for Copy button
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
   * Handle Clear Button
   */
  function handleClear() {
    sourceText.value = '';
    updateCharCount(0);
    clearBtn.classList.add('hidden');
    resetOutput();
    saveState('');
    sourceText.focus();
  }

  let currentAudio = null;

  /**
   * Handle Text-to-Speech (Pronunciation) via Google TTS endpoint
   */
  function handleSpeak() {
    if (!currentTranslation) return;

    // Stop previous audio playback if running
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    speakBtn.classList.add('playing');

    // Google Cloud Translate TTS audio URL
    const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(currentTranslation)}&tl=si&client=tw-ob`;
    currentAudio = new Audio(ttsUrl);

    currentAudio.play().then(() => {
      // Audio playback started successfully
    }).catch((err) => {
      console.warn('Google TTS audio play error, trying browser SpeechSynthesis:', err);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentTranslation);
        utterance.lang = 'si';
        utterance.rate = 0.9;
        utterance.onend = () => speakBtn.classList.remove('playing');
        utterance.onerror = () => speakBtn.classList.remove('playing');
        window.speechSynthesis.speak(utterance);
      } else {
        speakBtn.classList.remove('playing');
        showToast('Audio playback not supported');
      }
    });

    currentAudio.onended = () => {
      speakBtn.classList.remove('playing');
      currentAudio = null;
    };

    currentAudio.onerror = () => {
      speakBtn.classList.remove('playing');
      currentAudio = null;
    };
  }

  /**
   * Character Counter Update
   */
  function updateCharCount(count) {
    charCount.textContent = `${count} / 5000`;
  }

  /**
   * Loading Spinner Toggle
   */
  function showLoading(isLoading) {
    if (isLoading) {
      statusIndicator.classList.remove('hidden');
    } else {
      statusIndicator.classList.add('hidden');
    }
  }

  /**
   * Show Notification Toast
   */
  function showToast(msg) {
    toastMessage.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2200);
  }

  /**
   * Theme Toggle Logic
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
   * Save text and theme state
   */
  function saveState(text) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ lastText: text });
    } else {
      localStorage.setItem('lastText', text);
    }
  }

  /**
   * Restore state on popup open
   */
  function initStorage() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['lastText', 'theme'], (result) => {
        if (result.theme) {
          document.documentElement.setAttribute('data-theme', result.theme);
        }
        if (result.lastText) {
          sourceText.value = result.lastText;
          handleInput();
        }
      });
    } else {
      const theme = localStorage.getItem('theme');
      const lastText = localStorage.getItem('lastText');
      if (theme) document.documentElement.setAttribute('data-theme', theme);
      if (lastText) {
        sourceText.value = lastText;
        handleInput();
      }
    }
  }
});
