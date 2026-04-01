export const COLORS = {
  primary: '#3D7A5E',       // English green
  primaryDark: '#2A5A44',
  primaryLight: '#E6F2EC',
  navy: '#2A5A44',          // Deep green — headers, strong accents
  navyLight: '#3D7A5E',
  red: '#D94038',           // Red — urgency, CTAs
  redLight: '#FCEAEA',
  cream: '#FDFBF7',         // Vanilla white — background
  yellow: '#F5C842',
  yellowLight: '#FEF9E7',
  danger: '#B02820',
  text: '#1A2E25',          // Deep green-tinted text
  textSecondary: '#7A8C83',
  border: '#DCE8E2',
  background: '#FDFBF7',    // Vanilla white
  white: '#FFFFFF',
  card: '#FFFFFF',
}

export const DISCOVER_RADII = [
  { label: '100m', value: 100 },
  { label: '300m', value: 300 },
  { label: '500m', value: 500 },
  { label: '1 km', value: 1000 },
  { label: '2 km', value: 2000 },
]

export const SESSION_LENGTHS = [
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
  { label: 'Always On', value: null },
]

export const OFFER_DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: 'Open', value: null },
]

export const MAX_REDEMPTIONS_OPTIONS = [5, 10, 20, 50]

export const OFFER_TEMPLATES = [
  { id: 'half_off', label: '50% off', text: '50% off for the next {{N}} customers' },
  { id: 'free_drink', label: 'Free drink', text: 'Free drink with any purchase' },
  { id: 'bogo', label: 'Buy 1 get 1', text: 'Buy 1 get 1 free' },
  { id: 'free_side', label: 'Free side', text: 'Free side dish with any main' },
]

export const BOOST_OPTIONS = [
  { id: 'discount', label: 'Increase discount', description: 'Raise your offer to attract more customers' },
  { id: 'free_item', label: 'Add a free item', description: 'Throw in something extra' },
  { id: 'wider_radius', label: 'Widen radius', description: 'Reach more people nearby' },
]

// Stall detection: boost prompt shown when fewer than 30% of spots claimed after 50% of duration
export const STALL_THRESHOLD_CLAIMED = 0.3
export const STALL_THRESHOLD_ELAPSED = 0.5

// QR reservation window in minutes
export const QR_RESERVATION_MINUTES = 15
