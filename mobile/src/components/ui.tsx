// Building blocks used by every screen. All of them scale with the system text
// size, meet 48pt touch targets, expose their role/state to VoiceOver and TalkBack,
// and lay out from the reading direction (start/end), so RTL works.
import { forwardRef, type ReactNode } from 'react';
import type React from 'react';
import { Pressable, StyleSheet, Text, View, type AccessibilityRole, type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewProps, type ViewStyle } from 'react-native';
import { useI18n } from '../lib/i18n';
import { radius, space, TOUCH, useTheme } from '../lib/theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'small' | 'label';
const SIZES: Record<Variant, TextStyle> = {
  display: { fontSize: 34, lineHeight: 41, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800' },
  heading: { fontSize: 19, lineHeight: 25, fontWeight: '700' },
  body: { fontSize: 17, lineHeight: 25 },
  small: { fontSize: 15, lineHeight: 21 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
};
// Scripts that are tall or stacked (Indic, Arabic, Thai) need more line height.
const TALL = new Set(['hi', 'bn', 'mr', 'te', 'ta', 'ar', 'ur']);

type TxtProps = TextProps & { ref?: React.Ref<React.ComponentRef<typeof Text>>; variant?: Variant; color?: 'heading' | 'text' | 'muted' | 'accent' | 'danger'; center?: boolean; heading?: boolean };
export function Txt({ variant = 'body', color, center, heading, style, ...rest }: TxtProps) {
  const { c } = useTheme();
  const { rtl, lang } = useI18n();
  const base = SIZES[variant];
  const tone = color ?? (['display', 'title', 'heading'].includes(variant) ? 'heading' : variant === 'label' || variant === 'small' ? 'muted' : 'text');
  const lh = TALL.has(lang.code) && base.lineHeight ? { lineHeight: Math.round(base.lineHeight * 1.18) } : null;
  const textTransform = lang.code === 'en' || !base.textTransform ? base.textTransform : 'none';
  return (
    <Text
      accessibilityRole={heading ? 'header' : undefined}
      style={[base, lh, { textTransform, color: c[tone], textAlign: center ? 'center' : rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' }, style]}
      {...rest}
    />
  );
}

type BtnProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: ReactNode;
  hint?: string;
  role?: AccessibilityRole;
  style?: StyleProp<ViewStyle>;
  size?: 'md' | 'lg';
};
export const Button = forwardRef<React.ComponentRef<typeof View>, BtnProps>(function Button({ label, variant = 'primary', icon, hint, role = 'button', style, disabled, size = 'md', ...rest }, ref) {
  const { c } = useTheme();
  const bg = { primary: c.accent, secondary: c.surface, ghost: 'transparent', danger: 'transparent' }[variant];
  const fg = { primary: c.accentText, secondary: c.heading, ghost: c.accent, danger: c.danger }[variant];
  const border = variant === 'secondary' ? c.borderStrong : variant === 'danger' ? c.danger : 'transparent';
  return (
    <Pressable
      ref={ref}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      android_ripple={{ color: c.accentSoft }}
      style={({ pressed }) => [
        styles.btn,
        size === 'lg' && styles.btnLg,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.45 : pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
      {...rest}
    >
      {icon}
      <Text style={[styles.btnText, size === 'lg' && styles.btnTextLg, { color: fg }]} numberOfLines={3}>
        {label}
      </Text>
    </Pressable>
  );
});

export function Card({ style, children, ...rest }: ViewProps) {
  const { c, scheme } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, shadowOpacity: scheme === 'dark' ? 0 : 0.08 }, style]} {...rest}>
      {children}
    </View>
  );
}

/** A determinate progress bar announced as "x percent" by screen readers. */
export function ProgressBar({ value, label, color }: { value: number; label: string; color?: string }) {
  const { c } = useTheme();
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: pct }} style={[styles.track, { backgroundColor: c.ringTrack }]}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color ?? c.accent }]} />
    </View>
  );
}

export function Row({ style, ...rest }: ViewProps) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.md }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  btn: {
    minHeight: TOUCH,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  btnLg: { minHeight: 58, paddingHorizontal: space.xxl },
  btnText: { fontSize: 17, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  btnTextLg: { fontSize: 18 },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.xl,
    gap: space.md,
    shadowColor: '#111538',
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  track: { height: 10, borderRadius: radius.pill, overflow: 'hidden', width: '100%' },
  fill: { height: '100%', borderRadius: radius.pill },
});
