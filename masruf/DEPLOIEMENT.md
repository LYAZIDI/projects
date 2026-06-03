# Masruf — Guide de Déploiement

## 1. Installation locale

```bash
cd masruf
npm install
npx expo start
```

Scanner le QR code avec **Expo Go** (iOS App Store / Google Play).

---

## 2. Tester sur émulateur

```bash
# Android
npx expo start --android

# iOS (Mac uniquement)
npx expo start --ios
```

---

## 3. Build avec EAS (Expo Application Services)

### Prérequis
```bash
npm install -g eas-cli
eas login
eas build:configure
```

### APK Android (test interne)
```bash
eas build --platform android --profile preview
```
→ Télécharger le `.apk` et installer sur tout appareil Android.

### AAB Android (Google Play)
```bash
eas build --platform android --profile production
```
→ Fichier `.aab` à uploader sur Google Play Console.

### IPA iOS (App Store)
```bash
eas build --platform ios --profile production
```
→ Fichier `.ipa` à soumettre via App Store Connect.

---

## 4. Publication Google Play

1. Créer un compte **Google Play Developer** (25$ unique)
2. Créer une application dans Google Play Console
3. Uploader le fichier `.aab`
4. Remplir : description (FR), captures d'écran, icône
5. Soumettre pour révision (2-7 jours)

```bash
# Soumettre directement via EAS
eas submit --platform android
```

---

## 5. Publication App Store

1. Compte **Apple Developer** (99$/an)
2. Créer l'app dans **App Store Connect**
3. Uploader via EAS ou Transporter

```bash
eas submit --platform ios
```

Infos requises :
- Nom : Masruf - Gestion des dépenses
- Sous-titre : Vos finances en DH
- Description : App de gestion des dépenses personnelles en dirham marocain
- Catégorie : Finance
- Âge minimum : 4+

---

## 6. Assets à créer

| Fichier | Dimensions |
|---------|-----------|
| `assets/icon.png` | 1024×1024 px |
| `assets/splash.png` | 1284×2778 px |
| `assets/adaptive-icon.png` | 1024×1024 px |

---

## 7. Variables d'environnement

Créer `.env` :
```
EXPO_PUBLIC_APP_ENV=production
```

---

## 8. Checklist avant publication

- [ ] Tester sur appareil Android réel (mi-gamme)
- [ ] Tester sur iPhone SE (petit écran)
- [ ] Tester en mode hors-ligne (airplane mode)
- [ ] Vérifier les crashes avec `expo diagnostics`
- [ ] Captures d'écran en français
- [ ] Politique de confidentialité (données locales = pas besoin RGPD)
- [ ] Description en français ET arabe (store marocain)
