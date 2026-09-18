# MOL App V3 — Android internal APK

Native Android shell for the existing MOL App V3 mobile frontend.

## Runtime model

- WebView loads the production V3 mobile frontend from GitHub Pages.
- The V3 bearer session is mirrored into private Android SharedPreferences through MOLNative.
- A foreground service remains active after the UI goes to the background and after device reboot.
- The service checks mol-app-v3-comm-list every 10 seconds.
- Existing messages are baselined on first start; only later messages generate native alerts.
- Background polling never marks a message as SHOWN or ACK.
- New relevant messages use a high-importance Android notification with sound, vibration and full-screen intent.
- Mobile AUTH sessions use the V3 backend rolling mobile lifetime; explicit logout or server-side revocation still ends the session.

## Device setup

On first login allow notifications, full-screen notifications when Android exposes that setting, and exemption from battery optimization.

Some Android/OEM policies can still suppress full-screen UI. The high-priority notification, sound and vibration remain the fallback.

## Build

gradle -p android assembleDebug

GitHub Actions publishes the internal debug-signed APK as MOL-App-V3-mobile.apk.
