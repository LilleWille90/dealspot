/**
 * boost-offer edge function
 * Applies a boost to a stalling offer.
 * Hard limit: one boost per offer.
 * Sends re-notification to all consumers currently in range.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')!

serve(async (req) => {
  try {
    const { offer_id, boost_type, add_spots } = await req.json()
    // boost_type: 'discount' | 'free_item' | 'wider_radius'

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Fetch offer and verify it hasn't been boosted yet
    const { data: offer, error } = await supabase
      .from('offers')
      .select('*, supplier_profiles(business_name), supplier_locations(*)')
      .eq('id', offer_id)
      .single()

    if (error || !offer) {
      return new Response(JSON.stringify({ error: 'Offer not found' }), { status: 404 })
    }

    if (offer.boost_used) {
      return new Response(JSON.stringify({ error: 'Offer has already been boosted' }), { status: 409 })
    }

    if (!['active', 'boosted'].includes(offer.status)) {
      return new Response(JSON.stringify({ error: 'Offer is not active' }), { status: 400 })
    }

    // Apply boost
    const updates: Record<string, unknown> = {
      status: 'boosted',
      boost_used: true,
    }

    if (add_spots && [5, 10].includes(add_spots)) {
      updates.max_redemptions = offer.max_redemptions + add_spots
    }

    if (boost_type === 'wider_radius') {
      updates.broadcast_radius = Math.min((offer.broadcast_radius || 500) * 2, 2000)
    }

    await supabase.from('offers').update(updates).eq('id', offer_id)

    // Re-notify consumers in (possibly new) radius
    const supplierLat = offer.supplier_locations?.lat ?? offer.supplier_profiles?.fixed_lat
    const supplierLng = offer.supplier_locations?.lng ?? offer.supplier_profiles?.fixed_lng
    const newRadius = updates.broadcast_radius ?? offer.broadcast_radius ?? 500

    const { data: consumers } = await supabase
      .from('consumer_locations')
      .select('consumer_id, lat, lng')
      .eq('deal_mode_active', true)
      .not('lat', 'is', null)

    const nearbyConsumers = (consumers || []).filter(c => {
      const d = haversineDistance(supplierLat, supplierLng, c.lat, c.lng)
      return d <= newRadius
    })

    if (nearbyConsumers.length > 0) {
      const consumerIds = nearbyConsumers.map(c => c.consumer_id)
      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token')
        .in('user_id', consumerIds)

      if (tokens && tokens.length > 0) {
        await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            Authorization: `key=${FCM_SERVER_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registration_ids: tokens.map(t => t.token),
            notification: {
              title: '⚡ Deal just got better',
              body: `${offer.supplier_profiles.business_name}: ${offer.text}`,
            },
            data: { type: 'boosted_offer', offer_id },
            priority: 'high',
          }),
        })
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 })
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
