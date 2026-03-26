import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../lib/constants'

export default function QRScanner() {
  const router = useRouter()
  const { offer_id } = useLocalSearchParams()
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission()
    }
  }, [])

  async function handleBarCodeScanned({ data }) {
    if (scanned || processing) return
    setScanned(true)
    setProcessing(true)

    // Expected format: dealspot://redeem/{redemption_id}/{qr_token}
    const match = data.match(/^dealspot:\/\/redeem\/([^/]+)\/(.+)$/)
    if (!match) {
      Alert.alert('Invalid QR code', 'This QR code is not a valid Dealspot redemption code.', [
        { text: 'Try again', onPress: () => setScanned(false) },
      ])
      setProcessing(false)
      return
    }

    const qrToken = match[2]
    const { data: { session } } = await supabase.auth.getSession()

    const { data: result, error } = await supabase.functions.invoke('redeem-qr', {
      body: { qr_token: qrToken, supplier_id: session?.user?.id },
    })

    setProcessing(false)

    if (error || !result?.success) {
      const msg = error?.message || 'Could not redeem this code.'
      Alert.alert('Redemption failed', msg, [
        { text: 'Try again', onPress: () => setScanned(false) },
        { text: 'Cancel', onPress: () => router.back() },
      ])
      return
    }

    Alert.alert(
      '✓ Redeemed!',
      'Deal confirmed. The spot has been marked as redeemed.',
      [{ text: 'Done', onPress: () => router.back() }]
    )
  }

  if (!permission) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={styles.noPermission}>
        <Text style={styles.noPermissionText}>Camera access is required to scan QR codes.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Allow camera</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      >
        {/* Overlay */}
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.scanArea}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanHint}>
              {processing ? 'Verifying…' : 'Point camera at customer\'s QR code'}
            </Text>
          </View>
        </View>
      </CameraView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'transparent' },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  scanHint: {
    color: COLORS.white,
    fontSize: 15,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  noPermission: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 16 },
  noPermissionText: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },
  permBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  permBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  backLink: { color: COLORS.textSecondary, fontSize: 14, textDecorationLine: 'underline' },
})
