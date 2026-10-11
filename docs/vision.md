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

1. **The landing page is the log in** (Ben: "Landing page is a log in"). Team's reading, not Ben's words: a new user reaches sign-up from it (Ben earlier: "Users will sign up and select their club from the list").
2. **Once logged in, the home screen is the user's home club's weather, with the club name at the top**, for **one week** (Ben: "Let's just do one week then"; this replaces the first brief's current week and next week).
3. **Every day shows its times from 10:00 to 22:00, and each block gets a traffic-light score** (Ben's earlier words: "show the times for each day from 08:00 to 20:00 and have a score for each block"; on 11 Oct 2026 Ben changed the window: "change the time window and go from 8-19 change to 10-21", meaning blocks starting 10:00 to 21:00, so 10:00 to 22:00. The 08:00 to 20:00 window is superseded):
   - **Green:** a good chance of no rain or wind.
   - **Yellow:** passable level of play.
   - **Red:** very unlikely you will get to play.

   **Every hour box is the same size, and shows the rain chance and the wind speed** (Ben: "make sure every box is the same size. Have the rain percentage and the wind speed in each box"; also "boxes do not need to list x out of 5 based on how many sources they have"). *Why:* rain and wind both decide the light, so a box that said 3% rain but was red because of the wind would confuse people (Ben: "Rain and wind are needed as some say 3% as in chance of rain but are red because of the wind which may confuse users"). So the box never shows "N of 5 providers"; the count is still shown in the detail that opens from the box (Team convention 1).

   Team's readings, not Ben's words, so say if any is wrong: **one week is today and the next six days** (not Monday to Sunday); **a block is one hour** (10:00 to 11:00, then on to 21:00 to 22:00: twelve a day); **the score is the green/yellow/red light**; the blocks of today that are already over are not shown; all times are UK time (Europe/London); **the box shows the wind in mph** (it is small), and the detail shows mph and km/h.
4. **An Away Game button** on the home screen shows **a list of the other clubs, alphabetically**. Clicking one shows **the same screen as the home screen, with that club and its data** instead (Ben: "once they are clicked you see the same screen as your homescreen but with the selected club and its data instead").
5. **There is always a button at the top of the screen that takes the user home, with an Account button** for changing the home club "if that ever happens" (Ben: "There should always be a home button at the top of the screen with an account button for changing your home club if that ever happens"). On 11 Oct 2026 Ben renamed the home button: "change the home button to say LX Tennis Weather, it will still bring the user to the home screen". So it reads **LX Tennis Weather** (beside the brand mark) and still goes to `/`.
6. **Aggregated figures, with the sources one tap away.** Temperature, wind, rain and the rest are shown as an **aggregate** of the five providers. An **expand source data** control shows what each of the five providers says specifically.
7. **No day icon** (Ben: "No day icon as it could rain 80% of the day but not the 20% you actually want to play at"). Only the hour blocks are scored; nothing sums a day into one light.

Team's readings of 4 and 5, not Ben's words: the list is sorted by the name shown, and "the other clubs" leaves out the user's own home club; the LX Tennis Weather link and Account sit at the top of every screen once logged in; the Account page also has Log out, which a log-in needs.

## The clubs (Ben's decision)

Eighteen clubs (Ben listed eighteen names; the five Belfast clubs are one entry, below), in the order Ben listed them:

Enniskillen, Irvinestown, Omagh, Limavady, Coleraine, Dungannon, Ballymena, Portadown, Banbridge, Downshire (Hillsborough), Hilden (Lisburn), Larne, Whitehead, Belfast, Newcastle, Bangor, Donaghadee, Cloughey.

This is the list of places "where we might be playing". Names are as Ben wrote them.

**Belfast is one entry** (Ben: "Belfast clubs are Windsor, Boat Club, Cavehill, Ballynafeigh, Hawarden, the others are indoor so it doesn't matter. If the weather data for these will be identical you can just put them all under one"). Windsor, Belfast Boat Club, Cavehill, Ballynafeigh and Hawarden share one forecast point, the middle of the five (54.58959, -5.91818; no club is more than 5.1 km from it). The team measured whether the five really are identical (11 Oct 2026, 82 blocks): not identical, but close. Against Windsor, another club's light differed in 3 to 5 blocks, by one step each; rain chance by up to 14 points, wind by up to 3 mph, temperature by under 1 degree. The cause is the models' coarse grid cells (10 to 28 km), so those are not real differences between the courts. Ben's condition ("if ... identical") isn't exactly met, so the team tells him; merging is what he allowed.

**Addresses and locations** (Ben: "Use google maps and search for the names I gave you but add tennis club after each name") are in `src/clubs/clubs.ts`, found by searching Google Maps for each name plus "tennis club". Where the search didn't land on an obvious club, the team checked the club's own site or page:

- **Banbridge:** Google Maps has no Banbridge tennis club listing. Banbridge Tennis Club's own website says it plays at Banbridge Leisure Centre, so that is the location.
- **Hilden:** Google Maps lists the site as "Hilden Tennis Academy"; Hilden Tennis Club's Facebook page gives the same address (36 Belfast Road, Lisburn, also Lisburn Racquets Club).
- **Limavady:** the tennis club is the Limavady Recreation Club's tennis section.
- **Bangor:** Google Maps' first result for "Bangor tennis club" was Bangor in Wales; the club used is Bangor Lawn Tennis Club, Farnham Park, Co Down.

## Product rules

### Ben's decisions

1. **The headline is the aggregate; the providers are the detail.** The default view never makes the user read five forecasts. The five are available under "expand source data" (Core flow, 6).
2. **Never invent weather.** If a provider has no data or can't be reached, say so and show what the others say. No placeholder or sample numbers dressed up as a forecast. If nothing can be shown, show an honest empty state.
3. **The traffic light follows the chance of rain and the wind.**
   - **Rain** (Ben: "Rain is what people are most worried about"):
     - **Red:** over 70% chance of rain.
     - **Yellow:** 31% to 70%.
     - **Green:** 30% and under (Ben: "Let's have rain percentage as 30 and under being classed as good"; it was under 40% before).
   - **Wind:** Ben: "strong wind definitely makes the game unplayable, but I can't remember what speed feels too much". So a strong enough wind is red; the speeds are the team's pick (Team convention 4), for Ben to confirm.
   - **A block's light is the worse of its rain light and its wind light.**

   Team's reading, not Ben's words: exactly 70% is yellow (Ben changed only the green limit, so the red limit stays at over 70%), and the light follows the whole-number % shown on screen (30.4% shows as 30% and is green; 30.5% shows as 31% and is yellow; 70.4% shows as 70% and is yellow; 70.5% shows as 71% and is red), so the number and the colour never disagree.
4. **Units:** temperature in **Celsius**; wind in **mph and km/h**. Team's reading, not Ben's words: both wind units are shown together wherever wind appears (the way LX Tennis shows lb and kg), so nobody has to pick; the one exception is the small hour box, which shows mph only (Core flow 3).
5. **The five providers are the five whose data is most publicly accessible** (Ben: "I'm not sure who they are, but I'm thinking this app will replace a player having to open the 5 most popular weather apps and making an average decision themselves, so whoever has the 5 most publicly accessible data"). Which five is the team's call, below.
6. **Combining the forecasts:** whichever method gives the most reliable end point (Ben: "Whichever would work best"). The team's pick is below.
7. **Same stack as the other LX projects** (Ben: "Use what we have been using so far"): Next.js (App Router) + TypeScript, CSS Modules (no Tailwind), SQLite through Drizzle (a local file in development, Turso once hosted), hosted on Vercel. The details are in the LX Tennis vision. The look and theme are not part of this decision (see Open questions).
8. **No charging, no ads** (Ben, 11 Oct 2026: "I wasn't planning on charging people for this or running ads"). This is why Open-Meteo's free non-commercial tier applies (Team convention 2).

### Team conventions

1. **Every figure shows how many providers it's built from** (e.g. "4 of 5 providers") when fewer than five contributed, so an aggregate from two sources is never mistaken for one from five. **Exception, Ben's decision: the hour boxes in the week strip don't show it** (Core flow 3); the detail that opens from a box does.
2. **The five providers are Met Office (UKMO), ECMWF, DWD ICON, NOAA GFS and Environment Canada GEM, all fetched through [Open-Meteo](https://open-meteo.com)** (the team's pick, measured on 11 Oct 2026 for a Belfast location). *Why:* Open-Meteo is free for non-commercial use, needs no key, and serves all five from one call per location. Ben's decision 8 (no charging, no ads) keeps the site non-commercial, so the free tier applies; **a commercial plan is needed only if that decision changes** (the site starts charging or showing ads). Open-Meteo's terms can change and it can block misuse, so don't assume the free tier is permanent. The free limits are 10,000 calls a day and 300,000 a month. Open-Meteo's data is CC BY 4.0, so **Open-Meteo is credited on the site, with a link**; it lists the Met Office data as CC BY-SA 4.0, so **the UK Met Office is credited too, with that licence linked** (see Open questions for what ShareAlike may mean for us).
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

   - **Consequence:** for a week starting 11 Oct every figure has four or five providers (16 Oct: DWD ICON's chance of rain has ended; 17 Oct: the Met Office model's other figures end at 13:00). Convention 1 shows the count in the hour's detail, so it is never hidden. Outside the first week there are fewer, which is a reason to keep it to one week.
3. **Rain chance is the mean of the providers that give one; temperature and wind are the median.** *Why:* each provider's chance is already a probability, so their mean is a probability too and every provider counts; the median keeps one model with a wild temperature or wind from dragging the figure. **Backtested 11 Oct 2026** (`scripts/backtest/`, results in `scripts/backtest/results/summary.txt`) against hourly airport observations (Belfast City, Belfast International, City of Derry; 11,553 station-hours, 340 days, Aug 2025 to Oct 2026), forecasts 1 to 6 days ahead from Open-Meteo's Previous Runs API:
   - **The blend beats every single provider** at every lead, including the Met Office alone: wind error 0.3 to 0.8 mph lower, and the light matches the observed light 4 to 6 points more often. Every Met Office-first schedule tried (hard switches for the first 1 to 4 days, tapers) was also worse, so the app keeps the equal blend. Met Office wind at 5 and 6 days is no better than a constant guess.
   - **Dropping the Met Office from the blend costs almost nothing** at 2 to 6 days and a little at 1 day (wind error +0.11 mph).
   - **Limits:** the rain chance the app shows (ensemble-derived) is not stored for past days, so rain at 1 to 6 days was tested through a calibrated proxy from precipitation amounts; the real chances were checked only a few hours ahead (all five only for 19 days). Rain is judged from airport weather reports (occurrence, not amount). Only three airfield stations: nothing within 45 km of Enniskillen, Omagh or Newcastle, and no club west or south is validated. Gusts and temperature untested. To test the real rain chance, log the live forecasts for 6 to 8 weeks and compare.
4. **Wind lights, by sustained wind speed** (Ben didn't give speeds; these are the team's pick, to be confirmed): **green under 10 mph, yellow 10 to 15 mph, red over 15 mph**, on the whole-number mph shown, like the rain light. *Why:* one tennis-conditions guide (Playable) says wind noticeably affects play from about 7 mph and is "genuinely unplayable for most recreational players above 15 mph sustained". Northern Ireland is windy, so the team put yellow at 10 rather than 7, so a normal breeze isn't a red day. The speed is the forecast's wind at 10 m up in the open, and courts are often sheltered; gusts, which the same guide says matter as much, are not used yet (see Open questions).
5. **Forecasts are fetched on the server and cached** for up to an hour per forecast point, so the five providers aren't called on every page view and the site stays far under Open-Meteo's free limits (10,000 calls a day; 18 clubs at one call an hour is 432). One hour is the team's pick; the models update a few times a day. Provider keys, if any are ever added, stay on the server.
6. **Accounts follow LX Tennis's approach, and are checked on the server.** Email and password (at least 12 characters); passwords hashed with scrypt; a signed, HttpOnly, SameSite=Lax cookie session (Secure in production) from `SESSION_SECRET`; failed log ins and refused sign-ups counted per email and per client address in the database, with short lockouts (a minute, then five, then fifteen). A wrong password and an unknown email get the same message. `getCurrentUser()` (`src/auth/current-user.ts`) is the boundary: every screen with account data and every Server Action calls it and refuses when it returns null; `src/proxy.ts` only does the quick cookie check so a logged-out visit to `/away` or `/account` gets a real redirect. Forms work before JavaScript loads (plain POST to a Server Action that always ends in `redirect()`), and report errors as a flag in the URL, never what the user typed. *Why:* same reasons as on LX Tennis; anyone can call a Server Action directly, whatever the page shows.

## Theme

### Ben's decision

Ben has decided two small things about the look, both on 11 Oct 2026. **The mark:** "Change the logo to be the same colour but have the cloud above the tennis ball" (so the same blue, lime and white, with the cloud above the ball). **The header:** "also swap the header colour with the body colour, the header should always be dark". The exact colours that follow from that are the team's reading (Team convention 10), for Ben to confirm. He hasn't chosen anything else about the look for this site (LX Tennis's synthwave theme is his decision for that site only). The first look below is Drage's proposal for Ben to react to, apart from those two changes. The Team conventions after it are how the team builds the look, whatever Ben chooses, and change through review.

### First look (Drage's proposal, awaiting Ben; not a decision)

- **Feel:** calm and easy to read at a glance, for a phone at the side of a court. A pale sky-blue light theme and a deep night-blue dark theme, chosen by the phone's own setting (`prefers-color-scheme`; no switch). One blue for everything you can press; the traffic lights are the only strong colours on the page. The system font, so nothing is downloaded. The mark is a cloud above a tennis ball (Ben's change; it was a ball behind a cloud). The header is always dark (Ben's change).
- **The week:** each day is a heading and a strip of small cells, one per hour. A cell shows the hour, the light as a shape and a word, the chance of rain and the wind in mph, one line each ("3%", "16 mph"; a missing figure is a dash in the same line), and never "n of 5". Every cell is the same fixed height (100px on a phone, 108px from 768px) and the strip's columns are equal, so no box is ragged in any state. A screen reader hears "rain 3 percent, wind 16 miles per hour" after the hour and the light's word. On a phone the strip is two rows of six (10:00 to 15:00, then 16:00 to 21:00); from 768px it is one row of twelve, and every hour sits in the same column on every day. Tapping a cell opens a card with the detail. *Why:* the thing a player wants is "where are the greens today and tomorrow", and a strip answers it by scanning. The first build had a card of about 250px for each of 80-plus hours; the strip is a cell of about 100px, measured at about 1,750px for the whole week on a 360 to 430px phone (about two screens; today and the top of tomorrow fit on the first screen of a 390 by 844 phone) and 1,080px at 1280px wide. Cells about 52 to 64px wide are big enough to tap and make a two-row strip fit a 360px phone, and the word stays in the cell because shape and colour are not enough on their own. The two figures sit side by side with the word so a red hour with a low rain chance shows the wind that made it red; the units ("%", "mph") are the labels, since a text label doesn't fit a 52px cell.
- **The card** is out of the page's flow, under the day, so opening an hour never moves the cells you are scanning. The open cell gets a thick ring. It is a native `<details>`: a tap opens it, a second tap closes it, and opening another closes the first. *Trade-off:* it covers the next day while open, and Escape doesn't close it (that needs JavaScript).
- **The lights**, each a different shape and a word as well as a colour, so they work in grayscale and for colour-blind players. The key sits above the week and carries a plain sentence that the colour is decided by the chance of rain and the wind speed (Ben, 11 Oct 2026: "explain alongside the key that the colour is decided by rain chance and wind speed").

  | Light | Word | Shape | Colour |
  | --- | --- | --- | --- |
  | Green | Good | circle with a tick | green |
  | Yellow | Passable | triangle with an exclamation mark | amber |
  | Red | Unlikely | square with a cross | red |
  | None (not enough data) | Unknown | dashed empty ring with a question mark, dashed edge | grey |

  An unknown hour says why on its card ("no wind data"), and the card shows, for rain and for wind, the light each gives, so you can see which one made the hour's light.
- **Nothing sums a day into one light** (Ben's decision, Core flow 7). Only hours are scored.

### Team conventions

1. **Colours only via the semantic tokens** in `src/app/globals.css` (`--color-*`, `--light-*`). No raw hex or `rgb()` in components or CSS Modules. There is one layer of tokens, each written twice (light, then inside `@media (prefers-color-scheme: dark)`); a new token needs both values, except tokens that are the same in both themes (`--color-mark-*`, `--color-header-*`), which are written once. Also use the other tokens where one exists: `--font-size-*`, `--space-*`, `--radius*`, `--content-width`, `--narrow-width`, `--touch-target`, `--focus-ring-width`, `--duration-fast`. The two places that can't read CSS variables, `src/app/icon.svg` and the `viewport` theme colours in `src/app/layout.tsx`, mirror tokens (convention 5).
2. **Contrast: WCAG AA in both themes.** Text and its tokens are at least 4.5:1 on the surfaces they sit on; icons and the edges of controls are at least 3:1. The measured ratios are in the header comment of `globals.css`; a new colour token needs its ratio checked and recorded there. The one known exception is the amber passable triangle, which is light by nature (2.1:1 on its cell); it is outlined in the dark text colour (8.9:1) so its shape never depends on the fill.
3. **A light is never shown by colour alone.** Always the shape (`LightIcon`) and the word (`lightWord` in `src/weather/format.ts`) with it; use `LightBadge` for a light on its own. Never add a day-level light (Ben's decision, Core flow 7).
4. **Breakpoints.** CSS custom properties can't be used in `@media`, so the scale is written down here. Styles are mobile-first (`min-width`). The site uses one:

   | Breakpoint | Used for |
   | --- | --- |
   | `48rem` (768px) | wider page gutters (`layout.module.css`, `site-header.module.css`); the club name and its button share a row (`club-weather.module.css`); the day strip goes from two rows of six to one row of twelve (`day-strip.module.css`, and the same columns in `loading.module.css`); the hour card gets more padding and its three figures sit side by side (`hour-cell.module.css`, `block-detail.module.css`); the log in and sign up card gets more padding (`auth-card.module.css`) |

   One thing scales with the screen instead of jumping: the hour cell's text (`clamp()` in `hour-cell.module.css`, sized so "Passable" fits the narrowest cell at 360px and 768px; recheck both if the font, the gutters or the gap change; the cell's fixed height, 6.25rem then 6.75rem from 48rem, is repeated in `loading.module.css`). The Away list is one alphabetical column at every width, held to `--narrow-width` (Ben, 11 Oct 2026: "make the list of clubs in alphabetical order one list, I don't like the three columns"). `HOURS_PER_PHONE_ROW` in `format.ts` must equal the 6 in `day-strip.module.css`.
5. **`src/app/icon.svg` hard-codes the mark's three colours**, because a static file can't read CSS variables. They mirror these tokens, and `components/brand-mark.tsx` draws the same picture with the tokens, so change all three together. The picture is the cloud above the tennis ball, with a small gap and no overlap (white on lime has almost no contrast, so an overlap would blur the cloud's edge at 16px):

   | Hex | Token |
   | --- | --- |
   | `#0a5a8c` | `--color-mark-bg` |
   | `#d9ec3f` | `--color-mark-ball` |
   | `#ffffff` | `--color-mark-cloud` |

   `apple-icon.png` (180px, for a phone's home screen) is rasterised from `icon.svg` on the opaque blue (a full square, the phone rounds it), so re-render it if the artwork changes. The two `themeColor` values in `layout.tsx` mirror `--color-bg` (light, dark). **Never write a double hyphen inside a comment in `icon.svg`, not even in a token name**: XML forbids it, and the browser then silently drops the whole icon. Check a changed icon as XML (a `DOMParser` with `image/svg+xml` reports no `parsererror`) and load it in a real browser.
6. **Motion respects `prefers-reduced-motion`.** The global rule in `globals.css` switches animations and transitions off; don't override it.
7. **Build with the shared pieces in `src/components`** instead of restyling per page: `Button` (`primary` filled, `secondary` outlined, `quiet` for the header) and `SubmitButton`; `Form`, `Field` (with `hintId`, `describedBy`), `ClubSelect` and `FormMessage` (a client component: it moves focus to itself, because a redirect is a full page load that a screen reader wouldn't announce); `Notice` (`info`, `warning`, `problem`: the colour only tints the edge, the words carry the meaning); `Disclosure` (a native `<details>` with a chevron); `Narrow` for a reading-width column and `AuthCard` for log in and sign up; `PageLoading` and `WeekLoading` for loading states; `BrandMark`; and for the week `LightIcon`, `LightBadge`, `LightKey`, `DayStrip`, `HourCell`, `BlockDetail`, `SourceTable`.
8. **One `<main id="main">`, in the root layout**, with the skip link and the header. Pages render inside it and never add another. Next keeps the page you just left in the DOM (hidden) while you navigate, so a `<main>` per page, or the same field id on two pages, would be duplicated; give every field an id that is unique to its form (`login-email`, `signup-email`).
9. **Server components by default.** The only client component is `FormMessage`. The week, the cards and the lights need no JavaScript.
10. **The header is a dark band in both themes** (Ben's decision, Theme above), through the `--color-header-*` tokens, written once because they don't change with the theme; their contrast is recorded in `globals.css`. The shared `quiet` Button is made for a light page, so `site-header.module.css` re-colours the header's two links (text, hover fill, focus ring) instead of the Button changing for everyone. In the dark theme the body took the lighter tone the header used to have (`--color-bg` is now `#13252f`, was `#0b1721`) and `--color-surface` and `--color-border` moved one step lighter so cards still stand out from the page; the `themeColor` in `layout.tsx` follows `--color-bg`. Team's reading, not Ben's words, for him to confirm: "swap" means the header takes the old dark-theme page colour (`#0b1721`) in both themes, and the dark theme's page takes the old header colour; in the light theme the page stays pale and only the header goes dark.

## Current state

The app is built: Next.js 16 (App Router, Cache Components, Turbopack), TypeScript, CSS Modules, SQLite through Drizzle (`DATABASE_URL`, a local file in development). The forecast engine and the club list sit under it, in `src/forecast/` and `src/clubs/`. The club list has 18 entries (Ben's 18 names, Belfast as one entry). The look is Drage's first look (see Theme), awaiting Ben: every colour is a semantic token in `src/app/globals.css`, with a light and a dark value.

**Routes**

- `/`: logged out, the log in (email, password, link to sign up); logged in, the home screen, the home club's week.
- `/signup`: email, password (12 or more characters) and a home club chosen from the list; signing up logs you in. Someone already logged in is sent to `/`.
- `/away`: the other clubs, alphabetical by the name shown, without the user's home club. `/away/[clubId]`: the same week screen for that club; an unknown id is a 404; the user's own home club goes to `/`.
- `/account`: email, home club (a select, validated on the server against the club list), Log out (which returns to `/`).
- Logged-out visits to `/away*` and `/account` go to `/`. Every logged-in screen has a header with the LX Tennis Weather link (the brand mark and the name, to `/`) and Account; the home screen has an Away Game button. If a stored home club id is no longer in the club list, the user is sent to `/account` to choose again.

**How it works**

- The week screen is `ClubWeather` (`src/components/club-weather.tsx`), used by both `/` and `/away/[clubId]`: an "Your home club" or "Away game" label, the club name as the h1 (Belfast also lists the five clubs it stands for), the Away Game button (home screen) or a link back to the list (away screen), then the credit ("Weather data by Open-Meteo.com (CC BY 4.0), including UK Met Office model data (CC BY-SA 4.0)", each licence name linked, Team convention 2), then the week. The credit sits above the week, not below it, so an open hour card can never cover it. The week (`club-week.tsx`, `day-strip.tsx`, `hour-cell.tsx`, `block-detail.tsx`, `source-table.tsx`) is seven day headings, each with a strip of one cell per hour showing the hour, the light as a shape and a word (Good, Passable, Unlikely, or Unknown), the chance of rain and the wind in mph, each in whole numbers on its own line (a dash where there is no data). The cell is a fixed size, never shows "n of 5", and has screen-reader text for both figures. A tap opens that hour's card: the light with its reason when unknown, temperature, chance of rain and wind in mph and km/h each with "n of 5 providers" when fewer than five contributed (rain and wind also show the light they give), and a native `<details>` "Expand source data" with the five providers' own figures (a gap says "no data"). A provider with nothing at all is named above the week. If the fetch fails, or all five providers are unavailable, the screen says the forecast can't be loaded right now and shows no numbers. Until the forecast arrives the week is grey placeholder cells of the same height (`components/loading.tsx`). The hour cells are native `<details name="hour">`, so they work before JavaScript has loaded and opening one closes the last.
- `fetchHourlyForecast` makes one Open-Meteo call per club for the five providers; `src/weather/forecast-cache.ts` caches that fetched forecast per club (`"use cache"`, never served past an hour; Belfast's five clubs share its one entry). A failed fetch is not cached. `buildWeek` runs per request with the current time, so finished blocks drop out even from a cached forecast.
- `buildWeek` turns the forecast into seven UK days (today plus six) of 10:00-22:00 hour blocks (blocks starting 10:00 to 21:00), each with the aggregate temperature, rain chance and wind (Team convention 3), how many providers each is built from, every provider's own value, the rain light, the wind light and the block's light (the worse of the two; unknown unless both are known or one is red). Which hourly values feed a block is explained in `blocks.ts`. A provider with no value is a gap (`null`), never filled; a block with no data is still returned with `null` figures and a `null` light.
- Nothing is rounded in the engine; the screen rounds at display (whole % and mph and km/h, one decimal for °C), and the lights follow the whole numbers. A provider that doesn't reach that far ahead is a `null` in a block's per-provider values, which looks the same as an outage; only a provider with nothing at all is in `unavailable`. If all five are unavailable the fetch still returns normally, so the screen checks for that as well as for `ForecastFetchError`.
- There is no day icon (Ben's decision, Core flow 7).
- Two tables: `user` (email, password hash, home club id, created at) and `login_attempt` (the limiter's counters, keyed by a hash, so no email or address is stored). The home club id is a text column checked against `CLUBS` in code at every write, not a foreign key.
- **Not built:** password reset, email verification, password change. Without email verification, a refused sign-up can still be read as "that email has an account"; the limiter slows probing but doesn't stop it.

**Run it:** see the README (`npm install`, copy `.env.example` to `.env.local` and set `SESSION_SECRET`, `npm run db:migrate`, `npm run dev`). `npm run forecast -- <club id>` (or `<latitude> <longitude>`) prints the week live; `npm test` runs the tests.

## Open questions (Ben hasn't answered; don't decide these)

- **Confirm the wind speeds.** Ben can't remember what speed feels too much. The team's pick is yellow from 10 mph and red over 15 mph (Team convention 4); Ben says if that doesn't match how it feels on court.
- **Sign-up details.** Ben hasn't said how sign-up should work. The team built email address and password (as on LX Tennis) so there is something to log in with; he hasn't confirmed it. There is no email verification, so anyone can sign up with any address. The home club is picked at sign-up and changed on the Account page (Ben's decision, Core flow 5).
- **What "the rest" means.** Ben listed temperature, wind and rain "etc". Other figures (humidity, gusts, sunrise and sunset, court-drying time) are not decided. Gusts matter for tennis, so they are the likeliest addition.
- **Met Office data licence (ShareAlike).** Open-Meteo lists the Met Office data as CC BY-SA 4.0, and its Met Office page says any derived products "should also be redistributed under the same or a compatible licence". Our blended figures arguably count as a derived product, so the figures we show may need to be offered under CC BY-SA 4.0 too. That is the team's reading of the licence, not legal advice, and untested. Options: keep the Met Office source and say so (the site credit does this now); drop it (the other four sources have no ShareAlike; the backtest in Team convention 3 found this costs almost nothing at 2 to 6 days and a little at 1 day, so it is no longer a big loss); or read the Met Office's own data licence. Not decided.
- **The look.** LX Tennis's synthwave theme is Ben's decision for that site only. This site's first look is Drage's proposal (see Theme), a calm sky-blue light and night-blue dark theme with a week of one-hour cells; Ben has reacted only to the header and the mark so far (see Theme, Ben's decision), so the rest is not a decision. Ben also asked (11 Oct 2026): "Is there no way to keep this consistent with the LX purple/pink colour scheme?" That is a question, not a decision: adopting the synthwave scheme here would be a theme change for Ben to confirm, and nothing is built. What Ben could react to: the colours; the strip of twelve small cells per day (and the card that opens on a tap) against a plain list; whether he wants a dark theme at all (the header is dark in both); and the wording of the lights.

## Proposals awaiting Ben (not decided)

None at the moment.

## Priority and roadmap order (Ben's decision)

Not set. Ben's current order of projects is in the LX Tennis vision; this project hasn't been placed in it.

## How to change this doc

- **When Ben decides something, update this doc in the same change as the code, or on its own if there's no code change.** Move the item out of Open questions or Proposals into the section it belongs to, and delete it from where it was, so every fact lives in exactly one place.
- **Proposals only become decisions when Ben says so.** Anyone can add a new open question or proposal, clearly labelled.
- **Team conventions change through team review**, in the same change as the code that follows the new convention.
- **Keep Current state true.** When something ships, update it in the same change.
- **Keep it short and plain.** Rules and reasons, not issue lists or task backlogs.
