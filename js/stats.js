/**
 * AAdvantage Statistics Engine
 * Calculates comprehensive travel statistics from normalized data
 */

/**
 * Count occurrences in an array
 */
function countBy(arr, keyFn) {
  const counts = new Map();
  for (const item of arr) {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

/**
 * Get top N items from a Map by count
 */
function topN(countMap, n = 10) {
  return [...countMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

/**
 * Calculate lifetime aggregate statistics
 */
export function calculateLifetimeStats(flights, loungeVisits, milesActivity, profile) {
  const flown = flights.filter(f => f.departureDate);
  const totalFlights = flown.length;
  const totalDistance = flown.reduce((sum, f) => sum + (f.distanceMiles || 0), 0);
  const totalDuration = flown.reduce((sum, f) => sum + (f.estimatedDurationHours || 0), 0);
  
  // Unique locations
  const origins = new Set(flown.map(f => f.origin).filter(Boolean));
  const destinations = new Set(flown.map(f => f.destination).filter(Boolean));
  const allAirports = new Set([...origins, ...destinations]);
  
  const countriesOrigin = new Set(flown.map(f => f.originCountry).filter(Boolean));
  const countriesDest = new Set(flown.map(f => f.destinationCountry).filter(Boolean));
  const allCountries = new Set([...countriesOrigin, ...countriesDest]);
  
  // Airlines
  const airlines = new Set();
  for (const f of flown) {
    if (f.marketingFlight) airlines.add(f.marketingFlight.slice(0, 2));
    if (f.operatingFlight) airlines.add(f.operatingFlight.slice(0, 2));
  }
  
  // Miles
  const flightBaseMiles = flown.reduce((sum, f) => sum + (f.baseMiles || 0), 0);
  const flightBonusMiles = flown.reduce((sum, f) => sum + (f.bonusMiles || 0), 0);
  const partnerMiles = milesActivity
    .filter(a => a.type === 'earning')
    .reduce((sum, a) => sum + a.totalMiles, 0);
  const redeemedMiles = Math.abs(milesActivity
    .filter(a => a.type === 'redemption')
    .reduce((sum, a) => sum + a.totalMiles, 0));
  
  // Cabin distribution
  const cabinCounts = countBy(flown, f => f.cabinFlown);
  
  // Data quality
  const fullQuality = flown.filter(f => f.dataQuality === 'full').length;
  const partialQuality = flown.filter(f => f.dataQuality === 'partial').length;
  const pnrOnlyQuality = flown.filter(f => f.dataQuality === 'pnr_only').length;
  
  return {
    totalFlights,
    totalSegments: totalFlights,
    totalDistanceMiles: totalDistance,
    totalEstimatedHours: Math.round(totalDuration * 10) / 10,
    totalEstimatedDays: Math.round(totalDuration / 24 * 10) / 10,
    uniqueAirports: allAirports.size,
    uniqueCountries: allCountries.size,
    uniqueAirlines: airlines.size,
    airportsList: [...allAirports].sort(),
    countriesList: [...allCountries].sort(),
    airlinesList: [...airlines].sort(),
    internationalFlights: flown.filter(f => f.international).length,
    domesticFlights: flown.filter(f => !f.international).length,
    internationalRatio: totalFlights ? Math.round(flown.filter(f => f.international).length / totalFlights * 1000) / 1000 : 0,
    milesEarnedFromFlights: flightBaseMiles + flightBonusMiles,
    milesEarnedFromPartners: partnerMiles,
    totalMilesEarned: flightBaseMiles + flightBonusMiles + partnerMiles,
    milesRedeemed: redeemedMiles,
    cabinDistribution: Object.fromEntries(cabinCounts),
    upgradesReceived: flown.filter(f => f.upgraded).length,
    upgradeRate: totalFlights ? Math.round(flown.filter(f => f.upgraded).length / totalFlights * 1000) / 1000 : 0,
    loungeVisits: loungeVisits.length,
    millionMilerLevel: profile?.millionMilerLevel || '0',
    currentStatus: profile?.statusTier,
    averageFlightDistance: totalFlights ? Math.round(totalDistance / totalFlights) : 0,
    averageFlightDuration: totalFlights ? Math.round(totalDuration / totalFlights * 10) / 10 : 0,
    dataQuality: {
      fullRecords: fullQuality,
      partialRecords: partialQuality,
      pnrOnlyRecords: pnrOnlyQuality,
      fullPercentage: totalFlights ? Math.round(fullQuality / totalFlights * 1000) / 10 : 0,
      note: 'Partial records have miles data but no departure times or PNR'
    }
  };
}

/**
 * Calculate year-by-year statistics
 */
export function calculateAnnualStats(flights, milesActivity) {
  const flown = flights.filter(f => f.departureDate);
  
  // Group by year
  const byYear = new Map();
  for (const f of flown) {
    const year = f.departureDate.slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(f);
  }
  
  // Group miles by year
  const milesByYear = new Map();
  for (const a of milesActivity) {
    if (!a.date) continue;
    const year = a.date.slice(0, 4);
    if (!milesByYear.has(year)) milesByYear.set(year, { earned: 0, redeemed: 0 });
    const entry = milesByYear.get(year);
    if (a.type === 'earning') entry.earned += a.totalMiles;
    else entry.redeemed += Math.abs(a.totalMiles);
  }
  
  const allYears = new Set([...byYear.keys(), ...milesByYear.keys()]);
  const annual = {};
  
  for (const year of [...allYears].sort()) {
    const yearFlights = byYear.get(year) || [];
    const yearMiles = milesByYear.get(year) || { earned: 0, redeemed: 0 };
    
    const distance = yearFlights.reduce((sum, f) => sum + (f.distanceMiles || 0), 0);
    const duration = yearFlights.reduce((sum, f) => sum + (f.estimatedDurationHours || 0), 0);
    const eqm = yearFlights.reduce((sum, f) => sum + (f.eqm || 0), 0);
    const eqs = yearFlights.reduce((sum, f) => sum + (f.eqs || 0), 0);
    const eqd = yearFlights.reduce((sum, f) => sum + (f.eqd || 0), 0);
    const flightMiles = yearFlights.reduce((sum, f) => sum + (f.baseMiles || 0) + (f.bonusMiles || 0), 0);
    
    const airports = new Set();
    yearFlights.forEach(f => {
      if (f.origin) airports.add(f.origin);
      if (f.destination) airports.add(f.destination);
    });
    
    annual[year] = {
      flights: yearFlights.length,
      distanceMiles: distance,
      estimatedHours: Math.round(duration * 10) / 10,
      eqm,
      eqs: Math.round(eqs * 10) / 10,
      eqd: Math.round(eqd * 100) / 100,
      milesEarnedFlights: flightMiles,
      milesEarnedPartner: yearMiles.earned,
      milesRedeemed: yearMiles.redeemed,
      internationalFlights: yearFlights.filter(f => f.international).length,
      domesticFlights: yearFlights.filter(f => !f.international).length,
      upgrades: yearFlights.filter(f => f.upgraded).length,
      uniqueAirports: airports.size
    };
  }
  
  return annual;
}

/**
 * Calculate route analysis statistics
 */
export function calculateRouteStats(flights) {
  const flown = flights.filter(f => f.departureDate);
  
  // City pairs (undirected)
  const cityPairs = countBy(flown, f => {
    const pair = [f.origin, f.destination].sort();
    return `${pair[0]}-${pair[1]}`;
  });
  
  // Directional routes
  const routes = countBy(flown, f => `${f.origin}|${f.destination}`);
  
  // Airport frequency
  const airportFreq = new Map();
  for (const f of flown) {
    airportFreq.set(f.origin, (airportFreq.get(f.origin) || 0) + 1);
    airportFreq.set(f.destination, (airportFreq.get(f.destination) || 0) + 1);
  }
  
  // Hub analysis
  const aaHubs = ['DFW', 'CLT', 'MIA', 'ORD', 'PHX', 'LAX', 'JFK', 'PHL', 'DCA'];
  const hubFlights = flown.filter(f => aaHubs.includes(f.origin) || aaHubs.includes(f.destination)).length;
  
  // Distance stats
  const distances = flown.map(f => f.distanceMiles).filter(Boolean);
  const sortedDistances = [...distances].sort((a, b) => a - b);
  
  const longest = flown.reduce((max, f) => (!max || (f.distanceMiles || 0) > (max.distanceMiles || 0)) ? f : max, null);
  const shortest = flown.filter(f => f.distanceMiles > 0).reduce((min, f) => (!min || f.distanceMiles < min.distanceMiles) ? f : min, null);
  
  const topPair = topN(cityPairs, 1)[0];
  
  return {
    topCityPairs: topN(cityPairs, 20).map(({ key, count }) => ({ route: key, count })),
    topDirectionalRoutes: topN(routes, 20).map(({ key, count }) => {
      const [origin, destination] = key.split('|');
      return { origin, destination, count };
    }),
    mostVisitedAirports: topN(airportFreq, 20).map(({ key, count }) => ({ airport: key, visits: count })),
    hubUsage: {
      totalHubFlights: hubFlights,
      hubPercentage: flown.length ? Math.round(hubFlights / flown.length * 1000) / 10 : 0,
      byHub: Object.fromEntries(aaHubs.filter(h => airportFreq.has(h)).map(h => [h, airportFreq.get(h)]))
    },
    distanceStats: {
      average: distances.length ? Math.round(distances.reduce((a, b) => a + b, 0) / distances.length) : 0,
      median: sortedDistances.length ? sortedDistances[Math.floor(sortedDistances.length / 2)] : 0,
      longestFlight: longest ? {
        route: `${longest.origin}-${longest.destination}`,
        distance: longest.distanceMiles,
        date: longest.departureDate
      } : null,
      shortestFlight: shortest ? {
        route: `${shortest.origin}-${shortest.destination}`,
        distance: shortest.distanceMiles,
        date: shortest.departureDate
      } : null
    },
    mostFrequentRoute: topPair ? { route: topPair.key, count: topPair.count } : null
  };
}
