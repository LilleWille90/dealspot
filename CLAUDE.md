# Dealspot — CLAUDE.md

This file provides context to Claude Code about the Dealspot project.

## What is Dealspot?
A dual-sided mobile app connecting food venue operators (suppliers) to nearby hungry people (consumers) via instant, location-triggered deals. Suppliers broadcast deals; consumers with Deal Mode on get push notifications.

Core principle: consumers must always feel lucky — never recruited.

## User types
- **Supplier** — restaurant, café, food truck, market stall. Creates and broadcasts deals.
- **Consumer** — nearby hungry person. Receives and redeems deals. Free forever.

## Tech stack
- React Native (Expo SDK 55) — single codebase for iOS + Android
- Expo Router (file-based routing)
- Supabase — auth, PostgreSQL database, realtime, storage, edge functions
- FCM (Firebase Cloud Messaging) — push notifications
- expo-location — background geolocation
- expo-camera / CameraView — QR code scanning
- react-native-qrcode-svg — QR code generation
- No TypeScript — plain JSX throughout

## Commands
```bash
npm start          # Start Expo dev server
npm run android    # Run on Android
npm run ios        # Run on iOS
```

## Architecture
**Auth gate:** `app/index.jsx` checks session and redirects to `/(auth)/login` or the appropriate home based on whether the user has a `supplier_profiles` row.

**Routing:**
- `/(auth)/` — login, signup
- `/(consumer)/` — consumer home, onboarding, offer detail, QR redeem, history, settings
- `/(supplier)/` — supplier dashboard, onboarding, offer builder, go-live review, live dashboard, boost builder, QR scanner, location setup, history, settings

**Supabase client:** `lib/supabase.js` — singleton, import everywhere.

**Constants:** `lib/constants.js` — colours, session lengths, radii, templates, etc.

**Styling:** React Native StyleSheet (inline styles). Colour palette defined in `lib/constants.js` — primary green `#00a878`, amber `#f59e0b` for urgency/boost states.

## Database tables (Supabase)
- `supplier_profiles` — business name, category, location type, plan/tier
- `offers` — text, photo, max_redemptions, claimed_count, status, boost_used, expires_at
- `redemptions` — consumer QR reservations and redemptions
- `consumer_locations` — real-time consumer positions (purged after 24h — GDPR)
- `supplier_locations` — live GPS for mobile suppliers
- `push_tokens` — FCM device tokens

## Supabase Edge Functions
All in `supabase/functions/`:
- `go-live` — sends push notifications to nearby consumers when supplier activates an offer
- `reserve-spot` — atomically claims a spot and creates a pending QR redemption
- `redeem-qr` — verifies and confirms a QR scan by supplier
- `boost-offer` — applies a boost (one per offer), re-notifies consumers
- `nearby-offers` — returns active offers within consumer's discovery radius
- `reachable-count` — returns anonymous count of nearby deal-mode consumers (for supplier)
- `search-address` — proxies Google Places autocomplete (keeps API key server-side)
- `delete-account` — GDPR account deletion

## Environment variables
Required in `.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Required in Supabase Edge Function secrets:
```
SUPABASE_SERVICE_ROLE_KEY=...
FCM_SERVER_KEY=...
GOOGLE_PLACES_API_KEY=...
QR_JWT_SECRET=...
```

## Setup checklist (new environment)
1. Create Supabase project
2. Run `supabase/migrations/001_initial_schema.sql` in Supabase SQL editor
3. Enable Realtime for `offers`, `redemptions`, `consumer_locations` tables
4. Create `offer-photos` storage bucket (public read)
5. Deploy all edge functions: `supabase functions deploy <name>`
6. Set edge function secrets (service role key, FCM key, Google Places key)
7. Set up Firebase project, download `google-services.json` / `GoogleService-Info.plist`
8. Fill in `.env.local` with Supabase URL and anon key
9. Run `npm start`

## Key business rules (enforce in code)
- One active offer per supplier at a time (v1)
- One boost per offer — hard limit, no exceptions
- Stall detection: < 30% claimed after 50% of duration → show boost prompt
- QR reservations expire after 15 minutes — spot returned to pool
- Consumer location stored max 24 hours (GDPR)
- Reachable count is anonymous — never expose consumer IDs or positions to suppliers

## Important notes
- The owner is NOT a developer — always write complete files, never fragments
- Explain what you're doing in plain language
- Never leave a half-working state
- Always push to GitHub at the end of a session
