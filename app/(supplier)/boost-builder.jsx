import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { COLORS, BOOST_OPTIONS } from '../../lib/constants'

export default function BoostBuilder() {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const [selectedBoost, setSelectedBoost] = useState(null)
  const [addSpots, setAddSpots] = useState(null) // null | 5 | 10
  const [boosting, setBoosting] = useState(false)

  async function handleBoost() {
    if (!selectedBoost) {
      Alert.alert('Choose a boost', 'Please select how you want to boost this offer.')
      return
    }

    setBoosting(true)

    const { error } = await supabase.functions.invoke('boost-offer', {
      body: {
        offer_id: id,
        boost_type: selectedBoost.id,
        add_spots: addSpots,
      },
    })

    setBoosting(false)

    if (error) {
      Alert.alert('Boost failed', error.message || 'Please try again.')
      return
    }

    router.replace(`/(supplier)/live-dashboard?id=${id}`)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Boost your offer</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            ⚠️ You can only boost once per offer. Choose wisely.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>How do you want to boost?</Text>
        {BOOST_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.boostOption, selectedBoost?.id === opt.id && styles.boostOptionActive]}
            onPress={() => setSelectedBoost(opt)}
          >
            <Text style={[styles.boostOptionTitle, selectedBoost?.id === opt.id && styles.boostOptionTitleActive]}>
              {opt.label}
            </Text>
            <Text style={[styles.boostOptionDesc, selectedBoost?.id === opt.id && styles.boostOptionDescActive]}>
              {opt.description}
            </Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionLabel}>Add extra spots? (optional)</Text>
        <View style={styles.spotsRow}>
          {[null, 5, 10].map(n => (
            <TouchableOpacity
              key={String(n)}
              style={[styles.spotsChip, addSpots === n && styles.spotsChipActive]}
              onPress={() => setAddSpots(n)}
            >
              <Text style={[styles.spotsText, addSpots === n && styles.spotsTextActive]}>
                {n === null ? 'No extra spots' : `+${n} spots`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.notifyNote}>
          <Text style={styles.notifyText}>
            📲 All consumers with Deal Mode on within your radius will receive a new notification: <Text style={{ fontStyle: 'italic' }}>"Deal just got better"</Text>
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.boostBtn, (!selectedBoost || boosting) && styles.boostBtnDisabled]}
          onPress={handleBoost}
          disabled={!selectedBoost || boosting}
        >
          {boosting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.boostBtnText}>⚡ Boost now</Text>
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
  backText: { fontSize: 20, color: COLORS.textSecondary, width: 32 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  content: { flex: 1, padding: 20, gap: 14 },
  warning: {
    backgroundColor: COLORS.amberLight,
    borderWidth: 1,
    borderColor: COLORS.amber,
    borderRadius: 10,
    padding: 14,
  },
  warningText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  boostOption: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  boostOptionActive: { borderColor: COLORS.amber, backgroundColor: COLORS.amberLight },
  boostOptionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  boostOptionTitleActive: { color: COLORS.amber },
  boostOptionDesc: { fontSize: 13, color: COLORS.textSecondary },
  boostOptionDescActive: { color: COLORS.text },
  spotsRow: { flexDirection: 'row', gap: 8 },
  spotsChip: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  spotsChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  spotsText: { fontSize: 13, color: COLORS.text },
  spotsTextActive: { color: COLORS.primary, fontWeight: '600' },
  notifyNote: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notifyText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  footer: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  boostBtn: {
    backgroundColor: COLORS.amber,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  boostBtnDisabled: { opacity: 0.5 },
  boostBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
})
