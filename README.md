# FitTrack

Track workouts, body weight and habits, and get help reaching your goals.
One codebase runs on the web now and builds for iOS and Android later.

**Stack:** Expo SDK 58 (React Native + Expo Router) · Supabase (Postgres + Auth) · TanStack Query · TypeScript

## Features

- **Workout logger**: sets, reps and weight; "last time" values and a next-set suggestion (double progression, 8–12 reps); rest timer; automatic PR detection
- **Lifting progress**: estimated 1RM (Epley) per exercise with a trend chart and full history
- **Body weight**: daily weigh-ins plus a 7-day moving average, a goal line, and a projected date for reaching your target
- **Goals**: target weight, target lift (est. 1RM) or workouts per week; each shows progress, ahead/on track/behind status, and a projection
- **Habits**: daily checklist, streaks, and a 16-week heatmap

## Setup

1. **Create a Supabase project** (free) at <https://supabase.com>.
2. **Create the database**: in the Supabase dashboard open *SQL Editor → New query*, paste
   [`supabase/migrations/20261019000000_init.sql`](supabase/migrations/20261019000000_init.sql) and run it.
3. **Add your keys**: copy `.env.example` to `.env.local` and fill in the Project URL and publishable key
   (*Project Settings → API*).
4. *(Optional, for local dev)* In *Authentication → Sign In / Providers → Email*, turn off "Confirm email" so new accounts can sign in immediately.
5. Run it:

   ```sh
   npm install
   npm run web       # browser
   npm start         # then scan the QR code with Expo Go on your phone
   ```

## Scripts

| Command | What it does |
|---|---|
| `npm run web` | Dev server in the browser |
| `npm start` | Dev server for Expo Go / simulators |
| `npm test` | Unit tests for the fitness math (`src/lib/stats.ts`) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npx expo export --platform web` | Static web build into `dist/` (deploy to Netlify, Vercel, etc.) |

## Project layout

```
src/app/                 screens (Expo Router: each file is a route)
  (tabs)/                Today · Train · Progress · Goals
  workout/[id].tsx       live workout logger
  exercise/[id].tsx      exercise history and 1RM chart
  sign-in.tsx
src/components/          UI kit, charts, heatmap, pickers
src/lib/
  stats.ts               pure fitness math (dates, 1RM, trends, goals, streaks), unit-tested
  derived.ts             turns rows into PRs, sessions and goal evaluations
  queries.ts             every Supabase read/write as a React Query hook
  supabase.ts, auth.tsx  client and session handling
supabase/migrations/     database schema, row level security, and the built-in exercise library
```

## Security

Every table has row level security, so a signed-in user can only read and write their own rows.
The publishable key is safe to ship in the app. Never put the database password or a secret key in it.

## Going mobile

The same code runs on iOS and Android. To ship store builds, use EAS:

```sh
npx eas-cli@latest build --platform android   # or ios
```

## Roadmap ideas

Running and cardio log (pace, weekly distance, 5K/10K PRs) · saved routines/templates · body measurements and progress photos ·
an overall fitness score · a weekly review summary · a muscle heatmap · a plate calculator · kg/lb setting ·
an AI coach that reads your logs · CSV export.
