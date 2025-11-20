# Vocal FFT Analyzer

## Overview

The Vocal FFT Analyzer is a professional web-based tool designed for real-time FFT (Fast Fourier Transform) analysis of microphone input. It provides a sophisticated spectrogram visualization to display frequency overtones, making it ideal for vocal exercises, overtone singing analysis, and understanding harmonic relationships in the human voice. The application captures audio at a 48kHz sample rate, processes it in real-time, and renders a dynamic spectrogram with a logarithmic frequency scale (0-5kHz) on the Y-axis, time on the X-axis, and heatmap color intensity representing frequency component magnitude.

## User Preferences

- I prefer simple language.
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.
- Do not make changes to the folder Z.
- Do not make changes to the file Y.

## System Architecture

The application is built as a single-page application primarily utilizing client-side technologies.

### UI/UX Decisions
- **Visual Design**: Inspired by professional audio software (e.g., Pro Tools, Ableton Live) featuring an electric blue accent (`#00a8ff`) for active states and highlights, a dark-optimized interface with deep charcoal backgrounds (`#0f1419`, `#1a1f29`, `#252b38`) for reduced eye strain, high contrast ratios, crisp borders (`#2d3442`), and functional shadows for depth.
- **Layout & Interaction**: Prioritizes maximum visualization space for the spectrogram. Mobile-friendly design with controls stacked vertically on smaller screens, eliminating horizontal scrolling. Controls use intuitive icons rather than text labels and dynamically adjust to screen width. Immediate visual feedback is provided for all interactions with professional hover and active states.
- **Typography**: Uses the `Inter` font for UI elements and `SF Mono`/`Roboto Mono` for precise numerical displays. Features a 6px border radius for a contemporary look and a carefully calibrated font hierarchy.

### Technical Implementations
- **Real-time Audio Analysis**: Microphone capture at 48kHz, live FFT processing with a 2048-sample window, and 60fps spectrogram rendering using the Canvas API.
- **Spectrogram Rendering**: Utilizes an off-screen canvas at 2x resolution with continuous sharpness control from smooth bilinear interpolation to crisp nearest-neighbor sampling. Employs live scrolling where new audio appears from the right and scrolls left within a fixed 10-second rolling window. The Y-axis features a logarithmic frequency scale (0-5kHz, never less than 3kHz at the top) with tick marks, maximizing the visualization area.
- **Control Adjustments**: Includes brightness (0-200%), decluttering (0-100%), and sharpness (0-100%) controls. Offers a color scheme toggle (Default, Warm, Cool, Monochrome) and an intensity scale toggle (Linear, Logarithmic, Power Curve). An advanced settings panel allows configuration of FFT window size (1024/2048/4096), frequency range, color schemes, and brightness boost.
- **Zoom & Navigation**: Auto-zoom to fit the entire recording, manual zoom slider, horizontal scroll slider, and a "Fit to Screen" button. Displays the visible time range.
- **Audio Processing**:
    - **FFT Analysis**: 48,000 Hz sample rate, 2048 samples FFT size, 0-5,000 Hz frequency range, 60fps update rate.
    - **Logarithmic Frequency Scale**: Each octave appears visually equidistant, aiding in identifying harmonic relationships.
    - **Color Mapping**: Multiple color schemes with configurable intensity scaling (linear/log/power) and brightness boost (25-200%).

### Feature Specifications
- **Transport Controls**: Record, Play, Stop buttons, and a Donate button.
- **Overtone Detection**: Enhanced sensitivity for detecting overtones and displaying them.
- **Silence Detection**: Adaptive noise-based detection to handle varying lengths of initial silence.

### System Design Choices
- **Frontend**: React with TypeScript, Web Audio API, Canvas API, Tailwind CSS, Shadcn UI components.
- **Backend**: Minimal Express.js server for serving the application; no database as all processing is client-side.
- **Project Structure**:
    - `client/src/components/`: SpectrogramCanvas, TransportControls, SliderControl, ZoomControls.
    - `client/src/hooks/`: useAudioAnalyzer.
    - `client/src/pages/`: VocalAnalyzer.
    - `shared/`: schema.ts.
    - `server/`: routes.ts.

## External Dependencies

- **Web Audio API**: For microphone input and real-time FFT analysis.
- **Canvas API**: For high-performance spectrogram rendering.
- **MediaRecorder API**: For video export functionality combining audio with spectrogram visualization.
- **React**: Frontend JavaScript library.
- **TypeScript**: Superset of JavaScript for type-safe code.
- **Tailwind CSS**: Utility-first CSS framework for responsive design.
- **Shadcn UI**: UI component library.
- **Express.js**: Minimal backend framework for serving the application.
- **PayPal**: Integrated for project donations (via a "Donate" button).

## Recent Changes

- 2025-11-20: **Video export with mobile compatibility attempt** - Added Export Video button that records synchronized spectrogram + audio; attempts to convert WebM to MP4 using FFmpeg.wasm for mobile compatibility, but falls back to WebM if conversion unavailable (requires SharedArrayBuffer support); includes proper error handling and user notifications about format limitations
- 2025-11-20: **Video export feature** - Added Export Video button to export synchronized spectrogram visualization with audio; uses MediaRecorder API with canvas.captureStream() at 30 fps; modified useAudioAnalyzer hook to support MediaStreamDestination for synchronized audio-video recording via shared AudioBufferSourceNode
- 2025-11-16: **Enhanced overtone detection sensitivity** - Lowered peak detection threshold from 0.15 to 0.05 and harmonic strength requirement from 25% to 8% of fundamental to detect and display blue labels for all visible overtones including weaker higher frequencies

## Known Limitations

- **Video format compatibility**: The app exports videos using browser's MediaRecorder API which produces WebM format. While the app includes FFmpeg.wasm to convert to MP4 for better mobile compatibility, this conversion requires SharedArrayBuffer support and proper cross-origin isolation headers. In environments where this is unavailable, videos are exported as WebM which may not play on iOS devices or some mobile browsers. Users are clearly notified of the format and compatibility when exporting.