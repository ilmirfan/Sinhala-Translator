/**
 * Offscreen OCR — Tesseract.js with persistent worker, no blob URLs.
 * tesseract.min.js is patched: uses new Worker(path) directly, not blob wrapper.
 * worker.min.js is patched: XHR fallback if importScripts(corePath) fails.
 */

let tesseractWorker = null;
let workerReady = false;
let workerInitPromise = null;

// ── Message listener ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'OFFSCREEN_PREWARM') {
    // Background asks us to start loading WASM now (before user triggers OCR)
    console.log('[Offscreen] Pre-warm requested');
    ensureWorker().catch(e => console.warn('[Offscreen] Pre-warm failed:', e));
    sendResponse({ started: true });
    return false;
  }

  if (request.action === 'OFFSCREEN_OCR') {
    console.log('[Offscreen] OCR request received');
    runOcr(request.imageDataUrl)
      .then(text => {
        console.log('[Offscreen] OCR success:', text.length, 'chars');
        sendResponse({ success: true, text });
      })
      .catch(err => {
        console.error('[Offscreen] OCR failed:', err);
        sendResponse({ success: false, error: String(err?.message || err) });
      });
    return true; // keep async channel open
  }
});

// ── Load a <script> tag into this offscreen page ────────────────────────────
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load: ' + src));
    document.head.appendChild(s);
  });
}

// ── Init Tesseract worker (only once, kept alive between OCR calls) ──────────
function ensureWorker() {
  if (workerReady) return Promise.resolve();
  if (workerInitPromise) return workerInitPromise;

  workerInitPromise = (async () => {
    console.log('[Offscreen] Loading Tesseract.js...');
    await loadScript(chrome.runtime.getURL('lib/tesseract.min.js'));

    if (typeof Tesseract === 'undefined') throw new Error('Tesseract not defined after load');
    console.log('[Offscreen] Tesseract.js loaded. Creating worker...');

    const workerPath = chrome.runtime.getURL('lib/worker.min.js');
    const corePath   = chrome.runtime.getURL('lib/tesseract-core.wasm.js');
    const langPath   = chrome.runtime.getURL('lib');

    // createWorker with workerBlobURL:false → uses new Worker(workerPath) directly
    // (tesseract.min.js patched to skip blob creation entirely)
    tesseractWorker = await Tesseract.createWorker({
      workerPath,
      corePath,
      langPath,
      cachePath:     langPath,
      workerBlobURL: false,
      gzip:          false,
      logger: (m) => {
        if (m.status && m.progress !== undefined) {
          const pct = Math.round(m.progress * 100);
          console.log(`[Tesseract] ${m.status} ${pct}%`);
        }
      }
    });

    console.log('[Offscreen] Worker created. Loading language...');
    await tesseractWorker.loadLanguage('sin');
    console.log('[Offscreen] Language loaded. Initializing...');
    await tesseractWorker.initialize('sin');
    await tesseractWorker.setParameters({ tessedit_ocr_engine_mode: '1' });

    workerReady = true;
    console.log('[Offscreen] ✅ Tesseract ready');

    // Tell background the engine is warmed up
    chrome.runtime.sendMessage({ action: 'OFFSCREEN_ENGINE_READY' }).catch(() => {});
  })();

  workerInitPromise.catch(err => {
    console.error('[Offscreen] Init failed:', err);
    workerInitPromise = null; // allow retry
  });

  return workerInitPromise;
}

// ── Run OCR ──────────────────────────────────────────────────────────────────
async function runOcr(imageDataUrl) {
  await ensureWorker();
  console.log('[Offscreen] Running recognition...');
  const { data } = await tesseractWorker.recognize(imageDataUrl);
  const text = (data?.text || '').trim();
  if (!text) throw new Error('No text recognized in selection');
  return text;
}

// Pre-warm immediately when this page loads
console.log('[Offscreen] Page initialized — starting pre-warm');
ensureWorker().catch(e => console.warn('[Offscreen] Initial pre-warm error:', e));
