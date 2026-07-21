# LA Metro Midlevel 2026

Site + native iOS wrapper for the LA Metro Midlevel 2026 gathering (application form and the SoCal people groups breakdown).

## Structure

- `docs/` — the actual website (plain HTML/CSS/JS, no build step). This is also what GitHub Pages serves and what the iOS app displays.
- `ios/` — a native Xcode project (via [Capacitor](https://capacitorjs.com)) that wraps `docs/` in a real iOS app shell. Nothing was rebuilt natively — it loads the same site.
- `capacitor.config.json` — points the native wrapper at `docs/`.

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
