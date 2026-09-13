-- Controlled database/policy integration test. All users, roles, listings and object metadata are rolled back.
-- No actual Storage blobs are inserted through SQL.
begin;
do $test$
declare
  user_a uuid:=gen_random_uuid(); user_b uuid:=gen_random_uuid(); admin_id uuid:=gen_random_uuid();
  public_id uuid:=gen_random_uuid(); private_id uuid:=gen_random_uuid(); six_id uuid:=gen_random_uuid();
  seven_id uuid:=gen_random_uuid(); duplicate_id uuid:=gen_random_uuid(); far_id uuid:=gen_random_uuid();
  blocked boolean; result record; target uuid; item text; original_count integer; n integer;
  photo_a text; photo_b text;
begin
  select count(*) into original_count from public.profiles;
  insert into auth.users(id,aud,role,email,raw_user_meta_data,created_at,updated_at) values
    (user_a,'authenticated','authenticated','gnm-test-a-'||user_a||'@example.invalid','{"full_name":"Test User A"}',now(),now()),
    (user_b,'authenticated','authenticated','gnm-test-b-'||user_b||'@example.invalid','{"full_name":"Test User B"}',now(),now()),
    (admin_id,'authenticated','authenticated','gnm-test-admin-'||admin_id||'@example.invalid','{"full_name":"Test Admin"}',now(),now());
  insert into public.user_roles(user_id,role) values(admin_id,'admin');
  update auth.users set email_confirmed_at = now() where id = admin_id;
  insert into private.admin_identity(singleton,user_id,email)
    select true,id,lower(email) from auth.users where id=admin_id
    on conflict(singleton) do update set user_id=excluded.user_id,email=excluded.email;
  if not coalesce(((select count(*) from public.profiles)=original_count+3),false) then raise exception 'FAILED: profile trigger'; end if;
  if not coalesce((private.submission_score(true,false,false,false,false,false)=2),false) then raise exception 'FAILED: score 2'; end if;
  if not coalesce((private.submission_score(true,false,false,false,false,true)=3),false) then raise exception 'FAILED: score 3'; end if;
  if not coalesce((private.submission_score(true,true,true,false,false,false)=6),false) then raise exception 'FAILED: score 6'; end if;
  if not coalesce((private.submission_score(true,true,true,false,false,true)=7),false) then raise exception 'FAILED: score 7'; end if;
  if not coalesce((private.submission_score(true,true,true,true,true,true)=11),false) then raise exception 'FAILED: score 11'; end if;
  for n in 0..11 loop
    if not coalesce((private.status_for_score(n)=case when n>=7 then 'approved' when n>=3 then 'manual_review' else 'rejected' end),false) then raise exception 'FAILED: every backend status threshold'; end if;
  end loop;
  if not coalesce((private.nontrivial_name('श्री गणेश मंडळ',3) and private.nontrivial_name('मीरा जोशी',2)),false) then raise exception 'FAILED: Unicode names'; end if;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',user_a,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  if not coalesce((current_user='authenticated'),false) then raise exception 'FAILED: role emulation actually active'; end if;
  if not coalesce(((select count(*) from public.profiles)=1),false) then raise exception 'FAILED: profiles ownership'; end if;
  update public.profiles set full_name='Updated User A' where id=user_a;
  if not coalesce(((select full_name from public.profiles where id=user_a)='Updated User A'),false) then raise exception 'FAILED: profile name update'; end if;
  blocked:=false; begin update public.profiles set id=user_b where id=user_a; exception when insufficient_privilege then blocked:=true; end; if not coalesce((blocked),false) then raise exception 'FAILED: profile ID immutable'; end if;
  blocked:=false; begin insert into public.user_roles(user_id,role) values(user_a,'admin'); exception when insufficient_privilege then blocked:=true; end; if not coalesce((blocked),false) then raise exception 'FAILED: cannot self-promote'; end if;
  if not coalesce((not private.is_admin()),false) then raise exception 'FAILED: no metadata admin bypass'; end if;
  blocked:=false; begin select public.review_pandal_submission(public_id,'featured'); exception when insufficient_privilege then blocked:=true; end; if not coalesce((blocked),false) then raise exception 'FAILED: regular user cannot moderate'; end if;
  blocked:=false; begin insert into public.pandals(id,source_submission_id,mandal_name,area,latitude,longitude,ganapati_image_paths,pandal_image_paths,category) values(public_id,public_id,'bad','',0,0,'{}','{}','featured'); exception when insufficient_privilege then blocked:=true; end; if not coalesce((blocked),false) then raise exception 'FAILED: no client publication'; end if;
  blocked:=false; begin insert into public.pandal_submissions(id,submitted_by,mandal_name,latitude,longitude) values(public_id,user_b,'Spoofed',0,0); exception when insufficient_privilege then blocked:=true; end; if not coalesce((blocked),false) then raise exception 'FAILED: cannot spoof owner'; end if;
  blocked:=false; begin insert into public.pandal_submissions(id,mandal_name,latitude,longitude,status,verification_score,category) values(public_id,'Forged',0,0,'approved',11,'featured'); exception when insufficient_privilege then blocked:=true; end; if not coalesce((blocked),false) then raise exception 'FAILED: cannot insert moderation fields'; end if;
  blocked:=false; begin insert into public.pandal_submissions(mandal_name,latitude,longitude) values('Invalid coordinates',91,0); exception when check_violation then blocked:=true; end; if not coalesce((blocked),false) then raise exception 'FAILED: invalid latitude rejected'; end if;
  blocked:=false; begin insert into public.pandal_submissions(mandal_name,latitude,longitude,contact_phone) values('Invalid phone',0,0,'abc9876543210'); exception when invalid_parameter_value then blocked:=true; end; if not coalesce((blocked),false) then raise exception 'FAILED: invalid nonempty phone rejected'; end if;
  insert into public.pandal_submissions(id,mandal_name,area,latitude,longitude,submitter_name,submitter_role,contact_phone,public_access)
    values(public_id,'Policy Test Mandal','Nagpur',21.1458,79.0882,'Meera Joshi','volunteer','+91 98765 43210',true),
      (private_id,'Private Test Mandal','Nagpur',21.1458,79.0882,'Meera Joshi','organizer','9876543210',false),
      (six_id,'Score Six Mandal','Nagpur',21.16,79.10,'',null,'',false),
      (seven_id,'Score Seven Mandal','Nagpur',21.1658,79.0882,'',null,'',true),
      (duplicate_id,'Policy Test Mandal','Nagpur',21.14581,79.08821,'Meera Joshi','volunteer','9876543210',true),
      (far_id,'Far Away Mandal','Elsewhere',22.1458,79.0882,'Meera Joshi','volunteer','9876543210',true);
  if not coalesce(((select contact_phone from public.pandal_submissions where id=public_id)='9876543210'),false) then raise exception 'FAILED: phone canonical 10 digits'; end if;
  blocked:=false; begin update public.pandal_submissions set verification_score=11,status='approved',category='featured' where id=public_id; exception when insufficient_privilege then blocked:=true; end; if not coalesce((blocked),false) then raise exception 'FAILED: no score status category updates'; end if;
  blocked:=false; begin perform public.finalize_pandal_submission(public_id); exception when invalid_parameter_value then blocked:=true; end; if not coalesce((blocked),false) then raise exception 'FAILED: missing photos remain draft'; end if;
  if not coalesce(((select status from public.pandal_submissions where id=public_id)='draft'),false) then raise exception 'FAILED: failed finalization retains draft'; end if;
  photo_a:=user_a::text||'/'||public_id::text||'/ganapati/'||gen_random_uuid()::text||'.png';
  photo_b:=user_a::text||'/'||public_id::text||'/pandal/'||gen_random_uuid()::text||'.png';
  if not coalesce((private.can_write_draft_image(photo_a)),false) then raise exception 'FAILED: own draft upload permission'; end if;
  if not coalesce((not private.can_write_draft_image(user_b::text||'/'||public_id::text||'/ganapati/'||gen_random_uuid()::text||'.png')),false) then raise exception 'FAILED: other folder upload denied'; end if;
  if not coalesce((not private.can_write_draft_image('bad/path.png')),false) then raise exception 'FAILED: malformed path denied'; end if;
  insert into storage.objects(bucket_id,name,metadata) values('pandal-images',photo_a,'{"mimetype":"image/png","size":100}');
  blocked:=false; begin perform public.finalize_pandal_submission(public_id); exception when invalid_parameter_value then blocked:=true; end; if not coalesce((blocked),false) then raise exception 'FAILED: one photo group is insufficient'; end if;
  insert into storage.objects(bucket_id,name,metadata) values('pandal-images',photo_b,'{"mimetype":"image/png","size":100}');
  foreach target in array array[private_id,six_id,seven_id,duplicate_id,far_id] loop
    foreach item in array array['ganapati','pandal'] loop
      insert into storage.objects(bucket_id,name,metadata) values('pandal-images',user_a::text||'/'||target::text||'/'||item||'/'||gen_random_uuid()::text||'.png','{"mimetype":"image/png","size":100}');
    end loop;
  end loop;
  if not coalesce(((select count(*) from storage.objects where bucket_id='pandal-images' and name in (photo_a,photo_b))=2),false) then raise exception 'FAILED: owner reads pending photos'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',user_b,'role','authenticated')::text,true);
  if not coalesce(((select count(*) from public.pandal_submissions)=0),false) then raise exception 'FAILED: B cannot read A submissions or contact'; end if;
  if not coalesce(((select count(*) from storage.objects where bucket_id='pandal-images' and name in (photo_a,photo_b))=0),false) then raise exception 'FAILED: B cannot read pending A images'; end if;
  blocked:=false; begin perform public.finalize_pandal_submission(public_id); exception when insufficient_privilege then blocked:=true; end; if not coalesce((blocked),false) then raise exception 'FAILED: B cannot finalize A draft'; end if;
  blocked:=false; begin insert into storage.objects(bucket_id,name,metadata) values('pandal-images',user_a::text||'/'||public_id::text||'/ganapati/'||gen_random_uuid()::text||'.png','{}'); exception when insufficient_privilege then blocked:=true; end; if not coalesce((blocked),false) then raise exception 'FAILED: B cannot upload in A folder'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  if not coalesce((private.is_admin()),false) then raise exception 'FAILED: verified admin'; end if;
  if not coalesce(((select count(*) from public.profiles)=original_count+3),false) then raise exception 'FAILED: admin total users'; end if;
  if not coalesce(((select count(*) from storage.objects where name in(photo_a,photo_b))=2),false) then raise exception 'FAILED: admin pending images'; end if;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',user_a,'role','authenticated')::text,true);
  select * into result from public.finalize_pandal_submission(public_id);
  if not coalesce((result.submission_status='approved' and result.published),false) then raise exception 'FAILED: score11 auto-publication'; end if;
  if not coalesce(((select verification_score from public.pandal_submissions where id=public_id)=11),false) then raise exception 'FAILED: actual backend score11'; end if;
  perform public.finalize_pandal_submission(public_id);
  if not coalesce(((select count(*) from public.pandals where id=public_id)=1),false) then raise exception 'FAILED: idempotent finalization'; end if;
  if not coalesce((not private.can_write_draft_image(photo_a)),false) then raise exception 'FAILED: finalized evidence locked'; end if;
  begin delete from storage.objects where bucket_id='pandal-images' and name=photo_a; exception when insufficient_privilege then null; end;
  if not coalesce(((select count(*) from storage.objects where name=photo_a)=1),false) then raise exception 'FAILED: cannot delete finalized photo'; end if;
  update storage.objects set name=name||'changed' where bucket_id='pandal-images' and name=photo_a;
  if not exists(select 1 from storage.objects where name=photo_a) then raise exception 'FAILED: finalized photo overwritten'; end if;
  delete from public.pandal_submissions where id=public_id;
  if not coalesce(((select count(*) from public.pandal_submissions where id=public_id)=1),false) then raise exception 'FAILED: cannot delete finalized submission'; end if;
  select * into result from public.finalize_pandal_submission(private_id);
  if not coalesce((result.submission_status='approved' and not result.published),false) then raise exception 'FAILED: private approved never public'; end if;
  if not coalesce(((select verification_score from public.pandal_submissions where id=private_id)=10),false) then raise exception 'FAILED: private score10 preserved'; end if;
  select * into result from public.finalize_pandal_submission(six_id);
  if not coalesce((result.submission_status='manual_review' and not result.published),false) then raise exception 'FAILED: actual score6 not approved'; end if;
  select * into result from public.finalize_pandal_submission(seven_id);
  if not coalesce((result.submission_status='approved' and result.published),false) then raise exception 'FAILED: actual score7 approved'; end if;
  select * into result from public.finalize_pandal_submission(duplicate_id);
  if not coalesce((result.submission_status='manual_review' and not result.published),false) then raise exception 'FAILED: obvious duplicate awaits manual review'; end if;
  if not coalesce(((select possible_duplicate from public.pandal_submissions where id=duplicate_id)),false) then raise exception 'FAILED: duplicate flag'; end if;
  perform public.finalize_pandal_submission(far_id);
  if not coalesce(((select distance_meters < 1 from public.nearby_pandals(21.1458,79.0882,5) where id=public_id)),false) then raise exception 'FAILED: nearby center distance'; end if;
  if not coalesce(((select distance_meters between 2200 and 2250 from public.nearby_pandals(21.1458,79.0882,5) where id=seven_id)),false) then raise exception 'FAILED: PostGIS known distance'; end if;
  if not coalesce((not exists(select 1 from public.nearby_pandals(21.1458,79.0882,5) where id=far_id)),false) then raise exception 'FAILED: far excluded'; end if;
  blocked:=false; begin perform public.nearby_pandals(91,79,5); exception when invalid_parameter_value then blocked:=true; end; if not coalesce((blocked),false) then raise exception 'FAILED: nearby invalid coordinates'; end if;
  blocked:=false; begin perform public.nearby_pandals(21,79,500); exception when invalid_parameter_value then blocked:=true; end; if not coalesce((blocked),false) then raise exception 'FAILED: nearby invalid radius'; end if;
  insert into public.saved_pandals(user_id,pandal_id) values(user_a,public_id);
  blocked:=false; begin insert into public.saved_pandals(user_id,pandal_id) values(user_b,public_id); exception when insufficient_privilege then blocked:=true; end; if not coalesce((blocked),false) then raise exception 'FAILED: cannot save for B'; end if;
  blocked:=false; begin insert into public.saved_pandals(user_id,pandal_id) values(user_a,private_id); exception when foreign_key_violation then blocked:=true; end; if not coalesce((blocked),false) then raise exception 'FAILED: cannot save unpublished'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',user_b,'role','authenticated')::text,true);
  if not coalesce(((select count(*) from public.saved_pandals)=0),false) then raise exception 'FAILED: B cannot see A saves'; end if;
  delete from public.saved_pandals where user_id=user_a;
  if not coalesce(((select count(*) from storage.objects where name in(photo_a,photo_b))=2),false) then raise exception 'FAILED: B can read published image paths'; end if;
  if not coalesce((not private.can_read_pandal_image(user_a::text||'/'||private_id::text||'/ganapati/unknown.png')),false) then raise exception 'FAILED: private approved images still hidden'; end if;
  insert into public.saved_pandals(user_id,pandal_id) values(user_b,public_id);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',user_a,'role','authenticated')::text,true);
  if not coalesce(((select count(*) from public.saved_pandals)=1),false) then raise exception 'FAILED: B could not delete A save'; end if;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  perform public.review_pandal_submission(duplicate_id,'community','Reviewed duplicate location manually');
  if not coalesce(((select category from public.pandals where id=duplicate_id)='community'),false) then raise exception 'FAILED: admin manual publication'; end if;
  perform public.review_pandal_submission(duplicate_id,'featured','Featured after review');
  if not coalesce(((select category from public.pandals where id=duplicate_id)='featured'),false) then raise exception 'FAILED: admin promotes existing approval'; end if;
  if not coalesce(((select reviewed_by=admin_id and reviewed_at is not null and review_notes='Featured after review' from public.pandal_submissions where id=duplicate_id)),false) then raise exception 'FAILED: admin audit metadata'; end if;
  perform public.review_pandal_submission(private_id,'featured');
  if not coalesce((not exists(select 1 from public.pandals where id=private_id)),false) then raise exception 'FAILED: admin cannot publish private'; end if;
  perform public.review_pandal_submission(public_id,'reject','Not eligible');
  if not coalesce((not exists(select 1 from public.pandals where id=public_id)),false) then raise exception 'FAILED: rejection removes publication'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',user_b,'role','authenticated')::text,true);
  if not coalesce((not exists(select 1 from public.saved_pandals where pandal_id=public_id)),false) then raise exception 'FAILED: rejection cascades saved references'; end if;
  if not coalesce(((select count(*) from storage.objects where name in(photo_a,photo_b))=0),false) then raise exception 'FAILED: rejected photos hidden again'; end if;
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  execute 'set local role anon';
  blocked:=false; begin perform count(*) from public.pandals; exception when insufficient_privilege then blocked:=true; end; if not coalesce((blocked),false) then raise exception 'FAILED: anonymous table access denied'; end if;
  blocked:=false; begin perform public.finalize_pandal_submission(public_id); exception when insufficient_privilege then blocked:=true; end; if not coalesce((blocked),false) then raise exception 'FAILED: anonymous RPC denied'; end if;
  execute 'reset role';
  if not coalesce((not exists(select 1 from information_schema.columns where table_schema='public' and table_name='pandals' and column_name in('contact_phone','submitter_name','submitter_role','review_notes','submitted_by'))),false) then raise exception 'FAILED: public table contains no private fields'; end if;
end;
$test$;
rollback;
select 'PASS: profile, ownership, grants, Storage RLS, immutable evidence, score boundaries, duplicate detection, admin review, saves and PostGIS. All fixtures rolled back.' as result;
