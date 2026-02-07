# Sleep Diary PWA

## Overview
A mobile-first sleep diary Progressive Web App optimized for iPhone Safari "Add to Home Screen". Designed as a personal instrument — closer to a pilot's logbook than a wellness app. All data is stored locally in the browser (localStorage) with no backend database required.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + Recharts
- **Backend**: Express.js (minimal, only serves static files)
- **Storage**: localStorage (client-side only)
- **PWA**: Service worker for offline support, manifest for home screen installation

## Key Files
- `shared/schema.ts` - SleepEntry and AppSettings types (Zod schemas)
- `client/src/lib/storage.ts` - localStorage CRUD operations, CSV export, seed data
- `client/src/lib/sleepUtils.ts` - Sleep metric calculations, date utilities
- `client/src/pages/log.tsx` - Main sleep log entry form (zone-based layout)
- `client/src/pages/history.tsx` - Entry history list
- `client/src/pages/dashboard.tsx` - Stats with hero metrics, charts, correlations
- `client/src/pages/settings.tsx` - PIN lock, CSV export, data management
- `client/src/components/pin-lock.tsx` - PIN lock screen overlay
- `client/src/components/time-picker.tsx` - Linked dual-drum time picker (quarter-hour)
- `client/src/App.tsx` - Routing and bottom navigation
- `client/public/manifest.json` - PWA manifest
- `client/public/sw.js` - Service worker

## Design System

### Color Zones (Functional, Not Decorative)
Color defines zones so the user can navigate by feel:
- **Sleep zone** (bedtime, sleep time, wake time): Deep indigo/navy — `--zone-sleep`
- **Disruption zone** (night wakings, nap): Slate/blue-grey — `--zone-disruption`
- **Substance zone** (drinks, spliffs, other): Warm amber/ochre — `--zone-substance`
- **Reflection zone** (feeling, notes): Soft warm neutral — `--zone-reflection`

Each zone has three variants in CSS: `--zone-{name}` (label), `--zone-{name}-muted` (secondary), `--zone-{name}-bg` (background tint).

### Visual Language
- Always dark mode (class="dark" on html)
- Background: #0D1117 (dark blue-black with warmth/depth)
- Primary accent: warm amber (hsl 35)
- Font: Inter
- Custom linked dual-drum time picker (quarter-hour increments: 00, 15, 30, 45)
- Bottom tab navigation (Log, History, Stats, More)

### Typography Hierarchy
- Hero metrics: text-4xl, font-light (total sleep is the hero number)
- Secondary metrics: text-2xl, font-light
- Time inputs: text-2xl
- Zone labels: text-[10px], uppercase, tracked out, low opacity
- Row labels: text-sm, low opacity
- Body: text-base

### Layout (Entry Screen)
Vertical narrative — a story of the night told top to bottom:
1. Date (tappable to open calendar picker)
2. The Night (sleep zone) — bedtime, fell asleep, woke up
3. Disruptions (disruption zone) — night wakings, collapsed by default
4. Nap (disruption zone) — optional, collapsed by default
5. Metrics strip — total sleep as hero number, efficiency, in bed
6. Factors (substance zone) — horizontal row: drinks stepper, spliffs toggle, other toggle
7. How I feel (reflection zone) — 1-5 star scale
8. Notes (reflection zone) — expandable textarea
9. Save — brief checkmark flash feedback

### Dashboard
- Hero stat at top: average sleep with trend arrow (up/down/flat)
- Average efficiency and feeling alongside
- Quality calendar with color-coded dots (green/amber/red)
- Charts with correlation overlays (amber circles on substance nights)
- Correlations section using substance zone colors

## Data Flow
- All data persists in localStorage
- No API calls - everything is client-side
- Seed data (14 days) auto-populates on first visit
- CSV export uses Web Share API on iOS, fallback download on desktop

## Sleep Quality Scoring
Composite score from: efficiency (>=85%=2pts, >=75%=1pt), duration (>=7h=2pts, >=6h=1pt), feeling (>=4=2pts, >=3=1pt). Score >=5 = good (green), >=3 = ok (amber), else poor (red).
