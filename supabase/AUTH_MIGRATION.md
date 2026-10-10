# Supabase Auth migration

The web app now signs in with Supabase Auth (`signInWithPassword` / `signUp`).
Admin access (`/admin`, `/api/v1/admin/*`, admin RLS policies) requires a
session for `lohithgamer12@gmail.com` whose `app_metadata.role` is `"admin"`.
`app_metadata` can only be set with the service role key.

Nothing below has been applied. Run in order:

1. **Create auth users from legacy rows** (from `frontend/`):

   ```bash
   node scripts/migrate-users-to-supabase-auth.mjs          # dry run
   node scripts/migrate-users-to-supabase-auth.mjs --apply  # creates auth users
   ```

   - Each auth user keeps its legacy `users.id`, so existing `scans.user_id` stay valid.
   - bcrypt hashes are imported, so those users keep their current password
     (including `demo@agriguard.in`, used by the landing page's demo button).
   - Rows stored as `sha256$<plaintext>` (written by the old client-side
     `register()`) are created without a password; those users must use
     password reset.
   - The admin row gets `app_metadata.role = "admin"`.

2. **Apply RLS** — paste `supabase/auth_rls_migration.sql` into the Supabase SQL
   editor and run it. It enables RLS on every table, adds the profile trigger for
   new sign-ups, and overwrites all legacy `hashed_password` values.

3. **Verify**:

   ```bash
   node scripts/migrate-users-to-supabase-auth.mjs --verify
   ```

   Every table except `crops` must report `ok` (0 rows for anon).

## Backend (FastAPI)

`require_lohith_admin` verifies the bearer token with Supabase Auth
(`GET /auth/v1/user`) and checks email, confirmation and `app_metadata.role`.
Set `SUPABASE_ANON_KEY` (public anon key) in `backend/.env`; without it every
admin request is refused. Locally issued JWTs and the old passkeys no longer
grant admin.

## Known gaps

- Scans inserted anonymously before this change have `user_id = NULL`; after RLS
  only the admin can see them.
- `backend` still ships a default `SECRET_KEY`; set a real one in `backend/.env`
  for any deployment reachable from the internet (it signs local, non-admin JWTs).
