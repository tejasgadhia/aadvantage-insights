/**
 * AAdvantage Data Parser
 * Extracts and structures data from American Airlines JSON export files
 */

/**
 * Parse Flight Records JSON (PNR data with itineraries)
 */
export function parseFlightRecords(data) {
  const flights = [];
  const flightData = data?.['Flight Data'] || [];
  
  for (const record of flightData) {
    const itinerary = record['Itinerary Information'] || [];
    const canceledItinerary = record['Canceled Itinerary Information'] || [];
    const flightInfo = record['Your Flight Information'] || [{}];
    
    const pnrInfo = flightInfo[0] || {};
    const pnr = pnrInfo['Reservation Record Locator'] || '';
    
    // Process active itineraries
    for (const segment of itinerary) {
      const status = (segment['Segment Current Status Code'] || '').trim();
      // HK = confirmed, TK = schedule change, RR = reconfirmed
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
          status: status,
          canceled: false
        });
      }
    }
    
    // Process canceled itineraries (for historical context)
    for (const segment of canceledItinerary) {
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
        status: (segment['Segment Current Status Code'] || '').trim(),
        canceled: true
      });
    }
  }
  
  return flights;
}

/**
 * Parse Account Activity JSON (miles data)
 */
export function parseAccountActivity(data) {
  const activityData = data?.['Advantage Activity Data']?.[0] || {};
  
  // Flight activity with miles
  const flightActivity = (activityData['Flight Activity Information'] || []).map(activity => ({
    source: 'account_activity',
    departureDate: activity['Departure Date Of Flight Segment'],
    origin: (activity['Departure Airport'] || '').trim(),
    destination: (activity['Arrival Airport'] || '').trim(),
    airline: (activity['Airlines'] || '').trim(),
    flightNumber: (activity['Flight Number'] || '').trim(),
    fareClass: (activity['Fare Class'] || '').trim(),
    ticketNumber: activity['Ticket Number'],
    postedDate: activity['Posted Date'],
    eqm: parseInt(activity['Elite Qualifying - Miles (EQMs)'] || 0, 10),
    eqs: parseFloat(activity['Elite Qualifying - Segments (EQSs)'] || 0),
    eqd: parseFloat((activity['Elite Qualifying - Dollars (EQDs)'] || '0').replace(/,/g, '')),
    baseMiles: parseInt(activity['Award Miles - Base Miles'] || 0, 10),
    bonusMiles: parseInt(activity['Award Miles - Bonus Miles'] || 0, 10)
  }));
  
  // Partner activity (credit cards, hotels, etc.)
  const partnerActivity = (activityData['Partner Activity Information'] || []).map(activity => ({
    activityDate: activity['Activity Date'],
    description: (activity['Description'] || '').trim(),
    postedDate: activity['Posted Date'],
    baseMiles: parseInt(activity['Award Miles - Base Miles'] || 0, 10),
    bonusMiles: parseInt(activity['Award Miles - Bonus Miles'] || 0, 10),
    eqd: parseFloat((activity['Elite Qualifying - Dollars'] || '0').replace(/,/g, ''))
  }));
  
  // Miles redemptions
  const redemptions = (activityData['Mileage Redemption Information'] || []).map(redemption => ({
    redemptionDate: redemption['Transaction Date'],
    description: (redemption['Transaction Type Description'] || '').trim(),
    milesRedeemed: parseInt(redemption['Transaction Award Miles'] || 0, 10)
  }));
  
  // SWU certificates
  const swuCertificates = (activityData['System Wide Upgrade Information'] || []).map(swu => ({
    earnedDate: (swu['Date and time earned'] || '').split(' ')[0],
    validThrough: swu['Valid through'],
    earned: parseInt(swu['Earned'] || 0, 10),
    used: parseInt(swu['Used'] || 0, 10),
    expired: parseInt(swu['Expired'] || 0, 10),
    available: parseInt(swu['Available'] || 0, 10)
  }));
  
  return { flightActivity, partnerActivity, redemptions, swuCertificates };
}

/**
 * Parse Admirals Club JSON (lounge visits)
 */
export function parseAdmiralsClub(data) {
  const admiralData = data?.['Admiral Data']?.[0] || {};
  const transactions = admiralData['Lounge Transaction Registration Information'] || [];
  
  return transactions.map(visit => ({
    locationCode: (visit['Lounge Use Location Code'] || '').trim(),
    loungeType: (visit['Lounge Type Description'] || '').trim(),
    timestamp: visit['Registration UTC Timestamp'],
    guests: parseInt(visit['Total Number of Guests'] || 1, 10),
    registrationCategory: (visit['Registration Category Name'] || '').trim(),
    tier: (visit['Registration Tier Name'] || '').trim(),
    pnr: (visit['PNR Locator Identifier'] || '').trim(),
    flightNumber: (visit['Flight Number'] || '').trim(),
    cabinCode: (visit['Cabin Code'] || '').trim(),
    origin: (visit['Guest Departure Airport Code'] || '').trim(),
    destination: (visit['Guest Arrival Airport Code'] || '').trim(),
    international: visit['International Segment Indicator'] === 'Y',
    diningEligible: visit['Dining Eligible Indicator'] === 'Y',
    diningUsed: visit['Dining Used Indicator'] === 'Y',
    flagshipEligible: visit['Flagship Door Eligible Indicator'] === 'Y',
    flagshipUsed: visit['Flagship Door Used Indicator'] === 'Y'
  }));
}

/**
 * Parse Account Profile JSON (member info)
 */
export function parseAccountProfile(data) {
  const profileData = data?.['Profile Data']?.[0] || {};
  
  const customer = profileData['Customer Profile']?.[0] || {};
  const loyalty = profileData['Loyalty Membership Information']?.[0] || {};
  
  const profile = {
    aadvantageNumber: (loyalty['AAdvantage Number'] || '').trim(),
    statusTier: (loyalty['AAdvantage Tier Description'] || '').trim(),
    millionMilerLevel: (loyalty['AAdvantage Million Miler® Level'] || loyalty['AAdvantage Million MilerÂ® Level'] || '').trim(),
    accountStatus: (loyalty['AAdvantage Account Status'] || '').trim(),
    seatPreference: (loyalty['Seat Preference'] || '').trim(),
    homeAirport: (loyalty['Home Airport'] || '').trim(),
    firstName: (customer['Customer First Name'] || '').trim(),
    lastName: (customer['Customer Last Name'] || '').trim()
  };
  
  const companions = (profileData['Companion Preferences'] || []).map(comp => ({
    firstName: (comp['Companion First Name'] || '').trim(),
    lastName: (comp['Companion Last Name'] || '').trim(),
    aadvantageNumber: (comp['Companion Frequent Flyer Account Number'] || '').trim()
  }));
  
  return { profile, companions };
}

/**
 * Detect which type of AA file this is based on content
 */
export function detectFileType(data) {
  if (data?.['Flight Data']) return 'flight_records';
  if (data?.['Advantage Activity Data']) return 'account_activity';
  if (data?.['Admiral Data']) return 'admirals_club';
  if (data?.['Profile Data']) return 'account_profile';
  return 'unknown';
}

/**
 * Parse any AA JSON file based on its type
 */
export function parseFile(data, fileName = '') {
  const fileType = detectFileType(data);
  
  switch (fileType) {
    case 'flight_records':
      return { type: fileType, data: parseFlightRecords(data) };
    case 'account_activity':
      return { type: fileType, data: parseAccountActivity(data) };
    case 'admirals_club':
      return { type: fileType, data: parseAdmiralsClub(data) };
    case 'account_profile':
      return { type: fileType, data: parseAccountProfile(data) };
    default:
      console.warn(`Unknown file type for ${fileName}`);
      return { type: 'unknown', data: null };
  }
}
