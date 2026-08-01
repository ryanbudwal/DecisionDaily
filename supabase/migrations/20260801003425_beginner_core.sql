-- DecisionLab V1: profiles, broader challenge categories, and dedicated scores.
-- This migration is additive so the existing daily challenge and archive remain live.

create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 3 and 30),
  avatar_url text,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_completed_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (longest_streak >= current_streak)
);

create unique index profiles_username_lower_idx on public.profiles (lower(username));

alter table public.profiles enable row level security;

create policy "users read their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "users update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke all on public.profiles from anon;
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (username, avatar_url) on public.profiles to authenticated;

create or replace function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    'player_' || substring(replace(new.id::text, '-', '') from 1 for 10)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function private.create_profile_for_new_user() from public, anon, authenticated;

drop trigger if exists decisionlab_create_profile on auth.users;
create trigger decisionlab_create_profile
after insert on auth.users
for each row execute function private.create_profile_for_new_user();

insert into public.profiles (id, username)
select
  users.id,
  'player_' || substring(replace(users.id::text, '-', '') from 1 for 10)
from auth.users as users
on conflict (id) do nothing;

alter table public.daily_challenges
drop constraint daily_challenges_category_check;

alter table public.daily_challenges
add constraint daily_challenges_category_check
check (category in (
  'economics',
  'investing',
  'personal-finance',
  'business',
  'real-estate',
  'crypto',
  'markets',
  'entrepreneurship'
));

create table public.scores (
  id bigint generated always as identity primary key,
  submission_id bigint not null unique references public.challenge_submissions(id) on delete cascade,
  reasoning_score smallint not null check (reasoning_score between 0 and 30),
  risk_score smallint not null check (risk_score between 0 and 25),
  falsifiability_score smallint not null check (falsifiability_score between 0 and 20),
  position_sizing_score smallint not null check (position_sizing_score between 0 and 15),
  confidence_score smallint not null check (confidence_score between 0 and 10),
  overall_score smallint not null check (overall_score between 0 and 100),
  scoring_breakdown jsonb not null default '{}'::jsonb,
  rubric_version integer not null default 1 check (rubric_version > 0),
  created_at timestamptz not null default now(),
  check (
    overall_score = reasoning_score
      + risk_score
      + falsifiability_score
      + position_sizing_score
      + confidence_score
  )
);

alter table public.scores enable row level security;

create policy "users read scores for their own submissions"
on public.scores for select
to authenticated
using (
  exists (
    select 1
    from public.challenge_submissions as submission
    where submission.id = scores.submission_id
      and submission.user_id = (select auth.uid())
  )
);

revoke all on public.scores from anon;
revoke all on public.scores from authenticated;
grant select on public.scores to authenticated;

create or replace function private.persist_submission_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is distinct from (select auth.uid()) then
    raise exception 'submission user must match the authenticated user';
  end if;

  insert into public.scores (
    submission_id,
    reasoning_score,
    risk_score,
    falsifiability_score,
    position_sizing_score,
    confidence_score,
    overall_score,
    scoring_breakdown
  )
  values (
    new.id,
    coalesce((new.scoring_breakdown -> 'reasoning' ->> 'score')::smallint, 0),
    coalesce((new.scoring_breakdown -> 'risk_management' ->> 'score')::smallint, 0),
    coalesce((new.scoring_breakdown -> 'falsifiability' ->> 'score')::smallint, 0),
    coalesce((new.scoring_breakdown -> 'position_sizing' ->> 'score')::smallint, 0),
    coalesce((new.scoring_breakdown -> 'calibration' ->> 'score')::smallint, 0),
    new.score,
    new.scoring_breakdown
  );

  return new;
end;
$$;

revoke execute on function private.persist_submission_score() from public, anon, authenticated;

drop trigger if exists persist_challenge_submission_score on public.challenge_submissions;
create trigger persist_challenge_submission_score
after insert on public.challenge_submissions
for each row execute function private.persist_submission_score();

insert into public.scores (
  submission_id,
  reasoning_score,
  risk_score,
  falsifiability_score,
  position_sizing_score,
  confidence_score,
  overall_score,
  scoring_breakdown
)
select
  submission.id,
  coalesce((submission.scoring_breakdown -> 'reasoning' ->> 'score')::smallint, 0),
  coalesce((submission.scoring_breakdown -> 'risk_management' ->> 'score')::smallint, 0),
  coalesce((submission.scoring_breakdown -> 'falsifiability' ->> 'score')::smallint, 0),
  coalesce((submission.scoring_breakdown -> 'position_sizing' ->> 'score')::smallint, 0),
  coalesce((submission.scoring_breakdown -> 'calibration' ->> 'score')::smallint, 0),
  submission.score,
  submission.scoring_breakdown
from public.challenge_submissions as submission
on conflict (submission_id) do nothing;
