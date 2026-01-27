# Overtone Singer

A real-time vocal overtone analyzer and spectrogram visualizer built with React and Express.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)

## Features

- **Real-time Audio Analysis**: Capture and analyze vocal overtones from your microphone
- **Spectrogram Visualization**: View frequency data in a beautiful, interactive spectrogram
- **Adjustable Settings**:
  - Brightness, contrast, and sharpness controls
  - Multiple color schemes (Default, Warm, Cool, Monochrome)
  - Intensity scale modes (Linear, Logarithmic, Power)
- **Recording & Playback**: Record, stop, play, and review your vocal performances
- **Export Options**:
  - Export audio as WAV files
  - Export spectrogram as PNG images
  - Export video with synchronized audio (WebM/MP4)
- **Zoom & Navigation**: Zoom in/out and navigate through longer recordings

## Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Comes with Node.js

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/RemiDz/overtonesinger.git
   cd overtonesinger
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

## Running the Application

### Development Mode

```bash
npm run dev
```

The application will start at `http://localhost:5000`

### Production Build

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start the production server**:
   ```bash
   npm start
   ```

## Project Structure

```
overtonesinger/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   └── ...         # Feature components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   ├── pages/          # Page components
│   │   ├── App.tsx         # Main App component
│   │   └── main.tsx        # Entry point
│   └── index.html          # HTML template
├── server/                 # Backend Express server
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Storage interface
│   └── vite.ts             # Vite middleware setup
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Zod schemas and TypeScript types
├── attached_assets/        # Image assets
├── package.json            # Project dependencies
├── vite.config.ts          # Vite configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run check` | Run TypeScript type checking |
| `npm run db:push` | Push database schema changes (Drizzle) |

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI component library
- **Framer Motion** - Animations
- **TanStack Query** - Data fetching
- **Wouter** - Client-side routing

### Backend
- **Express** - Web framework
- **TypeScript** - Type safety
- **Drizzle ORM** - Database ORM (optional)

### Audio Processing
- **Web Audio API** - Real-time audio analysis
- **FFmpeg (optional)** - Video export with MP4 conversion

## Browser Requirements

- Modern browser with Web Audio API support
- Microphone access permissions
- For MP4 video export: Browser with SharedArrayBuffer support (Chrome, Edge, Firefox)

## Usage Tips

1. **Allow Microphone Access**: When prompted, allow the browser to access your microphone
2. **Adjust Settings**: Use the brightness, contrast, and sharpness sliders to optimize the visualization
3. **Color Schemes**: Click the palette icon to cycle through color schemes
4. **Intensity Modes**: Click the activity icon to change how intensity is displayed
5. **Export**: After recording, use the export buttons to save your analysis

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

If you find this project helpful, consider supporting its development:

[![PayPal Donate](https://img.shields.io/badge/PayPal-Donate-blue?style=flat&logo=paypal)](https://www.paypal.com/donate/?hosted_button_id=ABRWM7GB438R4)
