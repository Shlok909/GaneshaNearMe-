# Security and mobile review

## Private credentials and public configuration

`GOOGLE_ROUTES_API_KEY` is server-only. The browser sends coordinates to authenticated `POST /api/routes`; it cannot supply a provider URL, API key, field mask, extra waypoints or premium route options. The endpoint validates coordinates, enforces a 2 KB request-body limit, checks the request origin, verifies the Supabase user, limits provider duration and filters the response. Provider errors and credentials are not returned or logged. Responses are private and not cached.

Supabase's publishable key, project URL, Maps JavaScript browser key and Map ID remain public by design. They cannot be made secret by renaming them. Supabase authorization uses RLS and verified identity. Restrict the Maps browser key to the actual website origins and Maps JavaScript API in Google Cloud. The private Routes key is restricted to Routes API and uses server IP restrictions when fixed outbound IPs are available.

## Persistent route limits

The endpoint consumes a database-backed allowance before contacting Google: **10 requests per minute and 100 per UTC day per account**. Concurrent calls serialize on that account's counter row, so different Vercel instances share the same allowance. An unavailable counter fails closed. HTTP 429 includes `Retry-After` when the app's limit is reached, and the UI offers Google Maps as a fallback.

Counters hold only account IDs, time-window numbers and request counts. They contain no location, route or IP address. Google Cloud's project-wide quota remains an additional independent limit; a lower Cloud quota can stop routes sooner. Rejected or failed provider requests still consume an app allowance to limit repeated retries.

## Exclusive administration

The database requires all of these for admin access:

- A role assigned in `public.user_roles`.
- The same immutable Auth user ID bound in the single row of `private.admin_identity`.
- A current, confirmed email matching the bound email, with the account neither deleted nor banned.

`/admin` and its profile link call `can_access_admin()`. RLS, private-image access and moderation RPCs use the same underlying check. Another user cannot gain admin access by editing their profile, JWT metadata, browser storage, URL or client JavaScript. Even an additional role row does not grant access to a different identity.

Passwords belong exclusively to Supabase Auth, which hashes them. The app has no hardcoded admin password or alternate client-side login gate.

To provision or change the sole administrator, first create/confirm the intended account through Supabase Auth. Then run this as the project owner in the SQL Editor, replacing only the email placeholder:

```sql
begin;
do $$
declare
  chosen_email text := lower('ADMIN_EMAIL');
  chosen_id uuid;
begin
  select id into strict chosen_id from auth.users
    where lower(email) = chosen_email and email_confirmed_at is not null
      and deleted_at is null and (banned_until is null or banned_until < now());
  delete from public.user_roles where user_id <> chosen_id;
  insert into public.user_roles(user_id, role) values(chosen_id, 'admin')
    on conflict(user_id) do update set role = excluded.role;
  insert into private.admin_identity(singleton, user_id, email)
    values(true, chosen_id, chosen_email)
    on conflict(singleton) do update set user_id=excluded.user_id, email=excluded.email;
end;
$$;
commit;
```

Existing passwords are never needed in this SQL. Sign in normally, then open `/admin`. A changed email fails the admin check until the project owner explicitly updates the binding.

## Browser and mobile changes

- A compact header About button opens the requested founder, co-founder and technical-help credits. The accessible dialog supports Escape, close-button activation, focus containment and focus return.
- Mobile inputs use at least 16 px text. Map view toggles and route actions have 44 px touch targets. Search, filters and location controls are checked for overlap at narrow widths.
- Responses include MIME-sniffing protection, frame protection, restricted device permissions and a CSP limiting framing, objects, base URLs and form destinations. This is a targeted CSP; it does not yet enforce a nonce-based script allowlist.
- Cross-site referrers send only the origin, which allows properly restricted Google browser keys without sharing app paths. Authenticated pages and APIs keep private/no-store caching.

## Verification and remaining limits

- Production dependency audit: no reported vulnerabilities at the time of this review.
- Live database tests verify the exclusive admin binding, unverified/changed-email denial, counter isolation, minute/day limits, rollover and anonymous/private-table denial. The broader submission/Storage/ownership suite also passes. All fixtures are rolled back.
- Browser tests cover mobile About behavior, responsive controls, headers, login/session flows, admin denial/moderation, server routing and absence of the Routes secret from production browser files.
- The Supabase security advisor reports leaked-password protection disabled. This feature requires Pro or higher; the connected project is on Free. No subscription upgrade was performed. [Supabase password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- The two private security tables intentionally have no client RLS policies and no client table grants. The advisor's informational “RLS enabled, no policy” notices describe their deny-by-default access, not public access.
- Cloud API-key restrictions, deployed environment values, provider quotas, future dependency advisories and account/password hygiene still require ongoing management. This review does not establish an absolute security guarantee.

Migration: `supabase/migrations/20260913093142_admin_and_route_security.sql`, applied to the connected project. The administrator binding is an explicit operational step and is not seeded by migrations.
