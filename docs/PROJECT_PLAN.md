# AAdvantage Insights — Project Plan

## Project Overview

A retrospective analytics tool for 15 years of American Airlines AAdvantage data. Unlike flight tracking apps (Flighty, TripIt) that focus on future travel, this tool looks backward — telling the story of where you've been, how your travel patterns evolved, and what your loyalty data reveals.

**Design inspiration**: Flighty's Passport feature, Spotify Wrapped, Apple's year-in-review style
**Data source**: American Airlines data export (4 JSON files)
**Time span**: 2011–2026 (complete history)

---

## Data Sources

| File | Contents | Key Fields |
|------|----------|------------|
| `AAdvantage_Account_Activity` | Flight activity, miles earned, credit card activity, SWU certificates, partner earning | Departure/arrival airports, dates, fare classes, base/bonus miles, EQMs/EQDs/EQSs |
| `AAdvantage_Account_Profile` | Member profile, status, companions, credit cards, preferences | Executive Platinum status, home airport (AUS), seat preference (window), companion list |
| `Admirals_Club` | Lounge membership, visit history, transactions | Visit timestamps, locations, lounge types (Admirals/Flagship), dining eligibility |
| `Flight_Records` | Complete PNR/reservation history with itineraries | Full itineraries, seat assignments, fare classes, cabin codes, operating vs marketing carriers |

**Data quality notes**:
- Flight Activity and Flight Records have overlapping flight data — will need deduplication
- Some partner flights (BA, AS) have limited detail
- Historical addresses show moves over time (could inform "travel eras" feature)

---

## Phase 1: Data Foundation ✅ COMPLETE

**Goal**: Clean, normalize, and structure raw AA data into usable formats

### Tasks

1. **Parse JSON files** ✅
   - Load all 4 files into browser via drag-and-drop
   - Flatten nested arrays (flights, activities, reservations)
   - Handle date/time parsing consistently

2. **Build unified flight ledger** ✅
   - Merge Flight Activity + Flight Records (dedupe by date + route)
   - Preserve unique fields from each source (`source` field tracks origin)
   - Flag data quality for each record (`dataQuality`: full, pnr_only, partial)

3. **Create lookup tables** ✅
   - Airports: on-demand loading from OpenFlights database (6,072 IATA airports)
   - Fare classes: booking code → cabin mapping (F/C/W/Y)
   - *Deferred*: Airlines lookup, aircraft types

4. **Calculate derived fields** ✅
   - Flight distance via Haversine formula
   - Estimated duration from distance
   - Domestic vs international flag
   - Connection detection (flights within 36hrs at same intermediate airport)
   - Upgrade detection (economy booking class + premium cabin flown)

5. **Normalize miles data** ✅
   - Flight miles separated from partner/credit card miles
   - EQM/EQD/EQS tracking per flight
   - SWU certificate tracking (earned/used/expired/available)

### Third-Party Data

| Data | Source | Status |
|------|--------|--------|
| Airport coordinates | OpenFlights via GitHub | ✅ 6,072 airports with lat/lon/timezone |
| Flight distances | Haversine calculation | ✅ Implemented |
| Fare class mapping | Manual reference | ✅ Implemented |

### Output
All data stays in-browser (privacy-first). Accessible via `window.aadvantageData`:
- `flights` — unified flight ledger array
- `loungeVisits` — normalized lounge data
- `stats` — calculated statistics object
- `connections` — detected multi-segment trips
- `airportCheck` — airport coverage report

---

## Phase 2: Core Statistics Engine

**Goal**: Generate the numbers that power visualizations and narratives

### Statistics to Calculate

#### Lifetime Totals
- Total flights
- Total miles flown (calculated from distances)
- Total award miles earned (from AA data)
- Unique airports visited
- Unique countries visited
- Unique airlines flown
- Total segments
- Estimated hours in air

#### Annual Breakdowns
- Flights per year
- Miles per year (flown + earned)
- Status qualification by year (EQMs, EQDs, EQSs)
- Year-over-year comparisons

#### Route Analysis
- Top 20 city pairs by frequency
- Hub distribution (% through DFW, ORD, LAX, etc.)
- International vs domestic ratio
- Average flight distance
- Longest/shortest routes flown
- Most frequent single route

#### Loyalty & Status
- Status tier history by year
- Million Miler progress (currently at 1MM)
- SWU certificates: earned, used, expired, available
- Upgrade success rate (fare class vs cabin code comparison)
- Miles earning sources breakdown (flying vs cards vs partners)
- Miles expiration tracking

#### Time Patterns
- Busiest travel months
- Day-of-week distribution
- Booking lead time (reservation create date vs departure)
- Seasonal patterns
- Travel frequency trends over 15 years

#### Lounge Analytics
- Total lounge visits
- Visits by location (airport + specific club)
- Flagship vs Admirals Club ratio
- Dining eligibility vs usage rate
- Membership ROI (annual fee vs visit frequency)

#### Partner & Companion Analysis
- Flights by operating carrier (AA vs BA vs AS vs others)
- Alliance partner usage (oneworld)
- Companion frequency (from stored companions, if detectable in PNRs)

### Output
- `stats.json` — all calculated statistics
- Stats organized by category for easy consumption
- Include metadata (calculation date, data range, record counts)

---

## Phase 3: Visualizations & Reports
*COMPLETE ✅*

### Completed Components

1. **The Passport** (overview dashboard) ✅
   - Lifetime stats at a glance
   - Year selector for year-by-year view
   - Key milestones highlighted
   - Dark mode aviation aesthetic

2. **Route Map** ✅
   - Interactive dark-themed map (Leaflet + CartoDB tiles)
   - Routes with frequency-weighted line thickness
   - Airport markers with visit counts
   - Popup details on hover

3. **Loyalty Timeline** ✅
   - Status tier progression over years
   - Million Miler progress bar with level tracking
   - SWU certificate tracker

4. **The Retrospective** ✅
   - Year-by-year cards with key stats
   - Color-coded by status tier
   - EQM, flights, distance per year

5. **Travel Eras** ✅
   - Auto-detected pattern shifts
   - Visual timeline of travel phases

6. **Lounge Report** ✅
   - Visit counts by airport
   - Estimated value calculator
   - Flagship access tracking

### Design Implementation
- Dark mode first, aviation-inspired aesthetic ✅
- Progressive disclosure (summary → detail) ✅
- Functional color coding (status tiers) ✅
- Glass-morphism cards with blur effects ✅
- Smooth animations and transitions ✅
- Responsive grid layouts ✅
- Chart.js visualizations ✅

---

## Phase 4: Insights & Narratives
*V2 — after Phase 3 complete*

### AI-Powered Story Generation
- Detect "travel eras" from pattern changes
- Generate natural language summaries
- Personalized insights ("You fly to India every November")
- Milestone celebrations with context
- "What if" scenarios (miles optimization)

### Complexity Note
AI-powered narratives add significant complexity. Consider:
- Local LLM vs API (Claude/GPT)
- Pre-computed vs on-demand generation
- Template-based vs fully generative

---

## Phase 5: Polish & Export
*V2 — after core features stable*

### Output Formats

1. **Web App** (primary)
   - React-based interactive dashboard
   - Responsive design
   - Shareable URLs

2. **Social Media Images**
   - Instagram/X optimized dimensions
   - Key stats in shareable format
   - Spotify Wrapped-style cards
   - One-tap export

3. **Data Export**
   - CSV download of flight history
   - JSON export for nerds
   - PDF report (lower priority)

---

## V1 Scope

**Focus**: Phase 1 + Phase 2 only

### V1 Deliverables
- [x] Cleaned, normalized flight data
- [x] Lookup tables (airports, fare classes)
- [x] Derived calculations (distances, durations, connections)
- [x] Complete statistics engine (Phase 2 - COMPLETE)
- [x] Basic validation via test console
- [x] Test UI with JSON visualization
- [x] JSON/CSV export functionality

### Phase 2 Statistics Implemented
- [x] Status tier history inference by year
- [x] Million Miler progress tracking with milestones
- [x] Year-over-year comparisons
- [x] Seasonal pattern detection
- [x] Travel eras detection (pattern changes)
- [x] Connection/layover analysis  
- [x] Miles earning efficiency analysis
- [x] Lounge membership ROI calculator
- [x] Booking lead time analysis

### V1 Non-Goals
- No production UI yet (test console only)
- No AI narratives

### Success Criteria
- [x] All flights deduplicated and normalized
- [x] Distance calculations implemented (Haversine)
- [x] Stats cover all categories listed in Phase 2
- [x] Data structure supports future visualization needs

---

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | Vanilla JavaScript | No build step, runs entirely in browser, simpler for solo dev |
| Static data | On-demand JSON fetch | Load only airports user needs (~100 vs 6,000) |
| Distance calculation | Haversine formula | Standard, accurate enough for analytics |
| Data storage | In-memory only | Privacy-first, nothing leaves browser |
| UI Framework | Tailwind CSS (CDN) | Fast styling, no build step |
| Charts | Chart.js + Leaflet | CDN-loaded, no dependencies |

---

## File Structure (Actual)

```
aadvantage-insights/
├── js/
│   ├── app.js                  # Main application (parsers, stats, UI)
│   └── data/
│       ├── airports-full.json  # OpenFlights database (6,072 airports)
│       └── airports-full.js    # JS module version (optional)
├── css/
│   └── style.css               # Custom styles
├── source-data/                # User's AA export files (gitignored)
│   ├── AAdvantage_Account_Activity_*.json
│   ├── AAdvantage_Account_Profile_*.json
│   ├── Admirals_Club_*.json
│   └── Flight_Records_*.json
├── index.html                  # Main app
├── test.html                   # Dev/test console with JSON viewer
├── PROJECT_PLAN.md             # This file
└── Flighty_Research.md         # Design inspiration
```

---

## Open Items

- [x] ~~Verify airport lookup data covers all airports~~ → On-demand loading from 6,072 airport database
- [x] ~~Fare class → cabin mapping~~ → Implemented in `FARE_CLASSES` and `ECONOMY_CLASSES`
- [ ] Codeshare handling (marketing vs operating carrier)
- [ ] Partner flight distance calculations
- [ ] Airlines lookup table (code → name, alliance)

---

## Changelog

| Date | Update |
|------|--------|
| 2026-01-15 | Initial plan created |
| 2026-01-15 | Phase 1 complete: parsers, flight merging, connection detection, on-demand airport loading from OpenFlights (6,072 airports), test UI with progress bars and renderjson viewer |
| 2026-01-15 | Phase 2 complete: Full statistics engine with status history, Million Miler tracking, YoY comparisons, seasonal patterns, travel eras detection, connection analysis, miles efficiency, lounge ROI, booking patterns, JSON/CSV export |
| 2026-01-15 | Phase 3 complete: Production dashboard with dark mode aviation aesthetic, interactive route map, loyalty timeline, year-by-year cards, travel eras visualization, lounge report, Chart.js graphs, glass-morphism design |
