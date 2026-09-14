# GaneshaNearMe (GnM) — Stage 3 Part 2

A mobile-first Ganapati discovery app with Supabase email/password authentication, database profiles, private submissions and images, public listings, saved places, admin moderation, PostGIS nearby search and Google Maps Advanced Markers.

**Listings, photos, saves and review decisions now use Supabase.** Existing browser-local records are preserved but are not imported or used as application data. No dummy listings are seeded.

See [the complete Stage 3 Part 2 report](docs/stage-3-data.md) for the schema, grants, RLS, functions, scoring, Storage rules, test results, limitations and first-admin setup. [Part 1 Auth notes](docs/stage-3-auth.md) document the earlier authentication work; their references to browser-local listings and the admin preview are superseded by Part 2.

## Run

Use Node.js 22 or newer (verified with Node 24.15.0).

```powershell
npm ci
# Fresh checkout only: preserve an existing .env.local.
Copy-Item .env.example .env.local
npm run dev
```

Open [localhost:3000/home](http://localhost:3000/home). Sign up and confirm your email, or sign into your existing account.

Configure these values in ignored `.env.local`:

```dotenv
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_browser_maps_key
GOOGLE_ROUTES_API_KEY=your_server_routes_key
NEXT_PUBLIC_GOOGLE_MAP_ID=your_javascript_map_id
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Use the Supabase project origin, not `/rest/v1`. The app uses only a publishable key. Rebuild production after changing public environment values. The connected project already has both migrations applied; see the report before setting up another project.

## Vercel environment variables

The yellow triangle on a `NEXT_PUBLIC_` variable warns that its value is shipped to the browser; it is not a deployment error. Changing a name just to suppress this warning does not make a value private.

- Replace the old public Routes variable with `GOOGLE_ROUTES_API_KEY` and store the dedicated Routes key as a **Sensitive** variable in Vercel. Remove the old public Routes entry. Redeploy after saving the environment changes.
- Keep `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase explicitly supports using the publishable key in browsers. Choose **Mark as Safe** for that publishable key; never use a Supabase secret/service-role key here. Database and Storage access remain governed by RLS and the signed-in user's session.
- Keep `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and `NEXT_PUBLIC_GOOGLE_MAP_ID` public so the browser map can load. Confirm the browser key's website/API restrictions before choosing **Mark as Safe**.
- Set `NEXT_PUBLIC_SITE_URL` to your production HTTPS origin and configure the matching Supabase Auth redirect URL. Select the intended Vercel environments (Production, Preview, Development) for each value.

See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys) and [Vercel environment variables](https://vercel.com/docs/environment-variables).

## App flow

- Share a Ganapati: enter its details, choose an exact map point, and add 1–2 Ganapati plus 1–3 decoration photos. A draft is created, files upload privately, and a guarded backend RPC scores and finalizes it.
- Scores 0–2 are rejected, 3–6 require review, and 7–11 are approved. Approved public listings appear as Community pandals. Obvious nearby duplicates require review. Private celebrations are never published, including when approved.
- Home shows an edge-to-edge map with floating search, location controls and map/list switching. All published listings stay available, with no All/Verified filters, distance dropdown or hidden radius cutoff. Opt-in browser location sorts listings nearest first. Location remains in memory unless explicitly chosen as the submitted pandal's point. PostGIS nearby queries remain available in the backend for future use.
- Saves and profile/submission history follow the signed-in account across browsers.
- Admins review real requests, promote Featured listings, or reject/remove published entries. A regular signed-in user cannot access the dashboard or call its privileged operation.

## Admin access

Administration is restricted to one explicitly bound, confirmed Supabase Auth identity. A role alone is insufficient. Follow the [exclusive admin setup](docs/security-and-mobile.md#exclusive-administration), then sign in normally and open **GnM Admin** from Profile or visit [localhost:3000/admin](http://localhost:3000/admin). Passwords are managed in Supabase Auth and are never stored in app source code.

The [security and mobile review](docs/security-and-mobile.md) covers server-only credentials, persistent route limits, database authorization, mobile controls, the About popup and remaining provider settings.

## Maps and photos

The app uses Maps JavaScript API and Routes API. Tapping a Modak opens the photos/save/share details sheet without requesting location or calling Routes API. Choosing **Show route on map** closes the sheet, asks for your current location when needed, then draws Google's driving route in blue and fits the complete journey on the map. A compact card shows route distance and estimated time without live traffic; **View details** reopens the sheet. Search and shared links open the same details and route action.

Enable **Routes API** in Google Cloud and use a dedicated server key restricted to **Routes API**, configured as `GOOGLE_ROUTES_API_KEY`. The browser sends coordinates to the authenticated `POST /api/routes` endpoint; the server calls Google and returns only the path, distance, duration and warnings. The Routes key is never bundled into client JavaScript. There is no fallback to the Maps JavaScript key. The endpoint checks the session and request origin, validates and bounds the body, fixes the routing options to basic driving, and never caches or logs GPS coordinates. Keep your Google Cloud daily request quota configured to control usage across users. A working base map alone does not confirm permission to compute routes.

The server Routes key must not use website/referrer restrictions, which apply to browser requests. Use server IP restrictions when your deployment has fixed outbound IPs; shared Vercel serverless deployments may need fixed egress before IP restrictions are practical. Keep the Maps JavaScript browser key restricted to your website origins and Maps JavaScript API. See [Google key security guidance](https://developers.google.com/maps/api-security-best-practices).

Routes use real provider paths and stay in memory. While location tracking is active, meaningful movement (at least 100 m or the reported accuracy, whichever is larger) can refresh the route at most once every 30 seconds. **Update route** refreshes immediately. Clear route, stopping location, changing selection and leaving Home remove the old line. Missing permission, API errors, no available route and a 25-second timeout offer recovery and an external Google Maps link; no straight-line substitute is drawn. The blue line is a route preview, not turn-by-turn navigation.

The details popup is a compact, viewport-bounded card: the Ganapati photo appears first, the chevron expands its information, and route/save/share actions remain visible. A logo skeleton covers both URL signing and image loading; failures offer a retry. Ganapati and decoration thumbnails remain separately labeled.

Marker and Home-list selections use Next.js's native history integration to update the shareable URL without a server navigation/auth round trip. Signed photo URLs share in-flight requests and are reused for up to four minutes within the mounted account provider (five-minute provider expiry). The bounded cache is memory-only, clears on sign-out/unmount, and does not bypass Storage permissions. Photo signing has a 15-second deadline; image loading has a 20-second fallback. The main photo has high fetch priority and thumbnails have low priority. Original images can still take longer on slow connections.

The private `pandal-images` bucket permits JPEG/PNG/WebP up to 5 MB each. Two separate arrays preserve Ganapati and decoration placement. Object paths are persisted; signed URLs are generated temporarily and refreshed. There is no client edit of finalized evidence.

Browser geolocation works on localhost when website and operating-system permissions allow it. Chrome/Edge can be used when an embedded preview cannot obtain location. Referrer restrictions and enabled APIs remain managed in Google Cloud.

## Checks

```powershell
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

The automated suite runs a production test build on port 3002 and an isolated Supabase HTTP contract double on 54329. It also covers live-location lifecycle, map marker cleanup, responsive layouts, authentication, photo bytes/grouping, partial-upload retry, database errors, cross-browser saves and admin decisions. Production is never seeded by these tests.

`tests/routes-api.spec.ts` verifies authenticated server routing, origin/body validation, provider error redaction and absence of the secret from production browser bundles. `tests/routes.spec.ts` covers routing requests, blue path rendering, stale responses, denied location, API errors, timeout/retry, GPS movement and cleanup on mobile/desktop. `node scripts/check-google-route.mjs` performs a separate live Google Routes check using fixed Nagpur waypoints and the ignored local server Routes configuration; it does not use user GPS or write database records.

`supabase/tests/stage_3_security.sql` verifies actual database roles, grants, Storage policies, scores and PostGIS using rolled-back fixtures. The live verification script requires separately provisioned disposable test identities in ignored `verification-artifacts`; it never uses a service key. Its cleanup must remove test images through Storage and delete only those test identities.

## Architecture

- `src/lib/supabase/`: typed browser/server clients, generated database types and session refresh.
- `supabase/migrations/`: reproducible database, Storage and RPC security.
- `src/lib/submit-pandal.ts`: draft, direct upload, recovery and finalization.
- `src/components/PandalDataProvider.tsx`: account-scoped public listings and saves.
- `src/hooks/useNearbyPandals.ts`: PostGIS query results.
- `src/hooks/useListingPhotos.ts`: runtime signed URLs and recovery.
- `src/lib/auth/account.ts`: verified profile and admin role.
- `src/components/MySubmissions.tsx`, `AdminDashboard.tsx`: private owner history and authorized moderation.
- `src/components/map/`, `src/hooks/useUserLocation.ts`: preserved Google Maps and opt-in location.
