import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../lib/constants'

export default function GoLiveReview() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const [reachableCount, setReachableCount] = useState(null)
  const [supplierProfile, setSupplierProfile] = useState(null)
  const [going, setGoing] = useState(false)

  const durationMinutes = params.durationMinutes === 'null' ? null : parseInt(params.durationMinutes)
  const maxRedemptions = parseInt(params.maxRedemptions)

  useEffect(() => {
    loadPreview()
  }, [])

  async function loadPreview() {
    const { data: { session } } = await supabase.auth.getSession()

    const { data: profile } = await supabase
      .from('supplier_profiles')
      .select('*, supplier_locations(*)')
      .eq('user_id', session?.user?.id)
      .single()

    setSupplierProfile(profile)

    // Get reachable consumer count from edge function
    const { data } = await supabase.functions.invoke('reachable-count', {
      body: {
        supplier_id: session?.user?.id,
        radius: profile?.broadcast_radius || 500,
      },
    })
    setReachableCount(data?.count ?? 0)
  }

  async function goLive() {
    setGoing(true)
    const { data: { session } } = await supabase.auth.getSession()

    const expiresAt = durationMinutes
      ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
      : null

    const { data: offer, error } = await supabase.from('offers').insert({
      supplier_id: session?.user?.id,
      text: params.text,
      photo_url: params.photoUrl || null,
      max_redemptions: maxRedemptions,
      duration_minutes: durationMinutes,
      status: 'active',
      claimed_count: 0,
      boost_used: false,
      expires_at: expiresAt,
    }).select().single()

    if (error) {
      setGoing(false)
      Alert.alert('Error', 'Could not go live. Please try again.')
      return
    }

    // Trigger push notifications to nearby consumers
    await supabase.functions.invoke('go-live', {
      body: { offer_id: offer.id },
    })

    setGoing(false)
    router.replace(`/(supplier)/live-dashboard?id=${offer.id}`)
  }

  const durationLabel = durationMinutes
    ? durationMinutes < 60 ? `${durationMinutes} min` : `${durationMinutes / 60}h`
    : 'Open (manual close)'

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Edit</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Review your offer</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.scroll}>
        {/* Offer preview card */}
        <View style={styles.previewCard}>
          {params.photoUrl ? (
            <Image source={{ uri: params.photoUrl }} style={styles.previewPhoto} />
          ) : null}
          <View style={styles.previewContent}>
            <Text style={styles.previewOfferText}>{params.text}</Text>
            <Text style={styles.previewMeta}>
              {maxRedemptions} spots · {durationLabel}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {reachableCount === null ? '…' : reachableCount}
            </Text>
            <Text style={styles.statLabel}>people nearby{'\n'}with Deal Mode on</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{maxRedemptions}</Text>
            <Text style={styles.statLabel}>spots{'\n'}available</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{durationLabel}</Text>
            <Text style={styles.statLabel}>offer{'\n'}duration</Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.locationRow}>
          <Text style={styles.locationText}>
            📍 {supplierProfile?.location_type === 'gps'
              ? 'Using your live GPS location'
              : supplierProfile?.fixed_address || 'Location not set'}
          </Text>
        </View>

        <Text style={styles.tip}>
          💡 Offers with photos get significantly more redemptions. {!params.photoUrl && 'Consider going back to add one.'}
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.goLiveBtn, going && styles.goLiveBtnDisabled]}
          onPress={goLive}
          disabled={going}
        >
          {going ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.goLiveBtnText}>🚀  Go live now</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backText: { color: COLORS.primary, fontSize: 16, width: 60 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  scroll: { flex: 1, padding: 20, gap: 16 },
  previewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewPhoto: { width: '100%', height: 140 },
  previewContent: { padding: 16, gap: 6 },
  previewOfferText: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  previewMeta: { fontSize: 13, color: COLORS.textSecondary },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  locationRow: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationText: { fontSize: 14, color: COLORS.text },
  tip: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  footer: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  goLiveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  goLiveBtnDisabled: { opacity: 0.6 },
  goLiveBtnText: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
})
