import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Live "Reduce motion" setting (iOS) / "Remove animations" (Android). */
export function useReducedMotion() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setOn).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setOn);
    return () => sub.remove();
  }, []);
  return on;
}

/** Whether VoiceOver / TalkBack is running. */
export function useScreenReader() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setOn).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => sub.remove();
  }, []);
  return on;
}

export const announce = (msg: string) => AccessibilityInfo.announceForAccessibility(msg);
