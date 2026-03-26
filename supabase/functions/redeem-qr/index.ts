/**
 * redeem-qr edge function
 * Called when supplier scans a consumer's QR code.
 * Verifies the token is valid and marks the redemption as redeemed.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const { qr_token, supplier_id } = await req.json()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Look up the redemption
    const { data: redemption, error } = await supabase
      .from('redemptions')
      .select('*, offers(id, supplier_id, status, expires_at)')
      .eq('qr_token', qr_token)
      .single()

    if (error || !redemption) {
      return new Response(JSON.stringify({ error: 'Invalid QR code' }), { status: 404 })
    }

    // Verify this supplier owns the offer
    if (redemption.offers.supplier_id !== supplier_id) {
      return new Response(JSON.stringify({ error: 'QR code is not for your offer' }), { status: 403 })
    }

    if (redemption.status === 'redeemed') {
      return new Response(JSON.stringify({ error: 'Already redeemed' }), { status: 409 })
    }

    if (redemption.status === 'expired') {
      return new Response(JSON.stringify({ error: 'QR code has expired' }), { status: 410 })
    }

    // Check reservation window (15 minutes)
    const reservedAt = new Date(redemption.reserved_at).getTime()
    if (Date.now() - reservedAt > 15 * 60 * 1000) {
      await supabase.from('redemptions').update({ status: 'expired' }).eq('id', redemption.id)
      return new Response(JSON.stringify({ error: 'Reservation window expired' }), { status: 410 })
    }

    // Mark as redeemed
    await supabase
      .from('redemptions')
      .update({ status: 'redeemed', redeemed_at: new Date().toISOString() })
      .eq('id', redemption.id)

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
