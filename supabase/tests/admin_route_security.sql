-- All identities, role bindings and quota counters are rolled back.
begin;
do $test$
declare
  owner_id uuid := gen_random_uuid(); other_id uuid := gen_random_uuid();
  n integer; retry integer; blocked boolean;
begin
  insert into auth.users(id,aud,role,email,email_confirmed_at,raw_user_meta_data,created_at,updated_at) values
    (owner_id,'authenticated','authenticated',owner_id::text||'@example.invalid',now(),'{}',now(),now()),
    (other_id,'authenticated','authenticated',other_id::text||'@example.invalid',now(),'{"role":"admin"}',now(),now());
  insert into public.user_roles(user_id,role) values(owner_id,'admin'),(other_id,'admin');
  insert into private.admin_identity(singleton,user_id,email)
    values(true,owner_id,owner_id::text||'@example.invalid')
    on conflict(singleton) do update set user_id=excluded.user_id,email=excluded.email;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',other_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  if public.can_access_admin() then raise exception 'Another identity gained admin access'; end if;
  blocked := false;
  begin update private.admin_identity set user_id=other_id; exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Client modified designated admin'; end if;
  for n in 1..10 loop
    if public.consume_route_request() <> 0 then raise exception 'Initial route quota rejected'; end if;
  end loop;
  retry := public.consume_route_request();
  if retry < 1 or retry > 60 then raise exception 'Minute quota was not enforced'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  if not public.can_access_admin() then raise exception 'Designated administrator denied'; end if;
  if public.consume_route_request() <> 0 then raise exception 'Accounts shared route quota'; end if;
  execute 'reset role';
  update private.route_request_limits set minute_window=minute_window-1, day_count=100 where user_id=owner_id;
  execute 'set local role authenticated';
  retry := public.consume_route_request();
  if retry < 1 or retry > 86400 then raise exception 'Day quota was not enforced'; end if;
  execute 'reset role';
  update private.route_request_limits set day_window=day_window-1 where user_id=owner_id;
  update auth.users set email_confirmed_at=null where id=owner_id;
  execute 'set local role authenticated';
  if public.consume_route_request() <> 0 then raise exception 'New day quota did not reset'; end if;
  if public.can_access_admin() then raise exception 'Unverified email retained admin access'; end if;
  execute 'reset role';
  update auth.users set email_confirmed_at=now(), email='changed-'||owner_id::text||'@example.invalid' where id=owner_id;
  execute 'set local role authenticated';
  if public.can_access_admin() then raise exception 'Changed email retained admin access'; end if;
  blocked := false;
  begin select day_count into n from private.route_request_limits where user_id=other_id; exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Client read private quota counters'; end if;
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  execute 'set local role anon';
  blocked := false;
  begin perform public.consume_route_request(); exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Anonymous user called quota function'; end if;
  execute 'reset role';
end;
$test$;
rollback;
