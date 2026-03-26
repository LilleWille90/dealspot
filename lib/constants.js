export const COLORS = {
  primary: '#00a878',       // Dealspot green
  primaryDark: '#007a57',
  primaryLight: '#e6f7f3',
  amber: '#f59e0b',         // Urgency / boosted
  amberLight: '#fffbeb',
  danger: '#ef4444',
  text: '#111827',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  background: '#f9fafb',
  white: '#ffffff',
  card: '#ffffff',
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
