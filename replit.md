# Sleep Diary PWA

## Overview
A mobile-first sleep diary Progressive Web App optimized for iPhone Safari "Add to Home Screen". Designed with a Braun-inspired, instrument-grade dark aesthetic. All data is stored locally in the browser (localStorage) with no backend database required.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + Recharts
- **Backend**: Express.js (minimal, only serves static files)
- **Storage**: localStorage (client-side only)
- **PWA**: Service worker for offline support, manifest for home screen installation

## Key Files
- `shared/schema.ts` - SleepEntry and AppSettings types (Zod schemas)
- `client/src/lib/storage.ts` - localStorage CRUD operations, CSV export, seed data
- `client/src/lib/sleepUtils.ts` - Sleep metric calculations, date utilities
- `client/src/pages/log.tsx` - Main sleep log entry form
- `client/src/pages/history.tsx` - Entry history list
- `client/src/pages/dashboard.tsx` - Stats with charts and correlations
- `client/src/pages/settings.tsx` - PIN lock, CSV export, data management
- `client/src/components/pin-lock.tsx` - PIN lock screen overlay
- `client/src/App.tsx` - Routing and bottom navigation
- `client/public/manifest.json` - PWA manifest
- `client/public/sw.js` - Service worker

## Design
- Always dark mode (class="dark" on html)
- Background: #0A0A0A
- Accent: warm amber (hsl 28)
- Font: Inter
- Native time/date inputs for iOS drum roller pickers
- Bottom tab navigation (Log, History, Stats, More)

## Data Flow
- All data persists in localStorage
- No API calls - everything is client-side
- Seed data (14 days) auto-populates on first visit
- CSV export uses Web Share API on iOS, fallback download on desktop
