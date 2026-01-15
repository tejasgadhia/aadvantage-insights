# AAdvantage Insights ✈️

> **🚧 Work in Progress** - This project is under active development

A retrospective analytics tool for 15+ years of American Airlines AAdvantage data. Unlike flight tracking apps that focus on future travel, this tool looks backward — telling the story of where you've been, how your travel patterns evolved, and what your loyalty data reveals.

**Design inspiration**: Flighty's Passport feature, Spotify Wrapped, Apple's year-in-review style

![Dashboard Preview](assets/preview.png)

## ✨ Features

### The Passport (Overview Dashboard)
- Lifetime stats: flights, miles, airports, countries
- Year selector for historical views
- Status tier and Million Miler tracking

### Route Map
- Interactive dark-themed map
- Frequency-weighted route lines
- Airport markers with visit counts

### Loyalty Timeline
- Status progression visualization (Gold → EP)
- Million Miler progress bar
- SWU certificate tracking

### Year-by-Year Retrospective
- Cards for each year with key metrics
- Color-coded by status tier achieved
- Travel era detection

### Lounge Report
- Visit statistics by airport
- Estimated membership value
- Flagship lounge tracking

## 🚀 Quick Start

1. **Get your data** from [American Airlines Privacy Portal](https://www.aa.com/privacy)
2. **Open the app**: https://tejasgadhia.github.io/aadvantage-insights/dashboard.html
3. **Upload your files**:
   - `Flight_Records_*.json`
   - `AAdvantage_Account_Activity_*.json`
   - `AAdvantage_Account_Profile_*.json`
   - `Admirals_Club_*.json`
4. **Explore** your flight history!

## 🔒 Privacy

**Your data never leaves your browser.** All processing happens 100% client-side. No servers, no tracking, no data collection. The app works completely offline after initial load.

## 🛠 Tech Stack

- **Vanilla JavaScript** - No build process, just open in browser
- **Tailwind CSS** (CDN) - Dark mode, glass-morphism design
- **Chart.js** - Bar charts, doughnut charts
- **Leaflet + CartoDB** - Dark-themed interactive maps
- **6,000+ airports** - OpenFlights database for coordinates

## 📁 Project Structure

```
aadvantage-insights/
├── dashboard.html      # Main dashboard (Phase 3)
├── index.html          # Original light-theme version
├── js/
│   ├── app.js          # Core parsing & normalization
│   ├── stats.js        # Phase 1 statistics
│   ├── stats-extended.js
│   └── stats-phase2.js # Enhanced analytics
├── js/data/
│   └── airports-full.json  # Airport database
└── source-data/        # Your AA data files (gitignored)
```

## 🗺 Roadmap

- [x] **Phase 1**: Data parsing & normalization
- [x] **Phase 2**: Statistics engine
- [x] **Phase 3**: Visualizations & dashboard
- [ ] **Phase 4**: AI-powered insights & narratives
- [ ] **Phase 5**: Shareable social cards & export

## 🧑‍💻 Local Development

```bash
# Clone the repo
git clone https://github.com/tejasgadhia/aadvantage-insights.git

# Open in browser (no build needed!)
open dashboard.html
```

## 📄 License

MIT

## ⚠️ Disclaimer

This project is not affiliated with American Airlines. AAdvantage® and American Airlines® are trademarks of American Airlines, Inc.
