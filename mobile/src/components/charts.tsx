// Result visuals. Each one is a single accessible element with a text equivalent,
// so screen-reader users get the same information as the picture.
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Polygon, Stop, Text as SvgText } from 'react-native-svg';
import { COLORS } from '@shared/scoring';
import { useReducedMotion } from '../lib/a11y';
import { useTheme } from '../lib/theme';

export function ScoreRing({ score, label, a11yLabel, size = 200, animate = true }: { score: number; label: string; a11yLabel: string; size?: number; animate?: boolean }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const still = !animate || reduced;
  const [frame, setFrame] = useState(0);
  const shown = still ? score : frame;
  useEffect(() => {
    if (still) return;
    const t0 = Date.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / 1400);
      setFrame(Math.round(score * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score, still]);
  const r = 52;
  const circ = 2 * Math.PI * r;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={a11yLabel} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 120 120" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#22b8e6" />
            <Stop offset="0.5" stopColor="#7c4dff" />
            <Stop offset="1" stopColor="#f76a0c" />
          </LinearGradient>
        </Defs>
        <Circle cx="60" cy="60" r={r} stroke={c.ringTrack} strokeWidth="10" fill="none" />
        <Circle
          cx="60" cy="60" r={r} stroke="url(#ring)" strokeWidth="10" fill="none" strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - shown / 100)} transform="rotate(-90 60 60)"
        />
      </Svg>
      <Text style={[styles.score, { color: c.heading, fontSize: size * 0.24 }]} maxFontSizeMultiplier={1.3}>
        {shown}%
      </Text>
      <Text style={[styles.band, { color: c.muted }]} maxFontSizeMultiplier={1.4} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/** Nine-axis radar, matching the website's result chart. */
export function Radar({ scores, labels, a11yLabel, size = 320 }: { scores: number[]; labels: string[]; a11yLabel: string; size?: number }) {
  const { c } = useTheme();
  const cx = 160;
  const cy = 160;
  const R = 110;
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i / scores.length) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const poly = (f: (i: number) => number) => scores.map((_, i) => pt(i, f(i)).join(',')).join(' ');
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={a11yLabel} style={{ width: '100%', aspectRatio: 460 / 360, maxWidth: size * 1.4 }}>
      <Svg width="100%" height="100%" viewBox="-70 -20 460 360">
        <Defs>
          <LinearGradient id="radar" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#5b84ff" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#e879f9" stopOpacity={0.35} />
          </LinearGradient>
        </Defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <Polygon key={f} points={poly(() => R * f)} fill="none" stroke={c.border} strokeWidth={1} />
        ))}
        {scores.map((_, i) => {
          const [x, y] = pt(i, R);
          return <Line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={c.border} strokeWidth={1} />;
        })}
        <Polygon points={poly((i) => (R * Math.max(scores[i], 4)) / 100)} fill="url(#radar)" stroke={c.accent} strokeWidth={2} />
        <G>
          {scores.map((s, i) => {
            const [x, y] = pt(i, (R * s) / 100);
            return <Circle key={i} cx={x} cy={y} r={5} fill={COLORS[i]} />;
          })}
        </G>
        {labels.map((l, i) => {
          const [x, y] = pt(i, R + 22);
          const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end';
          return (
            <SvgText key={i} x={x} y={y + 5} textAnchor={anchor} fontSize={15} fontWeight="600" fill={c.text} fontFamily={Platform.OS === 'web' ? 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' : undefined}>
              {l.length > 18 ? `${l.slice(0, 17)}…` : l}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  score: { fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  band: { fontSize: 15, fontWeight: '700', textAlign: 'center', paddingHorizontal: 28 },
});
