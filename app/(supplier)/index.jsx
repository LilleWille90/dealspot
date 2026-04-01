import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../lib/constants'
import { MOCK_MODE, MOCK_SUPPLIER_PROFILE, MOCK_ACTIVE_OFFER, MOCK_RECENT_CLOSED_OFFERS } from '../../lib/mockData'

export default function SupplierDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [activeOffer, setActiveOffer] = useState(null)
  const [recentOffers, setRecentOffers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    if (MOCK_MODE) {
      setProfile(MOCK_SUPPLIER_PROFILE)
      setActiveOffer(MOCK_ACTIVE_OFFER)
      setRecentOffers(MOCK_RECENT_CLOSED_OFFERS)
      setLoading(false)
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const [profileRes, offersRes] = await Promise.all([
      supabase.from('supplier_profiles').select('*').eq('user_id', session.user.id).single(),
      supabase.from('offers')
        .select('*')
        .eq('supplier_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    setProfile(profileRes.data)

    const offers = offersRes.data || []
    const active = offers.find(o => o.status === 'active' || o.status === 'boosted')
    setActiveOffer(active || null)
    setRecentOffers(offers.filter(o => o.status === 'closed').slice(0, 5))
    setLoading(false)
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
        <View style={styles.headerTop}>
          <View style={styles.headerBrand}>
            <View style={styles.mascot}>
              <Text style={styles.mascotEmoji}>⚡</Text>
            </View>
            <View>
              <Text style={styles.logo}>ZOLT</Text>
              <Text style={styles.businessName}>{profile?.business_name}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.newOfferBtn}
              onPress={() => router.push('/(supplier)/offer-builder')}
            >
              <Text style={styles.newOfferBtnText}>+ ZOLT ME</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(supplier)/settings')}>
              <Text style={styles.settingsIcon}>⚙</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {activeOffer ? (
          // Live offer card
          <TouchableOpacity
            style={styles.liveCard}
            onPress={() => router.push(`/(supplier)/live-dashboard?id=${activeOffer.id}`)}
          >
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>Live now</Text>
            </View>
            <Text style={styles.liveOfferText}>{activeOffer.text}</Text>
            <Text style={styles.liveOfferMeta}>
              {activeOffer.claimed_count || 0} / {activeOffer.max_redemptions} claimed · Tap to manage
            </Text>
          </TouchableOpacity>
        ) : (
          // Zolt me CTA
          <TouchableOpacity
            style={styles.marketMeBtn}
            onPress={() => router.push('/(supplier)/offer-builder')}
          >
            <Text style={styles.marketMeEmoji}>⚡</Text>
            <Text style={styles.marketMeTitle}>ZOLT ME</Text>
            <Text style={styles.marketMeSubtitle}>Go live with a deal in under 60 seconds</Text>
          </TouchableOpacity>
        )}

        {/* Location status */}
        <TouchableOpacity
          style={styles.locationCard}
          onPress={() => router.push('/(supplier)/location-setup')}
        >
          <Text style={styles.locationLabel}>📍 Location</Text>
          <Text style={styles.locationValue}>
            {profile?.location_type === 'gps' ? 'Live GPS' : profile?.fixed_address || 'Not set'}
          </Text>
          <Text style={styles.locationChange}>Change →</Text>
        </TouchableOpacity>

        {/* Recent offers */}
        {recentOffers.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={styles.sectionTitle}>Recent offers</Text>
              <TouchableOpacity onPress={() => router.push('/(supplier)/offer-history')}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            {recentOffers.map(offer => (
              <View key={offer.id} style={styles.recentCard}>
                <Text style={styles.recentText}>{offer.text}</Text>
                <Text style={styles.recentMeta}>
                  {offer.claimed_count || 0} / {offer.max_redemptions} redeemed
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: COLORS.navy,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mascot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotEmoji: { fontSize: 20 },
  logo: { fontSize: 22, fontWeight: '900', color: COLORS.white, letterSpacing: 3 },
  businessName: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  newOfferBtn: {
    backgroundColor: COLORS.red,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  newOfferBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  settingsIcon: { fontSize: 22, color: 'rgba(255,255,255,0.6)' },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  marketMeBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  marketMeEmoji: { fontSize: 44 },
  marketMeTitle: { fontSize: 26, fontWeight: '800', color: COLORS.white },
  marketMeSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  liveCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    gap: 8,
  },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  liveBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  liveOfferText: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  liveOfferMeta: { fontSize: 13, color: COLORS.textSecondary },
  locationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  locationValue: { flex: 1, fontSize: 14, color: COLORS.textSecondary },
  locationChange: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  recentSection: { gap: 10 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  seeAll: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  recentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  recentText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  recentMeta: { fontSize: 12, color: COLORS.textSecondary },
})
