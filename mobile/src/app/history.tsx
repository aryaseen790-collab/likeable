import { router } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { ChevronIcon } from '../components/icons';
import { Button, Card, Row, Txt } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { summarize } from '../lib/result';
import { useStore } from '../lib/store';
import { space, useTheme } from '../lib/theme';

export default function History() {
  const { c } = useTheme();
  const { t, bundle, formatDate, rtl } = useI18n();
  const { results, clearResults } = useStore();
  const insets = useSafeAreaInsets();
  const rows = results.map((r) => ({ r, s: summarize(t, bundle.questions, r.answers) }));
  const trend = [...rows].reverse().map((x) => x.s.overall).slice(-12);

  const clear = () =>
    Alert.alert(t('history.clear'), t('history.clearConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: clearResults },
    ]);

  return (
    <FlatList
      data={rows}
      keyExtractor={(x) => x.r.id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + space.xxl }]}
      ListHeaderComponent={
        rows.length > 1 ? (
          // Trend of the last 12 overall scores; decorative, the list below carries the numbers.
          <Card accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ paddingVertical: space.lg }}>
            <Svg width="100%" height={80} viewBox="0 0 300 80" preserveAspectRatio="none" style={rtl ? { transform: [{ scaleX: -1 }] } : undefined}>
              <Polyline
                points={trend.map((v, i) => `${(i / Math.max(1, trend.length - 1)) * 290 + 5},${75 - (v / 100) * 70}`).join(' ')}
                fill="none" stroke={c.accent} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round"
              />
              {trend.map((v, i) => (
                <Circle key={i} cx={(i / Math.max(1, trend.length - 1)) * 290 + 5} cy={75 - (v / 100) * 70} r={4} fill={c.accent} />
              ))}
            </Svg>
          </Card>
        ) : undefined
      }
      ListEmptyComponent={
        <View style={{ gap: space.lg, paddingTop: space.xxl }}>
          <Txt center>{t('history.empty')}</Txt>
          <Button label={t('test.start')} onPress={() => router.replace('/quiz')} />
        </View>
      }
      renderItem={({ item: { r, s } }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('history.itemA11y', { date: formatDate(r.date), score: s.overall, label: s.band.label })}
          onPress={() => router.push(`/result/${r.id}`)}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <Card style={styles.item}>
            <Row>
              <Txt variant="title" style={{ minWidth: 76, fontVariant: ['tabular-nums'] }}>{s.overall}%</Txt>
              <View style={{ flex: 1 }}>
                <Txt variant="heading">{s.band.label}</Txt>
                <Txt variant="small">{formatDate(r.date)}</Txt>
              </View>
              <ChevronIcon color={c.muted} flip={rtl} />
            </Row>
          </Card>
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
      ListFooterComponent={
        rows.length ? (
          <View style={{ gap: space.md, marginTop: space.xl }}>
            <Txt variant="small" center>{t('history.note')}</Txt>
            <Button variant="danger" label={t('history.clear')} onPress={clear} />
          </View>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  page: { padding: space.xl, gap: space.md, maxWidth: 720, width: '100%', alignSelf: 'center' },
  item: { paddingVertical: space.lg },
});
