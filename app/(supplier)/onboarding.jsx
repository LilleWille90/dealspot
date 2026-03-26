import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../lib/constants'

const CATEGORIES = ['Restaurant', 'Café', 'Food truck', 'Market stall', 'Bakery', 'Bar', 'Other']

export default function SupplierOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(0) // 0: details, 1: location, 2: done
  const [businessName, setBusinessName] = useState('')
  const [category, setCategory] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSaveProfile() {
    if (!businessName.trim()) {
      Alert.alert('Missing name', 'Please enter your business name.')
      return
    }
    if (!category) {
      Alert.alert('Choose a category', 'Please select what type of venue you are.')
      return
    }

    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()

    const { error } = await supabase.from('supplier_profiles').insert({
      user_id: session?.user?.id,
      business_name: businessName.trim(),
      category,
      location_type: 'fixed',
      plan: 'free',
    })

    setSaving(false)

    if (error) {
      Alert.alert('Error', error.message)
      return
    }

    setStep(1)
  }

  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        {[0, 1, 2].map(i => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      {step === 0 && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.emoji}>🏪</Text>
          <Text style={styles.title}>Tell us about your venue</Text>
          <Text style={styles.body}>This is what customers will see when you go live with a deal.</Text>

          <TextInput
            style={styles.input}
            placeholder="Business name"
            placeholderTextColor={COLORS.textSecondary}
            value={businessName}
            onChangeText={setBusinessName}
            autoCapitalize="words"
          />

          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.categoryChip, category === c && styles.categoryChipActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.categoryText, category === c && styles.categoryTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Continue</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}

      {step === 1 && (
        <View style={styles.content}>
          <Text style={styles.emoji}>📍</Text>
          <Text style={styles.title}>Set your location</Text>
          <Text style={styles.body}>
            Customers need to find you. Set a fixed address for a restaurant or café, or use live GPS if you're a food truck.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push({ pathname: '/(supplier)/location-setup', params: { onboarding: 'true' } })}
          >
            <Text style={styles.buttonText}>Set location →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipLink} onPress={() => setStep(2)}>
            <Text style={styles.skipText}>I'll do this later</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View style={styles.content}>
          <Text style={styles.emoji}>🚀</Text>
          <Text style={styles.title}>You're ready!</Text>
          <Text style={styles.body}>
            When you want customers, tap <Text style={{ fontWeight: '700' }}>Market me</Text> on your dashboard and create an offer. You'll be live in under 60 seconds.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/(supplier)/')}>
            <Text style={styles.buttonText}>Go to dashboard</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white, paddingTop: 60 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 40 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.primary, width: 24 },
  content: { flex: 1, paddingHorizontal: 28, gap: 16 },
  emoji: { fontSize: 52, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  body: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  categoryText: { fontSize: 14, color: COLORS.text },
  categoryTextActive: { color: COLORS.primary, fontWeight: '600' },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  skipLink: { alignItems: 'center', paddingVertical: 8 },
  skipText: { color: COLORS.textSecondary, fontSize: 14 },
})
