-- Decision Daily schema reference. Apply through a reviewed Supabase migration.

create table public.daily_challenges (
  id bigint generated always as identity primary key,
  slug text not null unique,
  challenge_number bigint not null unique,
  publish_date date not null unique,
  difficulty text not null default 'intermediate' check (difficulty in ('beginner', 'intermediate', 'advanced')),
  title text not null,
  subtitle text not null,
  scenario text not null,
  decision_prompt text not null,
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  decision_options jsonb not null default '[]'::jsonb check (jsonb_typeof(decision_options) = 'array'),
  source_note text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.challenge_outcomes (
  challenge_id bigint primary key references public.daily_challenges(id) on delete cascade,
  outcome_title text not null,
  outcome_summary text not null,
  result_label text not null,
  benchmark_label text,
  benchmark_result text,
  learning_points jsonb not null default '[]'::jsonb check (jsonb_typeof(learning_points) = 'array'),
  created_at timestamptz not null default now()
);

create table public.challenge_submissions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id bigint not null references public.daily_challenges(id) on delete cascade,
  decision text not null check (char_length(decision) between 1 and 80),
  allocation_percent smallint not null check (allocation_percent between 0 and 100),
  confidence_percent smallint not null check (confidence_percent between 1 and 100),
  reasoning text not null check (char_length(reasoning) between 60 and 2000),
  risks text[] not null check (cardinality(risks) between 1 and 8),
  change_my_mind text not null check (char_length(change_my_mind) between 20 and 1000),
  score smallint not null default 0 check (score between 0 and 100),
  scoring_breakdown jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  unique (user_id, challenge_id)
);

create index challenge_submissions_user_submitted_idx
  on public.challenge_submissions (user_id, submitted_at desc);
create index challenge_submissions_challenge_idx
  on public.challenge_submissions (challenge_id);

alter table public.daily_challenges enable row level security;
alter table public.challenge_outcomes enable row level security;
alter table public.challenge_submissions enable row level security;

create policy "authenticated users read published challenges"
on public.daily_challenges for select to authenticated
using (is_published and publish_date <= current_date);

create policy "users reveal outcomes after submitting"
on public.challenge_outcomes for select to authenticated
using (exists (
  select 1 from public.challenge_submissions submission
  where submission.challenge_id = challenge_outcomes.challenge_id
    and submission.user_id = (select auth.uid())
));

create policy "users read their own submissions"
on public.challenge_submissions for select to authenticated
using (user_id = (select auth.uid()));

create policy "users create their own locked submission"
on public.challenge_submissions for insert to authenticated
with check (user_id = (select auth.uid()));

revoke all on public.daily_challenges, public.challenge_outcomes, public.challenge_submissions from anon;
grant select on public.daily_challenges, public.challenge_outcomes to authenticated;
grant select, insert on public.challenge_submissions to authenticated;
grant usage, select on sequence public.challenge_submissions_id_seq to authenticated;

create schema if not exists private;

create or replace function private.calculate_submission_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reasoning_points integer := 0;
  risk_points integer := 0;
  falsifiability_points integer := 0;
  sizing_points integer := 0;
  calibration_points integer := 0;
begin
  if new.user_id is distinct from (select auth.uid()) then
    raise exception 'submission user must match the authenticated user';
  end if;

  reasoning_points := case
    when char_length(new.reasoning) >= 300 then 30
    when char_length(new.reasoning) >= 180 then 24
    when char_length(new.reasoning) >= 100 then 18
    else 12
  end;
  risk_points := least(25, cardinality(new.risks) * 7 + 4);
  falsifiability_points := case
    when char_length(new.change_my_mind) >= 160 then 20
    when char_length(new.change_my_mind) >= 90 then 16
    when char_length(new.change_my_mind) >= 45 then 12
    else 8
  end;
  sizing_points := case
    when new.allocation_percent <= 20 then 15
    when new.allocation_percent <= 35 then 11
    when new.allocation_percent <= 55 then 7
    else 3
  end;
  calibration_points := case
    when new.confidence_percent between 40 and 75 then 10
    when new.confidence_percent between 25 and 85 then 7
    else 4
  end;

  new.score := reasoning_points + risk_points + falsifiability_points + sizing_points + calibration_points;
  new.scoring_breakdown := jsonb_build_object(
    'reasoning', jsonb_build_object('score', reasoning_points, 'max', 30),
    'risk_management', jsonb_build_object('score', risk_points, 'max', 25),
    'falsifiability', jsonb_build_object('score', falsifiability_points, 'max', 20),
    'position_sizing', jsonb_build_object('score', sizing_points, 'max', 15),
    'calibration', jsonb_build_object('score', calibration_points, 'max', 10)
  );
  return new;
end;
$$;

create trigger score_challenge_submission
before insert on public.challenge_submissions
for each row execute function private.calculate_submission_score();

-- Keep scoring server-side; never accept score values from the browser.
