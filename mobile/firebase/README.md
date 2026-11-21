Put the Firebase config files for the site's GA4 property here to turn on Google Analytics:

- `google-services.json` (Android app `com.likeablepersontest.app`)
- `GoogleService-Info.plist` (iOS app `com.likeablepersontest.app`)

Without both files the app is built without the Firebase SDK and sends nothing.
These files are not secret, but they are kept out of git (see `.gitignore`) so each
build environment supplies its own (EAS: upload them as file secrets).
