/**
 * Fare class mappings - booking codes to cabin classes
 */
export const FARE_CLASSES = {
  // First Class
  "F": { cabin: "F", cabinName: "First Class", description: "Full fare first" },
  "A": { cabin: "F", cabinName: "First Class", description: "Discounted first" },
  "P": { cabin: "F", cabinName: "First Class", description: "First class award" },
  
  // Business Class
  "J": { cabin: "C", cabinName: "Business Class", description: "Full fare business" },
  "R": { cabin: "C", cabinName: "Business Class", description: "Discounted business" },
  "D": { cabin: "C", cabinName: "Business Class", description: "Discounted business" },
  "I": { cabin: "C", cabinName: "Business Class", description: "Business class award" },
  "C": { cabin: "C", cabinName: "Business Class", description: "Business class" },
  
  // Premium Economy
  "W": { cabin: "W", cabinName: "Premium Economy", description: "Premium economy" },
  "E": { cabin: "W", cabinName: "Premium Economy", description: "Premium economy" },
  
  // Economy
  "Y": { cabin: "Y", cabinName: "Economy", description: "Full fare economy" },
  "B": { cabin: "Y", cabinName: "Economy", description: "Economy" },
  "M": { cabin: "Y", cabinName: "Economy", description: "Economy" },
  "H": { cabin: "Y", cabinName: "Economy", description: "Discounted economy" },
  "K": { cabin: "Y", cabinName: "Economy", description: "Discounted economy" },
  "L": { cabin: "Y", cabinName: "Economy", description: "Discounted economy" },
  "G": { cabin: "Y", cabinName: "Economy", description: "Discounted economy" },
  "V": { cabin: "Y", cabinName: "Economy", description: "Discounted economy" },
  "S": { cabin: "Y", cabinName: "Economy", description: "Discounted economy" },
  "N": { cabin: "Y", cabinName: "Economy", description: "Deep discount economy" },
  "Q": { cabin: "Y", cabinName: "Economy", description: "Deep discount economy" },
  "O": { cabin: "Y", cabinName: "Economy", description: "Basic economy/award" },
  "T": { cabin: "Y", cabinName: "Economy", description: "Economy award" },
  "U": { cabin: "Y", cabinName: "Economy", description: "Economy award" },
  "X": { cabin: "Y", cabinName: "Economy", description: "Economy award" },
  "Z": { cabin: "Y", cabinName: "Economy", description: "Economy" }
};

// Economy fare classes for upgrade detection
export const ECONOMY_CLASSES = new Set(['Y', 'B', 'M', 'H', 'K', 'L', 'G', 'V', 'S', 'N', 'Q', 'O', 'T', 'U', 'X', 'Z']);
export const PREMIUM_CABIN_CODES = new Set(['F', 'C']);

/**
 * Get cabin code from fare class
 */
export function getCabinFromFare(fareClass) {
  const info = FARE_CLASSES[fareClass?.trim()?.toUpperCase()];
  return info?.cabin || 'Y';
}

/**
 * Get full fare class info
 */
export function getFareInfo(fareClass) {
  return FARE_CLASSES[fareClass?.trim()?.toUpperCase()] || { cabin: 'Y', cabinName: 'Economy', description: 'Unknown' };
}
