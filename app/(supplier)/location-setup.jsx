import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator
} from 'react-native'
import { useRouter } from 'expo-router'
import * as Location from 'expo-location'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../lib/constants'

export default function LocationSetup() {
  const router = useRouter()
  const [locationType, setLocationType] = useState('fixed') // 'gps' | 'fixed'
  const [addressSearch, setAddressSearch] = useState('')
  const [addressSuggestions, setAddressSuggestions] = useState([])
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [gpsLocation, setGpsLocation] = useState(null)
  const [saving, setSaving] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState(null)

  useEffect(() => {
    loadCurrentLocation()
  }, [])

  async function loadCurrentLocation() {
    const { data: { session } } = await supabase.auth.getSession()
    const { data: profile } = await supabase
      .from('supplier_profiles')
      .select('location_type, fixed_address, fixed_lat, fixed_lng')
      .eq('user_id', session?.user?.id)
      .single()

    if (profile) {
      setLocationType(profile.location_type || 'fixed')
      if (profile.fixed_address) {
        setAddressSearch(profile.fixed_address)
        setSelectedAddress({ address: profile.fixed_address, lat: profile.fixed_lat, lng: profile.fixed_lng })
      }
    }
  }

  async function requestGps() {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Location needed', 'Please enable location access to use live GPS mode.')
      return
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
    setGpsLocation(loc.coords)
  }

  function onAddressChange(text) {
    setAddressSearch(text)
    setSelectedAddress(null)
    if (searchTimeout) clearTimeout(searchTimeout)
    if (text.length < 3) {
      setAddressSuggestions([])
      return
    }
    // Debounce address search via edge function (Google Places)
    setSearchTimeout(setTimeout(() => searchAddress(text), 500))
  }

  async function searchAddress(query) {
    const { data } = await supabase.functions.invoke('search-address', {
      body: { query },
    })
    setAddressSuggestions(data?.suggestions || [])
  }

  async function handleSave() {
    if (locationType === 'fixed' && !selectedAddress) {
      Alert.alert('Select address', 'Please search for and select your venue address.')
      return
    }
    if (locationType === 'gps' && !gpsLocation) {
      await requestGps()
      return
    }

    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()

    await supabase.from('supplier_profiles').update({
      location_type: locationType,
      fixed_address: locationType === 'fixed' ? selectedAddress?.address : null,
      fixed_lat: locationType === 'fixed' ? selectedAddress?.lat : null,
      fixed_lng: locationType === 'fixed' ? selectedAddress?.lng : null,
    }).eq('user_id', session?.user?.id)

    if (locationType === 'gps' && gpsLocation) {
      await supabase.from('supplier_locations').upsert({
        supplier_id: session?.user?.id,
        lat: gpsLocation.latitude,
        lng: gpsLocation.longitude,
        is_live: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'supplier_id' })
    }

    setSaving(false)
    router.back()
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Location setup</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        {/* Type selector */}
        <Text style={styles.sectionLabel}>Location type</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeBtn, locationType === 'fixed' && styles.typeBtnActive]}
            onPress={() => setLocationType('fixed')}
          >
            <Text style={styles.typeIcon}>🏪</Text>
            <Text style={[styles.typeBtnText, locationType === 'fixed' && styles.typeBtnTextActive]}>
              Fixed address
            </Text>
            <Text style={[styles.typeSubText, locationType === 'fixed' && styles.typeBtnTextActive]}>
              Restaurant, café, stall
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, locationType === 'gps' && styles.typeBtnActive]}
            onPress={() => { setLocationType('gps'); requestGps() }}
          >
            <Text style={styles.typeIcon}>🚚</Text>
            <Text style={[styles.typeBtnText, locationType === 'gps' && styles.typeBtnTextActive]}>
              Live GPS
            </Text>
            <Text style={[styles.typeSubText, locationType === 'gps' && styles.typeBtnTextActive]}>
              Food truck, mobile
            </Text>
          </TouchableOpacity>
        </View>

        {/* Fixed address search */}
        {locationType === 'fixed' && (
          <>
            <Text style={styles.sectionLabel}>Search your address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Drottninggatan 10, Stockholm"
              placeholderTextColor={COLORS.textSecondary}
              value={addressSearch}
              onChangeText={onAddressChange}
            />
            {addressSuggestions.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestion}
                onPress={() => {
                  setSelectedAddress(s)
                  setAddressSearch(s.address)
                  setAddressSuggestions([])
                }}
              >
                <Text style={styles.suggestionText}>{s.address}</Text>
              </TouchableOpacity>
            ))}
            {selectedAddress && (
              <View style={styles.confirmed}>
                <Text style={styles.confirmedText}>✓ {selectedAddress.address}</Text>
              </View>
            )}
          </>
        )}

        {/* GPS status */}
        {locationType === 'gps' && (
          <View style={styles.gpsStatus}>
            {gpsLocation ? (
              <Text style={styles.gpsOk}>✓ GPS location acquired. Your location updates every 30 seconds while an offer is live.</Text>
            ) : (
              <Text style={styles.gpsWaiting}>Waiting for GPS…</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveBtnText}>Save location</Text>}
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
  backText: { color: COLORS.primary, fontSize: 16, width: 60 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  content: { flex: 1, padding: 20, gap: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.white,
  },
  typeBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  typeIcon: { fontSize: 28 },
  typeBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  typeBtnTextActive: { color: COLORS.primary },
  typeSubText: { fontSize: 11, color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
  },
  suggestion: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionText: { fontSize: 14, color: COLORS.text },
  confirmed: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    padding: 12,
  },
  confirmedText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  gpsStatus: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gpsOk: { fontSize: 14, color: COLORS.primary, lineHeight: 20 },
  gpsWaiting: { fontSize: 14, color: COLORS.textSecondary },
  footer: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
})
