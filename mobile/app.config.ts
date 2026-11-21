import fs from 'node:fs';
import type { ExpoConfig } from 'expo/config';

// Google Analytics (Firebase) is only compiled in when the Firebase config files from
// the GA4 property are present (see README: "Analytics"). Without them the app
// builds with analytics off and sends nothing.
const ANDROID_GOOGLE = './firebase/google-services.json';
const IOS_GOOGLE = './firebase/GoogleService-Info.plist';
const firebase = fs.existsSync(ANDROID_GOOGLE) && fs.existsSync(IOS_GOOGLE);

const config: ExpoConfig = {
  name: 'Likeable Person Test',
  slug: 'likeable-person-test',
  scheme: 'likeable',
  version: '1.0.0',
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#f6f7fb',
  ios: {
    bundleIdentifier: 'com.likeablepersontest.app',
    supportsTablet: true,
    ...(firebase && { googleServicesFile: IOS_GOOGLE }),
    config: { usesNonExemptEncryption: false },
    // No tracking across apps (no IDFA), so the app never shows the App Tracking Transparency prompt.
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      // Reasons for the "required reason" APIs that React Native and Expo use.
      NSPrivacyAccessedAPITypes: [
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp', NSPrivacyAccessedAPITypeReasons: ['C617.1', '0A2A.1', '3B52.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime', NSPrivacyAccessedAPITypeReasons: ['35F9.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace', NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'] },
      ],
      // Only collected after the person opts in; never linked to them, never used for tracking.
      NSPrivacyCollectedDataTypes: firebase
        ? [
            { NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeProductInteraction', NSPrivacyCollectedDataTypeLinked: false, NSPrivacyCollectedDataTypeTracking: false, NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAnalytics'] },
            { NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeDeviceID', NSPrivacyCollectedDataTypeLinked: false, NSPrivacyCollectedDataTypeTracking: false, NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAnalytics'] },
          ]
        : [],
    },
  },
  android: {
    package: 'com.likeablepersontest.app',
    ...(firebase && { googleServicesFile: ANDROID_GOOGLE }),
    // Results are personal: keep them out of cloud/adb backups and device transfers.
    allowBackup: false,
    // Nothing the app does needs these; some come in through libraries.
    blockedPermissions: [
      'com.google.android.gms.permission.AD_ID',
      'android.permission.ACCESS_ADSERVICES_AD_ID',
      'android.permission.ACCESS_ADSERVICES_ATTRIBUTION',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.RECORD_AUDIO',
      'android.permission.CAMERA',
    ],
    adaptiveIcon: {
      backgroundColor: '#295cff',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: true,
  },
  web: { favicon: './assets/favicon.png', bundler: 'metro', output: 'single' },
  plugins: [
    'expo-router',
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 180, resizeMode: 'contain', backgroundColor: '#f6f7fb', dark: { backgroundColor: '#07061a' } }],
    // The app lays itself out right-to-left for Arabic and Urdu on its own (see
    // src/lib/i18n.tsx), so the system direction is never applied on top of it.
    ['expo-localization', { supportsRTL: false }],
    'expo-sharing',
    'expo-web-browser',
    [
      'expo-build-properties',
      {
        // Phones only (32- and 64-bit ARM): keeps the downloadable APK small.
        android: { enableMinifyInReleaseBuilds: true, enableShrinkResourcesInReleaseBuilds: true, usesCleartextTraffic: false, buildArchs: ['armeabi-v7a', 'arm64-v8a'] },
        ios: firebase ? { useFrameworks: 'static' } : {},
      },
    ],
    ...(firebase ? ['@react-native-firebase/app', '@react-native-firebase/analytics'] : []),
    './plugins/withReleaseSigning',
  ],
  experiments: { typedRoutes: true },
  extra: { analyticsAvailable: firebase },
};

export default config;
