# Getting Blackjack Counter onto the App Store (no Mac needed)

Everything below is done in a browser. The iOS app is built on GitHub's Mac machines (GitHub Actions), so you never need a Mac of your own. Nothing in the repository contains secrets. You will add three small values to GitHub yourself.

Placeholders you will want to decide on first, all in **one file**, `app.config.json`:

| Key | Now | Notes |
|---|---|---|
| `appId` | `com.brettkreyer.blackjacktrainer` | Bundle ID. Permanent once the app is created in App Store Connect. |
| `appName` | `Blackjack Counter` | Name under the icon (≤ 30 chars; the App Store name must be unique). |
| `iapProductId` | `com.brettkreyer.blackjacktrainer.unlock` | In-app purchase product ID. Must match App Store Connect exactly. |
| `iapDisplayName` | `Unlock Counting & Deviations` | Shown in the paywall. |
| `supportEmail` | `support email TBD` | Fill in, then also edit `public/privacy/index.html` and `public/support/index.html`. |
| `privacyUrl`, `supportUrl`, `webUrl` | GitHub Pages URLs | Change if you move hosting. |

After editing, run `npm run apply-app-config` (writes the bundle id and name into the iOS project) and commit. Or ask the assistant to do it.

## 1. Enroll in the Apple Developer Program
1. Go to <https://developer.apple.com/programs/enroll/> and sign in with your Apple ID (turn on two-factor authentication first).
2. Enroll as an **Individual** (fastest) for **US $99/year**. Approval can take minutes to a couple of days.
3. Note your **Team ID** (10 characters): developer.apple.com → Account → Membership details.

## 2. Accept agreements, tax and banking (needed for any paid item)
App Store Connect (<https://appstoreconnect.apple.com>) → **Business** (formerly “Agreements, Tax, and Banking”) → accept the **Paid Apps Agreement**, add a bank account and complete the tax forms. The in-app purchase cannot be sold until this shows *Active*.

## 3. Create the app record
App Store Connect → **Apps → + → New App**
- Platform iOS, Name = your `appName`, Primary language English (U.S.)
- **Bundle ID**: if `com.brettkreyer.blackjacktrainer` is not in the dropdown, first register it at developer.apple.com → Certificates, IDs & Profiles → Identifiers → + → App IDs → App (Explicit). Then pick it here.
- SKU: any unique string, e.g. `blackjack-counter-1`.

## 4. Create the in-app purchase
App → **Monetization → In-App Purchases → +**
- Type **Non-Consumable**
- Reference name `Unlock Counting & Deviations`
- **Product ID** exactly `com.brettkreyer.blackjacktrainer.unlock` (or whatever `iapProductId` says)
- Price: pick a tier (you decide; the paywall shows whatever Apple returns)
- Localization: display name `Unlock Counting & Deviations`, description e.g. “Unlimited counting drills, rounds, count-while-you-play, bet sizing and index-play deviations.”
- Add a review screenshot (a screenshot of the paywall) and save. The first IAP is submitted together with the first app version.

**Offer codes (optional, for friends/testers):** the IAP → Offer Codes → create. The app has a *Redeem Code* button (Settings and the paywall). See the note on redemption in “Known limits” below.

## 5. App Store Connect API key (lets GitHub upload builds for you)
App Store Connect → **Users and Access → Integrations → App Store Connect API → Team Keys → +**
- Name `GitHub CI`, access **App Manager**
- Download the `AuthKey_XXXXXXXXXX.p8` file (**you can only download it once**) and note the **Key ID** and the **Issuer ID** shown at the top of the page.

## 6. Add GitHub secrets
GitHub repo `bkreyer32/blackjack-trainer` → Settings → Secrets and variables → Actions → **New repository secret**:

| Name | Value |
|---|---|
| `ASC_KEY_ID` | the Key ID |
| `ASC_ISSUER_ID` | the Issuer ID |
| `ASC_KEY_P8` | the **entire text** of the `.p8` file (open it in a text editor; include the BEGIN/END lines) |
| `APPLE_TEAM_ID` | your 10-character Team ID (can also be a repository *variable*) |

Do not paste these anywhere else (chat, email, the repo).

## 7. Turn on the CI workflows (one-time login step)
The two workflows are parked in `ci/github-workflows/` because the GitHub login used to push from the dev box doesn't yet have permission to create workflow files. On a computer with `gh` installed:

```
gh auth refresh -h github.com -s workflow     # approve in the browser with the one-time code
scripts/enable-ci.sh                           # moves them to .github/workflows/ and pushes
```
Alternatively in the GitHub web UI: Add file → Create new file → `.github/workflows/ios-simulator-build.yml`, and paste the contents of the parked file (same for `testflight.yml`).

- **iOS simulator build (unsigned)** runs on every push: installs, runs tests, builds the web app with `VITE_NATIVE=true`, syncs Capacitor, and compiles the iOS app for the simulator with no signing. It proves the project compiles. It needs no secrets.
- **TestFlight upload** is manual (Actions → *TestFlight upload* → Run workflow). It archives with automatic signing through your API key and uploads the build to App Store Connect.

## 8. First TestFlight build
1. Make sure steps 1–6 are done, then Actions → **TestFlight upload** → *Run workflow*.
2. After ~10–20 minutes the build appears in App Store Connect → your app → **TestFlight** (processing takes a few more minutes). Answer the export-compliance question: the app sets `ITSAppUsesNonExemptEncryption = false`, so it is normally pre-answered.
3. Add yourself as an internal tester (Users and Access → add your Apple ID with the *App Manager* or *Developer* role), install **TestFlight** on your iPhone, accept the invite.
4. **Sandbox-test the purchase on the iPhone**: in TestFlight builds, purchases use the sandbox automatically and are free. Check: locked items open the paywall, price shows, Buy unlocks, **Restore Purchases** works after deleting and reinstalling, Redeem Code opens Apple's sheet.

## 9. Store listing
- **Privacy Policy URL**: `https://bkreyer32.github.io/blackjack-trainer/privacy/`
- **Support URL**: `https://bkreyer32.github.io/blackjack-trainer/support/` (add your real contact email to both pages first)
- **App Privacy** questionnaire: choose **Data Not Collected** (the app has no analytics, accounts, ads or tracking).
- **Age rating**: answer the questionnaire honestly. The app simulates gambling with no real money. Apple's “Simulated Gambling” question applies, which typically yields **17+**. Review the current form carefully.
- **Screenshots**: 6.7" or 6.9" iPhone set is required (1290×2796 or 1320×2868). The headless screenshot scripts produce 390×844@3x (1170×2532); resize or capture from the TestFlight build on your iPhone.
- Category: Education (or Games → Card). Description and keywords: your call. Don't use another app's name as a keyword.
- Review notes: mention the app is a practice tool with no real money and that the unlock is a single non-consumable purchase. Describe how to reach the paywall (tap the lock on Count → Rounds).

## 10. Submit
App Store Connect → the version → pick the TestFlight build → attach the in-app purchase to the version → **Submit for Review**.

## Known limits (things only you or a real device can confirm)
- The simulator build in CI only proves it compiles. Real StoreKit, signing, and the TestFlight upload could not be tested without an Apple account and a Mac.
- **Offer codes for non-consumables**: the app calls `presentOfferCodeRedeemSheet` of the purchases plugin (iOS 16+). Apple supports offer codes for non-consumable IAP. Test with a real code in TestFlight/sandbox before relying on it. If a code redeems but the app doesn't unlock, tap **Restore Purchases** (the app also listens for transaction updates).
- Review times, the 17+ rating outcome, and any App Review feedback are Apple's decisions.
- If the name `Blackjack Counter` is taken, change `appName` (display name can differ from the App Store name).
