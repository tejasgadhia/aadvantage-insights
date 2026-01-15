# AAdvantage Insights - Project Instructions

## Overview
**Purpose**: Retrospective analytics tool for 15+ years of American Airlines AAdvantage data  
**Platform**: Static web app on GitHub Pages  
**Architecture**: Vanilla JavaScript (no build process)  
**Status**: Phase 3 Complete (Visualizations)

---

## Tech Stack (Actual)

| Technology | Purpose | CDN/Source |
|------------|---------|------------|
| Vanilla JS | Core logic, no framework | - |
| Tailwind CSS | Styling (dark mode) | cdn.tailwindcss.com |
| Chart.js 4.x | Bar/doughnut charts | cdn.jsdelivr.net |
| Leaflet 1.9 | Interactive maps | unpkg.com |
| CartoDB Tiles | Dark map theme | basemaps.cartocdn.com |

**Why no React?** Simpler for a solo project, no build step, faster iteration, works offline immediately.

---

## Project Structure

```
aadvantage-insights/
├── index.html              # Main dashboard (dark mode)
├── README.md
│
├── js/
│   ├── app.js              # Core: parsers, normalizers, UI rendering
│   ├── stats.js            # Phase 1: lifetime, annual, route stats
│   ├── stats-extended.js   # Phase 1: time patterns, loyalty, lounge
│   ├── stats-phase2.js     # Phase 2: status history, MM progress, eras
│   ├── parser.js           # (legacy, merged into app.js)
│   └── normalizer.js       # (legacy, merged into app.js)
│
├── js/data/
│   ├── airports-full.json  # 6,072 airports from OpenFlights
│   ├── airports.js         # Subset for quick loading
│   └── fareClasses.js      # Fare class → cabin mapping
│
├── css/
│   └── style.css           # Custom styles (minimal, Tailwind handles most)
│
├── docs/                   # Documentation
│   ├── PROJECT_PLAN.md     # Detailed roadmap with phase checklists
│   ├── PROJECT_INSTRUCTIONS.md  # This file
│   └── Flighty_Design_Research.md  # Design inspiration
│
├── dev/                    # Development & test files
│   ├── index-light.html    # Original light theme version
│   ├── test.html           # Phase 1 test console
│   └── test-phase2.html    # Phase 2 statistics test
│
└── source-data/            # User's AA data files (gitignored)
    ├── Flight_Records_*.json
    ├── AAdvantage_Account_Activity_*.json
    ├── AAdvantage_Account_Profile_*.json
    └── Admirals_Club_*.json
```

---

## Data Flow

```
User uploads JSON files
        ↓
detectFileType() → identifies which AA file
        ↓
parseFlightRecords() / parseAccountActivity() / etc.
        ↓
loadAirportsForCodes() → fetch only needed airports
        ↓
mergeFlightData() → dedupe PNR + Activity records
        ↓
calculateStats() → generate all statistics
        ↓
renderDashboard() → populate UI elements
```

---

## Key Data Structures

### Unified Flight Object
```javascript
{
  departureDate: "2024-03-15",
  departureTime: "0830",
  origin: "AUS",
  destination: "DFW",
  originCity: "Austin",
  destinationCity: "Dallas",
  originCountry: "United States",
  destinationCountry: "United States",
  marketingFlight: "AA1234",
  operatingFlight: "AA1234",
  bookingClass: "Y",
  cabinBooked: "Y",
  cabinFlown: "C",           // Upgraded!
  upgraded: true,
  distanceMiles: 190,
  estimatedDurationHours: 0.9,
  international: false,
  pnr: "ABCDEF",
  eqm: 500,
  eqs: 1,
  eqd: 150.00,
  baseMiles: 500,
  bonusMiles: 375
}
```

### Statistics Object (allStats)
```javascript
{
  lifetime: { totalFlights, totalDistance, uniqueAirports, ... },
  annual: { "2024": { flights, distance, eqm, ... }, ... },
  monthly: [45, 38, 52, ...],  // Jan-Dec totals
  topRoutes: [{ route: "AUS-DFW", count: 89 }, ...],
  statusHistory: { "2024": { status: "Executive Platinum", eqm: 125000 }, ... },
  millionMiler: { level: 1, total: 1234567, progress: 234567 },
  swu: { earned: 8, used: 6, expired: 0, available: 2 },
  lounge: { total: 45, topLounges: [...], flagshipVisits: 12 },
  eras: [{ startYear: "2011", endYear: "2015", volume: "moderate" }, ...],
  profile: { firstName, statusTier, millionMilerLevel, ... },
  years: ["2011", "2012", ..., "2026"]
}
```

---

## Design System

### Colors
```javascript
colors: {
  aa: {
    red: '#C8102E',      // AA brand red
    blue: '#0078D2',     // AA brand blue
    navy: '#00263A',     // Dark accent
    gold: '#D4AF37',     // Gold status
    platinum: '#E5E4E2', // Platinum status
    executive: '#8B5CF6' // Executive Platinum (purple)
  },
  dark: {
    900: '#0a0a0f',      // Background
    800: '#111118',      // Card background
    700: '#1a1a24',      // Elevated surface
    600: '#252532',      // Borders
    500: '#32324a'       // Muted elements
  }
}
```

### Card Styles
- `.glass-card` - Primary cards with blur effect
- `.glass-card-light` - Secondary/nested cards
- `.stat-card` - Hover-enabled stat displays

### Status Tier Styling
```javascript
const statusColors = {
  'Executive Platinum': 'bg-aa-executive',  // Purple
  'Platinum Pro': 'bg-blue-400',
  'Platinum': 'bg-gray-400',
  'Gold': 'bg-aa-gold',
  'Member': 'bg-gray-600'
};
```

---

## Phase Completion Status

### Phase 1: Data Foundation ✅
- [x] JSON file parsing (all 4 file types)
- [x] Flight data merging & deduplication
- [x] Airport lookup (6,072 airports, on-demand loading)
- [x] Distance calculation (Haversine formula)
- [x] Duration estimation
- [x] Upgrade detection (economy booking → premium cabin)

### Phase 2: Statistics Engine ✅
- [x] Lifetime totals
- [x] Annual breakdowns
- [x] Route analysis (top routes, hubs)
- [x] Status tier inference by year
- [x] Million Miler progress tracking
- [x] Year-over-year comparisons
- [x] Seasonal pattern detection
- [x] Travel eras detection
- [x] Lounge ROI calculation
- [x] JSON/CSV export

### Phase 3: Visualizations ✅
- [x] Dark mode dashboard
- [x] Glass-morphism design
- [x] Interactive route map
- [x] Flights by year chart
- [x] Top routes visualization
- [x] Cabin distribution doughnut
- [x] Monthly pattern chart
- [x] Million Miler progress bar
- [x] Status timeline
- [x] Year cards
- [x] Travel eras timeline
- [x] Lounge report
- [x] Milestones & fun facts

### Phase 4: AI Narratives (TODO)
- [ ] Travel era storytelling
- [ ] Personalized insights
- [ ] Pattern detection narratives
- [ ] Milestone celebrations

### Phase 5: Polish & Export (TODO)
- [ ] Social sharing cards (Spotify Wrapped style)
- [ ] PDF report generation
- [ ] Screenshot-friendly views

---

## Common Tasks

### Add a new statistic
1. Calculate in `calculateStats()` in dashboard.html (or stats-phase2.js)
2. Add to the stats object structure
3. Create UI element in HTML
4. Populate in `renderDashboard()` or specific render function

### Add a new chart
1. Add `<canvas id="new-chart">` to HTML
2. Create render function: `renderNewChart()`
3. Call from `renderDashboard()`
4. Store chart instance in `charts.newChart` for cleanup

### Add support for new AA data
1. Add detection in `detectFileType()`
2. Create parser function `parseNewData()`
3. Store in `loadedFiles.new_type`
4. Integrate in `processData()`

---

## Deployment

GitHub Pages auto-deploys from `main` branch.

```bash
git add .
git commit -m "Description"
git push origin main
```

Live at: https://tejasgadhia.github.io/aadvantage-insights/

---

## Files to Never Commit
- `source-data/*.json` - User's personal flight data
- `.DS_Store` - macOS metadata

These are in `.gitignore`.

---

## Reference Links
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Chart.js](https://www.chartjs.org/docs)
- [Leaflet](https://leafletjs.com/reference.html)
- [OpenFlights Data](https://openflights.org/data.html)
- [AA Privacy Portal](https://www.aa.com/privacy)
