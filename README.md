# LX Weather

A weather app for tennis players in Northern Ireland. It combines the forecasts of five weather providers into one aggregate forecast for each of the top tennis clubs, and shows one week of hour blocks from 08:00 to 20:00, each as green (good chance of no rain or wind), yellow (passable) or red (very unlikely you'll play). Works on the computer and the phone.

**Read [`docs/vision.md`](docs/vision.md) first.** It's the single source of truth for what we're building: what's decided, what's still open, and the rules we build by.

## Status

Only the forecast engine and the club list are built (`src/forecast/`, `src/clubs/`): it fetches the five providers for a latitude/longitude and combines them into a week of hour blocks with a traffic light each. There is no web app, database or users yet. See "Current state" in the vision doc.

## Commands

```sh
npm install
npm test                                     # unit tests (fake data, no network)
npx tsc --noEmit                             # type check
npm run forecast -- enniskillen              # live week for a club (id from src/clubs/clubs.ts)
npm run forecast -- <latitude> <longitude>   # live week for any point
```
