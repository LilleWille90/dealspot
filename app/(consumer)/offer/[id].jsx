import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert, ActivityIndicator
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../lib/constants'
import { MOCK_MODE, MOCK_OFFER_DETAILS } from '../../../lib/mockData'

export default function OfferDetail() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const [offer, setOffer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (MOCK_MODE) {
      const mock = MOCK_OFFER_DETAILS[id]
      if (mock) {
        setOffer(mock)
        setLoading(false)
      } else {
        router.back()
      }
      return
    }

    fetchOffer()

    const channel = supabase
      .channel(`offer_${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'offers', filter: `id=eq.${id}` }, payload => {
        setOffer(prev => ({ ...prev, ...payload.new }))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [id])

  // Countdown timer
  useEffect(() => {
    if (!offer?.expires_at) return
    function tick() {
      const ms = new Date(offer.expires_at).getTime() - Date.now()
      setTimeLeft(Math.max(0, ms))
    }
    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => clearInterval(timerRef.current)
  }, [offer?.expires_at])

  async function fetchOffer() {
    const { data, error } = await supabase
      .from('offers')
      .select('*, supplier_profiles (business_name, category), supplier_locations (lat, lng)')
      .eq('id', id)
      .single()

    if (error || !data) {
      Alert.alert('Not found', 'This offer is no longer available.')
      router.back()
      return
    }
    setOffer(data)
    setLoading(false)
  }

  async function claimSpot() {
    if (MOCK_MODE) {
      router.push('/(consumer)/redeem/mock-redemption-1')
      return
    }
    setClaiming(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { data, error } = await supabase.functions.invoke('reserve-spot', {
      body: { offer_id: id, consumer_id: session?.user?.id },
    })
    setClaiming(false)
    if (error || !data?.redemption_id) {
      Alert.alert('Could not claim', error?.message || 'All spots may have been taken. Try another deal!')
      return
    }
    router.push(`/(consumer)/redeem/${data.redemption_id}`)
  }

  function formatCountdown(ms) {
    const totalSec = Math.floor(ms / 1000)
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`
    return `${s}s`
  }

  function formatDistance(m) {
    return m < 1000 ? `${m}m away` : `${(m / 1000).toFixed(1)}km away`
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    )
  }

  const spotsLeft = offer.max_redemptions - offer.claimed_count
  const claimedRatio = offer.claimed_count / offer.max_redemptions
  const isBoosted = offer.status === 'boosted'
  const isSoldOut = offer.status === 'closed' || spotsLeft <= 0
  const isUrgent = claimedRatio >= 0.7 || (timeLeft !== null && timeLeft < 10 * 60 * 1000)
  const progressColor = isUrgent ? COLORS.red : COLORS.primary

  return (
    <View style={styles.container}>
      {/* Floating back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>←</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.heroWrapper}>
          {offer.photo_url ? (
            <Image source={{ uri: offer.photo_url }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={styles.heroPlaceholderEmoji}>🍽</Text>
            </View>
          )}
          {/* Gradient overlay */}
          <View style={styles.heroOverlay} />

          {/* Spots badge on image */}
          <View style={[styles.spotsBadge, isUrgent && styles.spotsBadgeUrgent]}>
            <Text style={styles.spotsBadgeText}>
              {isSoldOut ? 'Sold out' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
            </Text>
          </View>

          {/* Boosted badge */}
          {isBoosted && (
            <View style={styles.boostedBadge}>
              <Text style={styles.boostedText}>⚡ Boosted</Text>
            </View>
          )}
        </View>

        {/* Content card */}
        <View style={styles.card}>
          {/* Venue + category */}
          <View style={styles.venueRow}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{offer.supplier_profiles?.category}</Text>
            </View>
            {offer.distance_metres != null && (
              <Text style={styles.distance}>📍 {formatDistance(offer.distance_metres)}</Text>
            )}
          </View>

          <Text style={styles.venueName}>{offer.supplier_profiles?.business_name}</Text>
          <Text style={styles.offerText}>{offer.text}</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Countdown + spots row */}
          <View style={styles.statsRow}>
            {timeLeft !== null && (
              <View style={[styles.statBox, isUrgent && timeLeft < 10 * 60 * 1000 && styles.statBoxUrgent]}>
                <Text style={[styles.statValue, isUrgent && timeLeft < 10 * 60 * 1000 && styles.statValueUrgent]}>
                  {formatCountdown(timeLeft)}
                </Text>
                <Text style={styles.statLabel}>remaining</Text>
              </View>
            )}
            <View style={styles.statBox}>
              <Text style={[styles.statValue, isUrgent && styles.statValueUrgent]}>
                {isSoldOut ? '0' : spotsLeft}
              </Text>
              <Text style={styles.statLabel}>spots left</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{offer.claimed_count}</Text>
              <Text style={styles.statLabel}>claimed</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBg}>
            <View style={[
              styles.progressBar,
              { width: `${Math.min(claimedRatio * 100, 100)}%`, backgroundColor: progressColor }
            ]} />
          </View>

          {/* CTA */}
          {isSoldOut ? (
            <View style={styles.soldOut}>
              <Text style={styles.soldOutText}>All spots have been claimed</Text>
              <Text style={styles.soldOutSub}>Check back later for new deals nearby</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.ctaBtn, claiming && styles.ctaBtnDisabled]}
              onPress={claimSpot}
              disabled={claiming}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaBtnText}>
                {claiming ? 'Reserving your spot…' : 'Claim my spot'}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.disclaimer}>
            Your spot is reserved for 15 minutes. Show the QR code at the venue to redeem.
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: { color: COLORS.white, fontSize: 20, fontWeight: '700', marginTop: -2 },

  scroll: { paddingBottom: 40 },

  heroWrapper: { position: 'relative' },
  heroImage: { width: '100%', height: 300 },
  heroPlaceholder: {
    width: '100%',
    height: 240,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroPlaceholderEmoji: { fontSize: 72 },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'transparent',
  },

  spotsBadge: {
    position: 'absolute',
    top: 52,
    right: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  spotsBadgeUrgent: { backgroundColor: COLORS.red },
  spotsBadgeText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },

  boostedBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  boostedText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    marginTop: -20,
    marginHorizontal: 0,
    padding: 24,
    gap: 14,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },

  venueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryChip: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  categoryText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  distance: { fontSize: 13, color: COLORS.textSecondary },

  venueName: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  offerText: { fontSize: 17, fontWeight: '600', color: COLORS.text, lineHeight: 24 },

  divider: { height: 1, backgroundColor: COLORS.border },

  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  statBoxUrgent: { backgroundColor: COLORS.redLight },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  statValueUrgent: { color: COLORS.red },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },

  progressBg: { height: 6, backgroundColor: COLORS.border, borderRadius: 3 },
  progressBar: { height: 6, borderRadius: 3 },

  ctaBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaBtnDisabled: { opacity: 0.6 },
  ctaBtnText: { color: COLORS.white, fontSize: 18, fontWeight: '800' },

  soldOut: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  soldOutText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  soldOutSub: { fontSize: 13, color: COLORS.textSecondary },

  disclaimer: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
})
