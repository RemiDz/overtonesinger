# Vocal FFT Analyzer

A professional web-based vocal analysis tool that performs real-time FFT (Fast Fourier Transform) analysis of microphone input and displays a beautiful spectrogram visualization showing frequency overtones.

## Overview

This application captures audio from your device's microphone at 48kHz sample rate, performs real-time FFT analysis, and renders a spectrogram with:
- **Y-axis**: Logarithmic frequency scale (0-5kHz) to clearly show octave relationships
- **X-axis**: Time in seconds
- **Visualization**: Heatmap color intensity showing magnitude of each frequency component

Perfect for vocal exercises, overtone singing analysis, and understanding harmonic relationships in voice.

## Features

### Real-time Audio Analysis
- Microphone capture at 48kHz sampling rate
- Live FFT processing with 2048-sample window
- 60fps spectrogram rendering using Canvas API
- **Live scrolling spectrogram**: During recording, new audio appears from the right and scrolls left (like professional audio tools)
- Fixed 10-second rolling window during live recording for optimal real-time visualization
- Logarithmic frequency scale for clear octave visualization
- Frequency scale displayed on left margin (Y-axis) with tick marks for easy frequency reference

### Transport Controls
- **Record**: Start capturing microphone input
- **Play**: Playback recorded audio
- **Stop**: Stop recording or playback

### Control Adjustments
All controls use intuitive icons (like old TV controls) instead of text labels, arranged in a single horizontal line that dynamically adjusts to screen width:
- **Gain** (Volume icon): 0-200% microphone gain control for input sensitivity
- **Brightness** (Sun icon): 0-200% overall brightness control for the spectrogram
- **Sharpness** (Contrast icon): 0-100 peak decluttering to clean up frequencies near overtones
- **Advanced Settings**: Collapsible panel with:
  - FFT Window Size: 1024/2048/4096 samples for frequency resolution
  - Frequency Range: Adjustable min (20-1000 Hz) and max (1000-10000 Hz)
  - Color Schemes: Default, Warm, Cool, and Monochrome palettes
  - Intensity Scaling: Linear, logarithmic, or power curve mapping
  - Brightness Boost: 25-200% multiplier for overall intensity

### Zoom & Navigation
- Auto-zoom to fit entire recording when capture stops
- Manual zoom slider (0-100%) to examine specific portions
- Horizontal scroll slider appears when zoomed in
- Time range display shows visible portion (e.g., "0:00 - 0:05 / 0:10")
- "Fit to Screen" button to quickly view full capture
- Two-row layout prevents overlap on mobile devices

## Technology Stack

### Frontend
- React with TypeScript
- Web Audio API for microphone capture and FFT analysis
- Canvas API for high-performance spectrogram rendering
- Tailwind CSS for responsive design
- Shadcn UI components for professional interface

### Backend
- Express.js (minimal - serves the application)
- No database (all processing is client-side)

## Project Structure

```
client/
  src/
    components/
      SpectrogramCanvas.tsx      # Canvas-based FFT visualization
      TransportControls.tsx      # Record/Play/Stop buttons
      SliderControl.tsx          # Gain and declutter sliders
      ZoomControls.tsx           # Zoom and scroll controls
    hooks/
      useAudioAnalyzer.ts        # Web Audio API integration
    pages/
      VocalAnalyzer.tsx          # Main application page
shared/
  schema.ts                      # TypeScript types for audio data
server/
  routes.ts                      # Express server setup
```

## Audio Processing Details

### FFT Analysis
- Sample rate: 48,000 Hz
- FFT size: 2048 samples
- Frequency range: 0-5,000 Hz (covers fundamental + 5 octaves)
- Update rate: Real-time (60fps during recording)

### Logarithmic Frequency Scale
The Y-axis uses a logarithmic scale where each octave (frequency doubling) appears as equal visual distance. This makes it easy to identify harmonic relationships:
- Fundamental frequency appears as strongest horizontal band
- Overtones appear at 2x, 3x, 4x, 5x, etc. of fundamental
- Octaves are visually equidistant

### Color Mapping
Spectrogram supports multiple color schemes:
- **Default**: Blue → Cyan → Yellow → Red (perceptually-optimized)
- **Warm**: Brown → Orange → Red → Yellow (warm palette)
- **Cool**: Dark Blue → Green → Cyan (cool palette)
- **Monochrome**: Black → White grayscale

Each scheme maps magnitude intensity to color with configurable:
- Intensity scaling (linear/logarithmic/power curves)
- Brightness boost (25-200% multiplier)

## Usage

1. **Grant microphone permission** when prompted
2. **Click Record** to start capturing audio
3. **Sing or speak** to see real-time frequency analysis
4. **Adjust Gain** if input is too quiet or loud
5. **Use Declutter** to reduce visual noise around peaks
6. **Click Stop** to end recording
7. **Use Zoom controls** to examine specific portions of the recording
8. **Click Play** to hear the recorded audio

## Browser Compatibility

Works on all modern browsers with Web Audio API support:
- Chrome/Edge (recommended)
- Firefox
- Safari (including iOS Safari - works great on iPhone/iPad)
- Opera

**Note**: Requires HTTPS or localhost for microphone access.

## Performance

- Real-time FFT processing with no lag
- 60fps canvas rendering during recording
- Optimized for both desktop and mobile devices
- Responsive design adapts to all screen sizes

## Design Philosophy

This is a professional audio analysis tool with a modern, sophisticated design inspired by professional audio software (Pro Tools, Ableton Live):

### Visual Design
- **Electric Blue Accent**: Modern `#00a8ff` primary color for active states and highlights
- **Dark-Optimized Interface**: Deep charcoal backgrounds (#0f1419, #1a1f29, #252b38) reduce eye strain
- **High Contrast**: Studio-grade contrast ratios for clarity during long sessions
- **Crisp Borders**: Subtle `#2d3442` borders with professional separation
- **Functional Shadows**: Real depth with properly configured shadow system

### Layout & Interaction
- Maximum visualization space for the spectrogram
- Mobile-friendly layout with controls stacked vertically above and below the spectrogram
- No horizontal scrolling required - all controls accessible on phone screens
- Compact, efficient controls that don't clutter the interface
- Immediate visual feedback for all interactions
- Professional hover and active states with elevation effects

### Typography
- **Inter Font**: Modern, professional sans-serif for UI
- **SF Mono/Roboto Mono**: Monospace for precise numerical displays
- Tighter 6px border radius for contemporary look
- Carefully calibrated font hierarchy for technical precision

## Recent Changes

- 2025-11-08: **Live scrolling spectrogram** - New audio now appears from the right and scrolls left during recording (10-second rolling window)
- 2025-11-08: Auto-zoom to fit entire recording when capture stops
- 2025-11-08: **Major design overhaul** - Implemented modern professional design system inspired by DAW software
- 2025-11-08: Updated color palette to electric blue (#00a8ff) with deep charcoal backgrounds
- 2025-11-08: Enhanced shadows and elevation system for depth and clarity
- 2025-11-08: Optimized contrast ratios for both light and dark modes
- 2025-11-08: Tightened border radius to 6px for contemporary aesthetic

- 2025-11-06: Changed Advanced Settings to full-screen modal dialog with close button (X) for better mobile UX
- 2025-11-06: Removed x-axis "Time (seconds)" label to prevent overlap with time values
- 2025-11-06: **Maximized spectrogram space** - removed container padding (p-8→p-0) and minimized canvas padding
- 2025-11-06: Reduced canvas padding further (top: 20→12, bottom: 32→24, right: 16→8, left: 40→32)
- 2025-11-06: Optimized layout for mobile - centered Advanced Settings dialog and maximized spectrogram space
- 2025-11-06: Reduced control panel padding (py-2→py-1.5) to give more space to spectrogram
- 2025-11-06: Changed Advanced Settings to be centered on mobile (95vw width, max-w-md)
- 2025-11-06: Changed spectrogram background to always use black for better sound detail visibility
- 2025-11-06: Updated grid lines and axes to use light colors (white/rgba) for visibility on black background
- 2025-11-06: Reduced left padding from 64px to 40px to minimize wasted space
- 2025-11-06: Fixed canvas color rendering to use getComputedStyle() for proper theme color support
- 2025-11-06: Moved frequency scale to left margin (outside spectrogram) for maximum visualization space
- 2025-11-06: Added Y-axis frequency scale with tick marks for easy frequency reference
- 2025-11-06: Made sliders dynamically resize to fit screen width (no horizontal scrolling or clipping)
- 2025-11-06: Reordered sliders to: Gain, Brightness, Sharpness (left to right)
- 2025-11-06: Changed sharpness icon to Contrast (half-circle standard sharpness symbol)
- 2025-11-06: Added brightness slider with icon-based controls (Volume/Sun/Contrast icons replacing text labels)
- 2025-11-06: Reorganized layout for mobile - all controls now stack vertically above/below spectrogram (no horizontal scrolling)
- 2025-11-06: Fixed zoom controls overlap - split into two rows to prevent timer text from covering sliders
- 2025-11-06: Added comprehensive settings panel with FFT size, frequency range, color schemes, and intensity controls
- 2025-11-06: Implemented harmonic relationship detection with viewport-scoped analysis
- 2025-11-06: Added WAV/PNG export functionality and synchronized playback position indicator
- 2025-10-27: Initial implementation with core real-time FFT and spectrogram visualization
