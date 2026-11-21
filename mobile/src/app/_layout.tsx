import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { analyticsAvailable, applyConsent, trackScreen } from '../lib/analytics';
import { I18nProvider, useI18n } from '../lib/i18n';
import { StoreProvider, useSettings } from '../lib/store';
import { useTheme } from '../lib/theme';

function Shell() {
  const { c, scheme } = useTheme();
  const { t, rtl } = useI18n();
  const { analytics } = useSettings();
  const path = usePathname();
  const asked = useRef(false);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => {});
  }, [c.bg]);
  useEffect(() => {
    applyConsent(analytics);
  }, [analytics]);
  // Ask once, on first launch, and only when this build can send anything at all.
  useEffect(() => {
    if (analyticsAvailable && analytics === null && !asked.current) {
      asked.current = true;
      const id = setTimeout(() => router.push('/consent'), 400);
      return () => clearTimeout(id);
    }
  }, [analytics]);
  useEffect(() => {
    // Screen names only (e.g. "/result/[id]" is reported as "/result"), never ids.
    trackScreen(path.replace(/\/[^/]*\d[^/]*$/, ''));
  }, [path]);

  return (
    <View style={{ flex: 1, direction: rtl ? 'rtl' : 'ltr', backgroundColor: c.bg }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.accent,
          headerTitleStyle: { color: c.heading, fontWeight: '700' },
          headerShadowVisible: false,
          headerBackTitle: t('nav.back'),
          contentStyle: { backgroundColor: c.bg },
          animation: 'default',
        }}
      >
        <Stack.Screen name="index" options={{ title: t('app.name'), headerTitle: '' }} />
        <Stack.Screen name="quiz" options={{ title: t('quiz.title') }} />
        <Stack.Screen name="result/[id]" options={{ title: t('result.title') }} />
        <Stack.Screen name="history" options={{ title: t('nav.history') }} />
        <Stack.Screen name="settings" options={{ title: t('nav.settings') }} />
        <Stack.Screen name="language" options={{ title: t('nav.language') }} />
        <Stack.Screen name="consent" options={{ presentation: 'modal', title: '', headerShown: false, gestureEnabled: false }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <I18nProvider>
          <Shell />
        </I18nProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
