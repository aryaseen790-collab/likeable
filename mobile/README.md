# Likeable Person Test — mobile app

The iOS and Android app for [likeable-person-test.com](https://likeable-person-test.com), built with
Expo SDK 58 (React Native 0.88, Expo Router, TypeScript).

It asks the same 25 questions as the website and scores them with the same code
(`../shared/scoring.ts`, imported by both), in the same 20 languages. Results are kept
on the phone so people can track their progress.

| Screen | What it does |
|---|---|
| Home | Start or resume the test, last result, the 9 dimensions |
| Test | One question at a time: radio-group answers, progress bar, auto-advance (off when a screen reader is on), Back/Next |
| Result | Score ring, top strength and focus area, change since last time, assessment, radar chart, the 9 dimension scores, "how to improve" link, share as image or as the full text report, retake, delete |
| Your results | Every saved result with a trend line; delete one or all |
| Settings | Language (20), appearance (system/light/dark), analytics opt-in, privacy policy and terms, delete all data |
| Consent | Asked once at first launch, only in builds that include analytics |

## Run it

```bash
npm ci
```

```bash
npm run sync
```

```bash
npx expo run:ios
```

`npm run sync` copies the questions and translations from the website build (it builds
the site first if `../dist` is missing). Use `npx expo run:android` for Android.
The app uses native modules, so it runs in a development build, not Expo Go.

```bash
npm run verify
```

`verify` checks the content is in sync with the website, then runs TypeScript, ESLint
and 80 Jest tests. CI runs the same thing (`.github/workflows/mobile.yml`).

## Build and publish

Builds run on EAS (`eas.json`): `development`, `preview` (installable APK) and
`production` (store builds, auto-incremented build numbers).

```bash
npx eas-cli@latest build --profile production --platform all
```

```bash
npx eas-cli@latest submit --profile production --platform all
```

Before the first store submission:

1. **Bundle ID.** Both platforms use `com.likeablepersontest.app` (`app.config.ts`). Change it there first if you want another one; it can't change after the first upload.
2. **Analytics.** Add the Firebase files (next section), or ship without them.
3. **Privacy policy.** Add a mobile-app section to the website's privacy policy (wording below). Both stores require the policy URL.
4. **Store privacy forms.** Fill them in using the answers below.
5. **Device check.** Test on real devices with VoiceOver, TalkBack and the largest text size (checklist below).

## Analytics (Google Analytics 4)

The app sends GA4 events to the same property as the website, through Firebase
Analytics, **only after the person taps "Allow"**. Nothing is sent before that choice,
and nothing at all in builds without the Firebase files.

To turn it on:

1. In the Firebase console, link a project to the site's GA4 property (`G-KZTXC78Q70`).
2. Add an iOS app and an Android app, both with bundle ID `com.likeablepersontest.app`.
3. Download their config files into `mobile/firebase/`:
   - `GoogleService-Info.plist`
   - `google-services.json`

   They are gitignored. On EAS, upload them as file environment variables.

`app.config.ts` notices the files and compiles the Firebase SDK in. Without them the app is
built without Firebase, and Settings shows the analytics switch as unavailable.

What is sent, with the same names as the website's events:

- `quiz_start`
- `quiz_question_answered` (question number only, never the answer)
- `quiz_complete` (overall score)
- `quiz_retake`
- `share_click`
- `result_download`
- screen views (route names only)

What is switched off (`firebase.json`):
- automatic collection
- advertising ID and Android SSAID
- IDFV
- ad storage and ad personalisation
- ad-network registration
- automatic screen reporting

The ad-ID permissions are also removed from the Android manifest. Withdrawing consent in
Settings turns collection off and deletes the app-instance ID (`resetAnalyticsData`).

## Security and privacy

How the app maps to the [OWASP MASVS](https://mas.owasp.org/MASVS/) controls:

| Area | What the app does |
|---|---|
| Storage (MASVS-STORAGE) | Results, progress and settings are small JSON files in the app's private documents folder. iOS Data Protection and Android file-based encryption cover them at rest. `android:allowBackup="false"` keeps them out of cloud and adb backups. Nothing goes to logs, the clipboard or shared storage. |
| Untrusted input | Stored files and deep-link parameters are validated before use (`store.tsx`, `decodeAnswers`); anything malformed is dropped. Tests cover tampered data. |
| Network (MASVS-NETWORK) | The app makes no network requests of its own. Analytics, when allowed, goes over HTTPS through Firebase. Cleartext traffic is disabled on Android, and ATS is on with no exceptions on iOS. |
| Platform (MASVS-PLATFORM) | No WebViews. Website links open in the system browser (`expo-web-browser`). The `likeable://` scheme only opens screens and changes no data. Unused permissions are explicitly removed (`blockedPermissions`). |
| Code (MASVS-CODE) | No secrets in the app. Release Android builds are minified and resource-shrunk. CI audits runtime dependencies (`npm audit --omit=dev --audit-level=high`). Transitive packages with advisories are pinned to fixed versions (`overrides`). |
| Privacy (MASVS-PRIVACY) | No account, no sign-in, no ads, no tracking, so no App Tracking Transparency prompt. Analytics is opt-in with equal "Allow" and "Don't allow" buttons and can be changed any time. "Delete all my data" wipes everything on the device. The iOS privacy manifest (`PrivacyInfo.xcprivacy`) declares the required-reason APIs and the data collected. |

`npm audit` reports two moderate advisories, both inside Jest's own dependencies
(test tooling that is never shipped in the app). The runtime dependency audit is clean.

### App Store privacy label (App Store Connect → App Privacy)

These answers assume the build includes Firebase. Without it, answer "Data Not Collected".

- **Data used to track you:** none.
- **Data not linked to you:**
  - Usage Data → Product Interaction. Purpose: Analytics.
  - Identifiers → Device ID (the Firebase app-instance ID). Purpose: Analytics.
- Everything else: not collected.

### Google Play Data safety

- **Data collected:**
  - App activity → App interactions. Purpose: Analytics.
  - Device or other IDs. Purpose: Analytics.
- **Data shared:** none.
- **Collection is optional:** yes. The user opts in.
- **Data encrypted in transit:** yes.
- **Users can request deletion:** yes. Turning analytics off resets the ID, and "Delete all my data" clears the device.
- **Advertising ID:** not used (the permission is removed).

### Privacy policy wording to add to the website

> **Mobile app.** The Likeable Person Test app stores your answers and results only on
> your device; they are never sent to us. If you choose "Allow" when asked, the app sends
> anonymous usage statistics to Google Analytics (Firebase), such as when a test is
> started or completed and the overall score, to help us improve the test. It does not
> use advertising identifiers or track you across apps. You can turn this off at any time
> in Settings, which also resets the analytics identifier, and you can delete all data
> the app has stored with "Delete all my data".

## Accessibility

The app targets WCAG 2.2 AA on mobile, plus each platform's accessibility guidelines.

**Built in:**
- **Screen readers.** Every control has a role, a label and its state:
  - answers are radio buttons in a radio group
  - the progress bar reports its value
  - charts are single images with a full text equivalent
- **Focus.** It moves to each new question.
- **Auto-advance** is turned off while VoiceOver or TalkBack is running.
- **Announcements.** The result is announced, and errors use live regions.
- **Text size.** All text scales with the system setting. There are no fixed heights, layouts wrap, and the highlight cards stack. Only decorative emoji and the big score digits are capped.
- **Touch targets** are at least 48pt.
- **Contrast.** Text is at least 4.5:1 and UI parts at least 3:1 in both themes, enforced by `theme.test.ts`. It caught one border colour that failed.
- **Motion.** Reduce Motion stops the orbit animation, the question slide and the score count-up.
- **Colour** is never the only signal: every score is also written as a number and a label.
- **Right to left.** Arabic and Urdu mirror the whole layout immediately, with no restart. Tall scripts (Devanagari, Bengali, Telugu, Tamil, Arabic, Urdu) get extra line height.
- **Language.** Language names are spoken in their own language (`accessibilityLanguage`).
- **System fonts** are used instead of web fonts. They cover all 20 scripts and support Dynamic Type.

**Tested automatically:**
- `flow.test.tsx` drives the real screens through all 25 questions.
- It checks every pressable has a role and a label, checks radio state, and checks the Arabic layout flips.

**Must be checked by a person on real devices before release.** Automated checks can't replace this:
- [ ] VoiceOver (iOS): full test → result → share → settings; reading order makes sense on every screen.
- [ ] TalkBack (Android): the same path.
- [ ] Largest text size (iOS Accessibility sizes, Android 200%): nothing clipped or overlapping.
- [ ] Switch Control / Switch Access and an external keyboard can reach everything.
- [ ] Reduce Motion on: nothing animates.
- [ ] Arabic and Urdu on a phone set to an RTL language and to English.
- [ ] Dark mode in every screen.

## How it's organised

```
mobile/
  app.config.ts          app identity, permissions, privacy manifest, plugins
  firebase.json          analytics defaults (all off until consent)
  scripts/sync-content.mjs
  src/app/               screens (Expo Router): index, quiz, result/[id], history, settings, language, consent
  src/components/        ui (Txt, Button, Card, ProgressBar), charts, Orbit, icons, Choice
  src/lib/               store (on-device data), i18n, analytics, theme, a11y, result, storage
  src/content/bundles/   questions + website strings per language (generated by `npm run sync`)
  src/i18n/app/          app-only strings, 20 languages
  src/__tests__/         scoring parity, translations, contrast, storage safety, end-to-end flow
../shared/scoring.ts     scoring shared with the website
```

When questions or translations change on the website, run `npm run sync` and commit
`src/content/bundles/`. CI fails if they drift.
