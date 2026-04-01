import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../lib/constants'
import { MOCK_MODE, MOCK_HISTORY } from '../../lib/mockData'

export default function DealHistory() {
  const router = useRouter()
  const [redemptions, setRedemptions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    if (MOCK_MODE) {
      setRedemptions(MOCK_HISTORY)
      setLoading(false)
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    const { data } = await supabase
      .from('redemptions')
      .select('*, offers(text, supplier_profiles(business_name, category))')
      .eq('consumer_id', session?.user?.id)
      .eq('status', 'redeemed')
      .order('redeemed_at', { ascending: false })
      .limit(50)

    setRedemptions(data || [])
    setLoading(false)
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })
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
        <Text style={styles.title}>Deal history</Text>
        <View style={{ width: 48 }} />
      </View>

      {redemptions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🎟</Text>
          <Text style={styles.emptyTitle}>No deals yet</Text>
          <Text style={styles.emptyBody}>Turn on Deal Mode to start discovering deals near you.</Text>
        </View>
      ) : (
        <FlatList
          data={redemptions}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardVenue}>{item.offers?.supplier_profiles?.business_name}</Text>
              <Text style={styles.cardOffer}>{item.offers?.text}</Text>
              <Text style={styles.cardDate}>{formatDate(item.redeemed_at)}</Text>
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
    gap: 4,
  },
  cardVenue: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cardOffer: { fontSize: 14, color: COLORS.text },
  cardDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  emptyBody: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
})
