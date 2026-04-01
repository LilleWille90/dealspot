import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { supabase } from '../lib/supabase'
import { MOCK_MODE, MOCK_USER_ID } from '../lib/mockData'

export default function RootLayout() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    if (MOCK_MODE) {
      setSession({ user: { id: MOCK_USER_ID } })
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(consumer)" />
      <Stack.Screen name="(supplier)" />
    </Stack>
  )
}
