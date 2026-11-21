import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Choice } from '../components/Choice';
import { ChevronIcon, ExternalIcon } from '../components/icons';
import { Button, Card, Row, Txt } from '../components/ui';
import { announce } from '../lib/a11y';
import { analyticsAvailable } from '../lib/analytics';
import { useI18n } from '../lib/i18n';
import { SITE } from '../lib/result';
import { useStore, type ThemePref } from '../lib/store';
import { space, TOUCH, useTheme } from '../lib/theme';

export default function Settings() {
  const { c } = useTheme();
  const { t, lang, rtl } = useI18n();
  const { settings, updateSettings, deleteAllData } = useStore();
  const insets = useSafeAreaInsets();
  const site = (path: string) => `${SITE}${lang.code === 'en' ? '' : `/${lang.code}`}${path}`;
  const open = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => {});

  const wipe = () =>
    Alert.alert(t('settings.deleteAll'), t('settings.deleteAllConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteAllData();
          announce(t('settings.deleted'));
          router.dismissTo('/');
        },
      },
    ]);

  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + space.xxl }]} contentInsetAdjustmentBehavior="automatic">
      <Section title={t('nav.language')}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('nav.language')}: ${lang.name}`}
          onPress={() => router.push('/language')}
          style={({ pressed }) => [styles.choice, pressed && { opacity: 0.7 }]}
        >
          <Txt style={{ flex: 1 }} color="heading">{lang.name}</Txt>
          <ChevronIcon color={c.muted} flip={rtl} />
        </Pressable>
      </Section>

      <Section title={t('settings.appearance')}>
        <View accessibilityRole="radiogroup" accessibilityLabel={t('settings.appearance')}>
          {(['system', 'light', 'dark'] as ThemePref[]).map((th, i) => (
            <Choice key={th} label={t(`settings.${th}`)} selected={settings.theme === th} first={i === 0} onPress={() => updateSettings({ theme: th })} />
          ))}
        </View>
      </Section>

      <Section title={t('settings.privacy')}>
        <Row style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: space.xs }}>
            <Txt variant="heading" nativeID="analytics-label">{t('settings.analytics')}</Txt>
            <Txt variant="small">{analyticsAvailable ? t('settings.analyticsText') : t('settings.analyticsOff')}</Txt>
          </View>
          <Switch
            accessibilityLabel={t('settings.analytics')}
            accessibilityHint={analyticsAvailable ? t('settings.analyticsText') : t('settings.analyticsOff')}
            value={analyticsAvailable && settings.analytics === 'granted'}
            disabled={!analyticsAvailable}
            onValueChange={(on) => updateSettings({ analytics: on ? 'granted' : 'denied' })}
            trackColor={{ true: c.accent, false: c.borderStrong }}
            thumbColor="#ffffff"
            ios_backgroundColor={c.borderStrong}
          />
        </Row>
        <LinkRow label={t('nav.privacy')} onPress={() => open(site('/privacy-policy/'))} />
        <LinkRow label={t('nav.terms')} onPress={() => open(site('/terms-conditions/'))} />
      </Section>

      <Section title={t('settings.about')}>
        <LinkRow label={t('settings.website')} onPress={() => open(site('/'))} />
        <Txt variant="small">{t('settings.version', { v: Constants.expoConfig?.version ?? '1.0.0' })}</Txt>
      </Section>

      <Card>
        <Txt variant="heading" heading>{t('settings.deleteAll')}</Txt>
        <Txt variant="small">{t('settings.deleteAllText')}</Txt>
        <Button variant="danger" label={t('settings.deleteAll')} onPress={wipe} />
      </Card>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Txt variant="label" heading>{title}</Txt>
      <Card style={{ paddingVertical: space.sm }}>{children}</Card>
    </View>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  const { t } = useI18n();
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} accessibilityHint={t('common.opensBrowser')} onPress={onPress} style={({ pressed }) => [styles.choice, pressed && { opacity: 0.7 }]}>
      <Txt style={{ flex: 1 }} color="accent">{label}</Txt>
      <ExternalIcon color={c.accent} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.xl, gap: space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  choice: { minHeight: TOUCH + 4, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
});
