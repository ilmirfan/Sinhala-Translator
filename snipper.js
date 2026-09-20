(function () {
  // Remove existing overlays or cards if present
  const existingOverlay = document.getElementById('sinhala-snipper-overlay');
  if (existingOverlay) existingOverlay.remove();
  const existingCard = document.getElementById('sinhala-snipper-card');
  if (existingCard) existingCard.remove();

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'sinhala-snipper-overlay';

  // Create hint badge
  const hint = document.createElement('div');
  hint.id = 'sinhala-snipper-hint';
  hint.textContent = '✂️ Drag box around Sinhala text to OCR (Esc to cancel)';
  overlay.appendChild(hint);

  // Create selection box
  const box = document.createElement('div');
  box.id = 'sinhala-snipper-box';
  box.style.display = 'none';
  overlay.appendChild(box);

  document.body.appendChild(overlay);

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let currentRect = null;

  overlay.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    box.style.left = `${startX}px`;
    box.style.top = `${startY}px`;
    box.style.width = '0px';
    box.style.height = '0px';
    box.style.display = 'block';
  });

  overlay.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
    box.style.width = `${width}px`;
    box.style.height = `${height}px`;

    currentRect = {
      x: left,
      y: top,
      width: width,
      height: height
    };
  });

  overlay.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;

    if (currentRect && currentRect.width > 12 && currentRect.height > 12) {
      const rectToUse = { ...currentRect };
      overlay.remove();
      cleanupListeners();

      createFloatingCard(rectToUse);
    } else {
      box.style.display = 'none';
      currentRect = null;
    }
  });

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      overlay.remove();
      cleanupListeners();
    }
  }

  function cleanupListeners() {
    window.removeEventListener('keydown', handleKeyDown);
  }

  window.addEventListener('keydown', handleKeyDown);

  /**
   * Create and position floating OCR result card on screen
   */
  function createFloatingCard(rect) {
    const card = document.createElement('div');
    card.id = 'sinhala-snipper-card';

    let cardLeft = rect.x;
    let cardTop = rect.y + rect.height + 12;

    if (cardLeft + 330 > window.innerWidth) cardLeft = window.innerWidth - 340;
    if (cardLeft < 10) cardLeft = 10;
    if (cardTop + 180 > window.innerHeight) cardTop = rect.y - 190;
    if (cardTop < 10) cardTop = 10;

    card.style.left = `${cardLeft}px`;
    card.style.top = `${cardTop}px`;

    card.innerHTML = `
      <div class="snipper-card-header">
        <span>🇱🇰 Sinhala OCR & Translation</span>
        <button id="snipperCardClose" class="snipper-card-close">✕</button>
      </div>
      <div id="snipperCardBody" class="snipper-card-body">
        <div class="snipper-loading">
          <span class="snipper-spinner"></span> Capturing selected screen area...
        </div>
      </div>
    `;

    document.body.appendChild(card);
    document.getElementById('snipperCardClose').addEventListener('click', () => card.remove());

    chrome.runtime.sendMessage({ action: 'CAPTURE_TAB' }, (res) => {
      if (!res || !res.success || !res.dataUrl) {
        const errStr = res && res.error ? res.error : 'Failed to capture screen image';
        renderCardError(card, errStr);
        return;
      }

      cropAndPreprocessCanvas(res.dataUrl, rect, async (preprocessedDataUrl) => {
        const cardBody = document.getElementById('snipperCardBody');
        if (cardBody) {
          cardBody.innerHTML = `
            <div class="snipper-loading">
              <span class="snipper-spinner"></span> Running OCR<br>
              <small style="font-size:10px;opacity:0.7;margin-top:4px;display:block">First use may take up to 30s while engine loads</small>
            </div>
          `;
        }

        // Send preprocessed cropped image to Offscreen WASM engine via background
        chrome.runtime.sendMessage({ action: 'PERFORM_OCR', imageDataUrl: preprocessedDataUrl }, (ocrRes) => {
          if (!ocrRes || !ocrRes.success || !ocrRes.text) {
            renderCardError(card, ocrRes && ocrRes.error ? ocrRes.error : 'No Sinhala text recognized in crop');
            return;
          }

          const recognizedText = ocrRes.text;

          if (cardBody) {
            cardBody.innerHTML = `
              <div class="snipper-loading">
                <span class="snipper-spinner"></span> Translating text...
              </div>
            `;
          }

          chrome.runtime.sendMessage({ action: 'TRANSLATE_TEXT', text: recognizedText, sl: 'auto', tl: 'en' }, (transRes) => {
            const translation = transRes && transRes.success ? transRes.translation : 'Translation failed';
            
            chrome.storage.local.set({
              pendingSelection: recognizedText,
              lastText: recognizedText
            });

            renderCardSuccess(card, recognizedText, translation);
          });
        });
      });
    });
  }

  /**
   * Crop image canvas with 14px viewport padding, luminance auto-inversion, grayscale contrast stretch, and 3x upscaling
   */
  function cropAndPreprocessCanvas(dataUrl, rect, callback) {
    const img = new Image();
    img.onload = () => {
      const rx = img.naturalWidth / window.innerWidth;
      const ry = img.naturalHeight / window.innerHeight;

      const padViewport = 14;
      const rawX = Math.max(0, rect.x - padViewport);
      const rawY = Math.max(0, rect.y - padViewport);
      const rawW = rect.width + padViewport * 2;
      const rawH = rect.height + padViewport * 2;

      const cropX = Math.max(0, Math.round(rawX * rx));
      const cropY = Math.max(0, Math.round(rawY * ry));
      const cropW = Math.min(img.naturalWidth - cropX, Math.round(rawW * rx));
      const cropH = Math.min(img.naturalHeight - cropY, Math.round(rawH * ry));

      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = Math.max(10, cropW);
      srcCanvas.height = Math.max(10, cropH);
      const srcCtx = srcCanvas.getContext('2d');
      srcCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      const resultDataUrl = preprocessImageForOcr(srcCanvas);
      callback(resultDataUrl);
    };
    img.src = dataUrl;
  }

  /**
   * Auto-invert dark background, contrast thresholding & 3x HD upscaling with 35px pure white margins
   */
  function preprocessImageForOcr(srcCanvas) {
    const ctx = srcCanvas.getContext('2d');
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let totalLuma = 0;
    for (let i = 0; i < data.length; i += 4) {
      totalLuma += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const avgLuma = totalLuma / (w * h);
    const isDarkBg = avgLuma < 150;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      let gray = 0.299 * r + 0.587 * g + 0.114 * b;
      if (isDarkBg) {
        gray = 255 - gray;
      }

      if (gray < 60) gray = 0;
      else if (gray > 190) gray = 255;

      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    const scale = 3.0;
    const pad = 35;
    const outW = Math.round(w * scale + pad * 2);
    const outH = Math.round(h * scale + pad * 2);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    tempCanvas.getContext('2d').putImageData(imgData, 0, 0);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const outCtx = outCanvas.getContext('2d');

    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, outW, outH);

    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(tempCanvas, pad, pad, Math.round(w * scale), Math.round(h * scale));

    return outCanvas.toDataURL('image/png');
  }

  function renderCardSuccess(card, text, translation) {
    const cardBody = document.getElementById('snipperCardBody');
    if (!cardBody) return;

    cardBody.innerHTML = `
      <div class="snipper-rec-text">${escapeHtml(text)}</div>
      <div class="snipper-trans-text">${escapeHtml(translation)}</div>
      <div class="snipper-card-actions">
        <button id="snipperCopyBtn" class="snipper-btn">📋 Copy</button>
        <button id="snipperSpeakBtn" class="snipper-btn">🔊 Listen</button>
      </div>
    `;

    document.getElementById('snipperCopyBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(`${text} (${translation})`);
      document.getElementById('snipperCopyBtn').textContent = 'Copied!';
      setTimeout(() => {
        const btn = document.getElementById('snipperCopyBtn');
        if (btn) btn.textContent = '📋 Copy';
      }, 1800);
    });

    document.getElementById('snipperSpeakBtn').addEventListener('click', () => {
      const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=si&client=tw-ob`;
      const audio = new Audio(ttsUrl);
      audio.play().catch(() => {});
    });
  }

  function renderCardError(card, msg) {
    const cardBody = document.getElementById('snipperCardBody');
    if (!cardBody) return;
    cardBody.innerHTML = `<div style="color:#f43f5e; font-size:12px;">⚠️ ${escapeHtml(getErrorMessage(msg))}</div>`;
  }

  function getErrorMessage(err) {
    if (!err) return 'Unknown error occurred';
    if (typeof err === 'string') return err;
    if (err.message && typeof err.message === 'string') return err.message;
    return String(err);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
