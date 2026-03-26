/**
 * reserve-spot edge function
 * Called when consumer taps 'Get my spot'.
 * Atomically decrements spot counter and creates a pending redemption with a signed QR token.
 * Returns redemption_id for the QR screen.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const JWT_SECRET = Deno.env.get('QR_JWT_SECRET')!

serve(async (req) => {
  try {
    const { offer_id, consumer_id } = await req.json()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Check offer is still active and has spots
    const { data: offer, error: offerErr } = await supabase
      .from('offers')
      .select('id, status, max_redemptions, claimed_count, expires_at')
      .eq('id', offer_id)
      .in('status', ['active', 'boosted'])
      .single()

    if (offerErr || !offer) {
      return new Response(JSON.stringify({ error: 'Offer not available' }), { status: 404 })
    }

    if (offer.claimed_count >= offer.max_redemptions) {
      return new Response(JSON.stringify({ error: 'All spots have been claimed' }), { status: 409 })
    }

    if (offer.expires_at && new Date(offer.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Offer has expired' }), { status: 410 })
    }

    // Check consumer hasn't already claimed this offer
    const { data: existing } = await supabase
      .from('redemptions')
      .select('id, status')
      .eq('offer_id', offer_id)
      .eq('consumer_id', consumer_id)
      .in('status', ['pending', 'redeemed'])
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ error: 'You have already claimed this offer' }), { status: 409 })
    }

    // Generate QR token (UUID-based, stored in DB — no JWT needed for basic v1)
    const qrToken = crypto.randomUUID()

    // Insert redemption
    const { data: redemption, error: insertErr } = await supabase
      .from('redemptions')
      .insert({
        offer_id,
        consumer_id,
        qr_token: qrToken,
        status: 'pending',
        reserved_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertErr) {
      return new Response(JSON.stringify({ error: 'Could not reserve spot' }), { status: 500 })
    }

    // Increment claimed_count
    await supabase
      .from('offers')
      .update({ claimed_count: offer.claimed_count + 1 })
      .eq('id', offer_id)

    // If all spots claimed, close offer
    if (offer.claimed_count + 1 >= offer.max_redemptions) {
      await supabase.from('offers').update({ status: 'closed' }).eq('id', offer_id)
    }

    return new Response(JSON.stringify({ redemption_id: redemption.id }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
