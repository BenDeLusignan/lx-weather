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
- **Each user logs in and has a home club.** The app opens on their home club.
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

This is the list of places "where we might be playing". Names are as Ben wrote them.

## Product rules

### Ben's decisions

1. **The headline is the aggregate; the providers are the detail.** The default view never makes the user read five forecasts. The five are available under "expand source data" (Core flow, 4).
2. **Never invent weather.** If a provider has no data or can't be reached, say so and show what the others say. No placeholder or sample numbers dressed up as a forecast. If nothing can be shown, show an honest empty state.

### Team conventions

1. **Every figure shows how many providers it's built from** (e.g. "4 of 5 providers") when fewer than five contributed, so an aggregate from two sources is never mistaken for one from five.

## Current state

Nothing is built yet. This repo holds the vision, a README and a `.gitignore`. There is no code, no stack and no data yet.

## Open questions (Ben hasn't answered; don't decide these)

- **Which five providers.** Ben named Apple Weather, Met Office and BBC Weather as examples and said "etc". The other two, and whether each has a usable way to get its data (some providers have no public data feed), are not checked.
- **What makes a day green, yellow or red.** The thresholds for rain and wind (and whether temperature counts) are not set. Also open: whether the icon is per day, per hour, or for the part of the day players use (and which hours those are).
- **How the five forecasts are combined.** A plain average, a median, or a weighted one (and, for rain, chance versus amount), and what is shown when providers strongly disagree.
- **Who the users are, and how they log in.** The accounts, and how each user's home club is set (chosen by the user, or set by Ben), are not decided. So is whether they share accounts with LX Tennis.
- **Club locations.** Where each club's courts are, for the forecast lookup, is not recorded yet. Belfast has more than one club; which one is meant is not stated.
- **What "the rest" means.** Ben listed temperature, wind and rain "etc". Other figures (humidity, gusts, sunrise and sunset, court-drying time) are not decided.
- **Units.** Celsius or Fahrenheit; mph, km/h or knots (Northern Ireland usually uses mph and °C, not confirmed).
- **Hosting and the stack.** Not decided. The other LX projects use Next.js, TypeScript and Vercel; nothing here depends on that yet.

## Proposals awaiting Ben (not decided)

- **Follow the LX Tennis stack and theme** (Next.js App Router + TypeScript, CSS Modules, mobile-first) so the two projects feel like one family. Not decided: LX Tennis's synthwave theme is Ben's decision for that site only, and this site's look hasn't been chosen.
- **Forecasts fetched on the server and cached**, so provider keys stay private and the five providers aren't called on every page view.

## Priority and roadmap order (Ben's decision)

Not set. Ben's current order of projects is in the LX Tennis vision; this project hasn't been placed in it.

## How to change this doc

- **When Ben decides something, update this doc in the same change as the code, or on its own if there's no code change.** Move the item out of Open questions or Proposals into the section it belongs to, and delete it from where it was, so every fact lives in exactly one place.
- **Proposals only become decisions when Ben says so.** Anyone can add a new open question or proposal, clearly labelled.
- **Team conventions change through team review**, in the same change as the code that follows the new convention.
- **Keep Current state true.** When something ships, update it in the same change.
- **Keep it short and plain.** Rules and reasons, not issue lists or task backlogs.
