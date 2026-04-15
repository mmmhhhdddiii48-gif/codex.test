# Tarteeb — Android-ready with Capacitor

This repository now includes a clean Capacitor setup to package **Tarteeb** as an Android app while preserving product identity, sections, local assets, local audio, and local storage support.

## What's included

- Existing desktop source kept intact (`app.py` remains unchanged).
- New mobile web container UI under `www/` with a calm premium style and Arabic RTL layout.
- Capacitor configuration for Android packaging.
- Local/offline support without external assets (UI mark rendered in CSS + generated notification tone).
- LocalStorage-driven notes and section state.

## Project structure

- `app.py` — existing desktop project codebase.
- `www/index.html` — mobile shell entry.
- `www/styles.css` — premium responsive styling.
- `www/main.js` — local storage + audio + section rendering.
- `capacitor.config.ts` — Capacitor app/native configuration.
- `package.json` — scripts and Capacitor dependencies.

## Run locally (web)

```bash
python -m http.server 4173
# open http://localhost:4173/www/
```

## Android build workflow

```bash
npm install
npx cap add android
npx cap sync android
npx cap open android
```

### Optional run

```bash
npx cap run android
```

## Notes

- In this environment, `npm install` may fail due registry policy/network restrictions. If so, run the above commands in a normal development network.
- `android/` currently contains a placeholder README and is ready to receive generated native project files.
