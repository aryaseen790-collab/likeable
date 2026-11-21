// The web preview never sends analytics.
import type { Consent } from './store';
export const analyticsAvailable = false;
export async function applyConsent(_consent: Consent) {}
export function track(_name: string, _params: Record<string, string | number | boolean> = {}) {}
export function trackScreen(_screen: string) {}
