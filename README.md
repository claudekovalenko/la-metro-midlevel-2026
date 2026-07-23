# LA Metro Midlevel 2026

Site + native iOS wrapper for the LA Metro Midlevel 2026 gathering (application form and the SoCal people groups breakdown).

## Structure

- `docs/` — the actual website (plain HTML/CSS/JS, no build step). This is also what GitHub Pages serves and what the iOS app displays.
- `docs/native-bridge.js` — loaded on every page; a no-op on plain web, but when running inside the Capacitor app it wires up native share (`[data-native-share]` buttons) and push notification registration. This exists so the App Store build offers real native functionality beyond a website in a webview (see Guideline 4.2 below).
- `ios/` — a native Xcode project (via [Capacitor](https://capacitorjs.com)) that wraps `docs/` in a real iOS app shell.
- `capacitor.config.json` — points the native wrapper at `docs/`.

## App Store readiness (Guideline 4.2 — Minimum Functionality)

Apple routinely rejects apps that are just a website wrapped in a webview. To clear review, this
app needs to visibly do more than the website does in mobile Safari. What's wired up so far:

- **Native share sheet** — the "Share Map" button on the network map (and any element with
  `data-native-share`) uses the real iOS share sheet, not a browser share API.
- **Push notifications** — registers for push on first launch (permission prompt + device token,
  logged to console for now). Wire the token to a real backend before relying on it for gathering
  reminders or new-response alerts.
- **Add to Calendar** — the "Add to Calendar" button on the homepage opens the native
  create-event prompt pre-filled with the gathering's dates and location. Any element with
  `data-native-add-to-calendar` (+ `data-event-title`/`-location`/`-start`/`-end`) gets the same
  behavior.
- **Save to Contacts** — wired in `native-bridge.js` (`data-native-save-contact` +
  `data-contact-name`/`-org`/`-email`/`-phone`), not yet attached to a button since there's no real
  organizer contact info on the site to use — add one when there's an actual person/number to save.
- **Offline support** — the existing PWA service worker (`docs/sw.js`) already caches pages, so the
  app works without a connection.

Still needed before submitting:
1. In Xcode: App target → Signing & Capabilities → **+ Capability → Push Notifications** (and
   Background Modes → Remote notifications if you want silent pushes). This can't be done outside
   Xcode.
2. An actual push backend (APNs key + a server or service like OneSignal/Firebase) to send
   notifications — right now the app only registers and logs the token.
3. Run `npm install` (pulls in `@capacitor/share`, `@capacitor/push-notifications`,
   `@ebarooni/capacitor-calendar`, and `@capacitor-community/contacts`, already added to
   `package.json`) then `npx cap sync ios` before opening Xcode.
4. `Info.plist` already has the required `NSCalendarsFullAccessUsageDescription`,
   `NSCalendarsWriteOnlyAccessUsageDescription`, and `NSContactsUsageDescription` strings — Xcode
   will otherwise crash the app the first time it requests either permission.

## Running the website locally

No build step — just serve `docs/` and open it:

```bash
npx serve docs
```

## GitHub Pages

Settings → Pages → Source: **Deploy from a branch** → Branch **main**, folder **/docs** (not root — the site moved into `docs/` to share a folder with the native app).

## Building the iOS app (Mac + Xcode required)

This can't be built or signed from a non-Mac environment. To build and submit:

1. `npm install`
2. If `docs/` changes: `npx cap sync ios` (copies the latest web assets into the Xcode project)
3. Open `ios/App/App.xcworkspace` in Xcode
4. In Xcode, select the App target → **Signing & Capabilities** → set your Apple Developer team, and update the Bundle Identifier to whatever you register in App Store Connect (currently a placeholder: `com.lametromidlevel.app2026`)
5. `pod install` from `ios/App` if Xcode asks for it (CocoaPods)
6. Build → Archive → upload via Xcode Organizer to App Store Connect

## Known open item

The application form (`docs/gospel-workers-application.html`) currently has no real backend — submissions don't go anywhere until one is wired up (e.g. FormSubmit.co to an email address, or a Google Form/Airtable swap-in).
