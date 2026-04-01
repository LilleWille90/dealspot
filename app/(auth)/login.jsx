import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../lib/constants'

function Checker() {
  return (
    <View style={styles.checker}>
      {Array.from({ length: 40 }).map((_, i) => (
        <View key={i} style={[styles.checkerCell, i % 2 === 0 ? styles.checkerDark : styles.checkerOrange]} />
      ))}
    </View>
  )
}

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) Alert.alert('Login failed', error.message)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Checker />
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.mascot}>
            <Text style={styles.mascotEmoji}>⚡</Text>
          </View>
          <Text style={styles.logo}>ZOLT</Text>
          <Text style={styles.tagline}>Short. Sharp. Local.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign in</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={COLORS.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/signup')} style={styles.link}>
            <Text style={styles.linkText}>New here? Create an account →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Checker />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  checker: { flexDirection: 'row', height: 8 },
  checkerCell: { flex: 1, height: 8 },
  checkerDark: { backgroundColor: COLORS.primary },
  checkerOrange: { backgroundColor: COLORS.primaryLight },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 28, gap: 28 },
  hero: { alignItems: 'center', gap: 8 },
  mascot: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  mascotEmoji: { fontSize: 46 },
  logo: { fontSize: 52, fontWeight: '900', color: COLORS.navy, letterSpacing: 6 },
  tagline: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: 1 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    gap: 14,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.navy, marginBottom: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  link: { alignItems: 'center' },
  linkText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
})
