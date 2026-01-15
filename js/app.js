/**
 * AAdvantage Insights - Main Application
 * Self-contained flight history analyzer
 */

// ============================================================================
// DATA: Airports (loaded on-demand from airports-full.json)
// ============================================================================
let AIRPORTS = {};
let AIRPORTS_FULL = null; // Cached full dataset after first load

async function loadAirportsData() {
  if (AIRPORTS_FULL) return AIRPORTS_FULL;
  
  try {
    const response = await fetch('js/data/airports-full.json');
    AIRPORTS_FULL = await response.json();
    console.log(`Loaded ${Object.keys(AIRPORTS_FULL).length} airports from database`);
    return AIRPORTS_FULL;
  } catch (err) {
    console.error('Failed to load airports database:', err);
    return {};
  }
}

async function loadAirportsForCodes(codes) {
  const airportData = await loadAirportsData();
  const loaded = [];
  const missing = [];
  
  for (const code of codes) {
    const upperCode = (code || '').trim().toUpperCase();
    if (!upperCode) continue;
    
    if (airportData[upperCode]) {
      AIRPORTS[upperCode] = airportData[upperCode];
      loaded.push(upperCode);
    } else {
      missing.push(upperCode);
    }
  }
  
  return { loaded, missing };
}

function getAirport(code) {
  return AIRPORTS[(code || '').trim().toUpperCase()] || {};
}

// ============================================================================
// DATA: Fare Classes
// ============================================================================
const FARE_CLASSES = {
  "F": "F", "A": "F", "P": "F",
  "J": "C", "R": "C", "D": "C", "I": "C", "C": "C",
  "W": "W", "E": "W",
  "Y": "Y", "B": "Y", "M": "Y", "H": "Y", "K": "Y", "L": "Y",
  "G": "Y", "V": "Y", "S": "Y", "N": "Y", "Q": "Y", "O": "Y",
  "T": "Y", "U": "Y", "X": "Y", "Z": "Y"
};

const ECONOMY_CLASSES = new Set(['Y', 'B', 'M', 'H', 'K', 'L', 'G', 'V', 'S', 'N', 'Q', 'O', 'T', 'U', 'X', 'Z']);

function getCabinFromFare(fareClass) {
  return FARE_CLASSES[(fareClass || '').trim().toUpperCase()] || 'Y';
}

// ============================================================================
// UTILITIES
// ============================================================================
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

function estimateDuration(distanceMiles) {
  if (!distanceMiles) return null;
  if (distanceMiles < 500) return Math.round((distanceMiles / 350 + 0.5) * 10) / 10;
  if (distanceMiles < 2000) return Math.round((distanceMiles / 450 + 0.75) * 10) / 10;
  return Math.round((distanceMiles / 500 + 1.0) * 10) / 10;
}

function formatNumber(num) {
  return (num || 0).toLocaleString();
}

// ============================================================================
// PHASE 1: DATA VALIDATION & ENRICHMENT
// ============================================================================

/**
 * Check which airports in flight data are missing from our lookup table
 */
function checkAirportCoverage(flights) {
  const allAirports = new Set();
  flights.forEach(f => {
    if (f.origin) allAirports.add(f.origin.toUpperCase());
    if (f.destination) allAirports.add(f.destination.toUpperCase());
  });
  
  const found = [];
  const missing = [];
  
  allAirports.forEach(code => {
    if (AIRPORTS[code]) {
      found.push(code);
    } else {
      missing.push(code);
    }
  });
  
  return {
    total: allAirports.size,
    found: found.length,
    missing: missing.sort(),
    foundSet: new Set(found),
    missingSet: new Set(missing)
  };
}

/**
 * Detect connecting flights (flights within 24hrs at same intermediate airport)
 * Returns array of connection objects grouping related segments
 */
function detectConnections(flights) {
  if (!flights.length) return [];
  
  // Sort by departure date/time
  const sorted = [...flights].sort((a, b) => {
    const dateA = a.departureDate + (a.departureTime || '0000');
    const dateB = b.departureDate + (b.departureTime || '0000');
    return dateA.localeCompare(dateB);
  });
  
  const connections = [];
  let currentTrip = null;
  
  for (let i = 0; i < sorted.length; i++) {
    const flight = sorted[i];
    const prevFlight = currentTrip ? currentTrip.segments[currentTrip.segments.length - 1] : null;
    
    if (!currentTrip) {
      // Start new potential trip
      currentTrip = {
        segments: [flight],
        origin: flight.origin,
        finalDestination: flight.destination
      };
      continue;
    }
    
    // Check if this flight connects to previous
    const isConnection = prevFlight && 
      prevFlight.destination === flight.origin &&
      isWithin24Hours(prevFlight.departureDate, flight.departureDate);
    
    if (isConnection) {
      // Add to current trip
      currentTrip.segments.push(flight);
      currentTrip.finalDestination = flight.destination;
    } else {
      // Save previous trip if it had connections
      if (currentTrip.segments.length > 1) {
        currentTrip.connectionCount = currentTrip.segments.length - 1;
        currentTrip.connectionAirports = currentTrip.segments.slice(0, -1).map(s => s.destination);
        connections.push(currentTrip);
      }
      // Start new trip
      currentTrip = {
        segments: [flight],
        origin: flight.origin,
        finalDestination: flight.destination
      };
    }
  }
  
  // Don't forget last trip
  if (currentTrip && currentTrip.segments.length > 1) {
    currentTrip.connectionCount = currentTrip.segments.length - 1;
    currentTrip.connectionAirports = currentTrip.segments.slice(0, -1).map(s => s.destination);
    connections.push(currentTrip);
  }
  
  return connections;
}

/**
 * Check if two dates are within 24 hours
 */
function isWithin24Hours(date1, date2) {
  if (!date1 || !date2) return false;
  
  // Parse YYYY-MM-DD format
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  const diffMs = Math.abs(d2 - d1);
  const diffHours = diffMs / (1000 * 60 * 60);
  
  return diffHours <= 36; // Using 36 hours to account for overnight connections
}

// ============================================================================
// PARSERS
// ============================================================================
function parseFlightRecords(data) {
  const flights = [];
  const flightData = data?.['Flight Data'] || [];
  
  for (const record of flightData) {
    const itinerary = record['Itinerary Information'] || [];
    const flightInfo = record['Your Flight Information'] || [{}];
    const pnr = flightInfo[0]?.['Reservation Record Locator'] || '';
    
    for (const segment of itinerary) {
      const status = (segment['Segment Current Status Code'] || '').trim();
      if (['HK', 'TK', 'RR', 'SS'].includes(status)) {
        flights.push({
          source: 'flight_records',
          pnr: segment['Reservation Record Locator'] || pnr,
          bookingDate: segment['Reservation Create Date'],
          departureDate: segment['Segment Departure Date'],
          departureTime: segment['Segment Departure Time'],
          arrivalDate: segment['Segment Arrival Date'],
          arrivalTime: segment['Segment Arrival Time'],
          origin: (segment['Segment Departure Airport Code'] || '').trim(),
          destination: (segment['Segment Arrival Airport Code'] || '').trim(),
          marketingFlight: (segment['Marketing Flight'] || '').trim(),
          operatingFlight: (segment['Operating Flight'] || '').trim(),
          bookingClass: (segment['Booking Fare Class Code'] || '').trim(),
          cabinCode: (segment['Cabin Code'] || '').trim(),
          canceled: false
        });
      }
    }
  }
  return flights;
}

function parseAccountActivity(data) {
  const activityData = data?.['Advantage Activity Data']?.[0] || {};
  
  const flightActivity = (activityData['Flight Activity Information'] || []).map(a => ({
    departureDate: a['Departure Date Of Flight Segment'],
    origin: (a['Departure Airport'] || '').trim(),
    destination: (a['Arrival Airport'] || '').trim(),
    airline: (a['Airlines'] || '').trim(),
    flightNumber: (a['Flight Number'] || '').trim(),
    fareClass: (a['Fare Class'] || '').trim(),
    eqm: parseInt(a['Elite Qualifying - Miles (EQMs)'] || 0, 10),
    eqs: parseFloat(a['Elite Qualifying - Segments (EQSs)'] || 0),
    eqd: parseFloat((a['Elite Qualifying - Dollars (EQDs)'] || '0').replace(/,/g, '')),
    baseMiles: parseInt(a['Award Miles - Base Miles'] || 0, 10),
    bonusMiles: parseInt(a['Award Miles - Bonus Miles'] || 0, 10)
  }));
  
  const partnerActivity = (activityData['Partner Activity Information'] || []).map(a => ({
    activityDate: a['Activity Date'],
    description: (a['Description'] || '').trim(),
    baseMiles: parseInt(a['Award Miles - Base Miles'] || 0, 10),
    bonusMiles: parseInt(a['Award Miles - Bonus Miles'] || 0, 10)
  }));
  
  const redemptions = (activityData['Mileage Redemption Information'] || []).map(r => ({
    redemptionDate: r['Transaction Date'],
    description: (r['Transaction Type Description'] || '').trim(),
    milesRedeemed: parseInt(r['Transaction Award Miles'] || 0, 10)
  }));
  
  const swuCertificates = (activityData['System Wide Upgrade Information'] || []).map(s => ({
    earnedDate: (s['Date and time earned'] || '').split(' ')[0],
    validThrough: s['Valid through'],
    earned: parseInt(s['Earned'] || 0, 10),
    used: parseInt(s['Used'] || 0, 10),
    expired: parseInt(s['Expired'] || 0, 10),
    available: parseInt(s['Available'] || 0, 10)
  }));
  
  return { flightActivity, partnerActivity, redemptions, swuCertificates };
}

function parseAdmiralsClub(data) {
  const admiralData = data?.['Admiral Data']?.[0] || {};
  return (admiralData['Lounge Transaction Registration Information'] || []).map(v => ({
    locationCode: (v['Lounge Use Location Code'] || '').trim(),
    loungeType: (v['Lounge Type Description'] || '').trim(),
    timestamp: v['Registration UTC Timestamp'],
    guests: parseInt(v['Total Number of Guests'] || 1, 10),
    tier: (v['Registration Tier Name'] || '').trim(),
    origin: (v['Guest Departure Airport Code'] || '').trim(),
    destination: (v['Guest Arrival Airport Code'] || '').trim(),
    diningEligible: v['Dining Eligible Indicator'] === 'Y',
    flagshipEligible: v['Flagship Door Eligible Indicator'] === 'Y'
  }));
}

function parseAccountProfile(data) {
  const profileData = data?.['Profile Data']?.[0] || {};
  const loyalty = profileData['Loyalty Membership Information']?.[0] || {};
  const customer = profileData['Customer Profile']?.[0] || {};
  
  return {
    aadvantageNumber: (loyalty['AAdvantage Number'] || '').trim(),
    statusTier: (loyalty['AAdvantage Tier Description'] || '').trim(),
    millionMilerLevel: (loyalty['AAdvantage Million Miler® Level'] || loyalty['AAdvantage Million MilerÂ® Level'] || '').trim(),
    homeAirport: (loyalty['Home Airport'] || '').trim(),
    firstName: (customer['Customer First Name'] || '').trim(),
    lastName: (customer['Customer Last Name'] || '').trim()
  };
}

function detectFileType(data) {
  if (data?.['Flight Data']) return 'flight_records';
  if (data?.['Advantage Activity Data']) return 'account_activity';
  if (data?.['Admiral Data']) return 'admirals_club';
  if (data?.['Profile Data']) return 'account_profile';
  return 'unknown';
}


// ============================================================================
// NORMALIZER
// ============================================================================
function mergeFlightData(flightsFromPnr, flightActivity) {
  const activityIndex = new Map();
  
  for (const act of flightActivity) {
    const key = `${act.departureDate}|${act.origin}|${act.destination}`;
    activityIndex.set(key, act);
  }
  
  const unifiedFlights = [];
  const seenKeys = new Set();
  
  // Process PNR flights first
  for (const flight of flightsFromPnr) {
    if (flight.canceled) continue;
    
    const key = `${flight.departureDate}|${flight.origin}|${flight.destination}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    
    const activity = activityIndex.get(key);
    const originAirport = getAirport(flight.origin);
    const destAirport = getAirport(flight.destination);
    
    let distance = null;
    if (originAirport.lat && destAirport.lat) {
      distance = haversineDistance(originAirport.lat, originAirport.lon, destAirport.lat, destAirport.lon);
    }
    
    const cabinBooked = getCabinFromFare(flight.bookingClass) || flight.cabinCode?.trim() || 'Y';
    const cabinFlown = flight.cabinCode?.trim() || cabinBooked;
    const isUpgrade = ECONOMY_CLASSES.has(flight.bookingClass?.toUpperCase()) && ['C', 'F'].includes(cabinFlown);
    
    unifiedFlights.push({
      departureDate: flight.departureDate,
      departureTime: flight.departureTime,
      origin: flight.origin,
      originCity: originAirport.city,
      originCountry: originAirport.country,
      destination: flight.destination,
      destinationCity: destAirport.city,
      destinationCountry: destAirport.country,
      marketingFlight: flight.marketingFlight,
      operatingFlight: flight.operatingFlight,
      bookingClass: flight.bookingClass,
      cabinBooked,
      cabinFlown,
      upgraded: isUpgrade,
      distanceMiles: distance,
      estimatedDurationHours: estimateDuration(distance),
      international: originAirport.country && destAirport.country && originAirport.country !== destAirport.country,
      pnr: flight.pnr,
      eqm: activity?.eqm || 0,
      eqs: activity?.eqs || 0,
      eqd: activity?.eqd || 0,
      baseMiles: activity?.baseMiles || 0,
      bonusMiles: activity?.bonusMiles || 0,
      source: activity ? 'both' : 'pnr_only',
      dataQuality: activity ? 'full' : 'pnr_only'
    });
  }
  
  // Add activity-only records
  for (const act of flightActivity) {
    const key = `${act.departureDate}|${act.origin}|${act.destination}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    
    const originAirport = getAirport(act.origin);
    const destAirport = getAirport(act.destination);
    
    let distance = null;
    if (originAirport.lat && destAirport.lat) {
      distance = haversineDistance(originAirport.lat, originAirport.lon, destAirport.lat, destAirport.lon);
    }
    
    const inferredCabin = getCabinFromFare(act.fareClass);
    
    unifiedFlights.push({
      departureDate: act.departureDate,
      departureTime: null,
      origin: act.origin,
      originCity: originAirport.city,
      originCountry: originAirport.country,
      destination: act.destination,
      destinationCity: destAirport.city,
      destinationCountry: destAirport.country,
      marketingFlight: `${(act.airline || 'AA').trim()}${act.flightNumber || ''}`,
      operatingFlight: null,
      bookingClass: act.fareClass,
      cabinBooked: inferredCabin,
      cabinFlown: inferredCabin,
      upgraded: false,
      distanceMiles: distance,
      estimatedDurationHours: estimateDuration(distance),
      international: originAirport.country && destAirport.country && originAirport.country !== destAirport.country,
      pnr: null,
      eqm: act.eqm || 0,
      eqs: act.eqs || 0,
      eqd: act.eqd || 0,
      baseMiles: act.baseMiles || 0,
      bonusMiles: act.bonusMiles || 0,
      source: 'activity_only',
      dataQuality: 'partial'
    });
  }
  
  return unifiedFlights.sort((a, b) => (a.departureDate || '').localeCompare(b.departureDate || ''));
}

function normalizeLoungeVisits(visits) {
  return visits.map(v => {
    const airportCode = v.locationCode?.split('-')[0] || '';
    const airport = getAirport(airportCode);
    return {
      ...v,
      date: v.timestamp?.split(' ')[0] || null,
      airportCode,
      airportName: airport.name,
      city: airport.city
    };
  }).sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
}

// ============================================================================
// STATISTICS
// ============================================================================
function calculateStats(flights, loungeVisits, partnerActivity, redemptions, swuCertificates, profile) {
  const flown = flights.filter(f => f.departureDate);
  
  // Lifetime totals
  const totalFlights = flown.length;
  const totalDistance = flown.reduce((sum, f) => sum + (f.distanceMiles || 0), 0);
  const totalDuration = flown.reduce((sum, f) => sum + (f.estimatedDurationHours || 0), 0);
  
  const airports = new Set();
  const countries = new Set();
  flown.forEach(f => {
    if (f.origin) airports.add(f.origin);
    if (f.destination) airports.add(f.destination);
    if (f.originCountry) countries.add(f.originCountry);
    if (f.destinationCountry) countries.add(f.destinationCountry);
  });
  
  // Miles
  const flightMiles = flown.reduce((sum, f) => sum + (f.baseMiles || 0) + (f.bonusMiles || 0), 0);
  const partnerMiles = partnerActivity.reduce((sum, a) => sum + (a.baseMiles || 0) + (a.bonusMiles || 0), 0);
  const totalEqm = flown.reduce((sum, f) => sum + (f.eqm || 0), 0);
  
  // SWU
  const swuEarned = swuCertificates.reduce((sum, s) => sum + s.earned, 0);
  const swuUsed = swuCertificates.reduce((sum, s) => sum + s.used, 0);
  const swuAvailable = swuCertificates.reduce((sum, s) => sum + s.available, 0);
  
  // Annual breakdown
  const byYear = {};
  flown.forEach(f => {
    const year = f.departureDate.slice(0, 4);
    if (!byYear[year]) byYear[year] = { flights: 0, distance: 0, eqm: 0 };
    byYear[year].flights++;
    byYear[year].distance += f.distanceMiles || 0;
    byYear[year].eqm += f.eqm || 0;
  });
  
  // Top routes
  const routeCounts = {};
  flown.forEach(f => {
    const route = [f.origin, f.destination].sort().join('-');
    routeCounts[route] = (routeCounts[route] || 0) + 1;
  });
  const topRoutes = Object.entries(routeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([route, count]) => ({ route, count }));
  
  // Cabin distribution
  const cabinCounts = { F: 0, C: 0, W: 0, Y: 0 };
  flown.forEach(f => {
    const cabin = f.cabinFlown || 'Y';
    cabinCounts[cabin] = (cabinCounts[cabin] || 0) + 1;
  });
  
  return {
    lifetime: {
      totalFlights,
      totalDistanceMiles: totalDistance,
      totalEstimatedHours: Math.round(totalDuration * 10) / 10,
      totalEstimatedDays: Math.round(totalDuration / 24 * 10) / 10,
      uniqueAirports: airports.size,
      uniqueCountries: countries.size,
      internationalFlights: flown.filter(f => f.international).length,
      domesticFlights: flown.filter(f => !f.international).length,
      milesEarnedFromFlights: flightMiles,
      milesEarnedFromPartners: partnerMiles,
      totalMilesEarned: flightMiles + partnerMiles,
      totalEqm,
      cabinDistribution: cabinCounts,
      upgradesDetected: flown.filter(f => f.upgraded).length,
      loungeVisits: loungeVisits.length,
      averageFlightDistance: totalFlights ? Math.round(totalDistance / totalFlights) : 0
    },
    annual: byYear,
    routes: { topRoutes },
    loyalty: {
      currentStatus: profile?.statusTier || 'Unknown',
      millionMilerLevel: profile?.millionMilerLevel || '0',
      swuEarned,
      swuUsed,
      swuAvailable
    },
    profile
  };
}

// ============================================================================
// UI RENDERING
// ============================================================================
let flightsChart = null;
let routesChart = null;
let map = null;

function renderDashboard(stats, flights, loungeVisits) {
  // Summary cards
  document.getElementById('total-flights').textContent = formatNumber(stats.lifetime.totalFlights);
  document.getElementById('total-miles').textContent = formatNumber(stats.lifetime.totalDistanceMiles);
  document.getElementById('total-countries').textContent = stats.lifetime.uniqueCountries;
  document.getElementById('loyalty-status').textContent = stats.loyalty.currentStatus || '-';
  
  // Show dashboard
  document.getElementById('dashboard').classList.remove('hidden');
  
  // Render charts
  renderFlightsChart(stats.annual);
  renderRoutesChart(stats.routes.topRoutes);
  
  // Render map
  renderMap(flights);
  
  // Render table
  renderFlightsTable(flights);
}

function renderFlightsChart(annualData) {
  const ctx = document.getElementById('flights-chart').getContext('2d');
  const years = Object.keys(annualData).sort();
  const flightCounts = years.map(y => annualData[y].flights);
  
  if (flightsChart) flightsChart.destroy();
  
  flightsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: years,
      datasets: [{
        label: 'Flights',
        data: flightCounts,
        backgroundColor: '#0078D2'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderRoutesChart(topRoutes) {
  const ctx = document.getElementById('routes-chart').getContext('2d');
  
  if (routesChart) routesChart.destroy();
  
  routesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: topRoutes.slice(0, 8).map(r => r.route),
      datasets: [{
        label: 'Flights',
        data: topRoutes.slice(0, 8).map(r => r.count),
        backgroundColor: '#C8102E'
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}

function renderMap(flights) {
  if (map) map.remove();
  
  map = L.map('map').setView([30, -10], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);
  
  // Add route lines
  const routeCounts = {};
  flights.forEach(f => {
    if (!f.origin || !f.destination) return;
    const key = [f.origin, f.destination].sort().join('-');
    routeCounts[key] = (routeCounts[key] || 0) + 1;
  });
  
  Object.entries(routeCounts).forEach(([route, count]) => {
    const [orig, dest] = route.split('-');
    const origAirport = getAirport(orig);
    const destAirport = getAirport(dest);
    
    if (origAirport.lat && destAirport.lat) {
      const weight = Math.min(1 + Math.log2(count), 5);
      L.polyline(
        [[origAirport.lat, origAirport.lon], [destAirport.lat, destAirport.lon]],
        { color: '#0078D2', weight, opacity: 0.6 }
      ).addTo(map);
    }
  });
  
  // Add airport markers
  const airportVisits = {};
  flights.forEach(f => {
    if (f.origin) airportVisits[f.origin] = (airportVisits[f.origin] || 0) + 1;
    if (f.destination) airportVisits[f.destination] = (airportVisits[f.destination] || 0) + 1;
  });
  
  Object.entries(airportVisits).forEach(([code, visits]) => {
    const airport = getAirport(code);
    if (airport.lat) {
      const radius = Math.min(4 + Math.log2(visits) * 2, 12);
      L.circleMarker([airport.lat, airport.lon], {
        radius,
        fillColor: '#C8102E',
        color: '#fff',
        weight: 1,
        fillOpacity: 0.8
      }).bindPopup(`<b>${code}</b><br>${airport.city}<br>${visits} visits`).addTo(map);
    }
  });
}

function renderFlightsTable(flights) {
  const tbody = document.getElementById('flights-table-body');
  const recentFlights = [...flights].reverse().slice(0, 50);
  
  tbody.innerHTML = recentFlights.map(f => {
    const cabinLabel = { F: 'First', C: 'Business', W: 'Prem Econ', Y: 'Economy' }[f.cabinFlown] || f.cabinFlown;
    return `
      <tr class="border-b hover:bg-gray-50">
        <td class="px-4 py-2">${f.departureDate || '-'}</td>
        <td class="px-4 py-2">${f.marketingFlight || '-'}</td>
        <td class="px-4 py-2">${f.origin} <span class="text-gray-400">${f.originCity || ''}</span></td>
        <td class="px-4 py-2">${f.destination} <span class="text-gray-400">${f.destinationCity || ''}</span></td>
        <td class="px-4 py-2">${cabinLabel}</td>
        <td class="px-4 py-2">${f.upgraded ? '<span class="text-green-600">↑ Upgraded</span>' : ''}</td>
      </tr>
    `;
  }).join('');
}


// ============================================================================
// FILE HANDLING & INITIALIZATION
// ============================================================================
const loadedFiles = {
  flight_records: null,
  account_activity: null,
  admirals_club: null,
  account_profile: null
};

function handleFiles(files) {
  const fileList = document.getElementById('file-list');
  const fileItems = document.getElementById('file-items');
  
  fileList.classList.remove('hidden');
  
  Array.from(files).forEach(file => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const fileType = detectFileType(data);
        
        if (fileType === 'unknown') {
          showFileStatus(fileItems, file.name, 'error', 'Unknown file format');
          return;
        }
        
        loadedFiles[fileType] = data;
        showFileStatus(fileItems, file.name, 'success', fileType.replace(/_/g, ' '));
        
        // Check if we can process
        checkAndProcess();
      } catch (err) {
        showFileStatus(fileItems, file.name, 'error', 'Invalid JSON');
      }
    };
    
    reader.readAsText(file);
  });
}

function showFileStatus(container, fileName, status, message) {
  const statusClass = status === 'success' ? 'text-green-600' : 'text-red-600';
  const icon = status === 'success' ? '✓' : '✗';
  
  const existingItem = container.querySelector(`[data-file="${fileName}"]`);
  if (existingItem) {
    existingItem.remove();
  }
  
  const item = document.createElement('div');
  item.setAttribute('data-file', fileName);
  item.className = 'flex items-center gap-2 p-2 bg-gray-50 rounded';
  item.innerHTML = `
    <span class="${statusClass}">${icon}</span>
    <span class="font-medium">${fileName}</span>
    <span class="text-gray-500 text-sm">(${message})</span>
  `;
  container.appendChild(item);
}

function checkAndProcess() {
  // We need at least flight records OR account activity to proceed
  if (!loadedFiles.flight_records && !loadedFiles.account_activity) {
    return;
  }
  
  processData();
}

async function processData() {
  console.log('Processing data...');
  
  // Parse each file type
  const flightsFromPnr = loadedFiles.flight_records ? parseFlightRecords(loadedFiles.flight_records) : [];
  
  let flightActivity = [];
  let partnerActivity = [];
  let redemptions = [];
  let swuCertificates = [];
  
  if (loadedFiles.account_activity) {
    const activityData = parseAccountActivity(loadedFiles.account_activity);
    flightActivity = activityData.flightActivity;
    partnerActivity = activityData.partnerActivity;
    redemptions = activityData.redemptions;
    swuCertificates = activityData.swuCertificates;
  }
  
  const loungeVisits = loadedFiles.admirals_club ? normalizeLoungeVisits(parseAdmiralsClub(loadedFiles.admirals_club)) : [];
  const profile = loadedFiles.account_profile ? parseAccountProfile(loadedFiles.account_profile) : null;
  
  // Extract all unique airport codes from raw parsed data
  const allAirportCodes = new Set();
  flightsFromPnr.forEach(f => {
    if (f.origin) allAirportCodes.add(f.origin.toUpperCase());
    if (f.destination) allAirportCodes.add(f.destination.toUpperCase());
  });
  flightActivity.forEach(f => {
    if (f.origin) allAirportCodes.add(f.origin.toUpperCase());
    if (f.destination) allAirportCodes.add(f.destination.toUpperCase());
  });
  
  console.log(`Found ${allAirportCodes.size} unique airports in data`);
  
  // Load airport data for only the airports in the user's data
  const airportResult = await loadAirportsForCodes([...allAirportCodes]);
  console.log(`Loaded ${airportResult.loaded.length} airports, ${airportResult.missing.length} missing`);
  if (airportResult.missing.length > 0) {
    console.warn(`Missing airports: ${airportResult.missing.join(', ')}`);
  }
  
  // Now merge flights (airport data is available)
  const flights = mergeFlightData(flightsFromPnr, flightActivity);
  
  // Check coverage after merge
  const airportCheck = checkAirportCoverage(flights);
  
  // Detect connections
  const connections = detectConnections(flights);
  
  console.log(`Processed ${flights.length} flights, ${connections.length} connections detected`);
  
  // Calculate statistics
  const stats = calculateStats(flights, loungeVisits, partnerActivity, redemptions, swuCertificates, profile);
  
  // Add Phase 1 metadata to stats
  stats.dataQuality = {
    totalFlights: flights.length,
    airportsCovered: airportCheck.found,
    airportsMissing: airportCheck.missing,
    connectionsDetected: connections.length
  };
  
  // Render dashboard (only if dashboard exists - not on test page)
  if (document.getElementById('dashboard')) {
    renderDashboard(stats, flights, loungeVisits);
  }
  
  // Store for potential export
  window.aadvantageData = { flights, loungeVisits, stats, connections, airportCheck };
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input');
  const uploadSection = document.getElementById('upload-section');
  
  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  });
  
  // Drag and drop
  uploadSection.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadSection.classList.add('border-aa-blue', 'bg-blue-50');
  });
  
  uploadSection.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadSection.classList.remove('border-aa-blue', 'bg-blue-50');
  });
  
  uploadSection.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadSection.classList.remove('border-aa-blue', 'bg-blue-50');
    
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  });
});

// Banner close function
function closeBanner() {
  document.getElementById('privacy-banner').style.display = 'none';
}
