import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import * as Location from 'expo-location'
import * as Notifications from 'expo-notifications'
import { supabase } from '../../lib/supabase'
import { COLORS, DISCOVER_RADII } from '../../lib/constants'

const STEPS = ['welcome', 'location', 'notifications', 'radius']

export default function ConsumerOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [defaultRadius, setDefaultRadius] = useState(DISCOVER_RADII[2]) // 500m

  async function handleLocationPermission() {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        'Location required',
        'Zolt needs location access to show you nearby deals. You can enable it in Settings at any time.',
        [{ text: 'Continue anyway', onPress: () => setStep(s => s + 1) }]
      )
      return
    }
    await Location.requestBackgroundPermissionsAsync()
    setStep(s => s + 1)
  }

  async function handleNotificationPermission() {
    const { status } = await Notifications.requestPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        'Notifications off',
        "You won't receive deal alerts. You can enable notifications in Settings later.",
        [{ text: 'Continue', onPress: () => setStep(s => s + 1) }]
      )
      return
    }
    setStep(s => s + 1)
  }

  async function handleFinish() {
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('consumer_locations').upsert({
      consumer_id: session?.user?.id,
      deal_mode_active: false,
      radius_metres: defaultRadius.value,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'consumer_id' })

    router.replace('/(consumer)/')
  }

  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      {step === 0 && (
        <View style={styles.content}>
          <View style={styles.mascot}>
            <Text style={styles.mascotEmoji}>⚡</Text>
          </View>
          <Text style={styles.title}>Welcome to ZOLT</Text>
          <Text style={styles.body}>
            Zolt shows you instant deals from food spots near you — restaurants, food trucks, cafes, and more.
            {'\n\n'}
            Turn on Zolt Mode when you're hungry and we'll ping you the moment something good pops up nearby.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => setStep(1)}>
            <Text style={styles.buttonText}>GET STARTED</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 1 && (
        <View style={styles.content}>
          <Text style={styles.emoji}>📍</Text>
          <Text style={styles.title}>Location access</Text>
          <Text style={styles.body}>
            Zolt needs your location to find deals nearby.
            {'\n\n'}
            We only use your location while Zolt Mode is active. Your exact position is never shared with venues — they only see an anonymous count of how many people are nearby.
            {'\n\n'}
            We delete your location data after 24 hours.
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleLocationPermission}>
            <Text style={styles.buttonText}>ALLOW LOCATION</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipLink} onPress={() => setStep(s => s + 1)}>
            <Text style={styles.skipText}>Not now</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View style={styles.content}>
          <Text style={styles.emoji}>🔔</Text>
          <Text style={styles.title}>Deal alerts</Text>
          <Text style={styles.body}>
            When a venue near you goes live with a deal, we'll send you an instant notification — even if the app is closed.
            {'\n\n'}
            We only notify you when Zolt Mode is on. No marketing, no spam.
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleNotificationPermission}>
            <Text style={styles.buttonText}>ALLOW NOTIFICATIONS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipLink} onPress={() => setStep(s => s + 1)}>
            <Text style={styles.skipText}>Not now</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 3 && (
        <View style={styles.content}>
          <Text style={styles.emoji}>🗺️</Text>
          <Text style={styles.title}>Discovery range</Text>
          <Text style={styles.body}>How far should we look for deals? You can change this any time.</Text>
          <View style={styles.radiusOptions}>
            {DISCOVER_RADII.map(r => (
              <TouchableOpacity
                key={r.label}
                style={[styles.radiusOption, defaultRadius.label === r.label && styles.radiusOptionActive]}
                onPress={() => setDefaultRadius(r)}
              >
                <Text style={[styles.radiusLabel, defaultRadius.label === r.label && styles.radiusLabelActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.button} onPress={handleFinish}>
            <Text style={styles.buttonText}>START FINDING DEALS</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream, paddingTop: 60 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 40 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.primary, width: 24 },
  content: { flex: 1, paddingHorizontal: 28, gap: 16 },
  mascot: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.navy,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
    marginBottom: 8,
  },
  mascotEmoji: { fontSize: 40 },
  emoji: { fontSize: 52, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.navy },
  body: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22 },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.navy,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: COLORS.white, fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  skipLink: { alignItems: 'center', paddingVertical: 8 },
  skipText: { color: COLORS.textSecondary, fontSize: 14 },
  radiusOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  radiusOption: {
    borderWidth: 2,
    borderColor: COLORS.navy,
    borderRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  radiusOptionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  radiusLabel: { fontSize: 15, fontWeight: '700', color: COLORS.navy },
  radiusLabelActive: { color: COLORS.primary },
})
