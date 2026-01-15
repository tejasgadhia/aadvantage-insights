/**
 * Calculate time pattern statistics
 */
export function calculateTimePatterns(flights) {
  const flown = flights.filter(f => f.departureDate);
  
  const months = new Map();
  const days = new Map();
  const quarters = new Map();
  const yearlyTrend = new Map();
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  for (const f of flown) {
    // Month
    const month = parseInt(f.departureDate.slice(5, 7), 10);
    months.set(month, (months.get(month) || 0) + 1);
    
    // Day of week
    try {
      const dt = new Date(f.departureDate);
      const dayName = dt.toLocaleDateString('en-US', { weekday: 'long' });
      days.set(dayName, (days.get(dayName) || 0) + 1);
    } catch (e) {}
    
    // Quarter
    const q = `Q${Math.ceil(month / 3)}`;
    quarters.set(q, (quarters.get(q) || 0) + 1);
    
    // Year
    const year = f.departureDate.slice(0, 4);
    yearlyTrend.set(year, (yearlyTrend.get(year) || 0) + 1);
  }
  
  // Booking lead time
  const leadTimes = [];
  for (const f of flown) {
    if (f.bookingDate && f.departureDate) {
      try {
        const book = new Date(f.bookingDate);
        const dep = new Date(f.departureDate);
        const lead = Math.round((dep - book) / (1000 * 60 * 60 * 24));
        if (lead >= 0 && lead <= 365) leadTimes.push(lead);
      } catch (e) {}
    }
  }
  
  const busiestMonth = [...months.entries()].sort((a, b) => b[1] - a[1])[0];
  const busiestDay = [...days.entries()].sort((a, b) => b[1] - a[1])[0];
  
  return {
    byMonth: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [monthNames[i], months.get(i + 1) || 0])),
    busiestMonth: busiestMonth ? monthNames[busiestMonth[0] - 1] : null,
    byDayOfWeek: Object.fromEntries(days),
    busiestDay: busiestDay ? busiestDay[0] : null,
    byQuarter: Object.fromEntries(quarters),
    yearlyTrend: Object.fromEntries([...yearlyTrend.entries()].sort()),
    bookingLeadTime: {
      averageDays: leadTimes.length ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) : null,
      minDays: leadTimes.length ? Math.min(...leadTimes) : null,
      maxDays: leadTimes.length ? Math.max(...leadTimes) : null
    }
  };
}

/**
 * Calculate loyalty program statistics
 */
export function calculateLoyaltyStats(flights, milesActivity, swuCertificates, profile) {
  const flown = flights.filter(f => f.departureDate);
  
  const totalEqm = flown.reduce((sum, f) => sum + (f.eqm || 0), 0);
  const totalEqs = flown.reduce((sum, f) => sum + (f.eqs || 0), 0);
  const totalEqd = flown.reduce((sum, f) => sum + (f.eqd || 0), 0);
  
  const flightBase = flown.reduce((sum, f) => sum + (f.baseMiles || 0), 0);
  const flightBonus = flown.reduce((sum, f) => sum + (f.bonusMiles || 0), 0);
  
  // Earning by category
  const earningByCategory = new Map();
  for (const a of milesActivity) {
    if (a.type === 'earning') {
      earningByCategory.set(a.category, (earningByCategory.get(a.category) || 0) + a.totalMiles);
    }
  }
  
  // Redemption by category
  const redemptionByCategory = new Map();
  for (const a of milesActivity) {
    if (a.type === 'redemption') {
      redemptionByCategory.set(a.category, (redemptionByCategory.get(a.category) || 0) + Math.abs(a.totalMiles));
    }
  }
  
  // SWU stats
  const swuEarned = swuCertificates.reduce((sum, s) => sum + (s.earned || 0), 0);
  const swuUsed = swuCertificates.reduce((sum, s) => sum + (s.used || 0), 0);
  const swuExpired = swuCertificates.reduce((sum, s) => sum + (s.expired || 0), 0);
  const swuAvailable = swuCertificates.reduce((sum, s) => sum + (s.available || 0), 0);
  
  // Detected upgrades
  const detectedUpgrades = flown.filter(f => f.upgraded).length;
  
  // Cabin counts
  const cabinCounts = new Map();
  for (const f of flown) {
    if (f.cabinFlown) {
      cabinCounts.set(f.cabinFlown, (cabinCounts.get(f.cabinFlown) || 0) + 1);
    }
  }
  
  return {
    eliteQualifying: {
      totalEqm,
      totalEqs: Math.round(totalEqs * 10) / 10,
      totalEqd: Math.round(totalEqd * 100) / 100
    },
    currentStatus: profile?.statusTier,
    millionMiler: {
      level: profile?.millionMilerLevel || '0',
      totalQualifyingMiles: totalEqm
    },
    milesSources: {
      flightBase,
      flightBonus,
      totalFlight: flightBase + flightBonus,
      byCategory: Object.fromEntries(earningByCategory)
    },
    redemptions: {
      total: [...redemptionByCategory.values()].reduce((a, b) => a + b, 0),
      byCategory: Object.fromEntries(redemptionByCategory)
    },
    swuCertificates: {
      totalEarned: swuEarned,
      totalUsed: swuUsed,
      totalExpired: swuExpired,
      currentlyAvailable: swuAvailable,
      useRate: swuEarned ? Math.round(swuUsed / swuEarned * 100) / 100 : 0,
      note: 'SWU usage from AA data; individual flights cannot be identified'
    },
    upgradeStats: {
      swuUpgrades: swuUsed,
      detectedInFlightData: detectedUpgrades,
      note: 'AA overwrites booking class when SWU is applied, so most upgrades cannot be detected from flight data'
    },
    cabinDistribution: Object.fromEntries(cabinCounts)
  };
}

/**
 * Calculate lounge usage statistics
 */
export function calculateLoungeStats(loungeVisits) {
  const byAirport = new Map();
  const byType = new Map();
  const byYear = new Map();
  
  for (const v of loungeVisits) {
    if (v.airportCode) {
      byAirport.set(v.airportCode, (byAirport.get(v.airportCode) || 0) + 1);
    }
    if (v.loungeType) {
      byType.set(v.loungeType, (byType.get(v.loungeType) || 0) + 1);
    }
    if (v.date) {
      const year = v.date.slice(0, 4);
      byYear.set(year, (byYear.get(year) || 0) + 1);
    }
  }
  
  const diningEligible = loungeVisits.filter(v => v.diningEligible).length;
  const diningUsed = loungeVisits.filter(v => v.diningUsed).length;
  const flagshipEligible = loungeVisits.filter(v => v.flagshipEligible).length;
  const flagshipUsed = loungeVisits.filter(v => v.flagshipUsed).length;
  const totalGuests = loungeVisits.reduce((sum, v) => sum + (v.guests || 0), 0);
  
  return {
    totalVisits: loungeVisits.length,
    byAirport: [...byAirport.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([airport, visits]) => ({ airport, visits })),
    byLoungeType: Object.fromEntries(byType),
    byYear: Object.fromEntries([...byYear.entries()].sort()),
    dining: {
      timesEligible: diningEligible,
      timesUsed: diningUsed,
      useRate: diningEligible ? Math.round(diningUsed / diningEligible * 100) / 100 : 0
    },
    flagship: {
      timesEligible: flagshipEligible,
      timesUsed: flagshipUsed,
      useRate: flagshipEligible ? Math.round(flagshipUsed / flagshipEligible * 100) / 100 : 0
    },
    guests: {
      totalGuestsBrought: totalGuests - loungeVisits.length,
      averagePartySize: loungeVisits.length ? Math.round(totalGuests / loungeVisits.length * 10) / 10 : 0
    }
  };
}

/**
 * Calculate partner/codeshare statistics
 */
export function calculatePartnerStats(flights) {
  const flown = flights.filter(f => f.departureDate);
  
  const marketingCarriers = new Map();
  const operatingCarriers = new Map();
  
  for (const f of flown) {
    if (f.marketingFlight) {
      const carrier = f.marketingFlight.slice(0, 2);
      marketingCarriers.set(carrier, (marketingCarriers.get(carrier) || 0) + 1);
    }
    if (f.operatingFlight) {
      const carrier = f.operatingFlight.slice(0, 2);
      operatingCarriers.set(carrier, (operatingCarriers.get(carrier) || 0) + 1);
    }
  }
  
  const codeshares = flown.filter(f => 
    f.marketingFlight && f.operatingFlight &&
    f.marketingFlight.slice(0, 2) !== f.operatingFlight.slice(0, 2)
  ).length;
  
  return {
    byMarketingCarrier: [...marketingCarriers.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([airline, flights]) => ({ airline, flights })),
    byOperatingCarrier: [...operatingCarriers.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([airline, flights]) => ({ airline, flights })),
    codeshareFlights: codeshares,
    codeshareRate: flown.length ? Math.round(codeshares / flown.length * 1000) / 1000 : 0
  };
}

/**
 * Calculate firsts and milestones
 */
export function calculateMilestones(flights) {
  const flown = flights.filter(f => f.departureDate).sort((a, b) => a.departureDate.localeCompare(b.departureDate));
  
  if (!flown.length) return {};
  
  const firstFlight = flown[0];
  const firstIntl = flown.find(f => f.international);
  const firstPremium = flown.find(f => ['C', 'F'].includes(f.cabinFlown));
  
  // Distance milestones
  let cumulative = 0;
  const milestones = [];
  const thresholds = [10000, 25000, 50000, 100000, 250000, 500000, 750000, 1000000];
  const reachedThresholds = new Set();
  
  for (const f of flown) {
    cumulative += f.distanceMiles || 0;
    for (const threshold of thresholds) {
      if (cumulative >= threshold && !reachedThresholds.has(threshold)) {
        reachedThresholds.add(threshold);
        milestones.push({
          miles: threshold,
          date: f.departureDate,
          flight: `${f.origin}-${f.destination}`
        });
      }
    }
  }
  
  // New airports timeline
  const seenAirports = new Set();
  const newAirports = [];
  for (const f of flown) {
    for (const airport of [f.origin, f.destination]) {
      if (airport && !seenAirports.has(airport)) {
        seenAirports.add(airport);
        newAirports.push({
          airport,
          date: f.departureDate,
          number: seenAirports.size
        });
      }
    }
  }
  
  return {
    firstFlight: {
      route: `${firstFlight.origin}-${firstFlight.destination}`,
      date: firstFlight.departureDate
    },
    firstInternational: firstIntl ? {
      route: `${firstIntl.origin}-${firstIntl.destination}`,
      date: firstIntl.departureDate,
      destinationCountry: firstIntl.destinationCountry
    } : null,
    firstPremiumCabin: firstPremium ? {
      route: `${firstPremium.origin}-${firstPremium.destination}`,
      date: firstPremium.departureDate,
      cabin: firstPremium.cabinFlown
    } : null,
    distanceMilestones: milestones,
    newAirportsTimeline: newAirports.slice(-10)
  };
}

/**
 * Generate all statistics
 */
export function generateAllStats(flights, loungeVisits, milesActivity, swuCertificates, profile) {
  return {
    lifetime: calculateLifetimeStats(flights, loungeVisits, milesActivity, profile),
    annual: calculateAnnualStats(flights, milesActivity),
    routes: calculateRouteStats(flights),
    timePatterns: calculateTimePatterns(flights),
    loyalty: calculateLoyaltyStats(flights, milesActivity, swuCertificates, profile),
    lounge: calculateLoungeStats(loungeVisits),
    partners: calculatePartnerStats(flights),
    milestones: calculateMilestones(flights),
    profile,
    metadata: {
      generatedAt: new Date().toISOString(),
      flightCount: flights.length,
      dateRange: {
        first: flights[0]?.departureDate,
        last: flights[flights.length - 1]?.departureDate
      }
    }
  };
}
