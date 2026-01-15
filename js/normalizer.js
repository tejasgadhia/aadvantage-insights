/**
 * AAdvantage Data Normalizer
 * Merges, deduplicates, and enriches flight data from multiple sources
 */

import { AIRPORTS, getAirport } from './data/airports.js';
import { getCabinFromFare, ECONOMY_CLASSES, PREMIUM_CABIN_CODES } from './data/fareClasses.js';

/**
 * Calculate great circle distance between two points (Haversine formula)
 * @returns Distance in miles
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth radius in miles
  const toRad = (deg) => deg * Math.PI / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

/**
 * Estimate flight duration based on distance
 */
export function estimateDuration(distanceMiles) {
  if (!distanceMiles) return null;
  if (distanceMiles < 500) return Math.round((distanceMiles / 350 + 0.5) * 10) / 10;
  if (distanceMiles < 2000) return Math.round((distanceMiles / 450 + 0.75) * 10) / 10;
  return Math.round((distanceMiles / 500 + 1.0) * 10) / 10;
}

/**
 * Create a unique key for flight deduplication
 */
function createFlightKey(origin, destination, date, flightNum = null) {
  if (flightNum) {
    const num = String(flightNum).replace(/\D/g, '');
    return `${date}|${origin}|${destination}|${num}`;
  }
  return `${date}|${origin}|${destination}`;
}

/**
 * Calculate distance between two airports
 */
function calculateDistance(origin, destination) {
  const originAirport = getAirport(origin);
  const destAirport = getAirport(destination);
  
  if (originAirport.lat && destAirport.lat) {
    return haversineDistance(
      originAirport.lat, originAirport.lon,
      destAirport.lat, destAirport.lon
    );
  }
  return null;
}

/**
 * Detect if a flight was upgraded
 */
function detectUpgrade(bookingClass, cabinFlown) {
  const isEconomyFare = ECONOMY_CLASSES.has(bookingClass?.toUpperCase());
  const isPremiumCabin = PREMIUM_CABIN_CODES.has(cabinFlown?.toUpperCase());
  return isEconomyFare && isPremiumCabin;
}

/**
 * Merge and deduplicate flights from PNR and activity sources
 */
export function mergeFlightData(flightsFromPnr, flightActivity) {
  // Index activity data by flight key for lookup
  const activityIndex = new Map();
  
  for (const act of flightActivity) {
    const key = createFlightKey(act.origin, act.destination, act.departureDate, act.flightNumber);
    const simpleKey = createFlightKey(act.origin, act.destination, act.departureDate);
    
    activityIndex.set(key, act);
    if (!activityIndex.has(simpleKey)) {
      activityIndex.set(simpleKey, act);
    }
  }
  
  const unifiedFlights = [];
  const seenKeys = new Set();
  
  // Process PNR flights first (they have more detail)
  for (const flight of flightsFromPnr) {
    if (flight.canceled) continue;
    
    const key = createFlightKey(flight.origin, flight.destination, flight.departureDate, flight.marketingFlight);
    const simpleKey = createFlightKey(flight.origin, flight.destination, flight.departureDate);
    
    if (seenKeys.has(key) || seenKeys.has(simpleKey)) continue;
    seenKeys.add(key);
    seenKeys.add(simpleKey);
    
    // Try to find matching activity
    const activity = activityIndex.get(key) || activityIndex.get(simpleKey);
    
    // Get airport info
    const originAirport = getAirport(flight.origin);
    const destAirport = getAirport(flight.destination);
    const distance = calculateDistance(flight.origin, flight.destination);
    
    // Determine cabin
    const cabinBooked = getCabinFromFare(flight.bookingClass) || flight.cabinCode?.trim() || 'Y';
    const cabinFlown = flight.cabinCode?.trim() || cabinBooked;
    
    unifiedFlights.push({
      departureDate: flight.departureDate,
      departureTime: flight.departureTime,
      arrivalDate: flight.arrivalDate,
      arrivalTime: flight.arrivalTime,
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
      upgraded: detectUpgrade(flight.bookingClass, cabinFlown),
      distanceMiles: distance,
      estimatedDurationHours: estimateDuration(distance),
      international: originAirport.country !== destAirport.country,
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
  
  // Add activity records not in PNR data
  for (const act of flightActivity) {
    const key = createFlightKey(act.origin, act.destination, act.departureDate, act.flightNumber);
    const simpleKey = createFlightKey(act.origin, act.destination, act.departureDate);
    
    if (seenKeys.has(key) || seenKeys.has(simpleKey)) continue;
    seenKeys.add(key);
    seenKeys.add(simpleKey);
    
    const originAirport = getAirport(act.origin);
    const destAirport = getAirport(act.destination);
    const distance = calculateDistance(act.origin, act.destination);
    const inferredCabin = getCabinFromFare(act.fareClass);
    
    unifiedFlights.push({
      departureDate: act.departureDate,
      departureTime: null,
      arrivalDate: null,
      arrivalTime: null,
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
      international: originAirport.country !== destAirport.country,
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
  
  // Sort by date
  unifiedFlights.sort((a, b) => (a.departureDate || '').localeCompare(b.departureDate || ''));
  
  return unifiedFlights;
}

/**
 * Normalize lounge visits with airport info
 */
export function normalizeLoungeVisits(loungeVisits) {
  return loungeVisits.map(visit => {
    const airportCode = visit.locationCode?.split('-')[0] || '';
    const airport = getAirport(airportCode);
    
    return {
      date: visit.timestamp?.split(' ')[0] || null,
      timestamp: visit.timestamp,
      airportCode,
      airportName: airport.name,
      city: airport.city,
      loungeLocation: visit.locationCode,
      loungeType: visit.loungeType,
      guests: visit.guests,
      registrationCategory: visit.registrationCategory,
      tier: visit.tier,
      flightNumber: visit.flightNumber,
      cabinCode: visit.cabinCode,
      origin: visit.origin,
      destination: visit.destination,
      international: visit.international,
      diningEligible: visit.diningEligible,
      diningUsed: visit.diningUsed,
      flagshipEligible: visit.flagshipEligible,
      flagshipUsed: visit.flagshipUsed
    };
  }).sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
}

/**
 * Categorize miles earning by description
 */
function categorizeEarning(description) {
  const desc = (description || '').toUpperCase();
  if (/CITI|CARD|CREDIT|BARCLAYS/.test(desc)) return 'credit_card';
  if (/BONUS/.test(desc)) return 'bonus';
  if (/PROMO/.test(desc)) return 'promotion';
  if (/HOTEL|HYATT|MARRIOTT/.test(desc)) return 'partner_hotel';
  if (/CAR|AVIS|HERTZ/.test(desc)) return 'partner_car';
  if (/ESHOPPING|SHOP|DINING/.test(desc)) return 'partner_shopping';
  if (/MILLION MILER/.test(desc)) return 'million_miler';
  if (/TRANSFER/.test(desc)) return 'transfer';
  return 'other';
}

/**
 * Categorize miles redemption by description
 */
function categorizeRedemption(description) {
  const desc = (description || '').toUpperCase();
  if (/UPGRADE/.test(desc)) return 'upgrade';
  if (/AWARD|TICKET/.test(desc)) return 'award_flight';
  if (/HOTEL/.test(desc)) return 'hotel';
  if (/CAR/.test(desc)) return 'car';
  if (/EXPIRE/.test(desc)) return 'expiration';
  return 'other';
}

/**
 * Normalize all miles activity
 */
export function normalizeMilesActivity(partnerActivity, redemptions) {
  const activities = [];
  
  for (const act of partnerActivity) {
    activities.push({
      date: act.activityDate,
      postedDate: act.postedDate,
      type: 'earning',
      category: categorizeEarning(act.description),
      description: act.description,
      baseMiles: act.baseMiles || 0,
      bonusMiles: act.bonusMiles || 0,
      totalMiles: (act.baseMiles || 0) + (act.bonusMiles || 0),
      eqd: act.eqd || 0
    });
  }
  
  for (const red of redemptions) {
    activities.push({
      date: red.redemptionDate,
      postedDate: red.redemptionDate,
      type: 'redemption',
      category: categorizeRedemption(red.description),
      description: red.description,
      baseMiles: 0,
      bonusMiles: 0,
      totalMiles: -Math.abs(red.milesRedeemed || 0),
      eqd: 0
    });
  }
  
  return activities.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}
