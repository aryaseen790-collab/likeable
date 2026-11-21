import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { AccessibilityInfo, Animated, findNodeHandle, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIES, COLORS, encodeAnswers, score } from '@shared/scoring';
import { CheckIcon, CloseIcon } from '../components/icons';
import { Button, ProgressBar, Row, Txt } from '../components/ui';
import { announce, useReducedMotion, useScreenReader } from '../lib/a11y';
import { track } from '../lib/analytics';
import { useI18n } from '../lib/i18n';
import { dimName } from '../lib/result';
import { useStore } from '../lib/store';
import { radius, space, TOUCH, useTheme } from '../lib/theme';

const ADVANCE_MS = 420;

export default function Quiz() {
  const { c } = useTheme();
  const { t, bundle, lang, rtl } = useI18n();
  const { progress, saveProgress, addResult } = useStore();
  const { resume } = useLocalSearchParams<{ resume?: string }>();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const screenReader = useScreenReader();
  const questions = bundle.questions;
  const N = questions.length;

  const initial = resume && progress?.answers.length === N ? progress : null;
  const [answers, setAnswers] = useState<(number | null)[]>(() => initial?.answers ?? Array(N).fill(null));
  const [current, setCurrent] = useState(() => Math.min(initial?.current ?? 0, N - 1));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const questionRef = useRef<React.ComponentRef<typeof Text>>(null);
  const [anim] = useState(() => new Animated.Value(1));
  const [dir, setDir] = useState(1);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    track('quiz_start', { resume: !!initial });
  }, [initial]);
  useEffect(() => () => clearTimeout(timer.current), []);

  // New question: slide it in, and move screen-reader focus to it.
  useEffect(() => {
    if (!reduced) {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    }
    if (screenReader) {
      const id = setTimeout(() => {
        if (Platform.OS === 'web') return;
        const node = questionRef.current && findNodeHandle(questionRef.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      }, 350);
      return () => clearTimeout(id);
    }
  }, [current, reduced, screenReader, anim]);

  const q = questions[current];
  const ci = CATEGORIES.indexOf(q.category);
  const answeredCount = answers.filter((a) => a !== null).length;

  const persist = (a: (number | null)[], cur: number) => saveProgress({ answers: a, current: cur, lang: lang.code });

  const go = (to: number) => {
    clearTimeout(timer.current);
    setDir(to > current ? 1 : -1);
    setCurrent(to);
    persist(answers, to);
  };

  const finish = (final: (number | null)[]) => {
    clearTimeout(timer.current);
    const full = final.map((a) => a ?? 0);
    const result = addResult(full, lang.code);
    saveProgress(null);
    track('quiz_complete', { score: score(questions, full).overall });
    router.replace({ pathname: '/result/[id]', params: { id: result.id, fresh: '1', r: encodeAnswers(full) } });
  };

  const select = (i: number) => {
    const next = [...answers];
    next[current] = i;
    setAnswers(next);
    persist(next, current);
    Haptics.selectionAsync().catch(() => {});
    track('quiz_question_answered', { question: current + 1 });
    clearTimeout(timer.current);
    // With VoiceOver/TalkBack the person moves on themselves, so nothing changes under them.
    if (screenReader) return;
    timer.current = setTimeout(() => {
      if (current < N - 1) {
        setDir(1);
        setCurrent(current + 1);
        persist(next, current + 1);
      }
    }, ADVANCE_MS);
  };

  const isLast = current === N - 1;
  const translate = anim.interpolate({ inputRange: [0, 1], outputRange: [(rtl ? -1 : 1) * dir * 28, 0] });

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable accessibilityRole="button" accessibilityLabel={t('quiz.exit')} onPress={() => router.back()} hitSlop={4} style={styles.close}>
              <CloseIcon color={c.accent} />
            </Pressable>
          ),
          headerTitle: t('quiz.progress', { n: current + 1, total: N }),
        }}
      />
      <ScrollView contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + space.lg }]} contentInsetAdjustmentBehavior="automatic">
        <View style={{ gap: space.sm }}>
          <ProgressBar value={answeredCount / N} label={t('quiz.progress', { n: current + 1, total: N })} />
          <View style={[styles.chip, { backgroundColor: c.surface, borderColor: COLORS[ci] }]}>
            <View style={[styles.dot, { backgroundColor: COLORS[ci] }]} />
            <Txt variant="small" color="heading" style={{ fontWeight: '700' }}>
              {dimName(t, q.category)}
            </Txt>
          </View>
        </View>

        <Animated.View style={{ gap: space.lg, opacity: reduced ? 1 : anim, transform: [{ translateX: reduced ? 0 : translate }] }}>
          <Txt color="muted" style={{ fontStyle: 'italic' }}>{q.hook}</Txt>
          <Txt ref={questionRef} variant="title" heading accessibilityLabel={`${t('quiz.progress', { n: current + 1, total: N })}. ${q.text}`}>
            {q.text}
          </Txt>
          <View accessibilityRole="radiogroup" accessibilityLabel={q.text} style={{ gap: space.md }}>
            {q.options.map((o, i) => {
              const checked = answers[current] === i;
              return (
                <Pressable
                  key={`${current}-${i}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked }}
                  accessibilityLabel={o}
                  accessibilityHint={Platform.OS === 'ios' ? undefined : `${i + 1} / ${q.options.length}`}
                  onPress={() => select(i)}
                  android_ripple={{ color: c.accentSoft }}
                  style={({ pressed }) => [
                    styles.option,
                    { backgroundColor: checked ? c.accentSoft : c.surface, borderColor: checked ? c.accent : c.border, transform: [{ scale: pressed ? 0.985 : 1 }] },
                  ]}
                >
                  <View style={[styles.key, { borderColor: checked ? c.accent : c.borderStrong, backgroundColor: checked ? c.accent : 'transparent' }]}>
                    {checked ? <CheckIcon color={c.accentText} size={16} /> : <Text style={[styles.keyText, { color: c.muted }]} allowFontScaling={false}>{i + 1}</Text>}
                  </View>
                  <Txt style={{ flex: 1, fontWeight: checked ? '700' : '500' }} color="heading">{o}</Txt>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Row style={{ marginTop: space.sm }}>
          <Button variant="secondary" label={t('test.previous')} disabled={current === 0} onPress={() => go(current - 1)} style={{ flex: 1 }} />
          <Button
            label={isLast ? t('test.getResults') : t('test.next')}
            disabled={answers[current] === null || (isLast && answers.some((a) => a === null))}
            onPress={() => {
              if (isLast) finish(answers);
              else {
                go(current + 1);
                if (screenReader) announce(t('quiz.progress', { n: current + 2, total: N }));
              }
            }}
            style={{ flex: 1 }}
          />
        </Row>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.xl, gap: space.xl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  close: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center', marginStart: -space.md },
  chip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1.5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  option: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.md, borderWidth: 2 },
  key: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 15, fontWeight: '700' },
});
