# LX Weather

A weather app for tennis players in Northern Ireland. It combines the forecasts of five weather providers into one aggregate forecast for each of the top tennis clubs, and shows one week of hour blocks from 10:00 to 22:00, each as green (good chance of no rain or wind), yellow (passable) or red (very unlikely you'll play). Works on the computer and the phone.

**Read [`docs/vision.md`](docs/vision.md) first.** It's the single source of truth for what we're building: what's decided, what's still open, and the rules we build by.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router, Cache Components) + TypeScript, React 19
- Plain CSS / CSS Modules, no Tailwind. Every colour is a semantic token in `src/app/globals.css`, with a light and a dark value (the look is [in the vision](docs/vision.md), "Theme")
- SQLite through [Drizzle ORM](https://orm.drizzle.team) and `@libsql/client`: a local file in development, [Turso](https://turso.tech) when hosted on Vercel, chosen by `DATABASE_URL`
- Forecasts from [Open-Meteo](https://open-meteo.com) (five models, no key, free non-commercial tier), cached on the server for up to an hour per club. The site credits Open-Meteo (CC BY 4.0) and the UK Met Office model data (CC BY-SA 4.0); see the vision for the open licence question

## Setup

Requires Node.js 20.9 or newer.

1. **Install:**

   ```sh
   npm install
   ```

2. **Environment:** copy the example and set `SESSION_SECRET` (the comments in the file say how to generate one). `.env.local` is gitignored; never commit it.

   ```sh
   cp .env.example .env.local
   ```

   | Variable | What it is |
   | --- | --- |
   | `DATABASE_URL` | `file:local.db` for a local SQLite file in the repo root (gitignored), or a `libsql://…turso.io` URL for Turso |
   | `DATABASE_AUTH_TOKEN` | Turso only; empty for a local file |
   | `SESSION_SECRET` | At least 32 random characters; signs the login cookie and hashes the failed-login counters' keys. Changing it logs everyone out and forgets recent failed attempts |

3. **Create the database:** applies the migrations in `drizzle/` (the `user` and `login_attempt` tables). Run it again after pulling new migrations; it only applies the ones that are missing.

   ```sh
   npm run db:migrate
   ```

4. **Run it:** `npm run dev`, then open http://localhost:3000 and sign up.

## Deploying (Vercel + Turso)

Live at https://lx-weather.vercel.app. A deployed site needs three environment variables in the Vercel project (Settings, Environment Variables), for Production and Preview:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | The Turso database's `libsql://…turso.io` URL. A `file:` URL can't work on Vercel (its disk is read-only) |
| `DATABASE_AUTH_TOKEN` | The Turso auth token |
| `SESSION_SECRET` | 32+ random characters, a different one per environment is fine |

With any of them missing, the pages load but **sign-up and log-in crash** with "This page couldn't load". The Turso integration on Vercel adds `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`, which the app doesn't read: add `DATABASE_URL` and `DATABASE_AUTH_TOKEN` with the same values. Preview deployments share the one database, so a sign-up on a preview URL is a real account.

**Migrations don't run on deploy.** After adding a migration in `drizzle/`, run `npm run db:migrate` yourself with `DATABASE_URL` and `DATABASE_AUTH_TOKEN` set in the shell to the Turso values (they override `.env.local`), then deploy.

## Commands

```sh
npm run dev              # dev server at http://localhost:3000
npm run build            # production build
npm run start            # serve the production build
npm run lint             # ESLint
npm test                 # tests (tsx --test): accounts, the login limiter, sessions, password change, home club, your settings (theme, days, hours), club list, display formatting, the forecast engine. Uses throwaway databases, never local.db; no network
npx tsc --noEmit         # type check
npm run db:generate      # after editing src/db/schema.ts: write the SQL migration into drizzle/
npm run db:migrate       # apply pending migrations in drizzle/ to DATABASE_URL
npm run forecast -- enniskillen              # live week for a club (id from src/clubs/clubs.ts), printed in the terminal
npm run forecast -- <latitude> <longitude>   # live week for any point
```

## Routes

| Route | What |
| --- | --- |
| `/` | Logged out: log in. Logged in: your home club's week (a strip of hour cells per day; tap an hour for its figures) |
| `/signup` | Email, password (12+ characters), home club |
| `/away` | The other clubs, alphabetical |
| `/away/[clubId]` | The same week screen for that club |
| `/account` | Email, change home club, change password (logs out your other devices), which days and hours you see, log out |
| (every logged-in screen) | The header: the LX Tennis Weather link home, a light/dark slider (saves your choice and comes back to the same page), and Account |

## Gotchas

- **Colours go in tokens.** Never write a hex value in a component or a CSS Module: add a token to `src/app/globals.css` (both its light and its dark value, and its contrast ratio in the header comment). The exceptions that mirror tokens are in the vision, "Theme", Team conventions.
- **Check the week at 360px and 768px after touching the hour cells.** "Passable", "100%" and "29 mph" have to fit the narrowest cell without wrapping, and every cell must stay the same size; the vision's "Theme" says why and where.
- **The header's wordmark uses Orbitron from `next/font/google`.** The font is fetched from Google once, at `next dev` start and at `next build`, and then self-hosted from the site's own domain; visitors never contact Google. A build with no network can't fetch it, so build online.
- **`PageProps` / `LayoutProps` are generated types.** Next creates them in `.next/` (gitignored), so on a fresh clone your editor and `tsc` will report them as missing until you run `npm run dev`, `npm run build` or `npx next typegen` once.
- **`npm test` runs `tsx --conditions=react-server`.** Server-side modules import `server-only`, which throws when loaded outside the React server environment; that flag tells Node to load the server build of it. Don't remove it from `package.json`, or the tests will fail on import.
- **`next dev` rewrites part of `AGENTS.md`.** When it detects an AI coding agent and the Next.js block is missing or out of date, it rewrites everything between the `<!-- BEGIN:nextjs-agent-rules -->` and `<!-- END:nextjs-agent-rules -->` markers. Don't edit inside those markers; put project notes outside them.
- **The forecast cache is in memory.** It lasts as long as the server process and isn't shared between serverless instances, so on Vercel an instance may fetch again sooner than an hour. That only costs Open-Meteo calls, never stale data.
- **Migrations are the schema's history.** Commit the generated files in `drizzle/` together with the `src/db/schema.ts` change, and never edit a migration that has already been applied; add a new one.
