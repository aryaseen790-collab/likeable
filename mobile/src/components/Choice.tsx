import { Pressable, StyleSheet } from 'react-native';
import { useTheme, space, TOUCH } from '../lib/theme';
import { CheckIcon } from './icons';
import { Txt } from './ui';

/** One option in a single-choice list (language, appearance). Announced as a radio button. */
export function Choice({ label, selected, onPress, first, lang }: { label: string; selected: boolean; onPress: () => void; first?: boolean; lang?: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      accessibilityLanguage={lang}
      onPress={onPress}
      android_ripple={{ color: c.accentSoft }}
      style={({ pressed }) => [styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }, pressed && { opacity: 0.7 }]}
    >
      <Txt style={{ flex: 1, fontWeight: selected ? '700' : '400' }} color="heading">{label}</Txt>
      {selected && <CheckIcon color={c.accent} size={20} />}
    </Pressable>
  );
}


const styles = StyleSheet.create({
  row: { minHeight: TOUCH + 4, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
});
