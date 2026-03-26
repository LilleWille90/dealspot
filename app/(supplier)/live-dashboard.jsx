import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { COLORS, STALL_THRESHOLD_CLAIMED, STALL_THRESHOLD_ELAPSED } from '../../lib/constants'

export default function LiveDashboard() {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const [offer, setOffer] = useState(null)
  const [redemptions, setRedemptions] = useState([])
  const [reachableCount, setReachableCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showBoostPrompt, setShowBoostPrompt] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const [ending, setEnding] = useState(false)

  useEffect(() => {
    fetchOffer()

    // Real-time subscription
    const channel = supabase
      .channel(`live_offer_${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'offers', filter: `id=eq.${id}` }, payload => {
        setOffer(prev => ({ ...prev, ...payload.new }))
        checkStall(payload.new)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'redemptions', filter: `offer_id=eq.${id}` }, payload => {
        setRedemptions(prev => [payload.new, ...prev])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [id])

  useEffect(() => {
    if (!offer?.expires_at) return
    const interval = setInterval(() => {
      const remaining = Math.max(0, new Date(offer.expires_at).getTime() - Date.now())
      setTimeLeft(remaining)
      if (remaining === 0) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [offer?.expires_at])

  async function fetchOffer() {
    const { data } = await supabase
      .from('offers')
      .select('*')
      .eq('id', id)
      .single()

    setOffer(data)
    checkStall(data)

    const { data: reds } = await supabase
      .from('redemptions')
      .select('id, status, reserved_at, redeemed_at')
      .eq('offer_id', id)
      .order('reserved_at', { ascending: false })

    setRedemptions(reds || [])

    // Fetch reachable count
    const { data: { session } } = await supabase.auth.getSession()
    const { data: countData } = await supabase.functions.invoke('reachable-count', {
      body: { supplier_id: session?.user?.id, radius: data?.broadcast_radius || 500 },
    })
    setReachableCount(countData?.count ?? 0)
    setLoading(false)
  }

  function checkStall(o) {
    if (!o || o.status !== 'active' || o.boost_used) return
    if (!o.expires_at || !o.duration_minutes) return

    const elapsed = (Date.now() - new Date(o.created_at).getTime()) / 1000 / 60
    const elapsedRatio = elapsed / o.duration_minutes
    const claimedRatio = (o.claimed_count || 0) / o.max_redemptions

    if (elapsedRatio >= STALL_THRESHOLD_ELAPSED && claimedRatio < STALL_THRESHOLD_CLAIMED) {
      setShowBoostPrompt(true)
    }
  }

  async function endOffer() {
    Alert.alert(
      'End offer',
      'This will close the offer immediately. No more spots can be claimed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End offer', style: 'destructive', onPress: async () => {
            setEnding(true)
            await supabase.from('offers').update({ status: 'closed' }).eq('id', id)
            setEnding(false)
            router.replace('/(supplier)/')
          }
        },
      ]
    )
  }

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000)
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function formatTimestamp(iso) {
    return new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    )
  }

  const claimedRatio = (offer.claimed_count || 0) / offer.max_redemptions
  const isBoosted = offer.status === 'boosted'

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(supplier)/')}>
          <Text style={styles.backText}>← Dashboard</Text>
        </TouchableOpacity>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{isBoosted ? 'Boosted' : 'Live'}</Text>
        </View>
        <TouchableOpacity onPress={endOffer} disabled={ending}>
          <Text style={styles.endText}>{ending ? '…' : 'End'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Boost prompt */}
        {showBoostPrompt && !offer.boost_used && (
          <TouchableOpacity
            style={styles.boostPrompt}
            onPress={() => router.push(`/(supplier)/boost-builder?id=${id}`)}
          >
            <Text style={styles.boostPromptTitle}>📈 Uptake is slow</Text>
            <Text style={styles.boostPromptText}>Boost your offer to attract more customers →</Text>
          </TouchableOpacity>
        )}

        {/* Offer text */}
        <Text style={styles.offerText}>{offer.text}</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{offer.claimed_count || 0}</Text>
            <Text style={styles.statLabel}>claimed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{offer.max_redemptions - (offer.claimed_count || 0)}</Text>
            <Text style={styles.statLabel}>remaining</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{reachableCount ?? '…'}</Text>
            <Text style={styles.statLabel}>nearby</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressBg}>
            <View style={[
              styles.progressBar,
              { width: `${claimedRatio * 100}%` },
              claimedRatio >= 0.8 && styles.progressBarAmber,
            ]} />
          </View>
          {timeLeft !== null && (
            <Text style={styles.timeLeft}>{formatTime(timeLeft)} remaining</Text>
          )}
        </View>

        {/* Redemption log */}
        <Text style={styles.sectionTitle}>Redemption log</Text>
        {redemptions.length === 0 ? (
          <Text style={styles.emptyLog}>No redemptions yet</Text>
        ) : (
          redemptions.map((r, i) => (
            <View key={r.id} style={styles.logRow}>
              <Text style={styles.logCustomer}>Customer #{i + 1}</Text>
              <Text style={styles.logStatus}>{r.status}</Text>
              <Text style={styles.logTime}>{formatTimestamp(r.reserved_at)}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Footer actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => router.push(`/(supplier)/qr-scanner?offer_id=${id}`)}
        >
          <Text style={styles.scanBtnText}>📷  Scan QR code</Text>
        </TouchableOpacity>
        {!offer.boost_used && (
          <TouchableOpacity
            style={styles.boostBtn}
            onPress={() => router.push(`/(supplier)/boost-builder?id=${id}`)}
          >
            <Text style={styles.boostBtnText}>⚡ Boost</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  backText: { color: COLORS.primary, fontSize: 15 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  liveText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  endText: { color: COLORS.danger, fontSize: 15, fontWeight: '600' },
  scroll: { padding: 20, gap: 16, paddingBottom: 100 },
  boostPrompt: {
    backgroundColor: COLORS.amberLight,
    borderWidth: 1.5,
    borderColor: COLORS.amber,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  boostPromptTitle: { fontSize: 15, fontWeight: '700', color: COLORS.amber },
  boostPromptText: { fontSize: 14, color: COLORS.text },
  offerText: { fontSize: 20, fontWeight: '700', color: COLORS.text },
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
  statValue: { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary },
  progressSection: { gap: 6 },
  progressBg: { height: 8, backgroundColor: COLORS.border, borderRadius: 4 },
  progressBar: { height: 8, backgroundColor: COLORS.primary, borderRadius: 4 },
  progressBarAmber: { backgroundColor: COLORS.amber },
  timeLeft: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'right' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptyLog: { fontSize: 14, color: COLORS.textSecondary },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logCustomer: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  logStatus: { fontSize: 12, color: COLORS.textSecondary, textTransform: 'capitalize' },
  logTime: { fontSize: 12, color: COLORS.textSecondary },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    gap: 10,
  },
  scanBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  scanBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  boostBtn: {
    backgroundColor: COLORS.amber,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  boostBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
})
