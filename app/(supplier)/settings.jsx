import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView, ActivityIndicator
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../lib/constants'

export default function SupplierSettings() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [businessName, setBusinessName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    const { data: profile } = await supabase
      .from('supplier_profiles')
      .select('*')
      .eq('user_id', user?.id)
      .single()

    setProfile(profile)
    setBusinessName(profile?.business_name || '')
  }

  async function handleSave() {
    setSaving(true)
    await supabase.from('supplier_profiles').update({ business_name: businessName }).eq('user_id', user?.id)
    setSaving(false)
    Alert.alert('Saved', 'Your profile has been updated.')
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account, business profile, and all offer data within 72 hours.',
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
        {/* Business details */}
        <Text style={styles.sectionLabel}>Business details</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Business name</Text>
          <TextInput
            style={styles.input}
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Your business name"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="words"
          />
          <Text style={styles.fieldLabel}>Category</Text>
          <Text style={styles.fieldValue}>{profile?.category || '—'}</Text>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.saveBtnText}>Save changes</Text>}
          </TouchableOpacity>
        </View>

        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Email</Text>
          <Text style={styles.fieldValue}>{user?.email}</Text>
          <Text style={styles.fieldLabel}>Plan</Text>
          <Text style={styles.fieldValue}>{profile?.plan === 'pro' ? 'Pro' : 'Free'}</Text>
        </View>

        {/* Location */}
        <Text style={styles.sectionLabel}>Location</Text>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(supplier)/location-setup')}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Location type</Text>
              <Text style={styles.fieldValue}>
                {profile?.location_type === 'gps' ? '🚚 Live GPS' : `🏪 ${profile?.fixed_address || 'Not set'}`}
              </Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Text style={styles.deleteText}>Delete account & data</Text>
        </TouchableOpacity>

        <Text style={styles.gdprNote}>
          GDPR: Your data is stored in Sweden. Offer records are anonymised after 90 days. Account deletion completes within 72 hours.
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
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },
  fieldValue: { fontSize: 15, color: COLORS.text },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
  chevron: { fontSize: 16, color: COLORS.textSecondary },
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
