-- AgriGuard: Supabase Auth + Row Level Security
-- ============================================================================
-- DRAFT — review before applying. Run in the Supabase SQL editor AFTER
-- frontend/scripts/migrate-users-to-supabase-auth.mjs has created the auth
-- users (see supabase/AUTH_MIGRATION.md).
--
-- Model:
--   * Identity comes from Supabase Auth (auth.users). public.users is a profile
--     table whose id equals auth.users.id (as text), kept in sync by a trigger.
--   * The admin is exactly lohithgamer12@gmail.com AND app_metadata.role =
--     'admin'. app_metadata can only be written with the service role, so a
--     look-alike sign-up cannot become admin.
--   * Scans are readable/writable by their owner; the admin can read all.
-- ============================================================================

begin;

-- ─── Admin predicate ────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'lohithgamer12@gmail.com'
     and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

-- ─── Profile rows for new auth users ────────────────────────────────────────
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, hashed_password, full_name, is_active, created_at)
  values (
    new.id::text,
    lower(new.email),
    'supabase-auth',  -- passwords live in auth.users only
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    true,
    now()
  )
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ─── users: admin-only, plus each user's own profile row ────────────────────
alter table public.users enable row level security;
alter table public.users force row level security;

drop policy if exists users_admin_all on public.users;
create policy users_admin_all on public.users
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select to authenticated
  using (id = auth.uid()::text);

-- Clients never need the legacy hash column, not even their own.
revoke select on public.users from anon, authenticated;
grant select (id, email, full_name, is_active, created_at) on public.users to authenticated;
revoke insert, update, delete on public.users from anon;

-- ─── scans: owner read/write, admin read/delete ─────────────────────────────
alter table public.scans enable row level security;
alter table public.scans force row level security;

drop policy if exists scans_select_own_or_admin on public.scans;
create policy scans_select_own_or_admin on public.scans
  for select to authenticated
  using (user_id = auth.uid()::text or public.is_admin());

drop policy if exists scans_insert_own on public.scans;
create policy scans_insert_own on public.scans
  for insert to authenticated
  with check (user_id = auth.uid()::text);

drop policy if exists scans_update_own on public.scans;
create policy scans_update_own on public.scans
  for update to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

drop policy if exists scans_delete_own_or_admin on public.scans;
create policy scans_delete_own_or_admin on public.scans
  for delete to authenticated
  using (user_id = auth.uid()::text or public.is_admin());

-- ─── Catalog: public read, admin write ──────────────────────────────────────
alter table public.crops enable row level security;
alter table public.diseases enable row level security;

drop policy if exists crops_read on public.crops;
create policy crops_read on public.crops for select to anon, authenticated using (true);
drop policy if exists crops_admin_write on public.crops;
create policy crops_admin_write on public.crops for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists diseases_read on public.diseases;
create policy diseases_read on public.diseases for select to anon, authenticated using (true);
drop policy if exists diseases_admin_write on public.diseases;
create policy diseases_admin_write on public.diseases for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── IoT: readings for signed-in users, devices (key hashes) admin-only ────
alter table public.sensor_readings enable row level security;
alter table public.devices enable row level security;
alter table public.devices force row level security;

drop policy if exists sensor_readings_read on public.sensor_readings;
create policy sensor_readings_read on public.sensor_readings
  for select to authenticated using (true);
drop policy if exists sensor_readings_admin_write on public.sensor_readings;
create policy sensor_readings_admin_write on public.sensor_readings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists devices_admin_all on public.devices;
create policy devices_admin_all on public.devices for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── Wipe legacy password material from public.users ────────────────────────
-- Safe only after the migration script has imported every bcrypt hash into
-- auth.users. 'sha256$' rows held PLAINTEXT passwords and must not survive.
update public.users set hashed_password = 'supabase-auth'
  where hashed_password is distinct from 'supabase-auth';

commit;

-- ─── Verification ───────────────────────────────────────────────────────────
-- From frontend/: node scripts/migrate-users-to-supabase-auth.mjs --verify
-- Expected: anon gets 0 rows from users, scans, devices, sensor_readings.
