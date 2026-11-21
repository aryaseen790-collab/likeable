// The website's "social orbit": the nine dimension emojis circling you. Decorative
// only (hidden from screen readers); it holds still when Reduce Motion is on.
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@shared/scoring';
import { useReducedMotion } from '../lib/a11y';
import { ICONS } from '../lib/result';
import { useTheme } from '../lib/theme';

export function Orbit({ size = 220 }: { size?: number }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const [spin] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) {
      spin.stopAnimation();
      return;
    }
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 60000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [reduced, spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const counter = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });
  const r = size / 2 - 22;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, alignSelf: 'center' }}>
      <View style={[StyleSheet.absoluteFill, styles.ring, { borderColor: c.border, margin: 22, borderRadius: size }]} />
      <View style={[styles.core, { backgroundColor: c.accentSoft, width: size * 0.36, height: size * 0.36, borderRadius: size, top: size * 0.32, left: size * 0.32 }]}>
        <Text style={{ fontSize: size * 0.17 }} allowFontScaling={false}>🙂</Text>
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
        {ICONS.map((icon, i) => {
          const a = -Math.PI / 2 + (i / ICONS.length) * Math.PI * 2;
          return (
            <Animated.View
              key={i}
              style={[styles.bubble, { backgroundColor: c.surface, borderColor: COLORS[i], left: size / 2 + Math.cos(a) * r - 20, top: size / 2 + Math.sin(a) * r - 20, transform: [{ rotate: counter }] }]}
            >
              <Text style={styles.emoji} allowFontScaling={false}>{icon}</Text>
            </Animated.View>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { borderWidth: 1.5, borderStyle: 'dashed' },
  core: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  bubble: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 19 },
});
