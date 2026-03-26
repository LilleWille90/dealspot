import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert, ActivityIndicator
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../lib/constants'

export default function OfferDetail() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const [offer, setOffer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)

  useEffect(() => {
    fetchOffer()

    // Subscribe to real-time updates on this offer
    const channel = supabase
      .channel(`offer_${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'offers', filter: `id=eq.${id}` }, payload => {
        setOffer(prev => ({ ...prev, ...payload.new }))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [id])

  async function fetchOffer() {
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        supplier_profiles (business_name, category),
        supplier_locations (lat, lng)
      `)
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

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    )
  }

  const claimedRatio = offer.claimed_count / offer.max_redemptions
  const isBoosted = offer.status === 'boosted'
  const isSoldOut = offer.status === 'closed' || offer.claimed_count >= offer.max_redemptions
  const progressColor = claimedRatio >= 0.8 ? COLORS.amber : COLORS.primary

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero photo */}
        {offer.photo_url ? (
          <Image source={{ uri: offer.photo_url }} style={styles.heroImage} />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroPlaceholderText}>🍽</Text>
          </View>
        )}

        <View style={styles.content}>
          {/* Boosted badge */}
          {isBoosted && (
            <View style={styles.boostedBadge}>
              <Text style={styles.boostedText}>⚡ Boosted deal</Text>
            </View>
          )}

          <Text style={styles.venueName}>{offer.supplier_profiles?.business_name}</Text>
          <Text style={styles.category}>{offer.supplier_profiles?.category}</Text>
          <Text style={styles.offerText}>{offer.text}</Text>

          {/* Distance */}
          <Text style={styles.distance}>
            {offer.distance_metres < 1000
              ? `${offer.distance_metres}m away`
              : `${(offer.distance_metres / 1000).toFixed(1)}km away`}
          </Text>

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{offer.claimed_count} of {offer.max_redemptions} claimed</Text>
              <Text style={[styles.spotsLeft, claimedRatio >= 0.8 && styles.spotsLeftUrgent]}>
                {offer.max_redemptions - offer.claimed_count} left
              </Text>
            </View>
            <View style={styles.progressBg}>
              <View style={[styles.progressBar, { width: `${claimedRatio * 100}%`, backgroundColor: progressColor }]} />
            </View>
          </View>

          {/* CTA */}
          {isSoldOut ? (
            <View style={styles.soldOut}>
              <Text style={styles.soldOutText}>All spots claimed</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.ctaButton, claiming && styles.ctaButtonDisabled]}
              onPress={claimSpot}
              disabled={claiming}
            >
              <Text style={styles.ctaText}>{claiming ? 'Reserving your spot…' : 'Get my spot'}</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.disclaimer}>
            Your spot is held for 15 minutes. Show the QR code at the venue to redeem.
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: { position: 'absolute', top: 52, left: 16, zIndex: 10, padding: 8 },
  backBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 },
  scroll: { paddingBottom: 40 },
  heroImage: { width: '100%', height: 260 },
  heroPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroPlaceholderText: { fontSize: 60 },
  content: { padding: 24, gap: 10 },
  boostedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.amberLight,
    borderWidth: 1,
    borderColor: COLORS.amber,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  boostedText: { color: COLORS.amber, fontSize: 12, fontWeight: '700' },
  venueName: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  category: { fontSize: 13, color: COLORS.textSecondary },
  offerText: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 4 },
  distance: { fontSize: 14, color: COLORS.textSecondary },
  progressSection: { gap: 6 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 13, color: COLORS.textSecondary },
  spotsLeft: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  spotsLeftUrgent: { color: COLORS.amber },
  progressBg: { height: 6, backgroundColor: COLORS.border, borderRadius: 3 },
  progressBar: { height: 6, borderRadius: 3 },
  ctaButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaButtonDisabled: { opacity: 0.6 },
  ctaText: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  soldOut: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  soldOutText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  disclaimer: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
})
