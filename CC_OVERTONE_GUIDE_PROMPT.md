# Task: Create a User Guide Page for Overtone Singer

## Context
Overtone Singer (overtonesinger.com) is a real-time vocal FFT analyser / spectrogram web app used by overtone singers and sound healing practitioners. It visualises the frequencies in your voice in real time — showing the fundamental note and overtone harmonics as coloured lines on a scrolling spectrogram display.

The app is built with Vite + TypeScript + React and deployed to GitHub Pages. The source lives in `client/` and static assets go in `client/public/`.

There is already an `/about` route. We need a `/guide` route that serves as a simple, visual user guide.

## What to Build
Create a new route at `/guide` (so it's accessible at `overtonesinger.com/guide`) containing a clear, visual, mobile-friendly user guide.

The guide must be dead simple — it's aimed at sound healing students in a classroom setting, not developers. Many will open it on their phones.

## Guide Content

### Section 1: Getting Started (3 steps)
1. **Open the App** — Go to overtonesinger.com on your phone, tablet, or laptop. Chrome works best. No download needed.
2. **Allow Microphone** — Your browser will ask to use your microphone. Tap "Allow". (If you accidentally blocked it, tap the lock icon in the address bar to re-enable.)
3. **Sing or Hum** — You'll see coloured lines appear on the spectrogram in real time as your voice is picked up.

### Section 2: Reading the Display
- **Time** runs left to right (newest sound appears on the right)
- **Frequency (Hz)** runs bottom to top (low notes at the bottom, high notes at the top)
- **Colour/brightness** shows volume — brighter = louder
- **The lowest bright line** is your fundamental note (the pitch you're singing)
- **The lines above it** are your overtones/harmonics — these are what overtone singers learn to isolate and amplify

### Section 3: Tips for Overtone Singing Practice
- **Vowel shapes:** Slowly shift between 'EE', 'OO', 'AH' and watch how the overtone lines move and change brightness
- **Isolating overtones:** Hold a steady low drone note. Try to make one single upper line get brighter — that's an isolated overtone
- **Volume:** Sing at a steady, moderate volume. Too quiet and overtones won't show clearly
- **Microphone distance:** Keep 15–30 cm from your device mic for clearest results
- **Quiet space:** Background noise appears as scattered colour. A quiet room gives the cleanest visualisation

### Section 4: Troubleshooting
- **No sound detected?** Check your browser has microphone permission enabled (look for the mic/lock icon in the address bar)
- **Display looks messy?** Reduce background noise — close windows, move away from fans/AC
- **Laggy or slow?** Close other browser tabs. Chrome gives the best performance
- **On iPhone?** Safari works but Chrome is recommended for best results

### Footer
- Link back to the main app: overtonesinger.com
- "Built by a sound healer, for sound healers"
- Small credit: "Part of the NestorLab ecosystem"

## Design Requirements
- **Match the existing app aesthetic** — dark background, similar colour palette to the spectrogram (deep purples/navy, teal/cyan accents, warm amber for highlights)
- **Mobile-first** — most students will open this on their phones in class
- **Large, readable text** — minimum 16px body text
- **Visual step numbers** — use numbered circles or badges for the 3 getting-started steps
- **No images required** — keep it clean text with good typography and spacing
- **Smooth scroll** — if the page is long, ensure sections flow naturally
- **Add a sticky "Open App" button** at the bottom of the page that links to the root `/` route
- **Use the same font stack** as the rest of the app
- **Keep it as a single React component** — follow the same routing pattern used by `/about`

## Implementation Notes
- Check how the `/about` route is implemented and follow the same pattern for routing
- The component should be in the same location/style as the About page component
- Add a link to `/guide` somewhere accessible (e.g. in the app's navigation or footer, next to the About link)
- Make sure the route works with GitHub Pages SPA routing (check how `/about` handles this — likely uses the 404.html redirect trick or hash routing)

## Deliverable
A working `/guide` page deployed alongside the existing app, accessible at overtonesinger.com/guide — ready to share with students via a simple link.
