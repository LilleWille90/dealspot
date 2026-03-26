import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../lib/constants'

export default function OfferHistory() {
  const router = useRouter()
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOffers()
  }, [])

  async function fetchOffers() {
    const { data: { session } } = await supabase.auth.getSession()
    const { data } = await supabase
      .from('offers')
      .select('*')
      .eq('supplier_id', session?.user?.id)
      .eq('status', 'closed')
      .order('created_at', { ascending: false })
      .limit(50)

    setOffers(data || [])
    setLoading(false)
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function redemptionRate(offer) {
    if (!offer.max_redemptions) return '—'
    return `${Math.round(((offer.claimed_count || 0) / offer.max_redemptions) * 100)}%`
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Offer history</Text>
        <View style={{ width: 48 }} />
      </View>

      {offers.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No past offers</Text>
          <Text style={styles.emptyBody}>Your completed offers will appear here with performance stats.</Text>
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardText}>{item.text}</Text>
              <View style={styles.cardStats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{item.claimed_count || 0}/{item.max_redemptions}</Text>
                  <Text style={styles.statLabel}>redeemed</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{redemptionRate(item)}</Text>
                  <Text style={styles.statLabel}>rate</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{item.boost_used ? 'Yes' : 'No'}</Text>
                  <Text style={styles.statLabel}>boosted</Text>
                </View>
              </View>
              <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
            </View>
          )}
        />
      )}
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
  backText: { color: COLORS.primary, fontSize: 16, width: 48 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  list: { padding: 20, gap: 12 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  cardText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardStats: { flexDirection: 'row', gap: 16 },
  stat: { gap: 2 },
  statValue: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary },
  cardDate: { fontSize: 12, color: COLORS.textSecondary },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  emptyBody: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
})
