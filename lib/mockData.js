// Mock data for simulator / dev testing.
// Set MOCK_MODE to false to always hit real Supabase.
export const MOCK_MODE = __DEV__

export const MOCK_USER_ID = 'mock-user-123'

// Confirmed working Unsplash images (verified 2026-03-28)
const IMG = {
  tacos1: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&h=500&fit=crop',
  tacos2: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&h=500&fit=crop',
  tacos3: 'https://images.unsplash.com/photo-1504544750208-dc0358e63f7f?w=800&h=500&fit=crop',
  tacos4: 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=800&h=500&fit=crop',
}

// ── Consumer ────────────────────────────────────────────────────────────────

export const MOCK_NEARBY_OFFERS = [
  {
    id: 'offer-1',
    text: '3 tacos for the price of 2 — right now only!',
    photo_url: IMG.tacos1,
    distance_metres: 85,
    spots_remaining: 8,
    claimed: 12,
    max_redemptions: 20,
  },
  {
    id: 'offer-2',
    text: 'Free horchata with any order over 2 tacos',
    photo_url: IMG.tacos2,
    distance_metres: 310,
    spots_remaining: 14,
    claimed: 6,
    max_redemptions: 20,
  },
  {
    id: 'offer-3',
    text: '2-for-1 cocktails 5–7 pm',
    distance_metres: 530,
    spots_remaining: 5,
    claimed: 15,
    max_redemptions: 20,
  },
]

export const MOCK_HISTORY = [
  {
    id: 'red-1',
    redeemed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    offers: {
      text: '3 tacos for the price of 2',
      supplier_profiles: { business_name: 'El Fuego Taco Truck', category: 'Mexican Street Food' },
    },
  },
  {
    id: 'red-2',
    redeemed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    offers: {
      text: '2-for-1 cocktails 5–7 pm',
      supplier_profiles: { business_name: 'Nook Bar', category: 'Bar' },
    },
  },
  {
    id: 'red-3',
    redeemed_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    offers: {
      text: '20% off your total bill',
      supplier_profiles: { business_name: 'Pasta Basta', category: 'Restaurant' },
    },
  },
]

// ── Supplier — El Fuego Taco Truck ───────────────────────────────────────────

export const MOCK_SUPPLIER_PROFILE = {
  id: 'profile-1',
  user_id: MOCK_USER_ID,
  business_name: 'El Fuego Taco Truck',
  category: 'Mexican Street Food',
  location_type: 'gps',
  fixed_address: null,
  broadcast_radius: 500,
  plan: 'free',
  created_at: new Date().toISOString(),
}

export const MOCK_ACTIVE_OFFER = {
  id: 'active-offer-1',
  supplier_id: MOCK_USER_ID,
  text: '3 tacos for the price of 2 — today only!',
  photo_url: IMG.tacos1,
  max_redemptions: 20,
  claimed_count: 12,
  duration_minutes: 60,
  status: 'active',
  boost_used: false,
  broadcast_radius: 500,
  expires_at: new Date(Date.now() + 28 * 60 * 1000).toISOString(),
  created_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
}

export const MOCK_RECENT_CLOSED_OFFERS = [
  {
    id: 'closed-1',
    text: 'Free horchata with any order over 2 tacos',
    photo_url: IMG.tacos2,
    max_redemptions: 15,
    claimed_count: 15,
    status: 'closed',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'closed-2',
    text: 'Taco Tuesday — 4 tacos for 100 kr',
    photo_url: IMG.tacos3,
    max_redemptions: 30,
    claimed_count: 27,
    status: 'closed',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'closed-3',
    text: 'Free guacamole with every order',
    photo_url: IMG.tacos4,
    max_redemptions: 20,
    claimed_count: 20,
    status: 'closed',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// Full offer detail objects keyed by id — used by the offer detail screen
export const MOCK_OFFER_DETAILS = {
  'offer-1': {
    id: 'offer-1',
    text: '3 tacos for the price of 2 — today only!',
    photo_url: IMG.tacos1,
    claimed_count: 12,
    max_redemptions: 20,
    status: 'active',
    boost_used: false,
    distance_metres: 85,
    expires_at: new Date(Date.now() + 28 * 60 * 1000).toISOString(),
    supplier_profiles: {
      business_name: 'El Fuego Taco Truck',
      category: 'Mexican Street Food',
    },
  },
  'offer-2': {
    id: 'offer-2',
    text: 'Free horchata with any order over 2 tacos',
    photo_url: IMG.tacos2,
    claimed_count: 6,
    max_redemptions: 20,
    status: 'active',
    boost_used: false,
    distance_metres: 310,
    expires_at: new Date(Date.now() + 52 * 60 * 1000).toISOString(),
    supplier_profiles: {
      business_name: 'El Fuego Taco Truck',
      category: 'Mexican Street Food',
    },
  },
  'offer-3': {
    id: 'offer-3',
    text: '2-for-1 cocktails 5–7 pm',
    photo_url: null,
    claimed_count: 15,
    max_redemptions: 20,
    status: 'active',
    boost_used: false,
    distance_metres: 530,
    expires_at: new Date(Date.now() + 8 * 60 * 1000).toISOString(), // Nearly expired — urgent
    supplier_profiles: {
      business_name: 'Nook Bar',
      category: 'Bar',
    },
  },
}

export const MOCK_LIVE_REDEMPTIONS = [
  {
    id: 'lr-1',
    status: 'redeemed',
    reserved_at: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    redeemed_at: new Date(Date.now() - 27 * 60 * 1000).toISOString(),
  },
  {
    id: 'lr-2',
    status: 'redeemed',
    reserved_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    redeemed_at: new Date(Date.now() - 21 * 60 * 1000).toISOString(),
  },
  {
    id: 'lr-3',
    status: 'redeemed',
    reserved_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    redeemed_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
  },
  {
    id: 'lr-4',
    status: 'redeemed',
    reserved_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    redeemed_at: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
  },
  {
    id: 'lr-5',
    status: 'pending',
    reserved_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    redeemed_at: null,
  },
]
