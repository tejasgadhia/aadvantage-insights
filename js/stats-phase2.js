/**
 * AAdvantage Insights - Phase 2 Enhanced Statistics
 * Comprehensive analytics engine for 15 years of travel data
 */

// ============================================================================
// STATUS TIER HISTORY
// ============================================================================

/**
 * Infer status tier from yearly EQM/EQD totals
 * AA Status Thresholds (2024):
 * - Gold: 30,000 EQM or $4,000 EQD
 * - Platinum: 60,000 EQM or $9,000 EQD  
 * - Platinum Pro: 90,000 EQM or $14,000 EQD
 * - Executive Platinum: 120,000 EQM or $18,000 EQD
 */
export function inferStatusHistory(flights) {
  const byYear = {};
  
  for (const f of flights) {
    if (!f.departureDate) continue;
    const year = f.departureDate.slice(0, 4);
    if (!byYear[year]) byYear[year] = { eqm: 0, eqd: 0, eqs: 0 };
    byYear[year].eqm += f.eqm || 0;
    byYear[year].eqd += f.eqd || 0;
    byYear[year].eqs += f.eqs || 0;
  }
  
  const statusHistory = {};
  
  for (const [year, totals] of Object.entries(byYear)) {
    let status = 'Member';
    let qualifiedBy = null;
    
    // Check thresholds (status earned this year, enjoyed next year)
    if (totals.eqm >= 120000 || totals.eqd >= 18000) {
      status = 'Executive Platinum';
      qualifiedBy = totals.eqm >= 120000 ? 'EQM' : 'EQD';
    } else if (totals.eqm >= 90000 || totals.eqd >= 14000) {
      status = 'Platinum Pro';
      qualifiedBy = totals.eqm >= 90000 ? 'EQM' : 'EQD';
    } else if (totals.eqm >= 60000 || totals.eqd >= 9000) {
      status = 'Platinum';
      qualifiedBy = totals.eqm >= 60000 ? 'EQM' : 'EQD';
    } else if (totals.eqm >= 30000 || totals.eqd >= 4000) {
      status = 'Gold';
      qualifiedBy = totals.eqm >= 30000 ? 'EQM' : 'EQD';
    }
    
    statusHistory[year] = {
      yearEarned: parseInt(year),
      yearEnjoyed: parseInt(year) + 1,
      status,
      qualifiedBy,
      eqm: totals.eqm,
      eqd: Math.round(totals.eqd * 100) / 100,
      eqs: Math.round(totals.eqs * 10) / 10,
      progressToNext: calculateProgressToNext(status, totals)
    };
  }
  
  return statusHistory;
}

function calculateProgressToNext(currentStatus, totals) {
  const thresholds = {
    'Member': { next: 'Gold', eqm: 30000, eqd: 4000 },
    'Gold': { next: 'Platinum', eqm: 60000, eqd: 9000 },
    'Platinum': { next: 'Platinum Pro', eqm: 90000, eqd: 14000 },
    'Platinum Pro': { next: 'Executive Platinum', eqm: 120000, eqd: 18000 },
    'Executive Platinum': { next: null, eqm: 120000, eqd: 18000 }
  };
  
  const threshold = thresholds[currentStatus];
  if (!threshold || !threshold.next) return null;
  
  return {
    nextStatus: threshold.next,
    eqmNeeded: Math.max(0, threshold.eqm - totals.eqm),
    eqdNeeded: Math.max(0, threshold.eqd - totals.eqd),
    eqmProgress: Math.min(100, Math.round(totals.eqm / threshold.eqm * 100)),
    eqdProgress: Math.min(100, Math.round(totals.eqd / threshold.eqd * 100))
  };
}


// ============================================================================
// MILLION MILER PROGRESS
// ============================================================================

/**
 * Calculate cumulative Million Miler progress over time
 * Million Miler levels: 1MM, 2MM, 3MM, 4MM
 */
export function calculateMillionMilerProgress(flights) {
  const sorted = [...flights]
    .filter(f => f.departureDate)
    .sort((a, b) => a.departureDate.localeCompare(b.departureDate));
  
  let cumulative = 0;
  const timeline = [];
  const milestones = [];
  const levels = [1000000, 2000000, 3000000, 4000000];
  const reachedLevels = new Set();
  
  // Monthly accumulation
  const monthlyTotals = {};
  
  for (const f of sorted) {
    const eqm = f.eqm || 0;
    cumulative += eqm;
    
    const month = f.departureDate.slice(0, 7);
    if (!monthlyTotals[month]) monthlyTotals[month] = { eqm: 0, cumulative: 0 };
    monthlyTotals[month].eqm += eqm;
    monthlyTotals[month].cumulative = cumulative;
    
    // Check milestones
    for (const level of levels) {
      if (cumulative >= level && !reachedLevels.has(level)) {
        reachedLevels.add(level);
        milestones.push({
          level: level / 1000000,
          date: f.departureDate,
          flight: `${f.origin}-${f.destination}`,
          totalEqm: cumulative
        });
      }
    }
  }
  
  // Convert to timeline array
  for (const [month, data] of Object.entries(monthlyTotals).sort()) {
    timeline.push({
      month,
      monthlyEqm: data.eqm,
      cumulativeEqm: data.cumulative,
      level: Math.floor(data.cumulative / 1000000)
    });
  }
  
  // Current progress to next level
  const currentLevel = Math.floor(cumulative / 1000000);
  const nextLevel = (currentLevel + 1) * 1000000;
  const progressToNext = cumulative % 1000000;
  
  return {
    currentLevel,
    totalLifetimeEqm: cumulative,
    progressToNextLevel: {
      current: progressToNext,
      needed: 1000000 - progressToNext,
      percentage: Math.round(progressToNext / 10000)
    },
    milestones,
    timeline: timeline.slice(-36), // Last 3 years monthly
    projectedYearsToNext: calculateProjection(sorted, progressToNext)
  };
}

function calculateProjection(flights, remaining) {
  // Calculate average yearly EQM from last 3 years
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  const cutoff = threeYearsAgo.toISOString().slice(0, 10);
  
  const recentFlights = flights.filter(f => f.departureDate >= cutoff);
  const recentEqm = recentFlights.reduce((sum, f) => sum + (f.eqm || 0), 0);
  const avgYearlyEqm = recentEqm / 3;
  
  if (avgYearlyEqm <= 0) return null;
  return Math.round((remaining / avgYearlyEqm) * 10) / 10;
}

// ============================================================================
// YEAR-OVER-YEAR COMPARISONS
// ============================================================================

export function calculateYearOverYear(flights, milesActivity) {
  const flown = flights.filter(f => f.departureDate);
  const byYear = {};
  
  for (const f of flown) {
    const year = f.departureDate.slice(0, 4);
    if (!byYear[year]) {
      byYear[year] = {
        flights: 0,
        distance: 0,
        eqm: 0,
        eqd: 0,
        baseMiles: 0,
        bonusMiles: 0,
        international: 0,
        domestic: 0,
        upgrades: 0,
        airports: new Set(),
        countries: new Set()
      };
    }
    byYear[year].flights++;
    byYear[year].distance += f.distanceMiles || 0;
    byYear[year].eqm += f.eqm || 0;
    byYear[year].eqd += f.eqd || 0;
    byYear[year].baseMiles += f.baseMiles || 0;
    byYear[year].bonusMiles += f.bonusMiles || 0;
    if (f.international) byYear[year].international++;
    else byYear[year].domestic++;
    if (f.upgraded) byYear[year].upgrades++;
    if (f.origin) byYear[year].airports.add(f.origin);
    if (f.destination) byYear[year].airports.add(f.destination);
    if (f.originCountry) byYear[year].countries.add(f.originCountry);
    if (f.destinationCountry) byYear[year].countries.add(f.destinationCountry);
  }
  
  const years = Object.keys(byYear).sort();
  const comparisons = [];
  
  for (let i = 1; i < years.length; i++) {
    const prev = byYear[years[i - 1]];
    const curr = byYear[years[i]];
    
    comparisons.push({
      year: parseInt(years[i]),
      previousYear: parseInt(years[i - 1]),
      changes: {
        flights: {
          current: curr.flights,
          previous: prev.flights,
          change: curr.flights - prev.flights,
          percentChange: prev.flights ? Math.round((curr.flights - prev.flights) / prev.flights * 100) : null
        },
        distance: {
          current: curr.distance,
          previous: prev.distance,
          change: curr.distance - prev.distance,
          percentChange: prev.distance ? Math.round((curr.distance - prev.distance) / prev.distance * 100) : null
        },
        eqm: {
          current: curr.eqm,
          previous: prev.eqm,
          change: curr.eqm - prev.eqm,
          percentChange: prev.eqm ? Math.round((curr.eqm - prev.eqm) / prev.eqm * 100) : null
        },
        international: {
          current: curr.international,
          previous: prev.international,
          change: curr.international - prev.international
        },
        uniqueAirports: {
          current: curr.airports.size,
          previous: prev.airports.size,
          change: curr.airports.size - prev.airports.size
        }
      }
    });
  }
  
  return {
    yearlyData: Object.fromEntries(
      years.map(y => [y, {
        ...byYear[y],
        airports: byYear[y].airports.size,
        countries: byYear[y].countries.size
      }])
    ),
    comparisons,
    busiestYear: years.reduce((max, y) => byYear[y].flights > (byYear[max]?.flights || 0) ? y : max, years[0]),
    quietestYear: years.reduce((min, y) => byYear[y].flights < (byYear[min]?.flights || Infinity) ? y : min, years[0])
  };
}


// ============================================================================
// SEASONAL & PATTERN DETECTION
// ============================================================================

export function detectSeasonalPatterns(flights) {
  const flown = flights.filter(f => f.departureDate);
  
  // Monthly patterns across all years
  const monthlyAverages = Array(12).fill(0);
  const monthCounts = Array(12).fill(0);
  const yearCount = new Set(flown.map(f => f.departureDate.slice(0, 4))).size;
  
  for (const f of flown) {
    const month = parseInt(f.departureDate.slice(5, 7), 10) - 1;
    monthlyAverages[month]++;
  }
  
  for (let i = 0; i < 12; i++) {
    monthlyAverages[i] = Math.round(monthlyAverages[i] / yearCount * 10) / 10;
  }
  
  // Find peak and low seasons
  const avgFlightsPerMonth = flown.length / 12 / yearCount;
  const peakMonths = [];
  const lowMonths = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  for (let i = 0; i < 12; i++) {
    if (monthlyAverages[i] > avgFlightsPerMonth * 1.25) {
      peakMonths.push({ month: monthNames[i], avgFlights: monthlyAverages[i] });
    }
    if (monthlyAverages[i] < avgFlightsPerMonth * 0.75) {
      lowMonths.push({ month: monthNames[i], avgFlights: monthlyAverages[i] });
    }
  }
  
  // Detect recurring routes by month
  const routesByMonth = {};
  for (const f of flown) {
    const month = parseInt(f.departureDate.slice(5, 7), 10);
    const route = [f.origin, f.destination].sort().join('-');
    const key = `${month}|${route}`;
    if (!routesByMonth[key]) routesByMonth[key] = { month, route, years: new Set() };
    routesByMonth[key].years.add(f.departureDate.slice(0, 4));
  }
  
  // Routes that appear in same month 3+ years
  const recurringPatterns = Object.values(routesByMonth)
    .filter(p => p.years.size >= 3)
    .map(p => ({
      month: monthNames[p.month - 1],
      route: p.route,
      yearsAppeared: p.years.size,
      years: [...p.years].sort()
    }))
    .sort((a, b) => b.yearsAppeared - a.yearsAppeared);
  
  // Quarter analysis
  const quarterTotals = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  for (const f of flown) {
    const month = parseInt(f.departureDate.slice(5, 7), 10);
    const quarter = `Q${Math.ceil(month / 3)}`;
    quarterTotals[quarter]++;
  }
  
  return {
    monthlyAverageFlights: Object.fromEntries(monthNames.map((m, i) => [m, monthlyAverages[i]])),
    peakTravelMonths: peakMonths,
    lowTravelMonths: lowMonths,
    recurringPatterns: recurringPatterns.slice(0, 10),
    quarterDistribution: quarterTotals,
    insight: generateSeasonalInsight(peakMonths, recurringPatterns)
  };
}

function generateSeasonalInsight(peakMonths, recurring) {
  const insights = [];
  
  if (peakMonths.length > 0) {
    const peakNames = peakMonths.map(p => p.month).join(', ');
    insights.push(`Peak travel months: ${peakNames}`);
  }
  
  if (recurring.length > 0) {
    const top = recurring[0];
    insights.push(`Most recurring pattern: ${top.route} in ${top.month} (${top.yearsAppeared} years)`);
  }
  
  return insights;
}

// ============================================================================
// TRAVEL ERAS DETECTION
// ============================================================================

export function detectTravelEras(flights) {
  const flown = flights.filter(f => f.departureDate);
  if (flown.length < 20) return { eras: [], insufficient: true };
  
  // Group by year
  const byYear = {};
  for (const f of flown) {
    const year = f.departureDate.slice(0, 4);
    if (!byYear[year]) {
      byYear[year] = {
        flights: 0,
        distance: 0,
        international: 0,
        topAirports: {},
        topRoutes: {},
        cabins: { F: 0, C: 0, W: 0, Y: 0 }
      };
    }
    byYear[year].flights++;
    byYear[year].distance += f.distanceMiles || 0;
    if (f.international) byYear[year].international++;
    
    // Track airports
    if (f.origin) byYear[year].topAirports[f.origin] = (byYear[year].topAirports[f.origin] || 0) + 1;
    if (f.destination) byYear[year].topAirports[f.destination] = (byYear[year].topAirports[f.destination] || 0) + 1;
    
    // Track routes
    const route = [f.origin, f.destination].sort().join('-');
    byYear[year].topRoutes[route] = (byYear[year].topRoutes[route] || 0) + 1;
    
    // Track cabins
    const cabin = f.cabinFlown || 'Y';
    byYear[year].cabins[cabin]++;
  }
  
  // Detect era boundaries based on significant changes
  const years = Object.keys(byYear).sort();
  const eras = [];
  let eraStart = years[0];
  let eraCharacteristics = extractCharacteristics(byYear[years[0]]);
  
  for (let i = 1; i < years.length; i++) {
    const current = byYear[years[i]];
    const currentChar = extractCharacteristics(current);
    const change = detectSignificantChange(eraCharacteristics, currentChar);
    
    if (change.significant) {
      // End current era, start new one
      eras.push({
        startYear: eraStart,
        endYear: years[i - 1],
        characteristics: eraCharacteristics,
        avgFlightsPerYear: Math.round(
          years.slice(years.indexOf(eraStart), i)
            .reduce((sum, y) => sum + byYear[y].flights, 0) / (i - years.indexOf(eraStart))
        )
      });
      eraStart = years[i];
      eraCharacteristics = currentChar;
    } else {
      // Update rolling characteristics
      eraCharacteristics = mergeCharacteristics(eraCharacteristics, currentChar);
    }
  }
  
  // Don't forget the final era
  eras.push({
    startYear: eraStart,
    endYear: years[years.length - 1],
    characteristics: eraCharacteristics,
    avgFlightsPerYear: Math.round(
      years.slice(years.indexOf(eraStart))
        .reduce((sum, y) => sum + byYear[y].flights, 0) / (years.length - years.indexOf(eraStart))
    )
  });
  
  // Name the eras
  return {
    eras: eras.map((era, i) => ({
      ...era,
      name: nameEra(era, i, eras.length),
      duration: parseInt(era.endYear) - parseInt(era.startYear) + 1
    })),
    totalEras: eras.length
  };
}

function extractCharacteristics(yearData) {
  const topAirport = Object.entries(yearData.topAirports)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const topRoute = Object.entries(yearData.topRoutes)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const premiumRatio = (yearData.cabins.F + yearData.cabins.C) / yearData.flights;
  const intlRatio = yearData.international / yearData.flights;
  
  return {
    flightVolume: yearData.flights < 20 ? 'low' : yearData.flights < 50 ? 'moderate' : 'high',
    avgDistance: yearData.flights ? Math.round(yearData.distance / yearData.flights) : 0,
    topAirport,
    topRoute,
    premiumRatio: Math.round(premiumRatio * 100),
    intlRatio: Math.round(intlRatio * 100)
  };
}

function detectSignificantChange(prev, curr) {
  const reasons = [];
  
  // Volume change
  if (prev.flightVolume !== curr.flightVolume) {
    reasons.push(`Volume: ${prev.flightVolume} → ${curr.flightVolume}`);
  }
  
  // Home airport change
  if (prev.topAirport && curr.topAirport && prev.topAirport !== curr.topAirport) {
    reasons.push(`Hub: ${prev.topAirport} → ${curr.topAirport}`);
  }
  
  // Significant distance change (>50%)
  if (prev.avgDistance && Math.abs(curr.avgDistance - prev.avgDistance) / prev.avgDistance > 0.5) {
    reasons.push(`Distance: ${prev.avgDistance}mi → ${curr.avgDistance}mi`);
  }
  
  // Premium travel change (>20 percentage points)
  if (Math.abs(curr.premiumRatio - prev.premiumRatio) > 20) {
    reasons.push(`Premium: ${prev.premiumRatio}% → ${curr.premiumRatio}%`);
  }
  
  return {
    significant: reasons.length >= 2,
    reasons
  };
}

function mergeCharacteristics(prev, curr) {
  return {
    flightVolume: curr.flightVolume,
    avgDistance: Math.round((prev.avgDistance + curr.avgDistance) / 2),
    topAirport: curr.topAirport,
    topRoute: curr.topRoute,
    premiumRatio: Math.round((prev.premiumRatio + curr.premiumRatio) / 2),
    intlRatio: Math.round((prev.intlRatio + curr.intlRatio) / 2)
  };
}

function nameEra(era, index, total) {
  const chars = era.characteristics;
  
  // Generate descriptive name based on characteristics
  const descriptors = [];
  
  if (chars.premiumRatio > 30) descriptors.push('Premium');
  if (chars.intlRatio > 40) descriptors.push('Global');
  else if (chars.intlRatio < 10) descriptors.push('Domestic');
  if (chars.flightVolume === 'high') descriptors.push('Road Warrior');
  else if (chars.flightVolume === 'low') descriptors.push('Occasional');
  
  if (descriptors.length === 0) descriptors.push('Balanced');
  
  return `${descriptors.join(' ')} Era (${era.startYear}-${era.endYear})`;
}


// ============================================================================
// CONNECTION & LAYOVER ANALYSIS
// ============================================================================

export function analyzeConnections(flights) {
  const flown = flights.filter(f => f.departureDate);
  const sorted = [...flown].sort((a, b) => {
    const dateA = a.departureDate + (a.departureTime || '0000');
    const dateB = b.departureDate + (b.departureTime || '0000');
    return dateA.localeCompare(dateB);
  });
  
  const connections = [];
  const connectionAirports = {};
  let directFlights = 0;
  let connectingFlights = 0;
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    
    // Check if same day or next day at same airport
    if (current.destination === next.origin) {
      const dayDiff = getDayDifference(current.departureDate, next.departureDate);
      
      if (dayDiff >= 0 && dayDiff <= 1) {
        // This is likely a connection
        connections.push({
          date: current.departureDate,
          origin: current.origin,
          connection: current.destination,
          destination: next.destination,
          fullRoute: `${current.origin}-${current.destination}-${next.destination}`,
          connectionAirport: current.destination
        });
        
        connectionAirports[current.destination] = (connectionAirports[current.destination] || 0) + 1;
        connectingFlights += 2;
        i++; // Skip next flight as it's part of this connection
      } else {
        directFlights++;
      }
    } else {
      directFlights++;
    }
  }
  
  // Add last flight if not part of connection
  if (sorted.length > 0 && (connections.length === 0 || 
      connections[connections.length - 1].destination !== sorted[sorted.length - 1].destination)) {
    directFlights++;
  }
  
  const topConnectionAirports = Object.entries(connectionAirports)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([airport, count]) => ({ airport, count }));
  
  return {
    totalConnections: connections.length,
    totalDirectFlights: directFlights,
    totalConnectingFlights: connectingFlights,
    connectionRate: flown.length ? Math.round(connectingFlights / flown.length * 100) : 0,
    topConnectionAirports,
    favoriteConnectionHub: topConnectionAirports[0]?.airport || null,
    recentConnections: connections.slice(-10).reverse()
  };
}

function getDayDifference(date1, date2) {
  if (!date1 || !date2) return -1;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

// ============================================================================
// MILES EARNING EFFICIENCY
// ============================================================================

export function analyzeMilesEfficiency(flights, milesActivity) {
  const flown = flights.filter(f => f.departureDate && f.distanceMiles > 0);
  
  // Calculate earning rates by fare class
  const byFareClass = {};
  for (const f of flown) {
    const fareClass = f.bookingClass || 'Unknown';
    if (!byFareClass[fareClass]) {
      byFareClass[fareClass] = { flights: 0, distance: 0, baseMiles: 0, bonusMiles: 0 };
    }
    byFareClass[fareClass].flights++;
    byFareClass[fareClass].distance += f.distanceMiles || 0;
    byFareClass[fareClass].baseMiles += f.baseMiles || 0;
    byFareClass[fareClass].bonusMiles += f.bonusMiles || 0;
  }
  
  // Calculate earning rate per mile flown
  const fareClassEfficiency = Object.entries(byFareClass)
    .map(([fc, data]) => ({
      fareClass: fc,
      flights: data.flights,
      totalDistance: data.distance,
      totalBaseMiles: data.baseMiles,
      totalBonusMiles: data.bonusMiles,
      earningRate: data.distance ? Math.round((data.baseMiles + data.bonusMiles) / data.distance * 100) / 100 : 0
    }))
    .sort((a, b) => b.earningRate - a.earningRate);
  
  // Overall stats
  const totalDistance = flown.reduce((sum, f) => sum + (f.distanceMiles || 0), 0);
  const totalBaseMiles = flown.reduce((sum, f) => sum + (f.baseMiles || 0), 0);
  const totalBonusMiles = flown.reduce((sum, f) => sum + (f.bonusMiles || 0), 0);
  
  // Miles from partners/credit cards
  const partnerMiles = milesActivity
    .filter(a => a.type === 'earning' && a.category !== 'flight')
    .reduce((sum, a) => sum + a.totalMiles, 0);
  
  const redemptionMiles = milesActivity
    .filter(a => a.type === 'redemption')
    .reduce((sum, a) => sum + Math.abs(a.totalMiles), 0);
  
  return {
    overallEarningRate: totalDistance ? Math.round((totalBaseMiles + totalBonusMiles) / totalDistance * 100) / 100 : 0,
    totalFlightMilesEarned: totalBaseMiles + totalBonusMiles,
    totalPartnerMilesEarned: partnerMiles,
    totalMilesRedeemed: redemptionMiles,
    netMilesBalance: (totalBaseMiles + totalBonusMiles + partnerMiles) - redemptionMiles,
    byFareClass: fareClassEfficiency.slice(0, 15),
    bonusRatio: totalBaseMiles ? Math.round(totalBonusMiles / totalBaseMiles * 100) : 0,
    insight: `For every mile flown, you earn ${(totalBaseMiles + totalBonusMiles) / totalDistance > 1 ? 
      Math.round((totalBaseMiles + totalBonusMiles) / totalDistance * 10) / 10 : 
      Math.round((totalBaseMiles + totalBonusMiles) / totalDistance * 100) / 100} award miles`
  };
}

// ============================================================================
// LOUNGE MEMBERSHIP ROI
// ============================================================================

export function calculateLoungeROI(loungeVisits, membershipData = null) {
  if (!loungeVisits || loungeVisits.length === 0) {
    return { insufficient: true, totalVisits: 0 };
  }
  
  // Group visits by year
  const byYear = {};
  for (const v of loungeVisits) {
    if (!v.date) continue;
    const year = v.date.slice(0, 4);
    if (!byYear[year]) {
      byYear[year] = { visits: 0, guests: 0, flagshipVisits: 0, diningEligible: 0 };
    }
    byYear[year].visits++;
    byYear[year].guests += (v.guests || 1) - 1; // Subtract self
    if (v.loungeType?.includes('Flagship')) byYear[year].flagshipVisits++;
    if (v.diningEligible) byYear[year].diningEligible++;
  }
  
  // Estimate value (conservative estimates)
  const valuePerVisit = 50; // Food, drinks, wifi, comfort
  const valuePerGuest = 35; // Guest pass value
  const valuePerFlagship = 25; // Premium over regular lounge
  const valuePerDining = 40; // Sit-down meal value
  
  const yearlyROI = Object.entries(byYear).map(([year, data]) => {
    const totalValue = 
      data.visits * valuePerVisit +
      data.guests * valuePerGuest +
      data.flagshipVisits * valuePerFlagship +
      data.diningEligible * valuePerDining;
    
    return {
      year,
      visits: data.visits,
      guests: data.guests,
      flagshipVisits: data.flagshipVisits,
      estimatedValue: totalValue,
      valuePerVisit: data.visits ? Math.round(totalValue / data.visits) : 0
    };
  }).sort((a, b) => a.year.localeCompare(b.year));
  
  const totalVisits = loungeVisits.length;
  const totalValue = yearlyROI.reduce((sum, y) => sum + y.estimatedValue, 0);
  const avgVisitsPerYear = yearlyROI.length ? Math.round(totalVisits / yearlyROI.length * 10) / 10 : 0;
  
  return {
    totalVisits,
    totalEstimatedValue: totalValue,
    avgVisitsPerYear,
    avgValuePerVisit: totalVisits ? Math.round(totalValue / totalVisits) : 0,
    yearlyBreakdown: yearlyROI,
    membershipPaysOff: avgVisitsPerYear >= 7, // Rough threshold for $550/year fee
    insight: avgVisitsPerYear >= 7 
      ? `With ${avgVisitsPerYear} visits/year, membership pays for itself`
      : `At ${avgVisitsPerYear} visits/year, consider pay-per-visit options`
  };
}


// ============================================================================
// BOOKING LEAD TIME ANALYSIS
// ============================================================================

export function analyzeBookingPatterns(flights) {
  const withBooking = flights.filter(f => f.bookingDate && f.departureDate);
  
  if (withBooking.length === 0) {
    return { insufficient: true };
  }
  
  const leadTimes = [];
  const byLeadBucket = {
    'Same day': 0,
    '1-7 days': 0,
    '8-14 days': 0,
    '15-30 days': 0,
    '31-60 days': 0,
    '61-90 days': 0,
    '90+ days': 0
  };
  
  for (const f of withBooking) {
    const booking = new Date(f.bookingDate);
    const departure = new Date(f.departureDate);
    const leadDays = Math.round((departure - booking) / (1000 * 60 * 60 * 24));
    
    if (leadDays < 0 || leadDays > 365) continue; // Invalid
    
    leadTimes.push({
      leadDays,
      route: `${f.origin}-${f.destination}`,
      international: f.international
    });
    
    if (leadDays === 0) byLeadBucket['Same day']++;
    else if (leadDays <= 7) byLeadBucket['1-7 days']++;
    else if (leadDays <= 14) byLeadBucket['8-14 days']++;
    else if (leadDays <= 30) byLeadBucket['15-30 days']++;
    else if (leadDays <= 60) byLeadBucket['31-60 days']++;
    else if (leadDays <= 90) byLeadBucket['61-90 days']++;
    else byLeadBucket['90+ days']++;
  }
  
  const validLeadTimes = leadTimes.filter(l => l.leadDays >= 0 && l.leadDays <= 365);
  const sorted = validLeadTimes.map(l => l.leadDays).sort((a, b) => a - b);
  
  // Domestic vs International comparison
  const domesticLeads = validLeadTimes.filter(l => !l.international).map(l => l.leadDays);
  const intlLeads = validLeadTimes.filter(l => l.international).map(l => l.leadDays);
  
  return {
    totalBookingsAnalyzed: validLeadTimes.length,
    averageLeadDays: sorted.length ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : null,
    medianLeadDays: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
    minLeadDays: sorted.length ? sorted[0] : null,
    maxLeadDays: sorted.length ? sorted[sorted.length - 1] : null,
    distribution: byLeadBucket,
    domesticAverage: domesticLeads.length ? Math.round(domesticLeads.reduce((a, b) => a + b, 0) / domesticLeads.length) : null,
    internationalAverage: intlLeads.length ? Math.round(intlLeads.reduce((a, b) => a + b, 0) / intlLeads.length) : null,
    lastMinuteBookings: byLeadBucket['Same day'] + byLeadBucket['1-7 days'],
    advancePlanners: byLeadBucket['61-90 days'] + byLeadBucket['90+ days'],
    insight: generateBookingInsight(sorted, byLeadBucket)
  };
}

function generateBookingInsight(sorted, buckets) {
  if (!sorted.length) return null;
  
  const avg = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
  const lastMinute = buckets['Same day'] + buckets['1-7 days'];
  const advanced = buckets['61-90 days'] + buckets['90+ days'];
  const total = sorted.length;
  
  if (lastMinute / total > 0.3) {
    return `You're a spontaneous traveler - ${Math.round(lastMinute / total * 100)}% of flights booked within a week`;
  } else if (advanced / total > 0.3) {
    return `You're a planner - ${Math.round(advanced / total * 100)}% of flights booked 60+ days ahead`;
  }
  
  return `Average booking lead time: ${avg} days before departure`;
}

// ============================================================================
// COMPREHENSIVE STATS GENERATOR
// ============================================================================

/**
 * Generate comprehensive Phase 2 statistics
 * This adds Phase 2 specific analytics to the base stats
 * 
 * @param {Object} data - Contains flights, loungeVisits, milesActivity, profile, etc.
 * @param {Object} baseStats - Pre-calculated Phase 1 statistics (optional)
 */
export function generatePhase2Stats(data, baseStats = null) {
  const { 
    flights, 
    loungeVisits, 
    milesActivity, 
    swuCertificates, 
    partnerActivity,
    redemptions,
    profile 
  } = data;
  
  // Combine all miles activity for analysis
  const allMilesActivity = [
    ...(milesActivity || []),
    ...(partnerActivity || []).map(p => ({
      date: p.activityDate,
      description: p.description,
      totalMiles: (p.baseMiles || 0) + (p.bonusMiles || 0),
      type: 'earning',
      category: 'partner'
    })),
    ...(redemptions || []).map(r => ({
      date: r.redemptionDate,
      description: r.description,
      totalMiles: -Math.abs(r.milesRedeemed || 0),
      type: 'redemption',
      category: detectRedemptionCategory(r.description)
    }))
  ];
  
  // Phase 2 Enhanced Stats
  const phase2Stats = {
    statusHistory: inferStatusHistory(flights),
    millionMiler: calculateMillionMilerProgress(flights),
    yearOverYear: calculateYearOverYear(flights, allMilesActivity),
    seasonalPatterns: detectSeasonalPatterns(flights),
    travelEras: detectTravelEras(flights),
    connections: analyzeConnections(flights),
    milesEfficiency: analyzeMilesEfficiency(flights, allMilesActivity),
    loungeROI: calculateLoungeROI(loungeVisits || []),
    bookingPatterns: analyzeBookingPatterns(flights)
  };
  
  // If base stats provided, merge them
  if (baseStats) {
    return {
      ...baseStats,
      ...phase2Stats,
      metadata: {
        ...(baseStats.metadata || {}),
        generatedAt: new Date().toISOString(),
        version: '2.0.0',
        phase: 2
      }
    };
  }
  
  // Otherwise return just Phase 2 stats with metadata
  return {
    ...phase2Stats,
    profile,
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '2.0.0',
      phase: 2,
      flightCount: flights.length,
      dataRange: {
        first: flights[0]?.departureDate,
        last: flights[flights.length - 1]?.departureDate,
        yearsSpan: getYearsSpan(flights)
      }
    }
  };
}

function detectRedemptionCategory(description) {
  const desc = (description || '').toLowerCase();
  if (desc.includes('flight') || desc.includes('award')) return 'award_flight';
  if (desc.includes('upgrade')) return 'upgrade';
  if (desc.includes('hotel')) return 'hotel';
  if (desc.includes('car')) return 'car_rental';
  return 'other';
}

function getYearsSpan(flights) {
  const flown = flights.filter(f => f.departureDate);
  if (!flown.length) return 0;
  
  const years = new Set(flown.map(f => f.departureDate.slice(0, 4)));
  return years.size;
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export stats to downloadable JSON
 */
export function exportStatsToJson(stats) {
  const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `aadvantage-stats-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Export flights to CSV
 */
export function exportFlightsToCsv(flights) {
  const headers = [
    'Date', 'Flight', 'Origin', 'Origin City', 'Destination', 'Destination City',
    'Distance', 'Duration', 'Cabin', 'Upgraded', 'EQM', 'EQS', 'EQD', 
    'Base Miles', 'Bonus Miles', 'International', 'PNR'
  ];
  
  const rows = flights.map(f => [
    f.departureDate,
    f.marketingFlight,
    f.origin,
    f.originCity,
    f.destination,
    f.destinationCity,
    f.distanceMiles,
    f.estimatedDurationHours,
    f.cabinFlown,
    f.upgraded ? 'Yes' : 'No',
    f.eqm,
    f.eqs,
    f.eqd,
    f.baseMiles,
    f.bonusMiles,
    f.international ? 'Yes' : 'No',
    f.pnr
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${cell || ''}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `aadvantage-flights-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  
  URL.revokeObjectURL(url);
}
