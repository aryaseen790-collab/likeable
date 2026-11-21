import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { Alert, Platform, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { COLORS, decodeAnswers } from '@shared/scoring';
import { Radar, ScoreRing } from '../../components/charts';
import { ExternalIcon, ShareIcon } from '../../components/icons';
import { Button, Card, ProgressBar, Row, Txt } from '../../components/ui';
import { announce } from '../../lib/a11y';
import { track } from '../../lib/analytics';
import { useI18n } from '../../lib/i18n';
import { SITE, summarize, textReport } from '../../lib/result';
import { useStore } from '../../lib/store';
import { radius, space, useTheme } from '../../lib/theme';

export default function ResultScreen() {
  const { c } = useTheme();
  const { t, bundle, lang, formatDate } = useI18n();
  const { results, deleteResult, saveProgress } = useStore();
  const { id, fresh, r } = useLocalSearchParams<{ id: string; fresh?: string; r?: string }>();
  const insets = useSafeAreaInsets();
  const shareRef = useRef<React.ComponentRef<typeof View>>(null);
  const [msg, setMsg] = useState('');

  const index = results.findIndex((x) => x.id === id);
  const saved = index >= 0 ? results[index] : null;
  // Right after finishing, the answers also arrive in the route, so the screen never
  // flashes "not found" while the store catches up.
  const answers = useMemo(() => saved?.answers ?? decodeAnswers(r, bundle.questions.length), [saved, r, bundle.questions.length]);
  const date = saved?.date ?? new Date().toISOString();
  const s = useMemo(() => (answers ? summarize(t, bundle.questions, answers) : null), [answers, t, bundle.questions]);
  const prev = index >= 0 ? results[index + 1] : undefined;
  const prevScore = prev ? summarize(t, bundle.questions, prev.answers).overall : null;

  useEffect(() => {
    if (fresh && s) announce(t('result.scoreA11y', { score: s.overall, label: s.band.label }));
    // Announce once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!s) {
    return (
      <View style={[styles.page, { flex: 1, justifyContent: 'center' }]}>
        <Txt center>{t('result.notFound')}</Txt>
        <Button label={t('result.done')} onPress={() => router.dismissTo('/')} />
      </View>
    );
  }

  const delta = prevScore === null ? null : s.overall - prevScore;

  const shareText = async (full: boolean) => {
    setMsg('');
    track(full ? 'result_download' : 'share_click', { method: 'text' });
    try {
      const message = full
        ? textReport(t, s, formatDate(date), lang.tag)
        : `${t('test.shareText', { score: s.overall })}\n${SITE}${lang.code === 'en' ? '/' : `/${lang.code}/`}`;
      await Share.share({ title: t('test.shareTitle'), message });
    } catch {
      setMsg(t('result.shareFailed'));
      announce(t('result.shareFailed'));
    }
  };
  const shareImage = async () => {
    setMsg('');
    track('share_click', { method: 'image' });
    try {
      if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) throw new Error('unavailable');
      const uri = await captureRef(shareRef as unknown as Parameters<typeof captureRef>[0], { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: t('test.shareTitle') });
    } catch {
      shareText(false);
    }
  };
  const learnPath = bundle.learnMore[s.focus.name];
  const remove = () =>
    Alert.alert(t('result.delete'), t('result.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          if (saved) deleteResult(saved.id);
          router.dismissTo('/');
        },
      },
    ]);

  return (
    <>
      <Stack.Screen
        options={{
          headerBackVisible: !fresh,
          gestureEnabled: !fresh,
          headerRight: fresh ? () => <Button variant="ghost" label={t('result.done')} onPress={() => router.dismissTo('/')} style={{ paddingHorizontal: space.md }} /> : undefined,
        }}
      />
      <ScrollView contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + space.xxl }]} contentInsetAdjustmentBehavior="automatic">
        {/* This card is what the share image shows. */}
        <View ref={shareRef} collapsable={false} style={[styles.shareCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Txt variant="label" center>
            {t('test.resultsTitle')}
          </Txt>
          <View style={{ alignItems: 'center' }}>
            <ScoreRing score={s.overall} label={s.band.label} a11yLabel={t('result.scoreA11y', { score: s.overall, label: s.band.label })} animate={!!fresh} />
          </View>
          <View style={{ gap: space.md }}>
            <Highlight tone={c.good} title={t('test.topStrength')} name={s.top.label} score={s.top.score} />
            <Highlight tone={c.average} title={t('test.focusArea')} name={s.focus.label} score={s.focus.score} />
          </View>
          <Txt variant="small" center>
            likeable-person-test.com
          </Txt>
        </View>

        {delta !== null && (
          <Txt color="muted" center>
            {delta > 0 ? `▲ ${t('result.up', { n: delta })}` : delta < 0 ? `▼ ${t('result.down', { n: -delta })}` : t('result.same')}
          </Txt>
        )}

        <View style={styles.actions}>
          <Button label={t('result.shareImage')} icon={<ShareIcon color={c.accentText} size={20} />} onPress={shareImage} />
          <Button variant="secondary" label={t('result.shareText')} onPress={() => shareText(true)} />
          {!!msg && (
            <Txt color="danger" center accessibilityLiveRegion="assertive">
              {msg}
            </Txt>
          )}
        </View>

        <Card>
          <Txt variant="heading" heading>
            {t('test.assessment')}
          </Txt>
          <Txt>{s.band.feedback}</Txt>
          {learnPath && (
            <Button
              variant="ghost"
              role="link"
              label={`${t('test.howToImprove')} · ${s.focus.label}`}
              hint={t('result.opensBrowser')}
              icon={<ExternalIcon color={c.accent} size={18} />}
              onPress={() => WebBrowser.openBrowserAsync(`${SITE}${learnPath}`).catch(() => {})}
              style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }}
            />
          )}
        </Card>

        <Txt variant="title" heading>
          {t('result.dims')}
        </Txt>
        <Card style={{ paddingHorizontal: space.sm }}>
          <Radar
            scores={s.dims.map((d) => d.score)}
            labels={s.dims.map((d) => (d.name === 'Emotional Intelligence' ? t('dim.shortEI') : d.label))}
            a11yLabel={t('test.radarLabel')}
          />
        </Card>
        <View style={{ gap: space.md }}>
          {s.dims.map((d) => (
            <Card key={d.name} accessible accessibilityLabel={t('result.dimA11y', { name: d.label, score: d.score, feedback: d.feedback })} style={styles.dim}>
              <Row>
                <Txt allowFontScaling={false} style={{ fontSize: 22, lineHeight: 28 }}>
                  {d.icon}
                </Txt>
                <Txt variant="heading" style={{ flex: 1 }}>
                  {d.label}
                </Txt>
                <Txt variant="heading" style={{ fontVariant: ['tabular-nums'] }}>
                  {d.score}%
                </Txt>
              </Row>
              <ProgressBar value={d.score / 100} label={d.label} color={COLORS[d.index]} />
              <Txt variant="small">{d.feedback}</Txt>
            </Card>
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            variant="secondary"
            label={t('test.retry')}
            onPress={() => {
              track('quiz_retake');
              saveProgress(null);
              router.replace('/quiz');
            }}
          />
          {saved && <Button variant="danger" label={t('result.delete')} onPress={remove} />}
        </View>
        {saved && (
          <Txt variant="small" center>
            {t('history.note')}
          </Txt>
        )}
      </ScrollView>
    </>
  );
}

function Highlight({ tone, title, name, score }: { tone: string; title: string; name: string; score: number }) {
  const { c } = useTheme();
  return (
    <View accessible accessibilityLabel={`${title}: ${name}, ${score}%`} style={[styles.hl, { backgroundColor: c.surface2, borderStartColor: tone }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="label">{title}</Txt>
        <Txt variant="heading">{name}</Txt>
      </View>
      <Txt variant="title" style={{ fontVariant: ['tabular-nums'] }}>
        {score}%
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.xl, gap: space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  shareCard: { borderRadius: radius.lg, borderWidth: 1, padding: space.xl, gap: space.lg },
  actions: { gap: space.md },
  dim: { padding: space.lg, gap: space.sm },
  hl: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.md, borderStartWidth: 5, paddingVertical: space.md, paddingHorizontal: space.lg },
});
