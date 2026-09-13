-- CLI-created migration, filename aligned to the version recorded by Supabase MCP.
-- Keep privilege elevation behind an unexposed schema. Public RPCs are invokers.
alter function public.finalize_pandal_submission(uuid) set schema private;
alter function public.review_pandal_submission(uuid,text,text) set schema private;
create function public.finalize_pandal_submission(p_submission_id uuid)
returns table(submission_id uuid,submission_status text,published boolean)
language sql security invoker set search_path='' as $$
  select * from private.finalize_pandal_submission(p_submission_id);
$$;
create function public.review_pandal_submission(p_submission_id uuid,p_decision text,p_notes text default null)
returns void language sql security invoker set search_path='' as $$
  select private.review_pandal_submission(p_submission_id,p_decision,p_notes);
$$;
revoke all on function public.finalize_pandal_submission(uuid),public.review_pandal_submission(uuid,text,text) from public,anon,authenticated;
grant execute on function public.finalize_pandal_submission(uuid),public.review_pandal_submission(uuid,text,text) to authenticated;
revoke all on function public.rls_auto_enable() from public,anon,authenticated;
