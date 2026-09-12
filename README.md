# GaneshaNearMe (GnM) — Stage 2

An incremental upgrade of the existing mobile-first app: real Google Maps, opt-in browser location, nearby discovery, a map location picker, and score-based local submissions. The orange design, landing page, demo authentication, routes, save/share flows, and mobile preview sheets remain.

**Stage 2 is browser-local. Admin has no access protection, authentication is simulated, and Supabase/Stage 3 are not implemented.**

## Run and configure

Use Node.js 20.9+ and npm.

```powershell
npm ci
# On a fresh checkout only; preserve an existing .env.local:
Copy-Item .env.example .env.local
npm run dev
```

Open [localhost:3000/home](http://localhost:3000/home). If port 3000 is occupied, use the URL printed by Next.js.

Place these two values in the project-root **.env.local**:

```dotenv
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_browser_api_key
NEXT_PUBLIC_GOOGLE_MAP_ID=your_javascript_map_id
```

The user-supplied values are already configured locally and were verified against the live Google service. They are not reproduced in this document or hardcoded in source. .env.local is ignored; .env.example contains placeholders only. Restart development after changing them; rebuild production because NEXT_PUBLIC values are bundled at build time.

In Google Cloud, enable Maps JavaScript API, configure billing, and create a JavaScript Map ID. Restrict the browser key to this application's website referrers (including the localhost ports used for development/tests) and to Maps JavaScript API. Browser keys are visible in the delivered app; an environment file keeps them out of source control, not out of browser requests. See [Google's key restriction guidance](https://developers.google.com/maps/api-security-best-practices).

Map loads can incur charges. Review your project's quotas, budgets, usage and applicable pricing; this implementation does not promise free usage. We have not changed your Cloud billing, quotas or restrictions. See [Google's Maps JavaScript usage and billing documentation](https://developers.google.com/maps/documentation/javascript/usage-and-billing).

Missing either variable shows “Google Maps configuration is missing.” and both expected variable names, without printing their values. SDK/network/authentication/capability failures show “Map could not be loaded.” with Try Again; the rest of the page remains usable.

## Google map and markers

Installed dependencies:

- @googlemaps/js-api-loader **2.1.1**.
- @types/google.maps **3.66.2** (development types).

The former MapLibre dependency, worker-copy hooks, worker assets and map hook were removed. No other mapping provider is integrated.

src/lib/google-maps-loader.ts caches one loading promise and uses the official setOptions/importLibrary interface. It imports only **maps** and **marker**, using the weekly Google Maps JavaScript channel. src/lib/map-config.ts reads the environment configuration and supplies Nagpur's default center, latitude 21.1458 / longitude 79.0882, at zoom 12.

Home and the picker are client-only dynamic components. useGoogleMap owns new google.maps.Map, Map ID, readiness, missing/error/retry states, resize observation, and listener cleanup. Home keeps its map mounted when switching to list view. Filters, search, selection and location updates reuse that instance. The picker initializes only while open. Route remounts, picker reopening and explicit error retries can create a new map instance; the SDK is still shared.

Modak and blue location markers use **google.maps.marker.AdvancedMarkerElement**. Original Modak SVG art is appended as DOM children; there is no React root per marker. Interactive markers use accessible titles, gmpClickable and DOM gmp-click events. Selected Modaks get a red accent and higher stacking order. Marker references are reconciled by listing ID: changed entries update, obsolete entries and listeners are removed, and unmount clears all markers. No legacy google.maps.Marker, deprecated marker content/element, or marker.addListener API is used.

focusPandal, focusUserLocation and fitVisiblePandals centralize camera changes. Custom touch-friendly zoom/location/fit controls sit above the map. Google logo and attribution remain visible. See the official [loader guide](https://developers.google.com/maps/documentation/javascript/load-maps-js-api) and [Advanced Markers reference](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers).

Seven Nagpur records are explicitly named **Demo**; they are geographic fixtures, not verified real mandals. The original unused MapMock/decorative components remain as references.

## Browser location, nearby discovery and search

Location starts only after Use My Location. navigator.geolocation.watchPosition first uses high accuracy, maximumAge 30000 and timeout 15000. If the browser reports an unavailable/timed-out initial fix, it tries standard accuracy once with a 20000 ms timeout. This uses the same browser API, not an IP lookup or extra Google API. An app deadline also ends a stalled permission/provider request after its timeout plus a 5-second grace period; Cancel is always available while locating.

React state holds coordinates, accuracy and request status. The first fix centers the camera; later fixes move the blue marker and update distances without repeatedly recentering. My Location returns from list view and explicitly recenters. An empty nearby list does not cover the blue marker. Temporary signal loss keeps the last known fix visibly labeled while the watch continues. Stop, permission denial, terminal failure and unmount clear the watcher; canceled/stale callbacks are ignored.

Denied, unsupported and timeout states keep discovery usable and offer deliberate retry. Use Demo Nagpur Location is available only in development and absent from production builds. Geolocation needs browser permission and a secure context (HTTPS or localhost).

The shared LocationFeedback component shows progress, cancellation, accuracy and browser/Windows permission help on Home and the picker. On Windows, location services and the relevant app/desktop-app permissions must be enabled. An embedded app browser can still lack a functioning location provider; test the same localhost page directly in Chrome, Edge or Safari and allow site location access. During this follow-up, the embedded preview timed out and the user confirmed that Chrome displayed their actual current location as a blue marker. No actual coordinates were recorded in the project.

Live location stays in runtime state. It is not persisted to localStorage, included in share URLs, logged continuously, added to a profile or automatically submitted to Admin. Google SDK traffic still occurs to render the map. In the picker, the visitor can explicitly confirm a current-location candidate as the **pandal's** coordinate.

Local Haversine calculations sort nearest first and apply 1/3/5/10 km or All, defaulting to 5 km after location is available. Without location, all listings remain discoverable. Distances show meters below 1 km and one-decimal kilometers otherwise; these are straight-line distances. Empty results offer a larger radius or Explore All.

Search trims input and matches public listing names/areas case-insensitively. Keyboard-selectable results use only local data. Selecting a result focuses its marker and preview, even outside the current radius. /home?pandal=ID opens a matching public listing.

Directions open an encoded Google Maps URL with the pandal destination, without calling a routing API or including the visitor's coordinates. Share uses Web Share, clipboard fallback, then manual copy. Saved IDs persist across reload/logout.

## Location picker, links and images

The same Google Maps SDK and Map ID power the Add form's picker. Pan/zoom, tap-to-place, selecting another point, keyboard-accessible Choose map center, and Use My Current Location are supported. The selected coordinate is displayed and is transferred to the form only after Use this location.

The pure parser recognizes raw lat,lng and @lat,lng, plus supported Google long URLs containing q=lat,lng, query=lat,lng or @lat,lng. It validates finite coordinate ranges and Google hosts. Shortened links are not expanded, addresses are not geocoded, and ambiguous links show: “We couldn't detect exact coordinates from this link. Please choose the location on the map.”

Photo previews use URL.createObjectURL and revoke URLs on removal/unmount. Accepted MIME types are image/jpeg, image/png and image/webp, up to 5 MB per file. Ganapati photos allow 1–2; decoration photos allow 1–3. Files are not uploaded or persisted as Base64/blob/object URLs. Only filenames/counts are saved.

Indian contact normalization accepts formats such as 9876543210, +91 9876543210 and +91-9876543210, validates the mobile number, and normalizes valid values to +91.

## Internal verification and local publication

src/lib/submission-verification.ts exposes the React-independent evaluateGanapatiSubmission function. It returns totalScore, status, each criterion's points/valid flag and reasons. Named constants define the thresholds and maximum.

| Valid criterion                                   | Points |
| ------------------------------------------------- | -----: |
| Non-trivial mandal name                           |      2 |
| Valid latitude and longitude                      |      2 |
| Valid submitter name and Organizer/Volunteer role |      2 |
| Valid Indian contact                              |      2 |
| Both photo groups present and within limits       |      2 |
| Explicit Public Access Yes                        |      1 |
| Maximum                                           | **11** |

| Score | Result        |
| ----- | ------------- |
| 0–2   | rejected      |
| 3–6   | manual_review |
| 7–11  | approved      |

Fields earn points only after validation. A one-letter mandal name, text without coordinates, invalid phone or only one photo group does not earn that criterion's points.

Private access overrides an approved score to manual_review. **Only approved + public + valid-coordinate submissions enter public discovery.** The pure numerical scorer can reach 7+ without location points; in that case the public Add flow keeps the form open and asks for an exact map point before accepting approval. Admin cannot approve private or coordinate-less records.

Normal form/result screens do not show internal scores. Rejection displays the requested respectful message and preserves inputs/photos for editing; resubmitting updates that rejected local record. Manual review and approved submissions show their corresponding requested messages. Automatic approvals default to Community Pandal.

Metadata under gnm_demo_submissions includes ID, mandal/location/submitter/contact/public-access details, coordinates, photo filenames/counts, score, verificationStatus, submittedAt and category. Reload uses placeholder art. Older pending_review/adminCategory records migrate to the current shape without silently publishing pending requests; stored scores are recalculated. Malformed entries are ignored.

## Admin

/admin reads actual local submissions. Pending, Approved and Rejected tabs and the four summary counts reflect their current state. Cards show location, coordinates, submitter/role/contact, access, photo counts, eligibility score, status and date. Review shows the six-criterion breakdown and reasons.

Manual-review requests can be approved as Featured Public Pandal or Community Pandal, or rejected. Only public requests with valid coordinates can be approved. Approved entries immediately join fixtures on this browser's Home, search, saves and deep links.

**Admin is an unprotected local simulation, with no real review team or shared database.** Code comments call for Stage 3 Supabase authentication, roles, RLS/server-side authorization and secure backend validation. LocalStorage can be edited by its owner; this score is not identity verification. No Stage 3 code, schema or migration is included.

## Routes and persistence

All routes remain: /, /auth, /home, /add, /saved, /profile and /admin.

| Storage key          | Contents                                                   |
| -------------------- | ---------------------------------------------------------- |
| gnm_demo_logged_in   | Demo session flag                                          |
| gnm_demo_user        | Demo name/email; never passwords                           |
| gnm_saved_pandals    | Fixture or approved local listing IDs                      |
| gnm_demo_submissions | Local submission metadata and decisions; never image files |

Storage is scoped to the browser origin, not an authenticated account. Existing malformed-data handling, cross-tab updates and memory fallback remain. Changes made on port 3002 will not appear on port 3000.

**Maps JavaScript API is the only Google Maps API integrated.** No Places, Geocoding, Routes, Distance Matrix, Google Geolocation or Street View API feature is used. Browser geolocation, local math/search/parsing and ordinary Maps URL links provide the other functions. No Supabase integration is present.

## Files in the Google migration

Created:

- src/lib/google-maps-loader.ts — shared official SDK loader.
- src/lib/submission-verification.ts — pure scoring and thresholds.
- src/components/map/useGoogleMap.ts — map lifecycle.
- src/components/LocationFeedback.tsx — shared location progress, cancellation, accuracy and permission help.
- tests/google-maps-double.js — deterministic Google Maps interface test double.
- scripts/check-google-map.mjs — actual Google service smoke check.
- .env.local — local supplied configuration; ignored.
- AGENTS.md and CLAUDE.md — automatically generated guidance from Next.js development startup.

Updated:

- package.json, package-lock.json — loader/types dependencies and removal of worker hooks.
- .env.example, .gitignore, eslint.config.mjs — configuration placeholders and generated-artifact exclusions.
- src/app/layout.tsx, src/app/globals.css — Google map host, marker/accessibility styles and score/result UI.
- src/lib/map-config.ts, map-camera.ts — Google configuration and camera helpers.
- src/lib/types.ts, submission-eligibility.ts, demo-submissions.ts — current metadata, validation helpers, scoring persistence, migration and publication safety.
- src/components/HomeExperience.tsx — stable map/list lifecycle.
- src/hooks/useUserLocation.ts — bounded requests, standard-accuracy fallback and recovery from temporary signal loss.
- src/components/map/GanapatiMap.tsx, ModakMapMarker.ts, LocationPickerMap.tsx, MapErrorState.tsx — Google maps, Advanced Markers, picker and errors.
- src/components/AddPandalForm.tsx, AdminDashboard.tsx — result flows and score-based local review.
- src/components/PandalCard.tsx, PandalPreviewSheet.tsx — truthful “Locally approved” labeling.
- tests/helpers.ts, stage-one.spec.ts, stage-two.spec.ts, stage-two.logic.spec.ts — integration and regression coverage.
- README.md — setup, behavior, verification and limitations.

Removed: src/components/map/useMapLibre.ts, scripts/copy-maplibre-worker.mjs, scripts/check-real-map.mjs and the two generated public/maplibre worker modules.

Existing Stage 2 geo.ts, maps-links.ts, useUserLocation.ts, LocationPickerField.tsx, ImagePicker.tsx, AreaSearchBar.tsx, CategoryBadge.tsx, saved flows, fixture data and storage hooks are reused.

## Verification

```powershell
npm run lint
npm run typecheck
npm run build
npm run start -- --port 3002
# In a second terminal:
$env:PLAYWRIGHT_PRODUCTION = "1"
npm run test:e2e
```

Playwright uses installed Chrome by default. Configuration supports PLAYWRIGHT_BASE_URL, PLAYWRIGHT_SERVER_COMMAND and PLAYWRIGHT_CHANNEL=chromium. Without a running target it starts development on port 3002.

The automated UI suite injects a deterministic **Google Maps interface test double**, with browser geolocation/share/clipboard fixtures. It tests our integration behavior without consuming live map loads; it does not prove real SDK rendering. Logic coverage includes all 64 valid/invalid combinations of the six scoring criteria, thresholds, private-access override, Haversine, parsing, phone validation, storage migration and publication safety.

Browser coverage includes landing/auth/save regression, geo permission success/movement/cleanup and failures, demo-location build gating, filters/search/selection/deep links, sharing/directions, map retry/reuse, picker input/confirmation, image validation/previews, all three submission outcomes, private exclusion, both admin categories and rejection. Layout checks cover 360/390/430 px plus tablet/desktop.

The separate live Google check uses actual SDK traffic, verifies seven Advanced Modak markers, selection/preview, picker confirmation and one SDK load across both maps, and records console errors/warnings:

```powershell
node scripts/check-google-map.mjs
# Optional target:
node scripts/check-google-map.mjs http://localhost:3000/home
```

Live screenshots/report are in ignored verification-artifacts/. Playwright failure screenshots/traces are in ignored test-results/. The live script needs internet access and uses real Maps JavaScript map loads.

Verified on 12 September 2026:

- npm run lint: exit 0, no warnings or errors.
- npm run typecheck: exit 0.
- npm run build: exit 0, successful compilation and all 9 static pages generated.
- Production Playwright after the location follow-up: **40 passed** (8 logic + 16 mobile + 16 desktop), including fallback recovery, stalled/canceled requests, transient signal loss, recentering and an unobstructed blue marker with no nearby listings.
- Development-only location check: **1 passed**, including the demo Nagpur control.
- Missing-configuration browser check: friendly message, usable search, zero Google SDK requests and zero browser exceptions.
- Live Google check: 7 Advanced Modak markers, one SDK load across Home and picker, successful marker preview and coordinate confirmation, and **zero console errors or warnings**.
- Google logo/Terms visibility and unobstructed attribution verified on the actual map. The live screenshot check waits for attribution to render before capture.

Remaining limitations are intentional: demo listings/authentication, browser-origin-only storage and moderation, unprotected Admin, placeholder photos after reload, device-dependent GPS accuracy, external Google availability and billable map usage. No physical GPS field test or Google Cloud billing/restrictions audit was performed. Stage 3 remains unstarted.
