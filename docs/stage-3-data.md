# Stage 3 Part 2 — Database, Storage and moderation

Implemented September 13, 2026 for Supabase project `jprgjsruskdvvbmdoqne`. Part 1 email/password authentication remains in place. No service key, Google OAuth, Realtime subscription, paid upgrade, or production seed data was introduced.

## 1. What was built

Supabase now stores profiles, submissions, published Ganapatis, categorized photos and saved places. The existing Google map, Advanced Markers, location picker, opt-in location, responsive layout, logo and navigation remain. Admin authorization is enforced on the server and in the database.

## 2–3. Schema and tables

| Table | Purpose and principal columns |
| --- | --- |
| `profiles` | Auth-linked `id`, `full_name`, creation/update timestamps. Existing users were backfilled without overwriting profiles. |
| `user_roles` | Auth-linked `user_id` primary key, `role` constrained to `admin`, creation timestamp. No row means regular user. |
| `pandal_submissions` | Private owner, name, area, map point, location text, submitter identity/role/contact, public-access flag, theme/description, two image-path arrays, backend score, draft/review/approved/rejected state, category, duplicate flag and review audit fields. |
| `pandals` | Sanitized public name, area, map point, theme/description, two image-path arrays, category and timestamps. Same UUID as the unique source submission. |
| `saved_pandals` | Composite primary key `(user_id, pandal_id)`, timestamp, cascading foreign keys. |

All five application tables have RLS enabled. `private` contains internal helper functions and is **not exposed by the Data API**, verified by an authenticated request returning `PGRST106`.

## 4–5. PostGIS and indexes

PostGIS **3.3.7** is enabled in `extensions`. Validated latitude/longitude columns generate `geography(Point,4326)` values. Database checks reject coordinates outside ±90/±180, including nonfinite values. This avoids PostGIS silently normalizing out-of-range client coordinates.

Application indexes, in addition to primary keys and the unique source-submission constraint:

- `pandals_location_gist`, `submissions_location_gist`: spatial search and nearby duplicate checks.
- `submissions_owner_created`: owner history.
- `submissions_status_created`: review queues.
- `submissions_reviewer`: reviewer foreign key.
- `pandals_category_created`, `pandals_created`: category and stable chronological reads.
- `saved_pandal_lookup`: listing foreign key and cascading removal.

## 6–7. Private image bucket and policies

Bucket: **`pandal-images`**, private, maximum **5,242,880 bytes per file**, MIME types `image/jpeg`, `image/png`, `image/webp`.

Paths:

```text
USER_UUID/SUBMISSION_UUID/ganapati/RANDOM_UUID.jpg|png|webp
USER_UUID/SUBMISSION_UUID/pandal/RANDOM_UUID.jpg|png|webp
```

INSERT requires an authenticated owner, a valid path and an owned draft. SELECT permits the owner, a verified admin, or an image path explicitly included in a published listing. DELETE permits the owner while the submission is a draft, or an admin. No application UPDATE/overwrite policy is provided. Owner upload/delete checks lock the submission row so they cannot race finalization.

Ganapati images and decoration images always use separate folders and arrays. Published cards use the Ganapati cover; switching to decoration never changes the cover's category.

## 8–9. RLS and explicit grants

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `profiles` | Own row; admins can read for dashboard counts | None from client | Own `full_name` column only, ownership `WITH CHECK` | None |
| `user_roles` | Own role | None | None | None |
| `pandal_submissions` | Own submissions or admin | Own draft, approved field allowlist only | None from client | Own empty draft only; remove objects through Storage first |
| `pandals` | Authenticated users | None from client | None from client | None from client |
| `saved_pandals` | Own rows | Own user ID and an existing published listing | None | Own rows |

All application-table privileges were revoked from `PUBLIC`, `anon`, and `authenticated`, then explicitly granted as above. Submission INSERT is column-limited: clients cannot supply image arrays, score, status, category, timestamps, duplicate flags or review metadata. Profile UPDATE is column-limited. Saves have INSERT on `user_id,pandal_id` and DELETE; there is no blanket write grant. Policies target `TO authenticated` and use `(select auth.uid())` where appropriate.

`anon` cannot use application tables or RPCs. `user_metadata` is never used for authorization. Owners can read their own private submission records; the regular UI deliberately selects/displays only user-facing history fields and never displays internal scores or review notes.

## 10. Functions

Public, authenticated-only, **SECURITY INVOKER** entry points:

- `finalize_pandal_submission(uuid)` → submission ID, status, publication boolean.
- `review_pandal_submission(uuid,text,text)` → admin decision and optional notes.
- `nearby_pandals(double precision,double precision,double precision)` → safe listing fields and `distance_meters`.

Private helpers:

- `is_admin()` uses `user_roles`, never user-editable metadata.
- `create_profile()` is an Auth-insert trigger; `touch_updated_at()` maintains timestamps.
- `normalize_contact()` normalizes formatted Indian mobile numbers to ten digits and rejects invalid nonempty input.
- `nontrivial_name()`, `submission_score()`, `status_for_score()` define backend criteria and thresholds.
- `sync_public_pandal()` performs the sanitized publication/removal transaction.
- `can_write_draft_image()`, `can_read_pandal_image()` implement Storage checks.
- Private finalization/review implementations contain the required owner/admin checks and controlled privilege elevation.

All new functions use `search_path=''` and qualified references. Only the helpers needed by policies or guarded RPC wrappers have authenticated EXECUTE. Internal scoring, publishing and trigger functions are not client-callable. Unnecessary client EXECUTE was also revoked from the pre-existing `public.rls_auto_enable()` event-trigger function; its platform trigger was preserved.

## 11. Submission flow

1. Validate form fields, exact map point and both required photo groups.
2. Create one UUID draft with score zero and no moderation fields supplied by the browser.
3. Upload files directly through the authenticated Storage SDK. Ganapati permits 1–2 images; decoration permits 1–3.
4. Reuse the draft UUID and generated object paths if a request fails. Reconcile completed uploads before retrying. Draft details stay locked during recovery; photos can be adjusted.
5. Call the finalization RPC. It authenticates the owner, locks the row and reads **actual Storage object metadata**, sizes, MIME types, folder paths and counts.
6. Missing/invalid images keep the submission a draft. The backend computes the score, status and duplicate flag.
7. In the same transaction, publish a sanitized Community listing only if approved and public. An already-finalized request returns its existing result without republishing or recomputing.

Local browser data from earlier stages is neither imported into Supabase nor deleted. Application localStorage/IndexedDB code and the old local photo editor have been removed.

## 12–15. Scoring, thresholds and automatic approval

| Valid criterion | Points |
| --- | ---: |
| Nontrivial Mandal name | 2 |
| Exact valid location | 2 |
| Submitter name and organizer/volunteer role | 2 |
| Valid Indian mobile number | 2 |
| Both actual photo groups within limits | 2 |
| Public access | 1 |

Maximum **11**. **0–2 rejected; 3–6 manual review; 7–11 approved. The approval threshold is 7.**

Approval and publication are separate. A private submission can score 10 and be approved, but **cannot appear in `pandals`**. This also applies to admin approval. An obvious same-name submission within 100 metres is flagged for manual review rather than auto-rejected or published twice. A transaction-level name lock protects concurrent duplicate checks.

The chosen requirement for both photo groups, combined with a required exact location, gives a valid finalization at least four points. Therefore score 2/3 boundary checks exercise the pure database rule; the real finalizer is tested at 6/7/11. The complete normal form normally scores 11 for public access or 10 for private access.

## 16–17. Admin moderation and categories

`/admin` requires a server-verified `user_roles` row. Regular users receive an access-denied screen and no admin link on their profile. The dashboard queries real submissions, pending/approved/rejected tabs, backend scores, duplicate flags, private submitter details and signed photos. Total Users counts profile rows without reading Auth email records.

The guarded review RPC atomically sets the decision, category, reviewer UUID, timestamp and optional internal notes. Approve as Community, approve/promote as Featured, and reject are available for finalized submissions. Approval publishes only public celebrations. Rejection removes publication and cascades saved references. Finalized owner evidence is immutable.

**Community** is the automatic public category. **Featured** requires an admin decision; it is never browser-selected during submission.

## 18–20. Saves, discovery and nearby search

Saves are account-linked database rows with a composite unique key. Reloading or using another browser with the same account retrieves them again. Requests have pending states, duplicate-save recovery and visible errors. There is no local persistence fallback.

Home, search suggestions, list/map markers, previews and Saved derive published data only from `pandals`. Reads paginate through the Data API rather than stopping at its first-page limit. Empty and failed requests have distinct messages and retry actions. Search can explicitly open a listing outside the active radius; its selected marker is retained.

With runtime browser location and radius 1, 3, 5 or 10 km, Home uses `nearby_pandals`, `ST_DWithin` and `ST_Distance`, ordered by canonical metres. All mode reads published rows; its displayed straight-line distance uses the existing client calculation. The browser's current location is not stored. Only a point explicitly submitted as the pandal location is persisted.

## 21. Signed images

Only object paths are stored in application tables. Signed URLs are generated at runtime for five minutes, refreshed every four minutes and on focus. An image error triggers a bounded refresh; continued failures show the matching category placeholder with retry. Draft/rejected photos remain private. Previously issued signed links can remain valid until expiry after a listing is rejected, as is normal for signed URLs.

## 22–23. Profiles and contact privacy

`profiles.full_name` is the primary display/edit source. Auth continues to supply email and membership date. Profile changes write the owned database row and refresh header initials. My Submissions queries the current owner's name, area, date, status and public-access flag, without requesting internal notes or scores for display.

`public.pandals` has **no `contact_phone`, `submitter_name`, `submitter_role`, `submitted_by` or `review_notes` column**. Querying the public listing table cannot retrieve organizer contact details. Other users cannot query another owner's private submission.

## 24. First admin setup

**Superseded:** administrator access now also requires the exclusive identity binding. Use [the current admin setup](security-and-mobile.md#exclusive-administration); the historical role-only instructions below are insufficient on the updated database.

**No real admin has been assigned.** Pick an already-registered account explicitly. In the connected project's SQL Editor, replace the email below with that account's exact email and run once:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where lower(email) = lower('YOUR_REGISTERED_EMAIL')
on conflict (user_id) do update set role = excluded.role
returning user_id, role;
```

Expect exactly one returned row. Zero rows means the email does not match a registered account. Sign in as that account, reload Profile, and use **GnM Admin**, or visit `/admin`. Never put a service key in the app or set an admin claim in user metadata.

## 25. Advisors

The final security advisor has **no database/Storage findings** after moving elevated RPC implementations to `private` and revoking unnecessary event-trigger EXECUTE. It retains the existing **Leaked Password Protection Disabled** Auth warning. Auth configuration and project plan were not changed. [Supabase remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

The performance advisor has three informational unused-index notices (`submissions_reviewer`, `pandals_category_created`, `pandals_created`). They support real foreign keys/read paths and are retained in this new, nearly empty database. [Unused-index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## 26–28. Verification

- `supabase/tests/stage_3_security.sql` passed against the connected database. All fixture users, roles, listings, saves and Storage metadata in that suite were rolled back.
- A/B/admin coverage includes profile and submission ownership, prevention of role/owner/score/category forgery, no client publication, anonymous denial, draft-only writes, pending photo privacy, published image visibility, finalized evidence protection, admin publication/promotion/rejection, save ownership/cascades, duplicate review, exact nearby distances and radius/coordinate validation.
- Backend score helper checks: **2 → rejected; 3 → manual review; 6 → manual review; 7 → approved; 11 → approved**. Actual finalized submissions verify 6, 7, 10-private and 11, plus idempotency and duplicates.
- Separate live HTTP checks used two disposable non-admin accounts: real Auth sessions; profile isolation; actual image-byte uploads in both folders; denied pending signing for B; finalization; approved signed downloads with byte-for-byte equality; private contact denial; PostGIS; and account-specific saves.
- Real app screens verified login, Home's distinct photo groups, Saved, and admin denial with no browser console errors. The private API schema rejection was also checked over HTTP.
- The final production server passed the same real screen checks. The disposable HTTP-test accounts, submission, saves and image objects were removed afterwards; images were deleted through the Storage API. The original account/profile remains, with zero assigned admins and zero published test listings.
- **67 automated checks passed:** 9 logic checks (including all 64 scoring combinations), 29 mobile and 29 desktop browser checks. They use an isolated HTTP Auth/Data/Storage contract double and Google Maps double; they do not bypass app authentication or seed production.

## 29. Build checks

`npm run lint`, `npm run typecheck`, and `npm run build` passed. The production build has working routes for Home, Add, Saved, Profile, Admin, Auth and confirmation/error handling. The existing Maps/geolocation/marker-cleanup and responsive-layout regression checks pass.

## 30. Boundaries and remaining setup

- The owner must explicitly select the first real admin account using the one-time SQL above.
- Retrying an interrupted upload preserves its draft while the form remains open. Draft history is visible on Profile; this stage does not add an editor to resume an abandoned draft after closing that form.
- Signed-link revocation follows the five-minute expiry. No automatic abandoned-draft deletion, cross-tab realtime feed, external notifications, or Google OAuth was added.
- Existing local-only records and blobs remain in the user's browser but are not uploaded or displayed as Supabase records. Re-submit real listings through the new form.
- The Auth password-protection advisor warning remains, as described above.

## Migration reproducibility

The official Supabase CLI created each migration file. Their filenames were subsequently aligned with the exact versions recorded by MCP, so local and remote migration history agree:

1. `supabase/migrations/20260913050544_stage_3_pandal_database.sql`
2. `supabase/migrations/20260913052833_harden_rpc_entrypoints.sql`

They are already applied to the connected project. For a new project, apply in this order. Do not reapply the table-creation migration manually to this database. TypeScript definitions in `src/lib/supabase/database.types.ts` were generated from the connected schema. Environment values remain in ignored `.env.local`; `.env.example` contains placeholders.
