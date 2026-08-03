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

## 🚀 How to Install Locally

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

---

## 📦 How to Build the Zip Package for Publishing

To create the production distribution `.zip` file required by the Chrome Web Store:

Run the following command in terminal:

```bash
zip -r sinhala-translator-v1.0.0.zip manifest.json popup.html popup.css popup.js icons/
```

This generates `sinhala-translator-v1.0.0.zip` containing only the necessary production runtime files.

---

## 🌐 How to Submit to Chrome Web Store

### 1. Prerequisites
- A **Google Chrome Developer Account** (a one-time $5 registration fee is charged by Google if you don't already have one).
- Register at: [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole/)

---

### 2. Submission Steps

#### Step 1: Upload Package
1. Open the [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole/).
2. Click **"Add new item"** (or **"New Item"** button).
3. Drag and drop your built zip file (`sinhala-translator-v1.0.0.zip`) or click **Browse files**.

#### Step 2: Store Listing Information
Fill in the required store listing details:
- **Title**: `English to Sinhala Translator`
- **Summary**: `Instant English to Sinhala translation with live copy & speech functionality.`
- **Detailed Description**: Describe features like real-time translation, copy button, audio playback, light/dark mode.
- **Category**: Select `Productivity` or `Tools`.
- **Language**: English.

#### Step 3: Graphical Assets
Upload the required screenshots & promotional images:
- **Store Icon**: Upload `icons/icon128.png` (128x128 px).
- **Screenshots**: At least one screenshot of the extension popup (1280x800 px or 640x400 px PNG/JPEG). You can capture a screenshot of the popup window when open.

#### Step 4: Privacy Practice & Permissions
Under the **Privacy** tab:
- **Single Purpose**: Enter: *"Translates user-entered English text into Sinhala."*
- **Permission Justification**:
  - `storage`: Used locally to save user preferences (dark/light theme, last typed text).
  - `https://translate.googleapis.com/*`: Used to fetch text translations and audio TTS streams.
- **Data Usage**: Declare that your extension does **not** collect, store, or sell user personal data.

#### Step 5: Submit for Review
1. Review all sections to ensure there are no red warning banners.
2. Click **"Submit for Review"** at the top right.
3. Choose whether to publish automatically once approved or manually.
4. Google will review the extension (usually takes 24–48 hours). Once approved, it will be live on the Chrome Web Store!

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
└── README.md           # Project documentation & publishing guide
```

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).
