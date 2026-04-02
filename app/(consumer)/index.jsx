import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch, Alert, Image
} from 'react-native'
import { useRouter } from 'expo-router'
import * as Location from 'expo-location'
import { supabase } from '../../lib/supabase'
import { COLORS, SESSION_LENGTHS, DISCOVER_RADII } from '../../lib/constants'
import { MOCK_MODE, MOCK_NEARBY_OFFERS, MOCK_USER_ID } from '../../lib/mockData'

export default function ConsumerHome() {
  const router = useRouter()
  const [dealMode, setDealMode] = useState(false)
  const [selectedSession, setSelectedSession] = useState(SESSION_LENGTHS[0])
  const [selectedRadius, setSelectedRadius] = useState(DISCOVER_RADII[2]) // 500m default
  const [nearbyOffers, setNearbyOffers] = useState([])
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState(null)

  useEffect(() => {
    if (MOCK_MODE) {
      setSession({ user: { id: MOCK_USER_ID } })
      return
    }
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [])

  async function toggleDealMode(value) {
    if (value) {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Location needed',
          'Zolt needs your location to find deals nearby. Please enable location access in Settings.'
        )
        return
      }

      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync()
      if (bgStatus !== 'granted') {
        Alert.alert(
          'Background location',
          'For the best experience, allow background location so you get notified even when the app is closed.'
        )
      }
    }

    setDealMode(value)

    if (value) {
      startDealMode()
    } else {
      stopDealMode()
    }
  }

  async function startDealMode() {
    setLoading(true)
    if (MOCK_MODE) {
      setNearbyOffers(MOCK_NEARBY_OFFERS)
      setLoading(false)
      return
    }
    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      const expiresAt = selectedSession.value
        ? new Date(Date.now() + selectedSession.value * 60 * 1000).toISOString()
        : null

      await supabase.from('consumer_locations').upsert({
        consumer_id: session?.user?.id,
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        deal_mode_active: true,
        deal_mode_expires_at: expiresAt,
        radius_metres: selectedRadius.value,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'consumer_id' })

      await fetchNearbyOffers(location.coords)
    } catch (e) {
      Alert.alert('Error', 'Could not start Deal Mode. Please try again.')
      setDealMode(false)
    }
    setLoading(false)
  }

  async function stopDealMode() {
    if (!session?.user?.id) return
    await supabase.from('consumer_locations').upsert({
      consumer_id: session.user.id,
      deal_mode_active: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'consumer_id' })
    setNearbyOffers([])
  }

  async function fetchNearbyOffers(coords) {
    // Calls a Supabase Edge Function that returns active offers within radius
    const { data, error } = await supabase.functions.invoke('nearby-offers', {
      body: {
        lat: coords.latitude,
        lng: coords.longitude,
        radius: selectedRadius.value,
      },
    })
    if (!error && data?.offers) {
      setNearbyOffers(data.offers)
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View style={styles.mascot}>
            <Text style={styles.mascotEmoji}>⚡</Text>
          </View>
          <Text style={styles.logo}>ZOLT</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(consumer)/settings')}>
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Deal Mode Card */}
        <View style={[styles.dealModeCard, dealMode && styles.dealModeCardActive]}>
          <View style={styles.dealModeRow}>
            <View>
              <Text style={[styles.dealModeTitle, dealMode && styles.dealModeTitleActive]}>
                ZOLT MODE
              </Text>
              <Text style={[styles.dealModeSubtitle, dealMode && styles.dealModeSubtitleActive]}>
                {dealMode
                  ? `Active · ${selectedSession.label} · ${selectedRadius.label}`
                  : 'Tap to discover deals near you'}
              </Text>
            </View>
            <Switch
              value={dealMode}
              onValueChange={toggleDealMode}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          {!dealMode && (
            <>
              {/* Session picker */}
              <Text style={styles.pickerLabel}>How long?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {SESSION_LENGTHS.map(s => (
                  <TouchableOpacity
                    key={s.label}
                    style={[styles.chip, selectedSession.label === s.label && styles.chipActive]}
                    onPress={() => setSelectedSession(s)}
                  >
                    <Text style={[styles.chipText, selectedSession.label === s.label && styles.chipTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Radius picker */}
              <Text style={styles.pickerLabel}>How far?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {DISCOVER_RADII.map(r => (
                  <TouchableOpacity
                    key={r.label}
                    style={[styles.chip, selectedRadius.label === r.label && styles.chipActive]}
                    onPress={() => setSelectedRadius(r)}
                  >
                    <Text style={[styles.chipText, selectedRadius.label === r.label && styles.chipTextActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>

        {/* Nearby offers */}
        {dealMode && (
          <View style={styles.offersSection}>
            <Text style={styles.sectionTitle}>
              {nearbyOffers.length > 0 ? `${nearbyOffers.length} deal${nearbyOffers.length > 1 ? 's' : ''} near you` : 'Looking for deals…'}
            </Text>
            {nearbyOffers.map(offer => (
              <TouchableOpacity
                key={offer.id}
                style={styles.offerCard}
                onPress={() => router.push(`/(consumer)/offer/${offer.id}`)}
              >
                <View style={styles.offerCardInner}>
                  {offer.photo_url && (
                    <Image source={{ uri: offer.photo_url }} style={styles.offerThumb} />
                  )}
                  <View style={styles.offerCardBody}>
                    <Text style={styles.offerText}>{offer.text}</Text>
                    <Text style={styles.offerMeta}>
                      {offer.distance_metres < 1000
                        ? `${offer.distance_metres}m away`
                        : `${(offer.distance_metres / 1000).toFixed(1)}km away`}
                      {' · '}
                      {offer.spots_remaining} spots left
                    </Text>
                    {/* Progress bar */}
                    <View style={styles.progressBg}>
                      <View style={[
                        styles.progressBar,
                        { width: `${(offer.claimed / offer.max_redemptions) * 100}%` },
                        offer.claimed / offer.max_redemptions >= 0.8 && styles.progressBarAmber,
                      ]} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* History link */}
        <TouchableOpacity style={styles.historyLink} onPress={() => router.push('/(consumer)/history')}>
          <Text style={styles.historyLinkText}>View past deals →</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: COLORS.navy,
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mascot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotEmoji: { fontSize: 18 },
  logo: { fontSize: 24, fontWeight: '900', color: COLORS.white, letterSpacing: 3 },
  settingsIcon: { fontSize: 22, color: 'rgba(255,255,255,0.6)' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 20, paddingBottom: 40 },
  dealModeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dealModeCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  dealModeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dealModeTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  dealModeTitleActive: { color: COLORS.primary },
  dealModeSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  dealModeSubtitleActive: { color: COLORS.primaryDark },
  pickerLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, marginTop: 4 },
  chipRow: { flexDirection: 'row', marginBottom: 4 },
  chip: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: COLORS.white,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  chipText: { fontSize: 13, color: COLORS.text },
  chipTextActive: { color: COLORS.primary, fontWeight: '600' },
  offersSection: { gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  offerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  offerCardInner: {
    flexDirection: 'row',
  },
  offerThumb: {
    width: 88,
    alignSelf: 'stretch',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  offerCardBody: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  offerText: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  offerMeta: { fontSize: 13, color: COLORS.textSecondary },
  progressBg: { height: 4, backgroundColor: COLORS.border, borderRadius: 2 },
  progressBar: { height: 4, backgroundColor: COLORS.primary, borderRadius: 2 },
  progressBarAmber: { backgroundColor: COLORS.red },
  historyLink: { alignItems: 'center', paddingVertical: 8 },
  historyLinkText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
})
