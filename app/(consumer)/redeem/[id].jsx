import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import QRCode from 'react-native-qrcode-svg'
import { supabase } from '../../../lib/supabase'
import { COLORS, QR_RESERVATION_MINUTES } from '../../../lib/constants'

export default function RedeemScreen() {
  const { id } = useLocalSearchParams() // redemption id
  const router = useRouter()
  const [redemption, setRedemption] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    fetchRedemption()
  }, [id])

  useEffect(() => {
    if (!redemption?.reserved_at) return

    const expiresAt = new Date(redemption.reserved_at).getTime() + QR_RESERVATION_MINUTES * 60 * 1000

    const interval = setInterval(() => {
      const remaining = Math.max(0, expiresAt - Date.now())
      setTimeLeft(remaining)
      if (remaining === 0) {
        clearInterval(interval)
        Alert.alert(
          'Spot expired',
          'Your reservation window has passed. The spot has been released.',
          [{ text: 'Go back', onPress: () => router.replace('/(consumer)/') }]
        )
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [redemption])

  // Subscribe to real-time — if redeemed, show confirmation
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`redemption_${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'redemptions', filter: `id=eq.${id}` }, payload => {
        if (payload.new.status === 'redeemed') {
          router.replace('/(consumer)/redeem-success')
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [id])

  async function fetchRedemption() {
    const { data, error } = await supabase
      .from('redemptions')
      .select('*, offers(text, supplier_profiles(business_name))')
      .eq('id', id)
      .single()

    if (error || !data) {
      Alert.alert('Error', 'Could not load your QR code.')
      router.back()
      return
    }

    if (data.status === 'expired') {
      Alert.alert('Expired', 'This spot has expired.', [{ text: 'OK', onPress: () => router.replace('/(consumer)/') }])
      return
    }

    setRedemption(data)
    setLoading(false)
  }

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000)
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your deal</Text>
        <Text style={styles.venueName}>{redemption?.offers?.supplier_profiles?.business_name}</Text>
        <Text style={styles.offerText}>{redemption?.offers?.text}</Text>
      </View>

      <View style={styles.qrContainer}>
        <QRCode
          value={`dealspot://redeem/${id}/${redemption?.qr_token}`}
          size={220}
          color={COLORS.text}
          backgroundColor={COLORS.white}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.instructions}>Show this QR code to the staff</Text>

        {timeLeft !== null && (
          <View style={[styles.timer, timeLeft < 120000 && styles.timerUrgent]}>
            <Text style={[styles.timerText, timeLeft < 120000 && styles.timerTextUrgent]}>
              Expires in {formatTime(timeLeft)}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => Alert.alert(
            'Cancel reservation?',
            'Your spot will be released back to the pool.',
            [
              { text: 'Keep it', style: 'cancel' },
              { text: 'Cancel', style: 'destructive', onPress: () => router.replace('/(consumer)/') },
            ]
          )}
        >
          <Text style={styles.cancelText}>Cancel reservation</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white, paddingTop: 60 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', paddingHorizontal: 28, gap: 6, marginBottom: 32 },
  title: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  venueName: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  offerText: { fontSize: 16, color: COLORS.text, textAlign: 'center' },
  qrContainer: {
    alignItems: 'center',
    padding: 28,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    marginHorizontal: 28,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  footer: { alignItems: 'center', paddingHorizontal: 28, marginTop: 28, gap: 16 },
  instructions: { fontSize: 15, color: COLORS.textSecondary },
  timer: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  timerUrgent: { backgroundColor: COLORS.amberLight },
  timerText: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  timerTextUrgent: { color: COLORS.amber },
  cancelBtn: { paddingVertical: 8 },
  cancelText: { color: COLORS.textSecondary, fontSize: 14, textDecorationLine: 'underline' },
})
