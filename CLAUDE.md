# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Opel Van Logo Creator - A React application that allows users to upload their company logo, customize it (adjust transparency color and size), position it on a van image via drag-and-drop, and export the final composite image.

## Commands

```bash
yarn dev        # Start development server (Vite)
yarn build      # Type-check with tsc, then build for production
yarn lint       # Run ESLint
yarn preview    # Preview production build locally
```

## Tech Stack

- React 19 with TypeScript
- Vite 6 (bundler)
- Tailwind CSS 4 (via `@tailwindcss/vite` plugin)
- react-use-gesture (drag and pinch interactions)
- Heroicons (icons)

## Architecture

### Application Flow

The app is a 3-step wizard for customizing van branding:

1. **Step 1 (Upload)**: User uploads their company logo
2. **Step 2 (Customize)**: User adjusts logo transparency color, scales the logo, and drags it to position on the van
3. **Step 3 (Export)**: User downloads the final composite image

### Key Component: `ImageEditor.tsx`

The entire application logic resides in `src/components/ImageEditor.tsx`. It handles:

- **Logo processing**: Uses Canvas API to make a selected color transparent in the uploaded logo
- **Logo positioning**: Implements drag-and-drop via `useDrag` from react-use-gesture
- **Logo scaling**: Pinch gesture support via `usePinch` and a slider control
- **Image export**: Composites the van image with the positioned logo using Canvas, then triggers a download

### Styling

- Primary brand color: `#fafd1e` (Opel yellow)
- Custom font: Stellantis UI (loaded from `/public/fonts/`)
- Custom animation: `animate-move-dash` for visual feedback during logo dragging

### Static Assets

- Van image: `public/van-vivaro.webp` (referenced as `STATIC_CAR_IMAGE` constant)
- Fonts: `public/fonts/stellantis/`

## TypeScript Configuration

- Strict mode enabled
- Target: ES2020
- Unused locals/parameters cause errors
