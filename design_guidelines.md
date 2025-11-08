# Design Guidelines: Professional Vocal FFT Analyzer

## Design Approach

**Selected Approach:** Reference-Based - Professional Audio Software (Pro Tools, Ableton Live, Logic Pro)

**Justification:** This is a professional audio analysis tool requiring the sophisticated, technical aesthetic of industry-standard DAWs. These applications excel at presenting complex data clearly in dark interfaces optimized for long studio sessions. We'll adopt their visual language: precise data displays, high-contrast UI elements, and purposeful use of color for functional clarity.

**Key Design Principles:**
- Studio-grade dark interface: Reduces eye strain, focuses attention on data
- High-contrast visualization: Critical frequency data immediately readable
- Precision-first controls: Professional-grade accuracy in all interactions
- Functional color coding: Blue accents mark active states and key data

---

## Color System

**Base Palette:**
- Background: `#0f1419` (Deep charcoal)
- Surface: `#1a1f29` (Elevated panels)
- Surface elevated: `#252b38` (Control bars, modals)
- Borders: `#2d3442` (Subtle divisions)

**Interactive Elements:**
- Primary accent: `#00a8ff` (Electric blue - active states, highlights)
- Primary hover: `#0088cc` (Darker blue)
- Text primary: `#e4e8ec` (High contrast)
- Text secondary: `#8f95a3` (Labels, inactive)
- Text muted: `#5a6071` (Axis labels, tertiary info)

**Data Visualization:**
- Spectrogram gradient: Dark blue → Electric blue → Cyan → White (low to high intensity)
- Grid lines: `#2d3442` at 20% opacity
- Axis lines: `#5a6071`
- Frequency peaks: `#00ff88` (Accent green for detected fundamentals)

**Status Colors:**
- Recording: `#ff3366` (Critical red)
- Playing: `#00a8ff` (Electric blue)
- Processing: `#ffa500` (Warning orange)
- Ready: `#8f95a3` (Neutral gray)

---

## Typography

**Font Family:** Inter (Google Fonts)
- UI controls, labels: Inter
- Numerical displays: `font-mono` (system monospace)

**Hierarchy:**
- Control labels: `text-xs font-medium uppercase tracking-wide text-[#8f95a3]`
- Axis labels: `text-sm font-normal text-[#5a6071]`
- Numerical readouts: `text-base font-mono text-[#e4e8ec]`
- Status text: `text-sm font-semibold text-[#00a8ff]`
- Time display: `text-2xl font-mono text-[#e4e8ec]`

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 3, 4, 6, 8

**Structure:**
```
┌─────────────────────────────────────────────┐
│ Top Control Bar (h-16, bg-[#252b38])       │
│ [●][▶][■] Status | Gain | Declutter        │
├─────────────────────────────────────────────┤
│                                             │
│    SPECTROGRAM (bg-[#0f1419])              │
│    Y: 0-5kHz (log) | X: Time (linear)     │
│    Overlays: Time, Frequency peak          │
│                                             │
├─────────────────────────────────────────────┤
│ Zoom Controls (h-14, bg-[#1a1f29])         │
│ Range slider | Fit to Screen | Time range  │
└─────────────────────────────────────────────┘
```

**Responsive:** Chart fills `calc(100vh - 16 - 14)`, minimum 600px height recommended.

---

## Component Library

**Top Control Bar:** (`bg-[#252b38] border-b border-[#2d3442]`)
- Transport buttons: `w-11 h-11 rounded-full` with icons from Heroicons
- Record: `bg-[#ff3366]` when active, pulse animation
- Play/Stop: `bg-[#00a8ff]` when active
- Inactive: `bg-[#1a1f29] border border-[#2d3442]`
- Status text: Between controls, `text-[#00a8ff]` when active

**Sliders:** (`bg-[#1a1f29] rounded`)
- Track: `h-1.5 bg-[#2d3442]`
- Fill: `bg-[#00a8ff]`
- Thumb: `w-4 h-4 rounded-full bg-[#e4e8ec] border-2 border-[#00a8ff]`
- Labels: `text-xs uppercase text-[#8f95a3]` above
- Value display: `text-sm font-mono text-[#e4e8ec]` inline

**Spectrogram Chart:**
- Container: `bg-[#0f1419] p-8`
- Canvas with gradient heatmap rendering
- Grid: Thin lines in `#2d3442` at 20% opacity
- Axes: `stroke-[#5a6071] text-xs text-[#8f95a3]`
- Crosshair on hover: `stroke-[#00a8ff] opacity-60`

**Overlays:**
- Time display: Top-right, `bg-[#1a1f29]/80 backdrop-blur-sm px-4 py-2 rounded text-2xl font-mono`
- Frequency peak: Top-left, `bg-[#252b38]/90 backdrop-blur px-3 py-1.5 rounded text-sm font-mono`
- Format: "440.2 Hz + 3 overtones" in `text-[#00ff88]`

**Zoom Bar:** (`bg-[#1a1f29] border-t border-[#2d3442]`)
- Range display: `text-sm font-mono text-[#8f95a3]`
- Fit button: `bg-[#252b38] hover:bg-[#2d3442] px-4 py-1.5 rounded text-sm text-[#e4e8ec]`

**Toast Notifications:**
- Position: Bottom-center, 16px from zoom bar
- Style: `bg-[#252b38] border border-[#00a8ff] px-6 py-3 rounded-lg shadow-2xl`
- Error: Red border `#ff3366`, warning icon
- Auto-dismiss: 4 seconds, slide-up exit

---

## Animations

**Recording Pulse:** Record button scales 0.95→1.05, 1.2s ease-in-out infinite when active

**Zoom Transition:** Chart transform on "Fit to Screen", 500ms ease-out

**No animations on:** Sliders, playback controls, status changes

---

## Accessibility

- Minimum touch targets: 44x44px
- Keyboard navigation: Tab through all controls, Space/Enter to activate
- ARIA labels: "Record audio", "Play recording", "Stop", "Microphone gain", "Declutter slider"
- Focus rings: `ring-2 ring-[#00a8ff] ring-offset-2 ring-offset-[#0f1419]`
- Status announcements via screen reader on state changes

---

## Images

**No Images Required:** Purely functional audio analysis tool with no marketing content.