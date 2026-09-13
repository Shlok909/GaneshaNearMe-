-- Bind administration to one explicitly provisioned, verified Auth identity.
-- No credentials or project-specific user IDs belong in migration history.
create table private.admin_identity (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null check (email = lower(btrim(email)))
);
alter table private.admin_identity enable row level security;
revoke all on private.admin_identity from public, anon, authenticated;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.admin_identity a
    join public.user_roles r on r.user_id = a.user_id and r.role = 'admin'
    join auth.users u on u.id = a.user_id
    where a.singleton and a.user_id = (select auth.uid())
      and lower(u.email) = a.email and u.email_confirmed_at is not null
      and u.deleted_at is null
      and (u.banned_until is null or u.banned_until < now())
  );
$$;

create function public.can_access_admin() returns boolean
language sql stable security invoker set search_path = '' as $$
  select private.is_admin();
$$;
revoke all on function public.can_access_admin() from public, anon, authenticated;
grant execute on function public.can_access_admin() to authenticated;

-- One counter row per account; never store coordinates, IPs or routes.
create table private.route_request_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  minute_window bigint not null,
  minute_count integer not null,
  day_window bigint not null,
  day_count integer not null
);
alter table private.route_request_limits enable row level security;
revoke all on private.route_request_limits from public, anon, authenticated;

create function private.consume_route_request() returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  epoch bigint := floor(extract(epoch from clock_timestamp()))::bigint;
  minute_key bigint := epoch / 60;
  day_key bigint := epoch / 86400;
  usage private.route_request_limits%rowtype;
begin
  if caller is null then raise exception 'Sign in required.' using errcode = '42501'; end if;
  insert into private.route_request_limits values (caller, minute_key, 0, day_key, 0)
    on conflict (user_id) do nothing;
  select * into usage from private.route_request_limits where user_id = caller for update;
  if usage.minute_window <> minute_key then usage.minute_count := 0; end if;
  if usage.day_window <> day_key then usage.day_count := 0; end if;
  if usage.day_count >= 100 then return ((day_key + 1) * 86400 - epoch)::integer; end if;
  if usage.minute_count >= 10 then return ((minute_key + 1) * 60 - epoch)::integer; end if;
  update private.route_request_limits set
    minute_window = minute_key, minute_count = usage.minute_count + 1,
    day_window = day_key, day_count = usage.day_count + 1
    where user_id = caller;
  return 0;
end;
$$;
revoke all on function private.consume_route_request() from public, anon, authenticated;
grant execute on function private.consume_route_request() to authenticated;
create function public.consume_route_request() returns integer
language sql volatile security invoker set search_path = '' as $$
  select private.consume_route_request();
$$;
revoke all on function public.consume_route_request() from public, anon, authenticated;
grant execute on function public.consume_route_request() to authenticated;
