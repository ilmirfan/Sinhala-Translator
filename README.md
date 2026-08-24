# English to Sinhala Translator Chrome Extension

A fast, lightweight, and modern Chrome Extension (Manifest V3) that translates English text to Sinhala in real-time. Features dynamic translation, instant copy-to-clipboard, audio pronunciation, and dark/light themes.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Language](https://img.shields.io/badge/Language-English%20to%20Sinhala-orange.svg)

---

## ✨ Features

- 🗣️ **Singlish Phonetic Mode**: Type Sinhala words phonetically using English letters (e.g. `kohomada`, `isthuthi`, `subha udasanak`).
- 💡 **Interactive Word Suggestions**: View real-time Sinhala word suggestion candidate chips and pick the exact intended word.
- 🌐 **Dual Translation**: Seamlessly switch between **English ➔ Sinhala** and **Singlish ➔ Sinhala & English Meaning**.
- ⚡ **Real-Time Translation**: Translates as you type with debounced input optimization or via manual trigger.
- 📋 **One-Click Copy**: Copy translated text or identified Sinhala word + meaning directly to your clipboard.
- 🔊 **Audio Pronunciation**: Stream natural Sinhala speech output directly using Google Text-to-Speech (TTS).
- 🎨 **Modern Aesthetics**: Sleek dark & light theme toggle with smooth animations, custom fonts (`Noto Sans Sinhala`), and character counting.
- 🧹 **Quick Clear**: One-tap text clear button.
- 🔒 **Privacy Focused & Free**: Uses public Google endpoints — no personal API keys or account registration needed.

---

## 🚀 How to Install

### From GitHub Repository

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/ilmirfan/Sinhala-Translator.git
   ```

2. **Open Chrome Extensions Page**:
   Open Google Chrome and navigate to: `chrome://extensions`

3. **Enable Developer Mode**:
   Toggle on **Developer mode** in the top-right corner.

4. **Load Unpacked Extension**:
   - Click **Load unpacked** in the top-left corner.
   - Select the `Sinhala-Translator` folder.

5. **Pin & Use**:
   - Click the Extension puzzle icon in Chrome toolbar and pin **Sinhala Translator**.

---

## 🛠️ Project Structure

```text
Sinhala-Translator/
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

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).
