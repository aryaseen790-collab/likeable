// Google Analytics 4 through Firebase, the app counterpart of the website's GA4.
// Off unless BOTH: the build includes the Firebase config (app.config.ts), and the
// person tapped "Allow". No advertising ID, no ad signals, no cross-app tracking,
// and individual answers are never sent. Event names match the website.
import Constants from 'expo-constants';
import type { Consent } from './store';

type Params = Record<string, string | number | boolean>;
type FirebaseAnalytics = typeof import('@react-native-firebase/analytics');

export const analyticsAvailable = Constants.expoConfig?.extra?.analyticsAvailable === true;

let mod: FirebaseAnalytics | null = null;
let enabled = false;
function firebase(): FirebaseAnalytics | null {
  if (!analyticsAvailable) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod ??= require('@react-native-firebase/analytics') as FirebaseAnalytics;
    return mod;
  } catch {
    return null;
  }
}

/** Apply the person's choice. Called on launch and whenever it changes. */
export async function applyConsent(consent: Consent) {
  enabled = consent === 'granted';
  const fb = firebase();
  if (!fb) return;
  try {
    const a = fb.getAnalytics();
    await fb.setConsent(a, { analytics_storage: enabled, ad_storage: false, ad_user_data: false, ad_personalization: false });
    await fb.setAnalyticsCollectionEnabled(a, enabled);
    // Withdrawing consent also clears the app-instance ID and anything not yet sent.
    if (consent === 'denied') await fb.resetAnalyticsData(a);
  } catch {}
}

export function track(name: string, params: Params = {}) {
  if (!enabled) return;
  const fb = firebase();
  if (!fb) return;
  try {
    // Custom event names (quiz_start, …) are the same as on the website.
    (fb.logEvent as unknown as (a: unknown, n: string, p?: Params) => void)(fb.getAnalytics(), name, params);
  } catch {}
}

export function trackScreen(screen: string) {
  if (!enabled) return;
  const fb = firebase();
  try {
    fb?.logScreenView(fb.getAnalytics(), { screen_name: screen, screen_class: screen }).catch(() => {});
  } catch {}
}
