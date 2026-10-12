import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCVStore } from '../src/store/useCVStore'
import { useJobsStore } from '../src/store/useJobsStore'
import { useApplicationsStore } from '../src/store/useApplicationsStore'
import { COULEURS } from '../src/constants/theme'

const VERSION_KEY = 'jobseek_data_version'
const DATA_VERSION = '2'

async function purgerDonneesTest() {
  const version = await AsyncStorage.getItem(VERSION_KEY)
  if (version !== DATA_VERSION) {
    await AsyncStorage.multiRemove(['jobseek_cv', 'jobseek_applications', 'jobseek_favorites'])
    await AsyncStorage.setItem(VERSION_KEY, DATA_VERSION)
  }
}

export default function RootLayout() {
  const { charger } = useCVStore()
  const { chargerFavoris, rafraichir } = useJobsStore()
  const { charger: chargerApps } = useApplicationsStore()

  useEffect(() => {
    ;(async () => {
      try {
        await purgerDonneesTest()
      } catch {}
      charger()
      chargerFavoris()
      chargerApps()
      rafraichir()
    })()
  }, [])

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COULEURS.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="modal/job-detail"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="modal/apply"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="modal/ats"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="modal/settings"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="modal/translate"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </>
  )
}
