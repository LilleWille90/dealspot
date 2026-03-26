import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Switch, Alert, ScrollView
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { COLORS, DISCOVER_RADII } from '../../lib/constants'

export default function ConsumerSettings() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [defaultRadius, setDefaultRadius] = useState(DISCOVER_RADII[2])
  const [disableAfterRedeem, setDisableAfterRedeem] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all your data within 72 hours. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            await supabase.functions.invoke('delete-account')
            await supabase.auth.signOut()
            router.replace('/(auth)/login')
          }
        },
      ]
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.userName}>{user?.user_metadata?.name || 'Consumer'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Default radius */}
        <Text style={styles.sectionLabel}>Default discovery range</Text>
        <View style={styles.card}>
          <View style={styles.radiusOptions}>
            {DISCOVER_RADII.map(r => (
              <TouchableOpacity
                key={r.label}
                style={[styles.chip, defaultRadius.label === r.label && styles.chipActive]}
                onPress={() => setDefaultRadius(r)}
              >
                <Text style={[styles.chipText, defaultRadius.label === r.label && styles.chipTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preferences */}
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Turn off after redeeming</Text>
              <Text style={styles.rowSubLabel}>Deal Mode disables automatically after you claim a deal</Text>
            </View>
            <Switch
              value={disableAfterRedeem}
              onValueChange={setDisableAfterRedeem}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Text style={styles.deleteText}>Delete account</Text>
        </TouchableOpacity>

        <Text style={styles.gdprNote}>
          Your location data is deleted after 24 hours. Offer records are anonymised after 90 days.
          You can request a full data export by contacting support.
        </Text>
      </ScrollView>
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
  backText: { color: COLORS.primary, fontSize: 16, width: 48 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  scroll: { padding: 20, gap: 12, paddingBottom: 40 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  userName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  userEmail: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  radiusOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  chipText: { fontSize: 13, color: COLORS.text },
  chipTextActive: { color: COLORS.primary, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  rowSubLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  signOutBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutText: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  deleteBtn: { paddingVertical: 8, alignItems: 'center' },
  deleteText: { fontSize: 14, color: COLORS.danger, textDecorationLine: 'underline' },
  gdprNote: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 16, marginTop: 8 },
})
