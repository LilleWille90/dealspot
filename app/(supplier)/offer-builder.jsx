import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert
} from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../lib/supabase'
import { COLORS, OFFER_TEMPLATES, MAX_REDEMPTIONS_OPTIONS, OFFER_DURATIONS } from '../../lib/constants'

export default function OfferBuilder() {
  const router = useRouter()
  const [photo, setPhoto] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [customText, setCustomText] = useState('')
  const [maxRedemptions, setMaxRedemptions] = useState(10)
  const [duration, setDuration] = useState(OFFER_DURATIONS[1]) // 1 hour default
  const [uploading, setUploading] = useState(false)

  const offerText = customText || selectedTemplate?.text || ''

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to add a photo to your offer.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    })

    if (!result.canceled) {
      setPhoto(result.assets[0])
    }
  }

  async function handleContinue() {
    if (!offerText.trim()) {
      Alert.alert('Add offer text', 'Please select a template or write your own offer.')
      return
    }

    let photoUrl = null
    if (photo) {
      setUploading(true)
      photoUrl = await uploadPhoto(photo.uri)
      setUploading(false)
    }

    router.push({
      pathname: '/(supplier)/go-live-review',
      params: {
        text: offerText,
        maxRedemptions: maxRedemptions.toString(),
        durationMinutes: duration.value?.toString() || 'null',
        photoUrl: photoUrl || '',
      },
    })
  }

  async function uploadPhoto(uri) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const fileName = `${session.user.id}/${Date.now()}.jpg`

      const response = await fetch(uri)
      const blob = await response.blob()

      const { data, error } = await supabase.storage
        .from('offer-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('offer-photos')
        .getPublicUrl(data.path)

      return publicUrl
    } catch (e) {
      Alert.alert('Photo upload failed', 'We could not upload your photo. Your offer will go live without it.')
      return null
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Build your offer</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Photo */}
        <TouchableOpacity style={styles.photoBox} onPress={pickPhoto}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoIcon}>📷</Text>
              <Text style={styles.photoHint}>Add a photo (optional)</Text>
              <Text style={styles.photoSubHint}>Photos boost redemptions</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Templates */}
        <Text style={styles.sectionLabel}>Quick templates</Text>
        <View style={styles.templateGrid}>
          {OFFER_TEMPLATES.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.templateChip, selectedTemplate?.id === t.id && styles.templateChipActive]}
              onPress={() => {
                setSelectedTemplate(t)
                setCustomText('')
              }}
            >
              <Text style={[styles.templateText, selectedTemplate?.id === t.id && styles.templateTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom text */}
        <Text style={styles.sectionLabel}>Or write your own</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Free coffee with any sandwich today"
          placeholderTextColor={COLORS.textSecondary}
          value={customText}
          onChangeText={text => {
            setCustomText(text)
            setSelectedTemplate(null)
          }}
          maxLength={120}
          multiline
        />
        <Text style={styles.charCount}>{offerText.length}/120</Text>

        {/* Max redemptions */}
        <Text style={styles.sectionLabel}>Spots available</Text>
        <View style={styles.optionRow}>
          {MAX_REDEMPTIONS_OPTIONS.map(n => (
            <TouchableOpacity
              key={n}
              style={[styles.optionChip, maxRedemptions === n && styles.optionChipActive]}
              onPress={() => setMaxRedemptions(n)}
            >
              <Text style={[styles.optionText, maxRedemptions === n && styles.optionTextActive]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Duration */}
        <Text style={styles.sectionLabel}>Offer duration</Text>
        <View style={styles.optionRow}>
          {OFFER_DURATIONS.map(d => (
            <TouchableOpacity
              key={d.label}
              style={[styles.optionChip, duration.label === d.label && styles.optionChipActive]}
              onPress={() => setDuration(d)}
            >
              <Text style={[styles.optionText, duration.label === d.label && styles.optionTextActive]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueBtn, (uploading || !offerText.trim()) && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={uploading || !offerText.trim()}
        >
          <Text style={styles.continueBtnText}>
            {uploading ? 'Uploading photo…' : 'Review & go live →'}
          </Text>
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
  scroll: { padding: 20, gap: 12, paddingBottom: 100 },
  photoBox: { borderRadius: 12, overflow: 'hidden', height: 160 },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  photoIcon: { fontSize: 28 },
  photoHint: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  photoSubHint: { fontSize: 12, color: COLORS.primaryDark },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  templateChip: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
  },
  templateChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  templateText: { fontSize: 14, color: COLORS.text },
  templateTextActive: { color: COLORS.primary, fontWeight: '600' },
  textInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 12, color: COLORS.textSecondary, alignSelf: 'flex-end' },
  optionRow: { flexDirection: 'row', gap: 8 },
  optionChip: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  optionChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  optionText: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  optionTextActive: { color: COLORS.primary, fontWeight: '700' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  continueBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueBtnDisabled: { opacity: 0.5 },
  continueBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
})
