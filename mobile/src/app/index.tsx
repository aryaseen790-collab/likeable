import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderButtons } from '../components/HeaderButtons';
import { ChevronIcon } from '../components/icons';
import { Orbit } from '../components/Orbit';
import { Button, Card, Row, Txt } from '../components/ui';
import { COLORS } from '@shared/scoring';
import { plain, useI18n } from '../lib/i18n';
import { ICONS, summarize } from '../lib/result';
import { useStore } from '../lib/store';
import { radius, space, useTheme } from '../lib/theme';

export default function Home() {
  const { c } = useTheme();
  const { t, bundle, rtl, formatDate } = useI18n();
  const { progress, results, saveProgress } = useStore();
  const insets = useSafeAreaInsets();
  const N = bundle.questions.length;
  const answered = progress?.answers.filter((a) => a !== null).length ?? 0;
  const last = results[0];
  const lastSummary = last && summarize(t, bundle.questions, last.answers);

  const start = (resume: boolean) => {
    if (!resume) saveProgress(null);
    router.push({ pathname: '/quiz', params: resume ? { resume: '1' } : {} });
  };

  return (
    <>
      <Stack.Screen options={{ headerRight: () => <HeaderButtons /> }} />
      <ScrollView contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + space.xxl }]} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.hero}>
          <View style={[styles.chip, { backgroundColor: c.accentSoft }]}>
            <Txt variant="small" color="accent" style={{ fontWeight: '700' }}>
              {t('hero.badge')}
            </Txt>
          </View>
          <Txt variant="display" heading>
            {t('home.title')}
          </Txt>
          <Txt color="muted">{t('home.lead')}</Txt>
        </View>

        <Orbit />

        <View style={styles.actions}>
          <Button size="lg" label={t('test.start')} onPress={() => start(false)} />
          {progress && answered > 0 && answered < N && (
            <Button variant="secondary" label={t('test.resume', { n: answered, total: N })} onPress={() => start(true)} />
          )}
        </View>

        {lastSummary && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('home.lastResult')}. ${t('history.itemA11y', { date: formatDate(last.date), score: lastSummary.overall, label: lastSummary.band.label })}`}
            onPress={() => router.push(`/result/${last.id}`)}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <Card>
              <Txt variant="label">{t('home.lastResult')}</Txt>
              <Row>
                <Txt variant="title" style={{ fontVariant: ['tabular-nums'] }}>{lastSummary.overall}%</Txt>
                <View style={{ flex: 1 }}>
                  <Txt variant="heading">{lastSummary.band.label}</Txt>
                  <Txt variant="small">{formatDate(last.date)}</Txt>
                </View>
                <ChevronIcon color={c.muted} flip={rtl} />
              </Row>
            </Card>
          </Pressable>
        )}
        {results.length > 1 && <Button variant="ghost" label={t('home.viewAll')} onPress={() => router.push('/history')} />}

        <Txt variant="title" heading style={{ marginTop: space.lg }}>
          {plain(t('home.dims'))}
        </Txt>
        <View style={styles.dims}>
          {ICONS.map((icon, i) => (
            <Card key={i} accessible style={styles.dim}>
              <Row style={{ alignItems: 'flex-start' }}>
                <View style={[styles.dimIcon, { borderColor: COLORS[i] }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <Txt style={{ fontSize: 22, lineHeight: 28 }} center allowFontScaling={false}>{icon}</Txt>
                </View>
                <View style={{ flex: 1, gap: space.xs }}>
                  <Txt variant="heading" heading>{t(`dim.${i}.name`)}</Txt>
                  <Txt variant="small">{t(`dim.${i}.desc`)}</Txt>
                </View>
              </Row>
            </Card>
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.xl, gap: space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  hero: { gap: space.md },
  chip: { alignSelf: 'flex-start', paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill },
  actions: { gap: space.md },
  dims: { gap: space.md },
  dim: { padding: space.lg },
  dimIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
