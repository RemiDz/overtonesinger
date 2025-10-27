# Design Guidelines: Real-Time Vocal FFT Analyzer

## Design Approach

**Selected Approach:** Design System - Material Design Foundation

**Justification:** This is a utility-focused, data-dense audio analysis tool where functionality and clarity are paramount. Material Design provides excellent foundations for data visualization interfaces with clear hierarchy and systematic spacing. The application requires custom visualization components and precise control layouts optimized for professional audio work.

**Key Design Principles:**
- Function-first: Every element serves the audio analysis purpose
- Maximum visualization space: Chart dominates the viewport
- Compact, efficient controls: Minimize control footprint to maximize chart area
- Professional tool aesthetic: Clean, technical, uncluttered interface
- Immediate visual feedback: Clear states for recording/playing/stopped

---

## Core Design Elements

### A. Typography

**Font Family:** Inter or Roboto via Google Fonts CDN
- Primary: Body text, labels, axis values
- Monospace: Time/frequency numerical displays for precision alignment

**Font Hierarchy:**
- Control labels: text-xs (11px), font-medium, uppercase tracking
- Axis labels: text-sm (14px), font-normal
- Numerical displays: text-base (16px), font-mono for time/frequency values
- Status indicators: text-sm, font-semibold

---

### B. Layout System

**Spacing Primitives:** Tailwind units of 2, 3, 4, 6, 8
- Component padding: p-3, p-4
- Control bar spacing: gap-4, gap-6 for visual grouping
- Chart margins: p-8 for axis labels and breathing room
- Slider widths: Constrained to w-32 for gain, w-40 for declutter

**Layout Structure:**
```
┌────────────────────────────────────────┐
│  Top Control Bar (h-16 fixed)          │
│  [●][▶][■] | Gain slider | Declut sldr │
├────────────────────────────────────────┤
│                                        │
│         SPECTROGRAM CHART              │
│         (fills remaining height)       │
│         Y: 0-5kHz (logarithmic)       │
│         X: Time (seconds)             │
│                                        │
├────────────────────────────────────────┤
│  Zoom Controls (h-12 fixed)            │
│  Zoom slider | [Fit to Screen button]  │
└────────────────────────────────────────┘
```

**Responsive Behavior:**
- Mobile (base): Single column, stacked controls if needed
- Tablet/Desktop (md:): Full layout as shown, minimum width 768px recommended
- Chart: Always fills available vertical space (calc(100vh - header - footer))

---

### C. Component Library

#### Navigation/Controls

**Top Control Bar:**
- Fixed height: h-16
- Horizontal layout: flex items-center justify-between px-6
- Left section: Transport controls (Record/Play/Stop) with gap-3
- Right section: Sliders with gap-6
- Subtle bottom border for definition

**Transport Buttons:**
- Icon-only circular buttons: w-10 h-10
- Icons: Heroicons (solid variants)
  - Record: Circle with filled dot
  - Play: Triangle right
  - Stop: Square filled
- Button spacing: gap-3 between controls
- States: Default, active (currently recording/playing), disabled
- Size: Large touch targets (44x44px minimum) for mobile

**Slider Controls:**
- Compact horizontal sliders
- Microphone Gain: w-32, range 0-100%
- Declutter: w-40, range 0-100
- Labels: text-xs uppercase above slider
- Value display: text-sm font-mono inline after slider
- Track height: h-1.5 for precision control
- Thumb: Circular, w-4 h-4

#### Core UI Elements

**Spectrogram Chart Container:**
- Fills vertical space: flex-1 or calculated height
- Canvas or SVG-based rendering
- Padding: p-8 for axis labels
- Y-axis: Left side, logarithmic scale 0-5kHz
- X-axis: Bottom, linear time in seconds
- Grid: Subtle gridlines at octave intervals (vertical) and second intervals (horizontal)
- Axis styling: text-xs for labels, thin strokes for lines

**Zoom Controls Bar:**
- Fixed height: h-12
- Horizontal layout: flex items-center px-6 gap-4
- Zoom slider: flex-1, max-w-md
- "Fit to Screen" button: Standard button, compact size
- Range display: "Showing 0:05 - 0:15 of 0:30" in text-sm font-mono

#### Forms & Data Displays

**Status Indicator:**
- Small text display in control bar
- Shows: "Ready" | "Recording..." | "Playing" | "Processing..."
- Position: Between transport controls and sliders
- Font: text-sm font-medium

**Time Display:**
- Large, prominent: text-2xl font-mono
- Format: MM:SS.SS (minutes:seconds.centiseconds)
- Position: Overlaid on chart (top-right corner) or in control bar
- Styling: Monospace for alignment, semi-transparent background for visibility

**Frequency Peak Indicator:**
- Small overlay showing detected fundamental frequency
- Format: "Fundamental: 440 Hz" + overtone count
- Position: Top-left of chart
- Font: text-sm font-mono

#### Overlays

**Loading/Processing State:**
- Full-screen overlay during FFT processing
- Simple spinner with "Processing audio..." text
- Semi-transparent backdrop

**Error Messages:**
- Toast-style notifications
- Position: Bottom center, above zoom controls
- Dismissible after 4 seconds
- Examples: "Microphone access denied", "Recording failed"

---

### D. Interaction Patterns

**Spectrogram Interaction:**
- Pan: Click and drag horizontally to scroll through recording
- Zoom: Pinch gesture (mobile) or zoom slider control
- Hover: Crosshair cursor showing exact time/frequency at pointer
- Real-time rendering: Chart updates continuously during recording

**Control States:**
- Recording active: Record button shows active state, other buttons disabled
- Playing: Play button active, record disabled, stop enabled
- Idle: All controls enabled except stop

**Auto-zoom Behavior:**
- On stop recording: Animate zoom to fit entire capture (0.5s transition)
- Smooth easing function for professional feel

---

### E. Animations

**Minimal Animation Strategy:**

Use animations **only** for essential feedback:

1. **Transport Button States:**
   - Recording pulse: Subtle scale animation (0.95-1.05) on record button while active
   - Duration: 1s ease-in-out infinite

2. **Chart Transitions:**
   - Auto-zoom: Smooth transform animation when fitting to screen
   - Duration: 500ms ease-out
   
3. **Slider Feedback:**
   - No animation - immediate response for precise control

**Explicitly Avoid:**
- Page transitions
- Decorative animations
- Control hover animations (rely on system cursor feedback)

---

## Technical Specifications

**Chart Rendering:**
- Use Canvas API for performance with real-time FFT data
- Update rate: 60fps during recording
- Color mapping: Gradient from low to high intensity (spectrogram heatmap)

**Accessibility:**
- All controls keyboard navigable
- ARIA labels for all icon buttons
- Announce recording/playback state changes
- Ensure 44x44px minimum touch targets
- Focus visible states for all interactive elements

**Performance Targets:**
- Chart rendering: <16ms per frame (60fps)
- Audio processing: Real-time (no lag during recording)
- Responsive controls: <100ms interaction feedback

---

## Images

**No Images Required:** This is a functional audio analysis tool with no hero section or marketing content. All visual elements are UI components and data visualizations.