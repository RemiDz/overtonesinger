# Fix: Navigation, Guide Content & SPA Routing

## Issue 1: Restore Pro Button — DO NOT remove monetisation UI

The previous change removed the "Buy Pro" / Pro icon from the navigation and replaced it with a Guide/About icon. **This is wrong.** The Pro button needs to stay where it was — we're only temporarily bypassing the paywall logic, not removing the UI for it.

**What to do:**
- Restore the original Pro/upgrade button/icon to exactly where it was in the navigation
- Add a NEW separate link to `/guide` — either as a small "Guide" or "Help" text link in the navigation bar, footer, or as a subtle info/help icon. It should NOT replace any existing buttons
- Check git history if needed to restore the original navigation layout
- Remember: all Pro UI was supposed to be commented out (with `// TEMP:` markers), not deleted or replaced

## Issue 2: Rewrite Guide Page Content

The current guide content is too generic and includes overtone singing technique advice. **The guide should ONLY explain how to use the app** — not how to sing overtones. Teaching overtone singing is the practitioner's job, not the app's.

Replace the guide page content with the following. Keep the existing page styling/layout but update all the text:

---

### Page Title
**Overtone Singer — User Guide**

### Subtitle
How to use the real-time vocal frequency analyser

---

### Section: Getting Started

**Step 1 — Open the App**
Go to overtonesinger.com on your phone, tablet, or laptop. Chrome gives the best performance. No download or account needed.

**Step 2 — Allow Microphone Access**
Your browser will ask permission to use your microphone. Tap "Allow" when the pop-up appears. If you accidentally blocked it, tap the lock or microphone icon in the address bar to re-enable it.

**Step 3 — Start Using**
Sing, hum, or play an instrument near your device microphone. You will see the frequencies appear as coloured lines on the spectrogram display in real time.

---

### Section: Understanding the Display

**The Spectrogram Window**
- The display scrolls from left to right — newest sound appears on the right
- The vertical axis shows frequency (Hz) — low frequencies at the bottom, high at the top
- Colour and brightness show volume — brighter and warmer colours mean louder
- The lowest bright horizontal line is your fundamental frequency (the note being sung or played)
- Any lines appearing above the fundamental are the overtones/harmonics present in the sound

---

### Section: App Controls

Go through EACH control/button/feature that exists in the app UI and explain what it does. Look at the actual components and controls rendered in the app and describe each one. For example:
- What does the gain/volume slider do?
- What do the colour scheme options do?
- What does the record button do?
- What do any export buttons do?
- What does the FFT size or resolution control do (if present)?
- Any play/pause/stop controls?
- Any zoom or scroll controls?

**Important:** Describe every interactive element the user can see. Check the actual React components to find all controls. Write a short, clear sentence for each one explaining what it does. Use the actual labels/icons from the app so users can match the description to what they see on screen.

---

### Section: Tips for Best Results

- Keep your device microphone 15–30 cm from the sound source for the clearest readings
- Use a quiet room — background noise appears as scattered colour on the display
- Sing or play at a steady, moderate volume for the most defined frequency lines
- Close other browser tabs if the display feels slow or laggy
- Chrome browser gives the best performance; Safari on iPhone works but may be less responsive

---

### Section: Troubleshooting

- **No sound showing on the display?** Check that your browser has microphone permission — look for the lock or microphone icon in the address bar
- **Display looks noisy or messy?** Reduce background noise in your environment
- **App feels slow?** Close other browser tabs and try Chrome
- **On mobile?** Hold your device steady and sing/play directly towards the microphone

---

### Footer
- Link back to the app: overtonesinger.com
- "Part of the NestorLab ecosystem"

---

**IMPORTANT NOTES FOR THIS GUIDE:**
- Do NOT include any advice on how to sing overtones, what vowel shapes to use, or any technique instruction — that is the teacher/practitioner's domain
- Only describe what the app does and how to use its features
- Keep language simple and non-technical — the audience is sound healing students, not developers
- The tone should be welcoming and practical

## Issue 3: SPA Routing Still Broken

The `/guide` route (and `/about` if it exists) still returns 404 when accessed directly. The previous fix of copying index.html to 404.html at build time does not work. Follow the spa-github-pages redirect pattern:

**Create `client/public/404.html`** (replace existing if present):

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script>
    sessionStorage.redirect = location.href;
  </script>
  <meta http-equiv="refresh" content="0;URL='/'">
</head>
<body>
</body>
</html>
```

**In `client/index.html`**, add this script in the `<head>` BEFORE any other scripts:

```html
<script>
  (function(){
    var redirect = sessionStorage.redirect;
    delete sessionStorage.redirect;
    if (redirect && redirect !== location.href) {
      history.replaceState(null, null, redirect);
    }
  })();
</script>
```

**Remove** any `cp index.html 404.html` commands from vite.config.ts, package.json build scripts, or GitHub Actions workflows. The 404.html in `client/public/` gets copied to the build output automatically by Vite.

## Commit
Commit message: `fix: restore Pro button, rewrite guide content, fix SPA routing`

## Verify After Deployment
1. The Pro/upgrade button is back in its original position in the navigation
2. A new Guide link exists separately (not replacing anything)
3. https://overtonesinger.com/guide loads correctly (no 404)
4. The guide content only explains app features, not singing technique
5. https://overtonesinger.com/ still works as before
