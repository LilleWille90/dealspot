/**
 * nearby-offers edge function
 * Returns active offers within the consumer's discovery radius,
 * with distance calculated from consumer's position.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const { lat, lng, radius } = await req.json()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Fetch all active offers with supplier location
    const { data: offers } = await supabase
      .from('offers')
      .select(`
        id, text, photo_url, max_redemptions, claimed_count, status, broadcast_radius,
        supplier_profiles(business_name, category, location_type, fixed_lat, fixed_lng),
        supplier_locations(lat, lng)
      `)
      .in('status', ['active', 'boosted'])

    const results = (offers || [])
      .map(offer => {
        const sLat = offer.supplier_locations?.lat ?? offer.supplier_profiles?.fixed_lat
        const sLng = offer.supplier_locations?.lng ?? offer.supplier_profiles?.fixed_lng

        if (!sLat || !sLng) return null

        const distance = Math.round(haversineDistance(lat, lng, sLat, sLng))

        // Check offer's own broadcast radius too
        if (distance > (offer.broadcast_radius || 500)) return null
        // Check consumer's discovery radius
        if (distance > radius) return null

        return {
          id: offer.id,
          text: offer.text,
          photo_url: offer.photo_url,
          max_redemptions: offer.max_redemptions,
          claimed: offer.claimed_count,
          spots_remaining: offer.max_redemptions - offer.claimed_count,
          distance_metres: distance,
          status: offer.status,
          business_name: offer.supplier_profiles?.business_name,
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.distance_metres - b.distance_metres)

    return new Response(JSON.stringify({ offers: results }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}
