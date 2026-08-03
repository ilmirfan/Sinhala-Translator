# English to Sinhala Translator Chrome Extension

A fast, lightweight, and modern Chrome Extension (Manifest V3) that translates English text to Sinhala in real-time. Features dynamic translation, instant copy-to-clipboard, audio pronunciation, and dark/light themes.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Language](https://img.shields.io/badge/Language-English%20to%20Sinhala-orange.svg)

---

## ✨ Features

- ⚡ **Real-Time Translation**: Translates as you type with debounced input optimization or via manual trigger.
- 📋 **One-Click Copy**: Copy translated Sinhala text directly to your clipboard with instant visual confirmation.
- 🔊 **Audio Pronunciation**: Stream natural Sinhala speech output directly using Google Text-to-Speech (TTS).
- 🎨 **Modern Aesthetics**: Sleek dark & light theme toggle with smooth animations, custom fonts (`Noto Sans Sinhala`), and character counting.
- 🧹 **Quick Clear**: One-tap text clear button.
- 🔒 **Privacy Focused & Free**: Uses public Google Translate endpoints — no personal API keys or account registration needed.

---

## 🚀 How to Install

### Option A: From GitHub Repository

1. **Clone or Download the Repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Sinhala-Converter.git
   ```
   *(Or download the ZIP archive and extract it on your computer)*

2. **Open Chrome Extensions Page**:
   Open Google Chrome and navigate to:
   ```text
   chrome://extensions
   ```

3. **Enable Developer Mode**:
   Toggle on **Developer mode** in the top-right corner of the Extensions page.

4. **Load Unpacked Extension**:
   - Click the **Load unpacked** button in the top-left corner.
   - Select the `Sinhala-Converter` folder (the folder containing `manifest.json`).

5. **Pin & Use**:
   - Click the Puzzle icon (Extensions) in the Chrome toolbar.
   - Pin **Sinhala Translator** for quick access anytime!

---

## 🛠️ Project Structure

```text
Sinhala-Converter/
├── manifest.json       # Extension Manifest V3 configuration
├── popup.html          # Extension popup UI HTML structure
├── popup.css           # Custom styling (Dark/Light theme, layout, animations)
├── popup.js            # Translation, TTS, copy, & interaction logic
├── create_icons.js     # Script to generate high-res extension PNG icons
├── icons/              # Extension icon set (16x16, 48x48, 128x128)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md           # Project documentation
```

---

## 🎨 Icon Regeneration (Optional)

Icons (`icon16.png`, `icon48.png`, `icon128.png`) are pre-generated inside the `icons/` folder. If you want to re-generate them using Node.js:

```bash
node create_icons.js
```

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).
