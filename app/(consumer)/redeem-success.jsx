import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { COLORS } from '../../lib/constants'

export default function RedeemSuccess() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.title}>Enjoy your deal!</Text>
      <Text style={styles.body}>
        The staff have confirmed your redemption. Thanks for using Dealspot.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace('/(consumer)/')}>
        <Text style={styles.buttonText}>Back to deals</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    gap: 16,
  },
  emoji: { fontSize: 72 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  body: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginTop: 16,
  },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
})
