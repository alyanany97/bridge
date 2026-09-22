# Bridge Mobile App

React Native + Expo mobile application for iOS and Android.

## Setup

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode (macOS only)
- Android: Android Studio or Android SDK

### Environment Variables

Create a `.env.local` file in the `mobile/` directory:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# Backend API
EXPO_PUBLIC_API_URL=https://helper-495902.cloudfunctions.net

# Expo Project
EXPO_PUBLIC_PROJECT_ID=your_expo_project_id
```

### Installation

```bash
cd mobile
npm install
```

## Development

### Start Development Server
```bash
npm run start
```

### Run on Android
```bash
npm run android
```

### Run on iOS (macOS only)
```bash
npm run ios
```

### Run on Web
```bash
npm run web
```

## Project Structure

```
src/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main app tabs
│   └── [other]/           # Modal and detail screens
├── components/            # Reusable components
├── hooks/                 # Custom hooks (useLocation, useNotifications)
├── services/              # API and Firebase services
├── stores/                # Zustand state management
├── lib/                   # Utilities and helpers
├── constants/             # App constants and theme
└── assets/                # Images, icons, fonts
```

## Features

### Core Features
- ✅ User Authentication (Firebase)
- ✅ Browse available items
- ✅ Post items for donation
- ✅ Claim items
- ✅ Driver delivery management
- ✅ Real-time location tracking
- ✅ Push notifications
- ✅ User profiles and ratings

### AI Vision
- Camera integration for item photos
- Gemini Vision API for automatic item detection

### Maps & Location
- Real-time GPS tracking
- Route planning with OSRM
- Geocoding with Nominatim

### Chat
- Real-time messaging between helpers and receivers
- Delivery tracking updates

## Security

### Permissions
- **Location**: For delivery tracking and nearby items
- **Camera**: For photographing items
- **Photos**: For selecting item images
- **Notifications**: For delivery updates

### Firebase Security Rules
- User-only data access
- Public item listings with location filtering
- Firestore rules enforce proper access control

## Building for App Store

### iOS App Store
1. Create Apple Developer account
2. Configure signing certificates
3. Run: `eas build --platform ios`
4. Submit to App Store Connect

### Google Play Store
1. Create Google Play Developer account
2. Create keystore for signing
3. Run: `eas build --platform android`
4. Submit to Google Play Console

## Submission Checklist

- [ ] Privacy Policy
- [ ] Terms of Service
- [ ] App Store screenshots (5-8 per language)
- [ ] App Store description and keywords
- [ ] Test on real devices
- [ ] Firebase security rules reviewed
- [ ] API endpoints verified
- [ ] Push notifications tested
- [ ] Location permissions working
- [ ] Camera permissions working

## Deployment with EAS

### Configuration
EAS (Expo Application Services) handles building and updates:

```bash
# Login to Expo
eas login

# Configure for your account
eas build:configure

# Build for all platforms
eas build --platform all
```

### Update Management
Push over-the-air updates without app store resubmission:

```bash
eas update
```

## Troubleshooting

### Build Errors
- Clear cache: `expo start -c`
- Reinstall: `rm -rf node_modules && npm install`
- Check env vars: `echo $EXPO_PUBLIC_*`

### Runtime Errors
- Enable verbose logging: `expo start --verbose`
- Check Firebase connection in console
- Verify API endpoints are accessible

### Permission Issues
- Android: Check `app.json` permissions array
- iOS: Check `app.json` infoPlist entries

## Contributing

1. Create feature branch from `development-aryan`
2. Test on iOS and Android
3. Submit PR with description
4. Ensure all checks pass

## Notes

- Web version uses same codebase (Expo supports web)
- Firebase config same as web app
- API endpoints compatible with web and mobile
- State persists locally with AsyncStorage

## Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [Firebase for React Native](https://rnfirebase.io)
- [EAS Build](https://docs.expo.dev/build/introduction/)
