# AAdvantage Insights - Project Instructions

## Overview
**Purpose**: Analyze American Airlines customer data from privacy requests. Visualize flight history for frequent flyers.  
**Platform**: Static web app on GitHub Pages  
**Developer**: Solo PM, no coding background  

## Tech Stack
- React 18 + Vite
- Tailwind CSS (AA branding: #0078D2 blue, #C8102E red)
- Recharts + D3.js for charts
- Mapbox GL JS / Leaflet for maps
- PapaParse for CSV parsing
- Client-side only (no backend)

## Project Structure
```
aadvantage-insights/
├── src/
│   ├── components/
│   │   ├── FileUpload.jsx
│   │   ├── Dashboard.jsx
│   │   ├── PrivacyDisclosure.jsx
│   │   └── visualizations/
│   ├── utils/
│   ├── hooks/
│   └── App.jsx
├── public/
├── .github/workflows/deploy.yml
└── package.json
```

## Design
- AA brand colors with playful clouds/planes
- Mobile-responsive, desktop-optimized
- Boarding pass-style cards
- Clean, minimal interface

## Privacy
- All processing in browser
- No data sent to servers
- Warning labels on PII fields
- Prominent "data never leaves browser" disclosure
- Optional localStorage (requires consent)

## Data Handling
- Drag-and-drop + file picker upload
- Parse CSV/JSON files
- URL state: `?view=dashboard&date=2020-2025&chart=flights,spending`
- Export config as JSON
- Sanitize data for screenshots

## Phase 1 MVP
- File upload interface
- Data parsing
- Privacy disclosure
- Raw data table with filters
- Basic charts: flights over time, routes, spending, simple map
- URL state management
- GitHub Pages deployment

## Phase 2
- Advanced visualizations (interactive map, status progression, airport heatmap)
- Traveler comparisons (anonymized aggregates)
- Social sharing (sanitized stats)
- Dark mode

## Coding Standards
- Functional components with hooks
- Destructure props
- Keep components under 200 lines
- PascalCase for components, camelCase for utils
- Tailwind utilities (no @apply)

## Testing
- Manual testing in Chrome, Firefox, Safari, Edge
- React DevTools
- Verify no external API calls
- Lighthouse for performance

## GitHub
- Repo: `aadvantage-insights`
- Auto-deploy with GitHub Actions on push to main
- Public repository

## Project Location
`/Users/tejasgadhia/Claude/aadvantage-insights`

## Next Steps
1. Upload AA data files to project knowledge
2. Analyze data structure
3. Initialize repo with Vite + React + Tailwind
4. Build file upload UI
5. Create data parser
6. Design visualizations
7. Deploy to GitHub Pages

## Reference
- React: https://react.dev
- Vite: https://vitejs.dev
- Tailwind: https://tailwindcss.com
- Recharts: https://recharts.org

---
**Status**: Planning Phase  
**Next**: Upload AA data files for analysis