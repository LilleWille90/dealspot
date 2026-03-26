import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../lib/constants'

export default function Signup() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('consumer') // 'consumer' | 'supplier'
  const [loading, setLoading] = useState(false)

  async function handleSignup() {
    if (!name || !email || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields.')
      return
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.')
      return
    }
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    })

    if (error) {
      setLoading(false)
      Alert.alert('Sign up failed', error.message)
      return
    }

    // If supplier, redirect to supplier onboarding; consumer goes to consumer onboarding
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>dealspot</Text>
          <Text style={styles.tagline}>Create your account</Text>
        </View>

        {/* Role selector */}
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'consumer' && styles.roleBtnActive]}
            onPress={() => setRole('consumer')}
          >
            <Text style={[styles.roleBtnText, role === 'consumer' && styles.roleBtnTextActive]}>
              I want deals
            </Text>
            <Text style={[styles.roleSubText, role === 'consumer' && styles.roleBtnTextActive]}>
              Consumer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'supplier' && styles.roleBtnActive]}
            onPress={() => setRole('supplier')}
          >
            <Text style={[styles.roleBtnText, role === 'supplier' && styles.roleBtnTextActive]}>
              I'm a venue
            </Text>
            <Text style={[styles.roleSubText, role === 'supplier' && styles.roleBtnTextActive]}>
              Supplier
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder={role === 'supplier' ? 'Business name' : 'Your name'}
            placeholderTextColor={COLORS.textSecondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
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
            placeholder="Password (min 8 characters)"
            placeholderTextColor={COLORS.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Creating account…' : 'Create account'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={styles.link}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  inner: { flex: 1, justifyContent: 'center', padding: 28 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 40, fontWeight: '800', color: COLORS.primary, letterSpacing: -1 },
  tagline: { fontSize: 15, color: COLORS.textSecondary, marginTop: 6 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  roleBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  roleBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  roleBtnTextActive: { color: COLORS.primary },
  roleSubText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  form: { gap: 14 },
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
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  link: { alignItems: 'center', marginTop: 8 },
  linkText: { color: COLORS.primary, fontSize: 15 },
})
