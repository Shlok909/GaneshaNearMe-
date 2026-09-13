-- CLI-created migration, filename aligned to the version recorded by Supabase MCP.
-- Stage 3 Part 2. Never seed listings or infer an administrator from auth.users.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
create extension if not exists postgis with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role = 'admin'),
  created_at timestamptz not null default now()
);
create table public.pandal_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mandal_name text not null check (char_length(btrim(mandal_name)) between 1 and 160),
  area text not null default '' check (char_length(area) <= 160),
  location_text text not null default '' check (char_length(location_text) <= 1000),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location extensions.geography(Point,4326) generated always as
    (extensions.st_setsrid(extensions.st_makepoint(longitude, latitude),4326)::extensions.geography) stored,
  submitter_name text not null default '' check (char_length(submitter_name) <= 160),
  submitter_role text check (submitter_role in ('organizer','volunteer')),
  contact_phone text not null default '' check (contact_phone = '' or contact_phone ~ '^[6-9][0-9]{9}$'),
  public_access boolean not null default false,
  theme text check (char_length(theme) <= 500),
  description text check (char_length(description) <= 2000),
  ganapati_image_paths text[] not null default '{}',
  pandal_image_paths text[] not null default '{}',
  verification_score smallint not null default 0 check (verification_score between 0 and 11),
  status text not null default 'draft' check (status in ('draft','rejected','manual_review','approved')),
  category text check (category in ('community','featured')),
  possible_duplicate boolean not null default false,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text check (char_length(review_notes) <= 2000)
);
create table public.pandals (
  id uuid primary key references public.pandal_submissions(id) on delete cascade,
  source_submission_id uuid not null unique references public.pandal_submissions(id) on delete cascade,
  mandal_name text not null,
  area text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location extensions.geography(Point,4326) generated always as
    (extensions.st_setsrid(extensions.st_makepoint(longitude,latitude),4326)::extensions.geography) stored,
  theme text,
  description text,
  ganapati_image_paths text[] not null,
  pandal_image_paths text[] not null,
  category text not null check (category in ('community','featured')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint same_submission check (id = source_submission_id)
);
create table public.saved_pandals (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pandal_id uuid not null references public.pandals(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, pandal_id)
);
create index pandals_location_gist on public.pandals using gist(location);
create index submissions_location_gist on public.pandal_submissions using gist(location);
create index submissions_owner_created on public.pandal_submissions(submitted_by,created_at desc);
create index submissions_status_created on public.pandal_submissions(status,created_at desc);
create index submissions_reviewer on public.pandal_submissions(reviewed_by);
create index pandals_category_created on public.pandals(category,created_at desc);
create index pandals_created on public.pandals(created_at desc,id);
create index saved_pandal_lookup on public.saved_pandals(pandal_id);

create function private.is_admin() returns boolean language sql stable security definer
set search_path = '' as $$
  select exists(select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'admin');
$$;
create function private.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create function private.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,full_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),80))
  on conflict(id) do nothing;
  return new;
end;
$$;
create trigger gnm_create_profile after insert on auth.users for each row execute function private.create_profile();
insert into public.profiles(id,full_name,created_at)
select id,left(coalesce(raw_user_meta_data->>'full_name',''),80),created_at from auth.users on conflict(id) do nothing;
create trigger profiles_updated before update on public.profiles for each row execute function private.touch_updated_at();
create trigger submissions_updated before update on public.pandal_submissions for each row execute function private.touch_updated_at();
create trigger pandals_updated before update on public.pandals for each row execute function private.touch_updated_at();

create function private.normalize_contact() returns trigger language plpgsql set search_path = '' as $$
declare phone text;
begin
  phone := regexp_replace(btrim(new.contact_phone), '[[:space:]()\-]', '', 'g');
  if phone ~ '^\+91' then phone := substr(phone,4);
  elsif phone ~ '^0091' then phone := substr(phone,5);
  elsif phone ~ '^91[6-9][0-9]{9}$' then phone := substr(phone,3); end if;
  if phone <> '' and phone !~ '^[6-9][0-9]{9}$' then raise exception 'Enter a valid Indian mobile number.' using errcode='22023'; end if;
  new.contact_phone := phone;
  return new;
end;
$$;
create trigger submissions_normalize_contact before insert or update of contact_phone on public.pandal_submissions
for each row execute function private.normalize_contact();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.pandal_submissions enable row level security;
alter table public.pandals enable row level security;
alter table public.saved_pandals enable row level security;
revoke all on public.profiles, public.user_roles, public.pandal_submissions, public.pandals, public.saved_pandals from public, anon, authenticated;
grant select on public.profiles, public.user_roles, public.pandal_submissions, public.pandals, public.saved_pandals to authenticated;
grant update(full_name) on public.profiles to authenticated;
grant insert(id,submitted_by,mandal_name,area,location_text,latitude,longitude,submitter_name,submitter_role,contact_phone,public_access,theme,description)
on public.pandal_submissions to authenticated;
grant delete on public.pandal_submissions to authenticated;
grant insert(user_id,pandal_id), delete on public.saved_pandals to authenticated;
create policy profiles_read on public.profiles for select to authenticated using (id=(select auth.uid()) or (select private.is_admin()));
create policy profiles_edit on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
create policy roles_read on public.user_roles for select to authenticated using(user_id=(select auth.uid()));
create policy submissions_read on public.pandal_submissions for select to authenticated using(submitted_by=(select auth.uid()) or (select private.is_admin()));
create policy submissions_draft_insert on public.pandal_submissions for insert to authenticated with check (
  submitted_by=(select auth.uid()) and status='draft' and verification_score=0 and category is null
  and reviewed_by is null and reviewed_at is null and review_notes is null and submitted_at is null
  and not possible_duplicate and cardinality(ganapati_image_paths)=0 and cardinality(pandal_image_paths)=0
);
-- Delete objects through the Storage API first; keep a draft when cleanup fails.
create policy submissions_draft_delete on public.pandal_submissions for delete to authenticated using (
  submitted_by=(select auth.uid()) and status='draft' and not exists(
    select 1 from storage.objects o where o.bucket_id='pandal-images' and o.name like pandal_submissions.submitted_by::text || '/' || pandal_submissions.id::text || '/%'
  )
);
create policy pandals_read on public.pandals for select to authenticated using(true);
create policy saves_read on public.saved_pandals for select to authenticated using(user_id=(select auth.uid()));
create policy saves_insert on public.saved_pandals for insert to authenticated with check(user_id=(select auth.uid()));
create policy saves_delete on public.saved_pandals for delete to authenticated using(user_id=(select auth.uid()));

create function private.nontrivial_name(value text, minimum_letters integer) returns boolean
language sql immutable set search_path = '' as $$
  select char_length(regexp_replace(coalesce(value,''),'[^[:alpha:]]','','g')) >= minimum_letters
    and (select count(distinct letter) from regexp_split_to_table(lower(regexp_replace(coalesce(value,''),'[^[:alpha:]]','','g')),'') letter) > 1;
$$;
create function private.submission_score(mandal boolean, exact_location boolean, submitter boolean, phone boolean, images boolean, is_public boolean)
returns smallint language sql immutable set search_path = '' as $$
  select (2*coalesce(mandal::int,0)+2*coalesce(exact_location::int,0)+2*coalesce(submitter::int,0)
    +2*coalesce(phone::int,0)+2*coalesce(images::int,0)+coalesce(is_public::int,0))::smallint;
$$;
create function private.status_for_score(score integer) returns text language sql immutable set search_path = '' as $$
  select case when score >= 7 then 'approved' when score >= 3 then 'manual_review' else 'rejected' end;
$$;
-- Only called by guarded moderation functions, never granted to clients.
create function private.sync_public_pandal(submission public.pandal_submissions) returns void
language plpgsql set search_path = '' as $$
begin
  if submission.status='approved' and submission.public_access then
    insert into public.pandals(id,source_submission_id,mandal_name,area,latitude,longitude,theme,description,ganapati_image_paths,pandal_image_paths,category)
    values(submission.id,submission.id,submission.mandal_name,submission.area,submission.latitude,submission.longitude,
      submission.theme,submission.description,submission.ganapati_image_paths,submission.pandal_image_paths,coalesce(submission.category,'community'))
    on conflict(id) do update set mandal_name=excluded.mandal_name,area=excluded.area,latitude=excluded.latitude,longitude=excluded.longitude,
      theme=excluded.theme,description=excluded.description,ganapati_image_paths=excluded.ganapati_image_paths,
      pandal_image_paths=excluded.pandal_image_paths,category=excluded.category;
  else delete from public.pandals where id=submission.id;
  end if;
end;
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('pandal-images','pandal-images',false,5242880,array['image/jpeg','image/png','image/webp']);

-- A parent row lock serializes uploads/deletes with finalization. No finalized evidence can race a score calculation.
create function private.can_write_draft_image(object_name text) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare parts text[]; draft_id uuid; owner_id uuid; draft_status text;
begin
  if auth.uid() is null then return false; end if;
  if object_name !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/(ganapati|pandal)/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$' then return false; end if;
  parts := string_to_array(object_name,'/');
  begin owner_id:=parts[1]::uuid; draft_id:=parts[2]::uuid; exception when invalid_text_representation then return false; end;
  if owner_id <> auth.uid() then return false; end if;
  select status into draft_status from public.pandal_submissions where id=draft_id and submitted_by=owner_id for update;
  return coalesce(draft_status='draft',false);
end;
$$;
create function private.can_read_pandal_image(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    private.is_admin()
    or exists(select 1 from public.pandal_submissions s where s.submitted_by=(select auth.uid()) and object_name like s.submitted_by::text || '/' || s.id::text || '/%')
    or exists(select 1 from public.pandals p where object_name=any(p.ganapati_image_paths) or object_name=any(p.pandal_image_paths))
  );
$$;
create policy gnm_image_upload on storage.objects for insert to authenticated with check(bucket_id='pandal-images' and private.can_write_draft_image(name));
create policy gnm_image_read on storage.objects for select to authenticated using(bucket_id='pandal-images' and private.can_read_pandal_image(name));
create policy gnm_image_delete on storage.objects for delete to authenticated using(bucket_id='pandal-images' and (private.can_write_draft_image(name) or (select private.is_admin())));

create function public.finalize_pandal_submission(p_submission_id uuid)
returns table(submission_id uuid, submission_status text, published boolean)
language plpgsql security definer set search_path = '' as $$
declare s public.pandal_submissions; ganapati text[]; decorations text[]; prefix text; duplicate_found boolean;
begin
  if auth.uid() is null then raise exception 'Sign in to submit a Ganapati.' using errcode='42501'; end if;
  select * into s from public.pandal_submissions where id=p_submission_id and submitted_by=auth.uid() for update;
  if not found then raise exception 'Submission not found.' using errcode='42501'; end if;
  if s.status <> 'draft' then
    return query select s.id,s.status,exists(select 1 from public.pandals where id=s.id); return;
  end if;
  prefix:=s.submitted_by::text || '/' || s.id::text || '/';
  if exists(select 1 from storage.objects o where o.bucket_id='pandal-images' and starts_with(o.name,prefix) and (
    o.metadata->>'mimetype' not in ('image/jpeg','image/png','image/webp')
    or coalesce((o.metadata->>'size')::bigint,0) not between 1 and 5242880
    or o.metadata->>'mimetype' is null
    or o.name !~ ('^' || prefix || '(ganapati|pandal)/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$')
  )) then raise exception 'An uploaded photo is invalid. Remove it and retry.' using errcode='22023'; end if;
  select coalesce(array_agg(o.name order by o.created_at,o.name),'{}') into ganapati from storage.objects o
    where o.bucket_id='pandal-images' and starts_with(o.name,prefix || 'ganapati/');
  select coalesce(array_agg(o.name order by o.created_at,o.name),'{}') into decorations from storage.objects o
    where o.bucket_id='pandal-images' and starts_with(o.name,prefix || 'pandal/');
  if cardinality(ganapati) not between 1 and 2 or cardinality(decorations) not between 1 and 3 then
    raise exception 'Upload 1–2 Ganapati photos and 1–3 decoration photos before submitting. Your draft is saved.' using errcode='22023';
  end if;
  s.verification_score:=private.submission_score(private.nontrivial_name(s.mandal_name,3),s.location is not null,
    private.nontrivial_name(s.submitter_name,2) and s.submitter_role in ('organizer','volunteer'),
    s.contact_phone ~ '^[6-9][0-9]{9}$',true,s.public_access);
  s.status:=private.status_for_score(s.verification_score);
  -- Serialize matching names so two simultaneous nearby submissions cannot both auto-publish.
  perform pg_advisory_xact_lock(hashtextextended(lower(regexp_replace(s.mandal_name,'[^[:alnum:]]','','g')),0));
  select exists(select 1 from public.pandal_submissions other where other.id<>s.id
    and other.status in ('approved','manual_review') and other.public_access and s.public_access
    and lower(regexp_replace(other.mandal_name,'[^[:alnum:]]','','g'))=lower(regexp_replace(s.mandal_name,'[^[:alnum:]]','','g'))
    and extensions.st_dwithin(other.location,s.location,100)) into duplicate_found;
  if duplicate_found then s.status:='manual_review'; end if;
  update public.pandal_submissions set verification_score=s.verification_score,status=s.status,
    category=case when s.status='approved' then 'community' else null end,
    possible_duplicate=duplicate_found,ganapati_image_paths=ganapati,pandal_image_paths=decorations,submitted_at=now()
    where id=s.id returning * into s;
  perform private.sync_public_pandal(s);
  return query select s.id,s.status,exists(select 1 from public.pandals where id=s.id);
end;
$$;

create function public.review_pandal_submission(p_submission_id uuid,p_decision text,p_notes text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.pandal_submissions;
begin
  if auth.uid() is null or not private.is_admin() then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if p_decision not in ('community','featured','reject') or p_decision is null then raise exception 'Invalid review decision.' using errcode='22023'; end if;
  if char_length(p_notes)>2000 then raise exception 'Review notes must be at most 2000 characters.' using errcode='22023'; end if;
  select * into s from public.pandal_submissions where id=p_submission_id for update;
  if not found or s.status='draft' then raise exception 'Only finalized submissions can be reviewed.' using errcode='22023'; end if;
  update public.pandal_submissions set status=case when p_decision='reject' then 'rejected' else 'approved' end,
    category=case when p_decision='reject' then null else p_decision end,
    reviewed_by=auth.uid(),reviewed_at=now(),review_notes=nullif(btrim(p_notes),'') where id=s.id returning * into s;
  perform private.sync_public_pandal(s);
end;
$$;

create function public.nearby_pandals(p_latitude double precision,p_longitude double precision,p_radius_km double precision)
returns table(id uuid,source_submission_id uuid,mandal_name text,area text,latitude double precision,longitude double precision,
  theme text,description text,ganapati_image_paths text[],pandal_image_paths text[],category text,created_at timestamptz,updated_at timestamptz,distance_meters double precision)
language plpgsql stable security invoker set search_path = '' as $$
declare point extensions.geography;
begin
  if auth.uid() is null then raise exception 'Sign in to explore.' using errcode='42501'; end if;
  if p_latitude is null or not(p_latitude between -90 and 90) or p_longitude is null or not(p_longitude between -180 and 180)
    or p_radius_km is null or p_radius_km not in (1,3,5,10) then raise exception 'Invalid location or radius.' using errcode='22023'; end if;
  point:=extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography;
  return query select p.id,p.source_submission_id,p.mandal_name,p.area,p.latitude,p.longitude,p.theme,p.description,
    p.ganapati_image_paths,p.pandal_image_paths,p.category,p.created_at,p.updated_at,extensions.st_distance(p.location,point)
    from public.pandals p where extensions.st_dwithin(p.location,point,p_radius_km*1000)
    order by extensions.st_distance(p.location,point),p.id;
end;
$$;

revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.is_admin(),private.can_write_draft_image(text),private.can_read_pandal_image(text) to authenticated;
revoke all on function public.finalize_pandal_submission(uuid),public.review_pandal_submission(uuid,text,text),public.nearby_pandals(double precision,double precision,double precision) from public,anon,authenticated;
grant execute on function public.finalize_pandal_submission(uuid),public.review_pandal_submission(uuid,text,text),public.nearby_pandals(double precision,double precision,double precision) to authenticated;
comment on schema private is 'Internal helpers; do not expose this schema through the Data API.';
