/**
 * search-address edge function
 * Proxies address autocomplete via Google Places API.
 * Keeps the API key server-side.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const GOOGLE_PLACES_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY')!

serve(async (req) => {
  try {
    const { query } = await req.json()

    if (!query || query.length < 3) {
      return new Response(JSON.stringify({ suggestions: [] }), { status: 200 })
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
    url.searchParams.set('input', query)
    url.searchParams.set('types', 'address')
    url.searchParams.set('components', 'country:se')
    url.searchParams.set('key', GOOGLE_PLACES_KEY)

    const res = await fetch(url.toString())
    const data = await res.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return new Response(JSON.stringify({ suggestions: [] }), { status: 200 })
    }

    // For each prediction, get lat/lng via Place Details
    const suggestions = await Promise.all(
      (data.predictions || []).slice(0, 5).map(async (p: { place_id: string; description: string }) => {
        const detailUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json')
        detailUrl.searchParams.set('place_id', p.place_id)
        detailUrl.searchParams.set('fields', 'geometry')
        detailUrl.searchParams.set('key', GOOGLE_PLACES_KEY)

        const detailRes = await fetch(detailUrl.toString())
        const detail = await detailRes.json()
        const loc = detail.result?.geometry?.location

        return {
          address: p.description,
          lat: loc?.lat ?? null,
          lng: loc?.lng ?? null,
        }
      })
    )

    return new Response(JSON.stringify({ suggestions }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
