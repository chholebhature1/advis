# Insight Data Stack Playbook (Free and Low-Cost)

## Goal
Build an Insights page that feels live and useful without copying another broker's proprietary market page or violating data licensing rules.

## What you can safely do
- Use your own API routes that fetch from sources with clear terms.
- Prefer macro and sentiment signals that are open/free for display.
- Use delayed or fallback market snapshots when a source blocks requests.
- Show derived guidance (signals, trends, confidence bands) instead of raw mirrored tables.

## What to avoid
- Do not scrape and republish another broker app's live dashboard data.
- Do not assume public web visibility means data is free to redistribute.
- Do not brand copied widgets/tables as your own live feed.

## Recommended source mix

### Tier A: Free and stable (default)
1. Alternative.me Fear and Greed
- Use case: risk sentiment meter
- Refresh: every 5-10 minutes
- Page role: sentiment card and trend sparkline

2. Frankfurter USD/INR
- Use case: INR context and currency drift
- Refresh: every 10-15 minutes
- Page role: FX trend card and volatility cue

3. Yahoo Finance public quote/chart endpoints (best effort)
- Use case: NIFTY/SENSEX/BANKNIFTY snapshot + trend
- Refresh: 1-5 minutes for quote snapshot, 15-30 minutes for chart history
- Caveat: unofficial endpoint behavior can change

### Tier B: Low-cost paid upgrade path (when needed)
1. Official or licensed Indian market feed vendor
- Use case: strict real-time reliability and legal clarity
- Trigger: once your insight page has meaningful traffic and SLAs

2. News sentiment provider (optional)
- Use case: richer market context and event weighting
- Trigger: when you want higher-quality narrative signals

## Existing Pravix implementation status
The project already has a good base:
- src/app/api/market/homepage/route.ts
  - Fear and Greed + USD/INR with fallback and cache
- src/app/api/market/indices/route.ts
  - NIFTY50, BANKNIFTY, SENSEX snapshot with fallback and cache
- src/app/api/market/indices/history/route.ts
  - NIFTY history by horizon with fallback and cache

## Data policy for your Insights page
Use this display policy in UI labels:
- Live: data fetched successfully from configured provider
- Delayed: last successful value reused from cache beyond normal window
- Fallback: deterministic backup values currently shown

Recommended badge examples:
- Source: Live Yahoo Snapshot
- Source: Fallback Synthetic Series
- Last updated: 16-Apr-26 13:19 IST

## Suggested Insights page modules
1. Market Pulse
- NIFTY50, SENSEX, BANKNIFTY cards
- Trend arrows, absolute and percent change
- Source and timestamp badge

2. Risk Sentiment
- Fear and Greed score and 7-8 point trend
- Label bands: Fear, Neutral, Greed

3. INR Context
- USD/INR trend with rolling average
- Note whether INR pressure is rising/falling

4. Action Layer (derived)
- Plain-language guidance generated from your own rules:
  - Example: sentiment weak + index down + INR rising = "Reduce impulse trades, review allocation drift"
- This is your defensible value, not raw copied data

## Reliability architecture
1. Server-side fetch only
- Keep provider calls in Next.js route handlers
- Do not call upstream providers directly from client

2. Multi-level fallback
- L1: live provider
- L2: stale cache (if within tolerated max age)
- L3: deterministic fallback seed data

3. Cache policy
- Quote snapshots: 60 seconds cache + stale-while-revalidate
- Trend history: 5-30 minutes cache
- Sentiment/FX: 5-15 minutes cache

4. Source observability
- Return source status in every response payload
- Log failures with route + provider + status code

## Compliance checklist before launch
1. Add a footer disclaimer on insight modules:
- "Market data shown for informational and educational use. Not investment advice."

2. Add source attribution in small text:
- Example: "Sentiment: Alternative.me, FX: Frankfurter, Indices: Yahoo public endpoints"

3. Keep legal review for production launch:
- Especially if you add exchange-level intraday or full market breadth replication

## When to move to paid data
Move when any of the following is true:
- You need guaranteed real-time SLAs
- You need wide market breadth and depth data
- You need compliance certainty for commercial redistribution
- Free endpoint stability becomes a recurring issue

## 14-day execution plan
Day 1-2
- Finalize source policy and module list
- Add source badges and timestamp UX to Insights cards

Day 3-5
- Wire Insights page only to your own market routes
- Add explicit Live/Delayed/Fallback states in UI

Day 6-8
- Add derived action rules and confidence text
- Add instrumentation and route-level error logs

Day 9-11
- Add stronger stale-cache behavior and graceful degradation
- Add synthetic fallback tests

Day 12-14
- Run legal/compliance review of data display and attribution
- Freeze v1 and prepare paid-feed migration checklist

## Decision summary
Yes, you can build a useful Insights page at near-zero cost now, but do it through your own curated route layer, clear source labels, and derived guidance. Do not clone or republish another broker's live market dashboard data.
