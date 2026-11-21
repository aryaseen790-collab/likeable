// Asked once on first launch (only in builds that include analytics). Both choices
// are equally prominent, nothing is sent before a choice, and either one can be
// changed later in Settings.
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Txt } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useStore } from '../lib/store';
import { space } from '../lib/theme';

export default function ConsentScreen() {
  const { t } = useI18n();
  const { updateSettings } = useStore();
  const insets = useSafeAreaInsets();
  const choose = (v: 'granted' | 'denied') => {
    updateSettings({ analytics: v });
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl }]}>
      <Txt style={{ fontSize: 48, lineHeight: 60 }} center accessibilityElementsHidden importantForAccessibility="no">📊</Txt>
      <Txt variant="title" heading center>{t('consent.title')}</Txt>
      <Txt center>{t('consent.body')}</Txt>
      <View style={{ gap: space.md, marginTop: space.lg }}>
        <Button label={t('consent.allow')} onPress={() => choose('granted')} />
        <Button label={t('consent.deny')} onPress={() => choose('denied')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: 'center', padding: space.xl, gap: space.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },
});
