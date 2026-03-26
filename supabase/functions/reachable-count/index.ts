/**
 * reachable-count edge function
 * Returns the anonymous count of consumers with deal mode active
 * within the supplier's broadcast radius. No PII exposed.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const { supplier_id, radius } = await req.json()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Get supplier location
    const { data: profile } = await supabase
      .from('supplier_profiles')
      .select('location_type, fixed_lat, fixed_lng')
      .eq('user_id', supplier_id)
      .single()

    const { data: liveLocation } = await supabase
      .from('supplier_locations')
      .select('lat, lng')
      .eq('supplier_id', supplier_id)
      .single()

    const sLat = liveLocation?.lat ?? profile?.fixed_lat
    const sLng = liveLocation?.lng ?? profile?.fixed_lng

    if (!sLat || !sLng) {
      return new Response(JSON.stringify({ count: 0 }), { status: 200 })
    }

    // Count consumers with deal mode active and location within radius
    const { data: consumers } = await supabase
      .from('consumer_locations')
      .select('lat, lng')
      .eq('deal_mode_active', true)
      .not('lat', 'is', null)

    const count = (consumers || []).filter(c => {
      return haversineDistance(sLat, sLng, c.lat, c.lng) <= (radius || 500)
    }).length

    return new Response(JSON.stringify({ count }), { status: 200 })
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
