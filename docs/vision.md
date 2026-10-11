# LX Weather: vision

This is the single source of truth for what we're building and the rules we build by.
Read it before you plan, build or review anything in this repo.

## How to read it

Every rule here is labelled with who owns it, because that decides who you talk to about it:

- **Ben's decisions.** Ben made these calls. Follow them. If a request conflicts with one, raise it with Ben. Don't quietly deviate.
- **Team conventions.** The way the team builds. Follow them too, but they aren't Ben's calls: the team can change one through review (raise it with your teammate, not Ben), and updates this doc in the same change.
- **Current state** describes the code as it is today, not a target.
- **Open questions** and **Proposals awaiting Ben** are not decided. Don't build on them as if they were, and don't settle them yourself.

## What and why (Ben's decision)

A weather app for tennis players in Northern Ireland, where the weather is very unpredictable. It takes the forecasts of the top five European weather providers (Ben's examples: Apple Weather, Met Office, BBC Weather), combines them into one aggregate forecast, and shows it for each of the top tennis clubs in the country, so a player can see whether they'll actually get to play.

Ben's words: "this one will actually be incredibly useful". It is a portfolio project, built under the LX Studios name (hence `lx-weather`).

## Who it's for (Ben's decision)

- **Tennis players in Northern Ireland**, Ben and his friends first.
- **Users sign up and pick their club from the list.** That club is their home club, and its location is their home location. The app never checks their real location (no GPS).
- Used on a phone as much as on a computer.

## Platform (Ben's decision)

A website / web app that works on **both the computer and the phone**.

## Core flow (Ben's decisions)

1. **Open the app, log in.** It shows **the logged-in user's home club**, with **the current week and next week**.
2. **Each day gets a traffic-light icon** for playing conditions:
   - **Green:** a good chance of no rain or wind.
   - **Yellow:** passable level of play.
   - **Red:** very unlikely you will get to play.
3. **An Away Game button.** The user picks any of the other clubs from the list and sees that club's two-week weather (the same current week and next week view).
4. **Aggregated figures, with the sources one tap away.** Temperature, wind, rain and the rest are shown as an **aggregate** of the five providers. An **expand source data** control shows what each of the five providers says specifically.

## The clubs (Ben's decision)

Eighteen clubs, in the order Ben listed them:

Enniskillen, Irvinestown, Omagh, Limavady, Coleraine, Dungannon, Ballymena, Portadown, Banbridge, Downshire (Hillsborough), Hilden (Lisburn), Larne, Whitehead, Belfast, Newcastle, Bangor, Donaghadee, Cloughey.

This is the list of places "where we might be playing". Names are as Ben wrote them. **"Belfast" stands for about five clubs**, so the final list has one entry per club. Ben will provide each club's address; the forecast location is worked out from it.

## Product rules

### Ben's decisions

1. **The headline is the aggregate; the providers are the detail.** The default view never makes the user read five forecasts. The five are available under "expand source data" (Core flow, 4).
2. **Never invent weather.** If a provider has no data or can't be reached, say so and show what the others say. No placeholder or sample numbers dressed up as a forecast. If nothing can be shown, show an honest empty state.
3. **The traffic light follows the chance of rain** (Ben: "Rain is what people are most worried about"):
   - **Red:** over 70% chance of rain.
   - **Yellow:** 40% to 70%.
   - **Green:** under 40%.

   Team's reading, not Ben's words: exactly 40% and exactly 70% are yellow. Ben gave no wind threshold (the first brief said "no rain or wind"); see Open questions.
4. **Units:** temperature in **Celsius**; wind in **mph and km/h**. Team's reading, not Ben's words: both wind units are shown together wherever wind appears (the way LX Tennis shows lb and kg), so nobody has to pick.
5. **The five providers are the five whose data is most publicly accessible** (Ben: "I'm not sure who they are, but I'm thinking this app will replace a player having to open the 5 most popular weather apps and making an average decision themselves, so whoever has the 5 most publicly accessible data"). Which five is the team's call, below.
6. **Combining the forecasts:** whichever method gives the most reliable end point (Ben: "Whichever would work best"). The team's pick is below.
7. **Same stack as the other LX projects** (Ben: "Use what we have been using so far"): Next.js (App Router) + TypeScript, CSS Modules (no Tailwind), SQLite through Drizzle (a local file in development, Turso once hosted), hosted on Vercel. The details are in the LX Tennis vision. The look and theme are not part of this decision (see Open questions).

### Team conventions

1. **Every figure shows how many providers it's built from** (e.g. "4 of 5 providers") when fewer than five contributed, so an aggregate from two sources is never mistaken for one from five.
2. **The five providers are Met Office (UKMO), ECMWF, DWD ICON, NOAA GFS and Environment Canada GEM, all fetched through [Open-Meteo](https://open-meteo.com)** (the team's pick, measured on 11 Oct 2026 for a Belfast location). *Why:* Open-Meteo is free for non-commercial use, needs no key, and serves all five from one call per location. A portfolio project is non-commercial; **a commercial plan is needed if the site ever earns money**. The free limits are 10,000 calls a day and 300,000 a month. The data is CC BY 4.0, so **Open-Meteo is credited on the site**.
   - **These are forecast models, not the consumer apps.** The apps (Apple Weather, BBC Weather and the rest) post-process models like these, and none has a free public data feed. So the app replaces opening the apps by combining the models underneath them.
   - **Why not the apps Ben named.** BBC Weather has no public API (its only developer feed is a 3-day, non-commercial RSS feed documented in 2011). Apple Weather's data comes through WeatherKit, which needs an Apple Developer Program membership (500,000 calls a month included).
   - **Why not MET Norway or Météo-France.** Both are free, but neither gives a chance of rain, only an amount, and the traffic light needs the chance (Ben's decision 3).
   - **How far ahead each one reaches** (when the chance of rain is last given, and when everything else is, for 11 Oct 2026):

     | Provider | Chance of rain to | Everything else to |
     | --- | --- | --- |
     | Met Office (UKMO) | 20 Oct | 17 Oct |
     | ECMWF | 25 Oct | 26 Oct |
     | DWD ICON | 16 Oct | 18 Oct |
     | NOAA GFS | 26 Oct | 26 Oct |
     | Environment Canada GEM | 26 Oct | 21 Oct |

   - **Consequence:** the first days have all five providers; the second week has two or three. Convention 1 shows that on every day, so it is never hidden. GEM's chance of rain runs 5 days past its other figures; the team hasn't checked whether that stretch is trustworthy.
3. **Rain chance is the mean of the providers that give one; temperature and wind are the median.** *Why:* each provider's chance is already a probability, so their mean is a probability too and every provider counts; the median keeps one model with a wild temperature or wind from dragging the figure. This is the team's reading of "most reliable", **not yet tested**: it should be checked against what actually happened (Open-Meteo's free Historical Forecast API holds past forecasts) before it is treated as settled.

## Current state

Nothing is built yet. This repo holds the vision, a README and a `.gitignore`. There is no code and no data yet.

## Open questions (Ben hasn't answered; don't decide these)

- **Wind in the traffic light.** Ben gave rain thresholds only. Whether wind can make a day yellow or red (and at what mph), and whether temperature counts, is not set.
- **How the hours of a day become one icon.** A day has 24 hourly forecasts and a player plays in some of them. Which hours count (and whether the day's chance is the average, or the worst hour, over them) is not decided. Using the whole day would count rain at 3am; using the worst hour would make one passing shower turn the day yellow.
- **Sign-up details.** How a user signs up (email and password, as on LX Tennis, is the obvious choice but not decided), and whether they can change their home club afterwards.
- **The clubs.** Ben will provide the addresses, and the names of the five or so Belfast clubs.
- **What "the rest" means.** Ben listed temperature, wind and rain "etc". Other figures (humidity, gusts, sunrise and sunset, court-drying time) are not decided.
- **The look.** LX Tennis's synthwave theme is Ben's decision for that site only; this site's look hasn't been chosen.

## Proposals awaiting Ben (not decided)

- **Add Apple Weather through WeatherKit, in place of the weakest of the five.** It needs an Apple Developer Program membership (the team doesn't know whether Ben has one). It would give the app one of the consumer apps Ben named, not just its underlying models.
- **Add the Met Office's own feed (Weather DataHub) alongside its model in Open-Meteo.** It is free up to 360 calls a day with a registered key. It would put the Met Office's official, post-processed forecast in by name, for the first week only.
- **Forecasts fetched on the server and cached**, so the five providers aren't called on every page view and stay well under Open-Meteo's free limits.

## Priority and roadmap order (Ben's decision)

Not set. Ben's current order of projects is in the LX Tennis vision; this project hasn't been placed in it.

## How to change this doc

- **When Ben decides something, update this doc in the same change as the code, or on its own if there's no code change.** Move the item out of Open questions or Proposals into the section it belongs to, and delete it from where it was, so every fact lives in exactly one place.
- **Proposals only become decisions when Ben says so.** Anyone can add a new open question or proposal, clearly labelled.
- **Team conventions change through team review**, in the same change as the code that follows the new convention.
- **Keep Current state true.** When something ships, update it in the same change.
- **Keep it short and plain.** Rules and reasons, not issue lists or task backlogs.
