import Svg, { Circle, Path } from 'react-native-svg';

type P = { color: string; size?: number; flip?: boolean };
const base = (size = 24) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export const HistoryIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <Path d="M3 3v5h5M12 7v5l3 2" />
  </Svg>
);
export const SettingsIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Circle cx="12" cy="12" r="3" />
    <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Svg>
);
export const CloseIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);
export const ChevronIcon = ({ color, size, flip }: P) => (
  <Svg {...base(size)} stroke={color} style={flip ? { transform: [{ scaleX: -1 }] } : undefined} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Path d="m9 18 6-6-6-6" />
  </Svg>
);
export const ShareIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13" />
  </Svg>
);
export const CheckIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color} strokeWidth={3} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Path d="M20 6 9 17l-5-5" />
  </Svg>
);
export const ExternalIcon = ({ color, size }: P) => (
  <Svg {...base(size)} stroke={color} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </Svg>
);
