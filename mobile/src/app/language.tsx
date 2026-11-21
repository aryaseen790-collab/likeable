import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { LANGS } from '../lib/languages';
import { useStore } from '../lib/store';
import { space } from '../lib/theme';
import { Choice } from '../components/Choice';

export default function Language() {
  const { t, lang } = useI18n();
  const { updateSettings } = useStore();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + space.xxl }]} contentInsetAdjustmentBehavior="automatic">
      <Card style={{ paddingVertical: space.sm }}>
        <View accessibilityRole="radiogroup" accessibilityLabel={t('nav.language')}>
          {LANGS.map((l, i) => (
            <Choice
              key={l.code}
              label={l.name}
              lang={l.tag}
              selected={l.code === lang.code}
              first={i === 0}
              onPress={() => {
                updateSettings({ lang: l.code });
                if (router.canGoBack()) router.back();
              }}
            />
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' },
});
