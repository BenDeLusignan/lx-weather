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

1. **Open the app, log in.** It shows **the logged-in user's home club** for **one week** (Ben: "Let's just do one week then"; this replaces the first brief's current week and next week).
2. **Every day shows its times from 08:00 to 20:00, and each block gets a traffic-light score** (Ben: "show the times for each day from 08:00 to 20:00 and have a score for each block"):
   - **Green:** a good chance of no rain or wind.
   - **Yellow:** passable level of play.
   - **Red:** very unlikely you will get to play.

   Team's readings, not Ben's words, so say if any is wrong: **one week is today and the next six days** (not Monday to Sunday); **a block is one hour** (08:00 to 09:00, then on to 19:00 to 20:00: twelve a day); **the score is the green/yellow/red light**; the blocks of today that are already over are not shown; all times are UK time (Europe/London).
3. **An Away Game button.** The user picks any of the other clubs from the list and sees that club's one-week weather (the same view).
4. **Aggregated figures, with the sources one tap away.** Temperature, wind, rain and the rest are shown as an **aggregate** of the five providers. An **expand source data** control shows what each of the five providers says specifically.

## The clubs (Ben's decision)

Eighteen clubs, in the order Ben listed them:

Enniskillen, Irvinestown, Omagh, Limavady, Coleraine, Dungannon, Ballymena, Portadown, Banbridge, Downshire (Hillsborough), Hilden (Lisburn), Larne, Whitehead, Belfast, Newcastle, Bangor, Donaghadee, Cloughey.

This is the list of places "where we might be playing". Names are as Ben wrote them. **"Belfast" stands for about five clubs**, so the final list has one entry per club (Ben still has to say which; see Open questions).

**Addresses and locations** (Ben: "Use google maps and search for the names I gave you but add tennis club after each name") are in `src/clubs/clubs.ts`, found by searching Google Maps for each name plus "tennis club". Where the search didn't land on an obvious club, the team checked the club's own site or page:

- **Banbridge:** Google Maps has no Banbridge tennis club listing. Banbridge Tennis Club's own website says it plays at Banbridge Leisure Centre, so that is the location.
- **Hilden:** Google Maps lists the site as "Hilden Tennis Academy"; Hilden Tennis Club's Facebook page gives the same address (36 Belfast Road, Lisburn, also Lisburn Racquets Club).
- **Limavady:** the tennis club is the Limavady Recreation Club's tennis section.
- **Bangor:** Google Maps' first result for "Bangor tennis club" was Bangor in Wales; the club used is Bangor Lawn Tennis Club, Farnham Park, Co Down.

## Product rules

### Ben's decisions

1. **The headline is the aggregate; the providers are the detail.** The default view never makes the user read five forecasts. The five are available under "expand source data" (Core flow, 4).
2. **Never invent weather.** If a provider has no data or can't be reached, say so and show what the others say. No placeholder or sample numbers dressed up as a forecast. If nothing can be shown, show an honest empty state.
3. **The traffic light follows the chance of rain and the wind.**
   - **Rain** (Ben: "Rain is what people are most worried about"):
     - **Red:** over 70% chance of rain.
     - **Yellow:** 40% to 70%.
     - **Green:** under 40%.
   - **Wind:** Ben: "strong wind definitely makes the game unplayable, but I can't remember what speed feels too much". So a strong enough wind is red; the speeds are the team's pick (Team convention 4), for Ben to confirm.
   - **A block's light is the worse of its rain light and its wind light.**

   Team's reading, not Ben's words: exactly 40% and exactly 70% are yellow, and the light follows the whole-number % shown on screen (70.4% shows as 70% and is yellow; 70.5% shows as 71% and is red), so the number and the colour never disagree.
4. **Units:** temperature in **Celsius**; wind in **mph and km/h**. Team's reading, not Ben's words: both wind units are shown together wherever wind appears (the way LX Tennis shows lb and kg), so nobody has to pick.
5. **The five providers are the five whose data is most publicly accessible** (Ben: "I'm not sure who they are, but I'm thinking this app will replace a player having to open the 5 most popular weather apps and making an average decision themselves, so whoever has the 5 most publicly accessible data"). Which five is the team's call, below.
6. **Combining the forecasts:** whichever method gives the most reliable end point (Ben: "Whichever would work best"). The team's pick is below.
7. **Same stack as the other LX projects** (Ben: "Use what we have been using so far"): Next.js (App Router) + TypeScript, CSS Modules (no Tailwind), SQLite through Drizzle (a local file in development, Turso once hosted), hosted on Vercel. The details are in the LX Tennis vision. The look and theme are not part of this decision (see Open questions).

### Team conventions

1. **Every figure shows how many providers it's built from** (e.g. "4 of 5 providers") when fewer than five contributed, so an aggregate from two sources is never mistaken for one from five.
2. **The five providers are Met Office (UKMO), ECMWF, DWD ICON, NOAA GFS and Environment Canada GEM, all fetched through [Open-Meteo](https://open-meteo.com)** (the team's pick, measured on 11 Oct 2026 for a Belfast location). *Why:* Open-Meteo is free for non-commercial use, needs no key, and serves all five from one call per location. A portfolio project is non-commercial; **a commercial plan is needed if the site ever earns money**. The free limits are 10,000 calls a day and 300,000 a month. The data is CC BY 4.0, so **Open-Meteo is credited on the site**.
   - **These are forecast models, not the consumer apps.** The apps (Apple Weather, BBC Weather and the rest) post-process models like these, and none has a free public data feed. So the app replaces opening the apps by combining the models underneath them.
   - **Why not the apps Ben named.** BBC Weather has no public API (its only developer feed is a 3-day, non-commercial RSS feed documented in 2011). Ben has dropped Apple Weather ("ignore apple weather then"; it needs a paid Apple Developer membership) and the Met Office's own feed ("just pull the data from API": the Met Office model through Open-Meteo is the Met Office source).
   - **Why not MET Norway or Météo-France.** Both are free, but neither gives a chance of rain, only an amount, and the traffic light needs the chance (Ben's decision 3).
   - **How far ahead each one reaches** (when the chance of rain is last given, and when everything else is, for 11 Oct 2026):

     | Provider | Chance of rain to | Everything else to |
     | --- | --- | --- |
     | Met Office (UKMO) | 20 Oct | 17 Oct |
     | ECMWF | 25 Oct | 26 Oct |
     | DWD ICON | 16 Oct | 18 Oct |
     | NOAA GFS | 26 Oct | 26 Oct |
     | Environment Canada GEM | 26 Oct | 21 Oct |

   - **Consequence:** for a week starting 11 Oct every figure has four or five providers (16 Oct: DWD ICON's chance of rain has ended; 17 Oct: the Met Office model's other figures end at 13:00). Convention 1 shows the count on every figure, so it is never hidden. Outside the first week there are fewer, which is a reason to keep it to one week.
3. **Rain chance is the mean of the providers that give one; temperature and wind are the median.** *Why:* each provider's chance is already a probability, so their mean is a probability too and every provider counts; the median keeps one model with a wild temperature or wind from dragging the figure. This is the team's reading of "most reliable", **not yet tested**: it should be checked against what actually happened (Open-Meteo's free Historical Forecast API holds past forecasts) before it is treated as settled.
4. **Wind lights, by sustained wind speed** (Ben didn't give speeds; these are the team's pick, to be confirmed): **green under 10 mph, yellow 10 to 15 mph, red over 15 mph**, on the whole-number mph shown, like the rain light. *Why:* one tennis-conditions guide (Playable) says wind noticeably affects play from about 7 mph and is "genuinely unplayable for most recreational players above 15 mph sustained". Northern Ireland is windy, so the team put yellow at 10 rather than 7, so a normal breeze isn't a red day. The speed is the forecast's wind at 10 m up in the open, and courts are often sheltered; gusts, which the same guide says matter as much, are not used yet (see Open questions).

## Current state

The forecast engine and the club list exist: TypeScript in `src/forecast/` and `src/clubs/`. The club list has 17 of the 18 clubs: Belfast is missing until Ben picks its clubs (see Open questions). There is no Next.js app, database, UI or users yet.

- `fetchHourlyForecast` takes a latitude and longitude and makes one Open-Meteo call for the five providers (7 days of hourly temperature, chance of rain and wind). `buildWeek` turns that into the week view's data: seven UK days (today plus six) of 08:00-20:00 hour blocks, each with the aggregate temperature, rain chance and wind (Team convention 3), how many providers each is built from, every provider's own value, the rain light, the wind light and the block's light (the worse of the two; unknown unless both are known or one is red).
- A provider with no value is a gap (`null`) and is never filled; a block with no data is still returned, with `null` figures and a `null` light. A provider with nothing at all is listed in `unavailable`. If the fetch fails it throws `ForecastFetchError`.
- Which hourly values feed a block is explained in `blocks.ts`: rain from the stamp that ends the block (Open-Meteo gives it for the preceding hour), temperature and wind as the mean of the stamps at its start and end.
- It does not give a day one icon (open question below).
- Run `npm run forecast -- <club id>` (or `<latitude> <longitude>`) to see the week live, and `npm test` for the tests.
- **For whoever builds the UI on it:** nothing is rounded in the engine; round at display (whole % and mph and km/h, one decimal for °C). The lights already follow the whole numbers. A provider that doesn't reach that far ahead is a `null` in a block's per-provider values, which looks the same as an outage (only a provider with nothing at all is in `unavailable`). If all five are unavailable the fetch still returns normally, so the empty state must check for that as well as catching `ForecastFetchError`. A `null` light needs its own look (not green, not red).

## Open questions (Ben hasn't answered; don't decide these)

- **Confirm the wind speeds.** Ben can't remember what speed feels too much. The team's pick is yellow from 10 mph and red over 15 mph (Team convention 4); Ben says if that doesn't match how it feels on court.
- **One icon for a day?** Ben's first brief gave each day an icon; the week view now shows a score per hour block. Whether each day also gets one icon, and how it is worked out from its blocks, is not decided.
- **Sign-up details.** How a user signs up (email and password, as on LX Tennis, is the obvious choice but not decided), and whether they can change their home club afterwards.
- **Which Belfast clubs.** About five. Google Maps' search for "Belfast tennis club" gave these seven, for Ben to pick from (address, then latitude and longitude): Windsor Tennis Club (37 Windsor Ave, BT9 6EJ; 54.5789615, -5.9428311), Belfast Boat Club (12 Lockview Rd, Stranmillis, BT9 5FJ; 54.5693257, -5.9272395), Cavehill Tennis Club (20 N Circular Rd, BT15 5HB; 54.6334037, -5.9423441), Ballynafeigh Tennis Club (35A Wynchurch Park, BT6 0JL; 54.5695406, -5.9018683), Indoor Tennis Arena and Ozone Complex (Ormeau Embankment, BT6 8LT; 54.5896789, -5.9151837), Hawarden Lawn Tennis Club (3 Clonlee Dr, BT4 3DA; 54.5967078, -5.876607), Forth River Bowling & Tennis Club (104a Woodvale Rd, BT13 3BU; 54.6101643, -5.9638982). The models are coarse (the ECMWF grid in this feed is 0.25 degrees, so a Belfast point was snapped to 54.5, -6.0), so the Belfast clubs will mostly show the same or a near-identical forecast.
- **What "the rest" means.** Ben listed temperature, wind and rain "etc". Other figures (humidity, gusts, sunrise and sunset, court-drying time) are not decided. Gusts matter for tennis, so they are the likeliest addition.
- **The look.** LX Tennis's synthwave theme is Ben's decision for that site only; this site's look hasn't been chosen.

## Proposals awaiting Ben (not decided)

- **Forecasts fetched on the server and cached**, so the five providers aren't called on every page view and stay well under Open-Meteo's free limits.

## Priority and roadmap order (Ben's decision)

Not set. Ben's current order of projects is in the LX Tennis vision; this project hasn't been placed in it.

## How to change this doc

- **When Ben decides something, update this doc in the same change as the code, or on its own if there's no code change.** Move the item out of Open questions or Proposals into the section it belongs to, and delete it from where it was, so every fact lives in exactly one place.
- **Proposals only become decisions when Ben says so.** Anyone can add a new open question or proposal, clearly labelled.
- **Team conventions change through team review**, in the same change as the code that follows the new convention.
- **Keep Current state true.** When something ships, update it in the same change.
- **Keep it short and plain.** Rules and reasons, not issue lists or task backlogs.
