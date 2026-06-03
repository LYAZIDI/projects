import { useEffect, useState } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { initDB } from '../src/db/client'
import { useExpensesStore } from '../src/store/useExpensesStore'
import { useBudgetStore } from '../src/store/useBudgetStore'
import { COULEURS } from '../src/constants/theme'

// Garder le splash screen visible pendant l'initialisation
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [dbPrete, setDbPrete] = useState(false)
  const chargerCategories = useExpensesStore(s => s.chargerCategories)
  const chargerDepensesMois = useExpensesStore(s => s.chargerDepensesMois)
  const chargerBudget = useBudgetStore(s => s.chargerBudget)

  useEffect(() => {
    async function initialiser() {
      try {
        // 1. Initialiser SQLite
        await initDB()

        // 2. Charger les données initiales en parallèle
        await Promise.all([
          chargerCategories(),
          chargerDepensesMois(),
          chargerBudget(),
        ])

        setDbPrete(true)
      } catch (e) {
        console.error('Erreur initialisation DB:', e)
        setDbPrete(true) // Afficher l'app même en cas d'erreur
      } finally {
        SplashScreen.hideAsync()
      }
    }

    initialiser()
  }, [])

  if (!dbPrete) {
    return (
      <View style={styles.chargement}>
        <ActivityIndicator size="large" color={COULEURS.accent} />
      </View>
    )
  }

  return (
    <>
      <StatusBar style="light" backgroundColor={COULEURS.bg} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COULEURS.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal/ajouter"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="modal/modifier"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </>
  )
}

const styles = StyleSheet.create({
  chargement: {
    flex: 1,
    backgroundColor: COULEURS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
