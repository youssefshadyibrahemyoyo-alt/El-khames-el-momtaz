# El Khames El Momtaz (`الخميس الممتاز`)

Private Thursday-night 5-a-side Fantasy League web & PWA app built with **React 19 + TypeScript + Vite + Supabase**.

## Project Structure

```text
el-khames-el-momtaz/
├── public/                     # PWA manifest + resized 192x192 & 512x512 icons
├── supabase/
│   └── schema.sql              # Reference backup of Supabase views, storage & RPCs
├── src/
│   ├── __tests__/
│   │   └── squadRules.test.ts  # Vitest unit tests (budget, transfers, chips, Cairo DST)
│   ├── admin/                  # Admin dashboard tabs
│   │   ├── AdminPanel.tsx
│   │   ├── RegistrationsAdmin.tsx
│   │   ├── PlayersAdmin.tsx    # Includes direct phone/PC photo upload to Supabase Storage
│   │   ├── GameweeksAdmin.tsx  # Cairo time + auto-rollover start_gameweek RPC
│   │   ├── StatsAdmin.tsx      # Atomic match stats entry + 0-10 match ratings
│   │   └── ScoringRulesAdmin.tsx
│   ├── components/             # Shared UI layout, FUT cards & motion
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx          # Countdown + Floodlight Night toggle + EN/AR toggle
│   │   ├── FutPlayerCard.tsx   # FUT-style gold/silver/emerald player shield cards
│   │   ├── AnimatedNumber.tsx  # Smooth cubic-out animated stat counters
│   │   ├── ConfettiBurst.tsx   # Stadium confetti celebration burst on squad save
│   │   └── SquadInspectorModal.tsx
│   ├── i18n/                   # Bilingual English & Arabic (RTL) support
│   │   ├── translations.ts
│   │   └── LanguageContext.tsx
│   ├── theme/
│   │   └── ThemeContext.tsx    # Daylight + Night Floodlight dark theme toggle
│   ├── lib/                    # Pure domain logic & helpers
│   │   ├── supabase.ts
│   │   ├── cairoTime.ts
│   │   ├── squadRules.ts
│   │   └── demoData.ts
│   ├── screens/                # App pages
│   │   ├── AuthScreen.tsx
│   │   ├── OverviewScreen.tsx
│   │   ├── SquadScreen.tsx
│   │   ├── PlayerMarketScreen.tsx
│   │   └── LeaderboardScreen.tsx
│   ├── styles/
│   │   ├── styles.css          # Core layout, Daylight + Floodlight tokens & RTL
│   │   └── animations.css      # 3D turf, FUT card shimmer, spring slides & podiums
│   ├── types/
│   │   └── league.ts
│   ├── App.tsx                 # State & Supabase data orchestrator
│   └── main.tsx
├── package.json
└── vite.config.ts
```

## Key Features

- **5-a-Side Pitch & Squad Rules**: 7 players (`5 starters + 2 ordered subs`), `£50.0m` budget, Captain (`2×` / `3×` with Triple Captain), Vice-Captain auto-promotion, Bench Boost, and Wildcard.
- **Automatic Squad Rollover**: If a manager forgets to save before Thursday's deadline, their previous week's squad automatically carries over (`0` hits, `chip` cleared).
- **Post-Deadline Squad Inspector**: Click any manager in the Leaderboard after the transfer deadline to inspect their pitch, captain, bench auto-subs, and per-player points breakdown.
- **Bilingual (`English` / `العربية`)**: Instant LTR/RTL toggle with `Cairo` Arabic typography.
- **Admin Control Room**: Approve registrations, upload player photos from phone/PC (`player-photos` bucket), manage gameweeks in Cairo time, enter match stats & `0–10` ratings, and edit fantasy scoring rules live.

## Local Setup & Commands

Create `.env.local` in the project root (if omitted, the app launches in interactive Demo Preview mode):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

```bash
npm install
npm test          # Run Vitest unit tests
npm run dev       # Start local dev server
npm run build     # Typecheck + production bundle
```
