# Stage 3 Part 1: Supabase Authentication and Profile

Email/password signup and login now use Supabase Auth. Names are stored in `auth.users.raw_user_meta_data.full_name`. Listings, saves, moderation decisions and IndexedDB photos retain their existing browser storage. No application tables, migrations, policies, triggers, extensions or Storage buckets are created by this implementation.

## Configuration

Node used: **v24.15.0**. Minimum: Node 22. Installed with npm and exact versions in package.json/package-lock.json:

- `@supabase/supabase-js`: **2.116.0**
- `@supabase/ssr`: **0.12.7**

No deprecated auth-helpers package is used. The installation audit reported zero vulnerabilities.

Set these values in ignored `.env.local`; `.env.example` contains placeholders:

```dotenv
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAP_ID=
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The Supabase URL must be the project's base URL. The supplied `/rest/v1/` suffix was removed locally. Only the **publishable** Supabase key is used by browser and server code. No service-role/secret key is required or included. Restart development and rebuild production after environment changes.

## Clients and session checks

- `src/lib/supabase/client.ts`: the official cookie-aware browser singleton, used for SDK auth events and logout synchronization. It keeps no duplicate application user state.
- `src/lib/supabase/server.ts`: a fresh client scoped to request cookies; used by Server Components, Server Actions and the callback. Cookie writes happen in Actions/Route Handlers; Proxy handles refresh before Server Components render.
- `src/proxy.ts` and `src/lib/supabase/proxy.ts`: verify `getClaims()`, refresh expired sessions and copy new cookies to both the downstream request and browser response. Cookie/cache headers survive redirects. Auth responses use private/no-store caching.
- `src/lib/auth/session.ts`: freshly retrieves the user with `getUser()` and memoizes only within the server render. Both the protected layout and every protected page use it. No authorization decision uses `getSession()` or editable metadata.
- `SessionRefresh`: cleans up its SDK subscription and focus/pageshow listeners; refreshes server-rendered data on focus and reloads a restored browser back/forward-cache document. Logout invalidates Next caches and replaces the current page with login.

## Signup, confirmation and login

Signup trims and validates Full Name (1–80 characters), email, a password of at least eight characters, and matching confirmation. Supabase additionally enforces the project's password policy. Pending requests disable the form and prevent double submissions. Password fields are cleared after success and never written to app storage, metadata or logs.

Signup with confirmation enabled shows **Check your email** and stays on the auth screen. The live project's public Auth settings reported confirmation enabled; this setting was preserved. If confirmation is disabled by the owner, signup may return a session and proceed directly to the safe destination.

`/auth/confirm` accepts an email/signup `token_hash` for `verifyOtp()`. It also supports a PKCE `code` from the default confirmation flow in the same browser. Success writes SDK session cookies and redirects to `/home`; an invalid, expired or used callback goes to `/auth/error` without printing tokens or raw errors.

Login uses `signInWithPassword`. Wrong credentials, unconfirmed email, rate limits and unavailable configuration/service receive inline messages. The `next` parameter is restricted to known application paths; shared `/home?pandal=...` links are preserved safely. Authenticated visits to `/auth` redirect to `/home`.

## Profile, logout and routes

`/profile` displays verified full name, read-only email, initials and the real account creation month/year. Saving Full Name calls `updateUser({ data: { full_name } })`, shows **Profile updated**, refreshes the header and survives reload. No profile table or avatar bucket is used.

Logout calls Supabase `signOut()` on the server, revokes sessions, clears cookies and invalidates the layout. The browser SDK notifies its other tabs. Valid SDK cookies survive reload and reopened tabs; Proxy handles expiration without application refresh timers.

Protected: `/home`, `/add`, `/saved`, `/profile`, `/admin`. Anonymous direct navigation, reload and navigation after logout are redirected to `/auth`.

**To open the admin preview:** sign in, then visit [localhost:3000/admin](http://localhost:3000/admin). This is authenticated-only in Part 1, not secure admin-only authorization. Any authenticated user can access the browser-local preview. Part 2 must implement admin authorization using secure database/app metadata policies; editable `user_metadata`, email comparisons and hardcoded IDs are not permissions.

The Google button is disabled and marked **Coming soon**. Google OAuth is not implemented.

## Supabase Dashboard setup

The available MCP tools can inspect the project and database, but do not expose Auth configuration updates or email-template inspection. The public Auth settings endpoint confirms email signup and confirmation are enabled; it does not disclose Site URL, redirect allowlists or template content. Verify these manually:

1. Open the project **Authentication → URL Configuration**: [URL settings](https://supabase.com/dashboard/project/jprgjsruskdvvbmdoqne/auth/url-configuration).
2. For local development set **Site URL** to `http://localhost:3000` and add **Redirect URL** `http://localhost:3000/auth/confirm`.
3. Under **Authentication → Email Templates → Confirm signup**, use this confirmation link, retaining any surrounding email design:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"
  >Confirm your email</a
>
```

4. Keep the current **Confirm email** setting enabled. The token-hash template supports opening the email in another browser; the default PKCE code flow requires the browser that started signup and its verifier cookie.
5. Before deployment, set `NEXT_PUBLIC_SITE_URL` and Dashboard Site URL to the actual HTTPS domain. Add its exact `/auth/confirm` redirect URL. No production domain was supplied. Do not use broad wildcard redirects in production.

Do not include keys in templates. The default Supabase mail service has delivery/recipient/rate limits suitable for initial testing. Custom SMTP is a later production task; no paid provider was added. See [Supabase SSR guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client) and [email template documentation](https://supabase.com/docs/guides/auth/auth-email-templates).

## Files

Created:

- `src/lib/supabase/{client,server,proxy,config}.ts`
- `src/lib/auth/{session,user,validation,redirects}.ts`
- `src/proxy.ts`
- `src/app/auth/actions.ts`, `src/app/auth/confirm/route.ts`, `src/app/auth/error/page.tsx`
- `src/components/SessionRefresh.tsx`
- `tests/auth.spec.ts`, `tests/auth.logic.spec.ts`
- `tests/support/auth-server.mjs`, `tests/support/start-app.mjs`
- `docs/stage-3-auth.md`

Modified:

- `.env.example`, ignored `.env.local`, `package.json`, `package-lock.json`
- `.gitignore`, `next.config.ts`, `eslint.config.mjs`, `tsconfig.json`, generated `next-env.d.ts`
- `src/app/auth/page.tsx`, `src/app/(app)/layout.tsx`, all five protected `page.tsx` files, `src/app/globals.css`
- `src/components/{AuthForm,AppHeader,ProfileExperience,AdminDashboard}.tsx`
- `src/lib/{hooks,demo-storage,demo-submissions,types}.ts`
- `playwright.config.ts`, `tests/{helpers,stage-one.spec,stage-two.spec,local-listings.spec}.ts`
- `scripts/check-google-map.mjs`, `README.md`

Removed: `src/lib/demo-auth.ts` and its demo user/flag dependencies. A negative test intentionally sets the old demo flag to prove it grants no access.

## Verification

The automated suite uses a test-only HTTP Auth service with signed ES256 JWTs and JWKS; the app uses its normal SDK clients and guards. The service never contacts the real Supabase project. Tests cover both confirmation settings without changing live settings, safe redirects, wrong credentials, metadata changes, cookie persistence, expiration refresh, forged-token rejection and logout/back navigation. Existing map, location, local listing, saved, admin and photo tests run with authenticated test cookies.

Results on 13 September 2026:

- `npm run lint`: exit **0**, no ESLint warnings or errors.
- `npm run typecheck`: exit **0**.
- `npm run build`: exit **0**, compiled successfully; `/auth` and all five protected pages are dynamic, and Proxy is present.
- `npm run test:e2e`: exit **0**, **70 passed** in 2.8 minutes (10 logic, 30 mobile, 30 desktop). The initial run identified a missing API-version header in the test Auth service and two pre-existing reload/navigation races in tests; those were corrected before the passing run.
- Actual Chrome against `localhost:3000` and the real Supabase configuration: all five anonymous routes redirected, incorrect credentials produced the friendly inline error, auth layout had no overflow at 360/390/430/1440 px, and no browser exceptions or console errors were recorded. Screenshots and the report are in ignored `verification-artifacts/`.
- Direct live Auth request: HTTP **400**, `invalid_credentials`, no session created.
- MCP: project `ganeshanearme` was **ACTIVE_HEALTHY**. Before and after implementation: **0 Auth users**, **0 public tables**, **0 Storage buckets**. No application database or Storage changes were made.
- Source checks found no fake auth dependency, OAuth implementation, or configured API key in tracked/unignored files. Keys remain in ignored `.env.local`.

**Live signup/confirmation verification is pending a user-controlled test email.** The inbox address was requested during implementation but has not been supplied. No live test account was created, and successful login/profile updates against this hosted project cannot yet be claimed. Those flows passed against the isolated Auth service. Complete the Dashboard checks above, then sign up with a real inbox and open its confirmation link; we can finish MCP verification of that account afterward.

One Next.js server message, `The destination stream closed early`, appeared during rapid navigation in the automated suite. All assertions passed and no browser error accompanied it; its cause has not been conclusively identified. Lint and production builds emitted no errors. Local listings/photos remain scoped to the browser origin rather than to individual Supabase accounts. Part 2 and Google OAuth were not started.
