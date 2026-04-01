import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { COLORS } from '../lib/constants'
import { MOCK_MODE } from '../lib/mockData'

// In dev (MOCK_MODE), change this to '/(supplier)/' to preview the supplier side
// Change to '/(supplier)/' to preview the supplier side
const MOCK_ROUTE = '/(consumer)/'

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    if (MOCK_MODE) {
      router.replace(MOCK_ROUTE)
      return
    }

    async function redirect() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/(auth)/login')
        return
      }

      // Check user role and redirect to appropriate home
      const { data: profile } = await supabase
        .from('supplier_profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (profile) {
        router.replace('/(supplier)/')
      } else {
        router.replace('/(consumer)/')
      }
    }

    redirect()
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary }}>
      <ActivityIndicator color={COLORS.white} size="large" />
    </View>
  )
}
