// Extension Background Service Worker (Manifest V3)

let creatingOffscreenDoc = null;
let ocrEngineReady = false; // true after first successful Tesseract init

async function setupOffscreenDocument() {
  const path = 'offscreen.html';
  const url  = chrome.runtime.getURL(path);

  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [url]
  });
  if (existingContexts.length > 0) return true;

  if (creatingOffscreenDoc) { await creatingOffscreenDoc; creatingOffscreenDoc = null; return true; }

  try {
    creatingOffscreenDoc = chrome.offscreen.createDocument({
      url: path,
      reasons: ['WORKERS'],
      justification: 'Run local Sinhala WASM OCR engine'
    });
    await creatingOffscreenDoc;
    creatingOffscreenDoc = null;
    return true;
  } catch (e) {
    creatingOffscreenDoc = null;
    return true;
  }
}

// Pre-warm: create offscreen doc and start Tesseract init immediately
async function prewarmOcr() {
  try {
    await setupOffscreenDocument();
    // Give the page 200ms to start, then ping it to begin warming
    await new Promise(r => setTimeout(r, 500));
    chrome.runtime.sendMessage({ action: 'OFFSCREEN_PREWARM' }, () => {
      if (chrome.runtime.lastError) {
        // Offscreen not ready yet — that's OK
      }
    });
  } catch (e) { /* ignore prewarm errors */ }
}

// ── Install / startup ────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'translate_sinhala_selection',
    title: "Translate Selected Text ('%s')",
    contexts: ['selection']
  });
  prewarmOcr();
});

// Also prewarm when service worker starts (e.g. after browser restart)
prewarmOcr();

// ── Context Menu ─────────────────────────────────────────────────────────────
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'translate_sinhala_selection' && info.selectionText) {
    chrome.storage.local.set({ pendingSelection: info.selectionText.trim(), lastText: info.selectionText.trim() });
    if (chrome.action && chrome.action.openPopup) chrome.action.openPopup().catch(() => {});
  }
});

// ── Message listener ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'OFFSCREEN_ENGINE_READY') {
    ocrEngineReady = true;
    console.log('[Background] OCR engine is ready');
    return false;
  }
  if (request.action === 'START_SNIPPER') {
    handleStartSnipper(sender.tab ? sender.tab.id : null, sendResponse);
    return true;
  }
  if (request.action === 'CAPTURE_TAB') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'Capture failed' });
      } else {
        sendResponse({ success: true, dataUrl });
      }
    });
    return true;
  }
  if (request.action === 'GET_WEB_SELECTION') { handleGetWebSelection(sendResponse); return true; }
  if (request.action === 'TRANSLATE_TEXT')     { handleTranslateText(request.text, request.sl, request.tl, sendResponse); return true; }
  if (request.action === 'PERFORM_OCR')        { handlePerformOcr(request.imageDataUrl, sendResponse); return true; }
});

// ── OCR ──────────────────────────────────────────────────────────────────────
async function handlePerformOcr(imageDataUrl, sendResponse) {
  try {
    await setupOffscreenDocument();

    // If engine is already warmed up, short delay; otherwise longer for init
    const initDelay = ocrEngineReady ? 100 : 600;
    await new Promise(r => setTimeout(r, initDelay));

    // Timeout: 90s if engine not ready yet (WASM compile), 25s once ready
    const timeoutMs = ocrEngineReady ? 25000 : 90000;
    const timeoutMsg = ocrEngineReady
      ? 'OCR timed out — try a smaller selection'
      : 'OCR engine is loading (first use takes ~30s). Please try again in a moment.';

    const ocrResult = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve({ success: false, error: timeoutMsg }), timeoutMs);

      chrome.runtime.sendMessage({ action: 'OFFSCREEN_OCR', imageDataUrl }, (res) => {
        clearTimeout(timer);
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          if (res?.success) ocrEngineReady = true;
          resolve(res || { success: false, error: 'No response from OCR engine' });
        }
      });
    });

    sendResponse(ocrResult);
  } catch (err) {
    sendResponse({ success: false, error: err?.message || 'Background OCR error' });
  }
}

// ── Snipper ──────────────────────────────────────────────────────────────────
async function handleStartSnipper(tabIdFromSender, sendResponse) {
  try {
    let tabId = tabIdFromSender;
    if (!tabId) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab?.id) { sendResponse({ success: false, error: 'No active tab found' }); return; }
      tabId = activeTab.id;
    }
    await chrome.scripting.insertCSS({ target: { tabId }, files: ['snipper.css'] }).catch(() => {});
    await chrome.scripting.executeScript({ target: { tabId }, files: ['snipper.js'] });
    sendResponse({ success: true });
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

// ── Translate ─────────────────────────────────────────────────────────────────
async function handleTranslateText(text, sl = 'auto', tl = 'en', sendResponse) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data?.[0] && Array.isArray(data[0])) {
      const translation = data[0].filter(i => i?.[0]).map(i => i[0]).join('');
      sendResponse({ success: true, translation });
    } else {
      sendResponse({ success: false, error: 'Invalid response format' });
    }
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

// ── Web Selection ─────────────────────────────────────────────────────────────
async function handleGetWebSelection(sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) { sendResponse({ success: false, error: 'No active tab' }); return; }
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() || ''
    });
    sendResponse({ success: true, text: results?.[0]?.result?.trim() || '' });
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}
