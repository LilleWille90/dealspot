/**
 * delete-account edge function
 * GDPR-compliant account deletion.
 * Wipes personal data immediately; anonymises aggregate stats.
 * Full deletion completes within 72 hours per GDPR Art. 17.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    // Get the calling user from the JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const userId = user.id
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 1. Delete location data immediately
    await supabase.from('consumer_locations').delete().eq('consumer_id', userId)
    await supabase.from('supplier_locations').delete().eq('supplier_id', userId)

    // 2. Anonymise redemptions (remove consumer_id link)
    await supabase
      .from('redemptions')
      .update({ consumer_id: null })
      .eq('consumer_id', userId)

    // 3. Close any active offers (supplier)
    await supabase
      .from('offers')
      .update({ status: 'closed' })
      .eq('supplier_id', userId)
      .in('status', ['active', 'boosted'])

    // 4. Delete push tokens
    await supabase.from('push_tokens').delete().eq('user_id', userId)

    // 5. Delete profile data
    await supabase.from('supplier_profiles').delete().eq('user_id', userId)

    // 6. Delete the auth user (this cascades to most tables via FK)
    await supabase.auth.admin.deleteUser(userId)

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
