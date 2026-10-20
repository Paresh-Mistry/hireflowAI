-- HireFlow AI — core schema, RLS, triggers, RPCs.
-- Single-organization model: every authenticated user with a profile row is a workspace member.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  role text not null default 'recruiter' check (role in ('admin', 'recruiter', 'hiring_manager')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Every new auth user becomes a workspace member.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Membership check used by every policy.
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid());
$$;

-- ---------------------------------------------------------------- jobs
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 160),
  department text,
  location text,
  employment_type text not null default 'full-time'
    check (employment_type in ('full-time', 'part-time', 'internship', 'contract', 'other')),
  description text not null default '',
  requirements jsonb not null default '{"skills": [], "min_experience_years": null, "notes": ""}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_status_idx on public.jobs (status);
create index jobs_created_by_idx on public.jobs (created_by);
create index jobs_created_at_idx on public.jobs (created_at desc);
create trigger jobs_updated before update on public.jobs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- candidates
create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text,
  location text,
  current_title text,
  experience_years numeric(4, 1) check (experience_years is null or experience_years between 0 and 60),
  skills jsonb not null default '[]'::jsonb check (jsonb_typeof(skills) = 'array'),
  linkedin_url text,
  portfolio_url text,
  resume_path text,
  resume_filename text,
  resume_uploaded_at timestamptz,
  resume_text text,
  resume_md5 text generated always as (md5(resume_text)) stored,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index candidates_email_unique on public.candidates (lower(email));
create index candidates_created_at_idx on public.candidates (created_at desc);
create index candidates_created_by_idx on public.candidates (created_by);
create index candidates_name_idx on public.candidates (lower(full_name));
create trigger candidates_updated before update on public.candidates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- applications
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete restrict,
  stage text not null default 'applied'
    check (stage in ('applied', 'screening', 'interview', 'offer', 'hired', 'rejected')),
  source text,
  applied_at timestamptz not null default now(),
  last_stage_changed_at timestamptz not null default now(),
  rejection_reason text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_unique_candidate_job unique (candidate_id, job_id)
);
create index applications_candidate_idx on public.applications (candidate_id);
create index applications_job_idx on public.applications (job_id);
create index applications_stage_idx on public.applications (stage);
create index applications_applied_at_idx on public.applications (applied_at desc);
create index applications_created_by_idx on public.applications (created_by);
create trigger applications_updated before update on public.applications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- notes
create table public.candidate_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_application_idx on public.candidate_notes (application_id, created_at desc);
create index notes_author_idx on public.candidate_notes (author_id);
create trigger notes_updated before update on public.candidate_notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- activity logs
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null
    check (event_type in ('application_created', 'stage_changed', 'note_added', 'resume_updated', 'ai_analysis_completed')),
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_application_idx on public.activity_logs (application_id, created_at desc);
create index activity_created_idx on public.activity_logs (created_at desc);
create index activity_actor_idx on public.activity_logs (actor_id);
create index activity_stage_events_idx on public.activity_logs ((metadata ->> 'to'), created_at)
  where event_type = 'stage_changed';

-- ---------------------------------------------------------------- ai analyses
create table public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  provider text not null,
  model text,
  result jsonb not null,
  resume_hash text,
  job_description_hash text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create index ai_application_idx on public.ai_analyses (application_id, created_at desc);
create index ai_job_idx on public.ai_analyses (job_id);
create index ai_created_by_idx on public.ai_analyses (created_by, created_at desc);

-- ---------------------------------------------------------------- activity triggers
-- Activity is written only by trusted database logic (SECURITY DEFINER), never directly by clients.
-- Seed scripts set `app.seeding = 'on'` to supply their own back-dated history.
create or replace function public.log_activity(
  p_application uuid, p_actor uuid, p_type text, p_desc text, p_meta jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('app.seeding', true), '') = 'on' then return; end if;
  insert into public.activity_logs (application_id, actor_id, event_type, description, metadata)
  values (p_application, p_actor, p_type, p_desc, p_meta);
end $$;

create or replace function public.trg_application_created() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_job text;
begin
  select title into v_job from public.jobs where id = new.job_id;
  perform public.log_activity(new.id, new.created_by, 'application_created',
    'Applied for ' || coalesce(v_job, 'a role'), jsonb_build_object('job_id', new.job_id));
  return new;
end $$;
create trigger applications_after_insert after insert on public.applications
  for each row execute function public.trg_application_created();

create or replace function public.trg_application_stage() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.stage is distinct from old.stage then
    new.last_stage_changed_at = now();
    if new.stage <> 'rejected' then new.rejection_reason = null; end if;
    perform public.log_activity(new.id, auth.uid(), 'stage_changed',
      'Moved from ' || initcap(old.stage) || ' to ' || initcap(new.stage),
      jsonb_build_object('from', old.stage, 'to', new.stage));
  end if;
  return new;
end $$;
create trigger applications_before_update before update on public.applications
  for each row execute function public.trg_application_stage();

create or replace function public.trg_note_added() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.log_activity(new.application_id, new.author_id, 'note_added', 'Recruiter note added',
    jsonb_build_object('note_id', new.id));
  return new;
end $$;
create trigger notes_after_insert after insert on public.candidate_notes
  for each row execute function public.trg_note_added();

create or replace function public.trg_ai_completed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.log_activity(new.application_id, new.created_by, 'ai_analysis_completed',
    'AI analysis completed', jsonb_build_object('analysis_id', new.id, 'provider', new.provider));
  return new;
end $$;
create trigger ai_after_insert after insert on public.ai_analyses
  for each row execute function public.trg_ai_completed();

create or replace function public.trg_resume_updated() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.resume_path is distinct from old.resume_path and new.resume_path is not null then
    for r in select id from public.applications where candidate_id = new.id loop
      perform public.log_activity(r.id, auth.uid(), 'resume_updated', 'Resume updated',
        jsonb_build_object('filename', new.resume_filename));
    end loop;
  end if;
  return new;
end $$;
create trigger candidates_after_update after update on public.candidates
  for each row execute function public.trg_resume_updated();

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.candidates enable row level security;
alter table public.applications enable row level security;
alter table public.candidate_notes enable row level security;
alter table public.activity_logs enable row level security;
alter table public.ai_analyses enable row level security;

-- profiles: members can read teammates; each user edits only their own row.
create policy profiles_select on public.profiles for select to authenticated using (public.is_member());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- jobs
create policy jobs_select on public.jobs for select to authenticated using (public.is_member());
create policy jobs_insert on public.jobs for insert to authenticated
  with check (public.is_member() and created_by = auth.uid());
create policy jobs_update on public.jobs for update to authenticated
  using (public.is_member()) with check (public.is_member());
create policy jobs_delete on public.jobs for delete to authenticated
  using (public.is_member() and created_by = auth.uid());

-- candidates
create policy candidates_select on public.candidates for select to authenticated using (public.is_member());
create policy candidates_insert on public.candidates for insert to authenticated
  with check (public.is_member() and created_by = auth.uid());
create policy candidates_update on public.candidates for update to authenticated
  using (public.is_member()) with check (public.is_member());
create policy candidates_delete on public.candidates for delete to authenticated
  using (public.is_member() and created_by = auth.uid());

-- applications
create policy applications_select on public.applications for select to authenticated using (public.is_member());
create policy applications_insert on public.applications for insert to authenticated
  with check (
    public.is_member() and created_by = auth.uid()
    and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'open')
  );
create policy applications_update on public.applications for update to authenticated
  using (public.is_member()) with check (public.is_member());
create policy applications_delete on public.applications for delete to authenticated
  using (public.is_member() and created_by = auth.uid());

-- notes follow the parent application; only the author edits/deletes.
create policy notes_select on public.candidate_notes for select to authenticated
  using (public.is_member() and exists (select 1 from public.applications a where a.id = application_id));
create policy notes_insert on public.candidate_notes for insert to authenticated
  with check (public.is_member() and author_id = auth.uid()
    and exists (select 1 from public.applications a where a.id = application_id));
create policy notes_update on public.candidate_notes for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy notes_delete on public.candidate_notes for delete to authenticated
  using (author_id = auth.uid());

-- activity: read-only for clients (writes come from SECURITY DEFINER triggers).
create policy activity_select on public.activity_logs for select to authenticated
  using (public.is_member() and exists (select 1 from public.applications a where a.id = application_id));

-- AI analyses follow the parent application. Inserts only for your own rows.
create policy ai_select on public.ai_analyses for select to authenticated
  using (public.is_member() and exists (select 1 from public.applications a where a.id = application_id));
create policy ai_insert on public.ai_analyses for insert to authenticated
  with check (public.is_member() and created_by = auth.uid()
    and exists (select 1 from public.applications a where a.id = application_id and a.job_id = ai_analyses.job_id));

-- Helper: schema-qualified grants (RLS does the real filtering).
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.activity_logs from authenticated;

-- ---------------------------------------------------------------- RPC: candidate directory
create or replace function public.candidate_directory(
  p_q text default null, p_stage text default null, p_job uuid default null,
  p_location text default null, p_from date default null, p_to date default null,
  p_skill text default null, p_sort text default 'recent',
  p_limit int default 10, p_offset int default 0
) returns table (
  id uuid, full_name text, email text, current_title text, location text,
  skills jsonb, created_at timestamptz, applications jsonb, total_count bigint
) language sql stable security invoker set search_path = public as $$
  with filtered as (
    select c.*,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', a.id, 'job_id', j.id, 'job_title', j.title, 'stage', a.stage, 'applied_at', a.applied_at
        ) order by a.applied_at desc)
        from public.applications a join public.jobs j on j.id = a.job_id
        where a.candidate_id = c.id
      ), '[]'::jsonb) as apps
    from public.candidates c
    where (coalesce(p_q, '') = '' or c.full_name ilike '%' || p_q || '%'
        or c.email ilike '%' || p_q || '%'
        or coalesce(c.current_title, '') ilike '%' || p_q || '%'
        or c.skills::text ilike '%' || p_q || '%'
        or exists (select 1 from public.applications a2 join public.jobs j2 on j2.id = a2.job_id
                   where a2.candidate_id = c.id and j2.title ilike '%' || p_q || '%'))
      and (coalesce(p_location, '') = '' or coalesce(c.location, '') ilike '%' || p_location || '%')
      and (coalesce(p_skill, '') = '' or c.skills::text ilike '%' || p_skill || '%')
      and ((p_stage is null and p_job is null and p_from is null and p_to is null)
        or exists (select 1 from public.applications a3
                   where a3.candidate_id = c.id
                     and (p_stage is null or a3.stage = p_stage)
                     and (p_job is null or a3.job_id = p_job)
                     and (p_from is null or a3.applied_at::date >= p_from)
                     and (p_to is null or a3.applied_at::date <= p_to)))
  )
  select f.id, f.full_name, f.email, f.current_title, f.location, f.skills, f.created_at, f.apps,
         count(*) over () as total_count
  from filtered f
  order by
    (case when p_sort = 'name' then f.full_name end) asc nulls last,
    (case when p_sort = 'experience' then f.experience_years end) desc nulls last,
    (case when p_sort = 'oldest' then f.created_at end) asc,
    f.created_at desc
  limit greatest(p_limit, 1) offset greatest(p_offset, 0);
$$;

-- ---------------------------------------------------------------- RPC: dashboard
-- Metric definitions:
--   total_candidates     = rows in candidates
--   active_jobs          = jobs with status 'open'
--   active_applications  = applications not in hired/rejected
--   hires_in_period      = distinct applications that ENTERED 'hired' within the window
--                          (from stage_changed activity), compared to the previous equal window.
create or replace function public.dashboard_stats(p_days int default 30)
returns jsonb language sql stable security invoker set search_path = public as $$
  with params as (
    select now() - make_interval(days => p_days) as cur_start,
           now() - make_interval(days => p_days * 2) as prev_start
  )
  select jsonb_build_object(
    'total_candidates', (select count(*) from public.candidates),
    'active_jobs', (select count(*) from public.jobs where status = 'open'),
    'active_applications', (select count(*) from public.applications where stage not in ('hired', 'rejected')),
    'total_applications', (select count(*) from public.applications),
    'hires_current', (select count(distinct application_id) from public.activity_logs, params
                      where event_type = 'stage_changed' and metadata ->> 'to' = 'hired' and created_at >= params.cur_start),
    'hires_previous', (select count(distinct application_id) from public.activity_logs, params
                       where event_type = 'stage_changed' and metadata ->> 'to' = 'hired'
                         and created_at >= params.prev_start and created_at < params.cur_start),
    'applications_current', (select count(*) from public.applications, params where applied_at >= params.cur_start),
    'applications_previous', (select count(*) from public.applications, params
                              where applied_at >= params.prev_start and applied_at < params.cur_start),
    'stage_counts', coalesce((select jsonb_object_agg(stage, n) from (
                      select stage, count(*) n from public.applications group by stage) s), '{}'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', d.day, 'count', coalesce(x.n, 0)) order by d.day)
                       from (select generate_series((current_date - (p_days - 1)), current_date, '1 day')::date as day) d
                       left join (select applied_at::date as day, count(*) n from public.applications
                                  where applied_at >= current_date - (p_days - 1) group by 1) x on x.day = d.day), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------------- Storage (private resumes)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880,
  array['application/pdf', 'text/plain'])
on conflict (id) do update set public = false, file_size_limit = 5242880;

create policy resumes_select on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and public.is_member());
create policy resumes_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and public.is_member() and owner = auth.uid());
create policy resumes_update on storage.objects for update to authenticated
  using (bucket_id = 'resumes' and owner = auth.uid());
create policy resumes_delete on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and owner = auth.uid());
