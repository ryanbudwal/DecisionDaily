-- Persist only official daily results. Archive Basic practice is scored transiently.

alter table public.challenge_submissions
  add column is_official boolean not null default false;

update public.challenge_submissions as submission
set is_official = (
  not submission.is_replay
  and (submission.submitted_at at time zone 'America/Toronto')::date = challenge.publish_date
)
from public.daily_challenges as challenge
where challenge.id = submission.challenge_id;

create index challenge_submissions_user_official_idx
  on public.challenge_submissions (user_id, submitted_at desc)
  where is_official and not is_replay;

alter table public.scores drop constraint scores_position_sizing_score_check;
alter table public.scores add constraint scores_position_sizing_score_check
  check (position_sizing_score between 0 and 25);

create or replace function private.eastern_release_date(at_time timestamptz)
returns date
language sql
immutable
strict
set search_path = ''
as $$
  select (at_time at time zone 'America/Toronto')::date;
$$;

create or replace function private.is_official_release_submission(
  release_date date,
  replay boolean,
  at_time timestamptz
)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select not replay and release_date = private.eastern_release_date(at_time);
$$;

revoke execute on function private.eastern_release_date(timestamptz) from public, anon, authenticated;
revoke execute on function private.is_official_release_submission(date, boolean, timestamptz) from public, anon, authenticated;

create or replace function public.current_release_date()
returns date
language sql
stable
security invoker
set search_path = ''
as $$
  select (statement_timestamp() at time zone 'America/Toronto')::date;
$$;

revoke execute on function public.current_release_date() from public, anon;
grant execute on function public.current_release_date() to authenticated;

drop policy "authenticated users read published challenges" on public.daily_challenges;
create policy "authenticated users read published challenges"
on public.daily_challenges for select to authenticated
using (
  is_published
  and publish_date <= (statement_timestamp() at time zone 'America/Toronto')::date
);

drop policy "users read choices for available challenges" on public.basic_choice_options;
create policy "users read choices for available challenges"
on public.basic_choice_options for select to authenticated
using (exists (
  select 1
  from public.daily_challenges as challenge
  where challenge.id = basic_choice_options.challenge_id
    and challenge.is_published
    and challenge.publish_date <= (statement_timestamp() at time zone 'America/Toronto')::date
));

drop policy "users read outcomes after submitting" on public.challenge_outcomes;
create policy "users read outcomes after official submission"
on public.challenge_outcomes for select to authenticated
using (exists (
  select 1
  from public.challenge_submissions as submission
  where submission.challenge_id = challenge_outcomes.challenge_id
    and submission.user_id = (select auth.uid())
    and submission.is_official
    and not submission.is_replay
));

create or replace function private.basic_v4_result(
  target_challenge_id bigint,
  chosen_decision text,
  allocation smallint,
  reasoning_option_id bigint,
  risk_option_id bigint,
  change_option_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  reasoning_text text;
  risk_text text;
  change_text text;
  reasoning_points smallint;
  risk_points smallint;
  change_points smallint;
  sizing_points smallint;
  reasoning_feedback text;
  risk_feedback text;
  change_feedback text;
  sizing_feedback text;
  breakdown jsonb;
begin
  if allocation not between 0 and 100 then
    raise exception 'allocation must be between 0 and 100';
  end if;

  if not exists (
    select 1 from public.daily_challenges as challenge
    where challenge.id = target_challenge_id
      and challenge.is_published
      and challenge.decision_options ? chosen_decision
  ) then
    raise exception 'decision is not available for this challenge';
  end if;

  select choice.option_text, score.points, score.feedback
  into strict reasoning_text, reasoning_points, reasoning_feedback
  from public.basic_choice_options as choice
  join private.basic_choice_scores as score on score.option_id = choice.id
  where choice.id = reasoning_option_id
    and choice.challenge_id = target_challenge_id
    and choice.prompt_type = 'reasoning';

  select choice.option_text, score.points, score.feedback
  into strict risk_text, risk_points, risk_feedback
  from public.basic_choice_options as choice
  join private.basic_choice_scores as score on score.option_id = choice.id
  where choice.id = risk_option_id
    and choice.challenge_id = target_challenge_id
    and choice.prompt_type = 'risk';

  select choice.option_text, score.points, score.feedback
  into strict change_text, change_points, change_feedback
  from public.basic_choice_options as choice
  join private.basic_choice_scores as score on score.option_id = choice.id
  where choice.id = change_option_id
    and choice.challenge_id = target_challenge_id
    and choice.prompt_type = 'change_mind';

  sizing_points := case
    when allocation <= 20 then 25
    when allocation <= 35 then 18
    when allocation <= 55 then 10
    else 5
  end;
  sizing_feedback := case
    when sizing_points = 25 then 'Your capital at risk leaves meaningful room for uncertainty.'
    when sizing_points = 18 then 'Your position size is measured, though it accepts meaningful downside.'
    when sizing_points = 10 then 'Your position size is aggressive for an uncertain decision.'
    else 'Your position size leaves very little room for being wrong.'
  end;

  breakdown := jsonb_build_object(
    'reasoning', jsonb_build_object('score', reasoning_points, 'max', 30, 'feedback', reasoning_feedback),
    'risk_management', jsonb_build_object('score', risk_points, 'max', 25, 'feedback', risk_feedback),
    'falsifiability', jsonb_build_object('score', change_points, 'max', 20, 'feedback', change_feedback),
    'position_sizing', jsonb_build_object('score', sizing_points, 'max', 25, 'feedback', sizing_feedback)
  );

  return jsonb_build_object(
    'decision', chosen_decision,
    'allocation_percent', allocation,
    'reasoning', reasoning_text,
    'risks', jsonb_build_array(risk_text),
    'change_my_mind', change_text,
    'score', reasoning_points + risk_points + change_points + sizing_points,
    'scoring_breakdown', breakdown,
    'rubric_version', 4
  );
exception
  when no_data_found or too_many_rows then
    raise exception 'select valid Basic cards for this challenge';
end;
$$;

revoke execute on function private.basic_v4_result(bigint, text, smallint, bigint, bigint, bigint)
  from public, anon, authenticated;

create or replace function private.apply_basic_v4()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if new.submission_mode <> 'basic' then
    return new;
  end if;

  result := private.basic_v4_result(
    new.challenge_id,
    new.decision,
    new.allocation_percent,
    new.selected_reasoning_option_id,
    new.selected_risk_option_id,
    new.selected_change_option_id
  );
  new.reasoning := result ->> 'reasoning';
  new.risks := array[result -> 'risks' ->> 0];
  new.change_my_mind := result ->> 'change_my_mind';
  new.score := (result ->> 'score')::smallint;
  new.scoring_breakdown := result -> 'scoring_breakdown';
  return new;
end;
$$;

revoke execute on function private.apply_basic_v4() from public, anon, authenticated;
drop trigger if exists zz_apply_basic_v4 on public.challenge_submissions;
create trigger zz_apply_basic_v4
before insert on public.challenge_submissions
for each row execute function private.apply_basic_v4();

create or replace function private.prepare_submission_attempt()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_attempt integer;
  release_date date;
  eastern_today date := private.eastern_release_date(statement_timestamp());
begin
  if new.user_id is distinct from (select auth.uid()) then
    raise exception 'submission user must match the authenticated user';
  end if;

  select challenge.publish_date into strict release_date
  from public.daily_challenges as challenge
  where challenge.id = new.challenge_id and challenge.is_published;

  if release_date > eastern_today then
    raise exception 'this challenge has not been released yet';
  end if;
  if new.submission_mode = 'basic' and release_date < eastern_today then
    raise exception 'archive Basic practice is transient and cannot be inserted';
  end if;

  select max(submission.attempt_number)
  into next_attempt
  from public.challenge_submissions as submission
  where submission.user_id = new.user_id
    and submission.challenge_id = new.challenge_id;

  if next_attempt is null then
    new.attempt_number := 1;
    new.is_replay := false;
  else
    if coalesce(auth.jwt() -> 'app_metadata' ->> 'can_replay', 'false') <> 'true' then
      raise unique_violation using message = 'A decision is already locked for this challenge.';
    end if;
    new.attempt_number := next_attempt + 1;
    new.is_replay := true;
  end if;

  new.is_official := private.is_official_release_submission(
    release_date,
    new.is_replay,
    statement_timestamp()
  );
  return new;
end;
$$;

revoke execute on function private.prepare_submission_attempt() from public, anon, authenticated;

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
    submission_id, reasoning_score, risk_score, falsifiability_score,
    position_sizing_score, confidence_score, overall_score,
    scoring_breakdown, rubric_version
  ) values (
    new.id,
    coalesce((new.scoring_breakdown -> 'reasoning' ->> 'score')::smallint, 0),
    coalesce((new.scoring_breakdown -> 'risk_management' ->> 'score')::smallint, 0),
    coalesce((new.scoring_breakdown -> 'falsifiability' ->> 'score')::smallint, 0),
    coalesce((new.scoring_breakdown -> 'position_sizing' ->> 'score')::smallint, 0),
    coalesce((new.scoring_breakdown -> 'confidence_discipline' ->> 'score')::smallint, 0),
    new.score,
    new.scoring_breakdown,
    case when new.submission_mode = 'basic' then 4 else 2 end
  );
  return new;
end;
$$;

revoke execute on function private.persist_submission_score() from public, anon, authenticated;

create or replace function private.refresh_profile_streak(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest_date date;
  longest_value integer := 0;
  ending_value integer := 0;
  current_value integer := 0;
  eastern_today date := private.eastern_release_date(statement_timestamp());
begin
  with completed_dates as (
    select distinct challenge.publish_date as completed_date
    from public.challenge_submissions as submission
    join public.daily_challenges as challenge on challenge.id = submission.challenge_id
    where submission.user_id = target_user_id
      and submission.is_official
      and not submission.is_replay
  ), grouped_dates as (
    select completed_date,
      completed_date - row_number() over (order by completed_date)::integer as streak_group
    from completed_dates
  ), streaks as (
    select streak_group, min(completed_date) as first_date,
      max(completed_date) as last_date, count(*)::integer as streak_length
    from grouped_dates group by streak_group
  )
  select max(last_date), coalesce(max(streak_length), 0)
  into latest_date, longest_value
  from streaks;

  if latest_date is not null then
    with completed_dates as (
      select distinct challenge.publish_date as completed_date
      from public.challenge_submissions as submission
      join public.daily_challenges as challenge on challenge.id = submission.challenge_id
      where submission.user_id = target_user_id
        and submission.is_official and not submission.is_replay
    ), grouped_dates as (
      select completed_date,
        completed_date - row_number() over (order by completed_date)::integer as streak_group
      from completed_dates
    )
    select count(*)::integer into ending_value
    from grouped_dates
    where streak_group = (
      select streak_group from grouped_dates where completed_date = latest_date
    );
  end if;

  if latest_date >= eastern_today - 1 then current_value := ending_value; end if;

  update public.profiles
  set current_streak = current_value,
      longest_streak = longest_value,
      last_completed_date = latest_date,
      updated_at = now()
  where id = target_user_id;
end;
$$;

revoke execute on function private.refresh_profile_streak(uuid) from public, anon, authenticated;

create or replace function private.refresh_profile_after_official_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_official and not new.is_replay then
    perform private.refresh_profile_streak(new.user_id);
  end if;
  return new;
end;
$$;

revoke execute on function private.refresh_profile_after_official_submission() from public, anon, authenticated;
drop trigger if exists refresh_profile_after_official_submission on public.challenge_submissions;
create trigger refresh_profile_after_official_submission
after insert on public.challenge_submissions
for each row execute function private.refresh_profile_after_official_submission();

do $$
declare user_row record;
begin
  for user_row in select id from public.profiles loop
    perform private.refresh_profile_streak(user_row.id);
  end loop;
end;
$$;

create or replace function public.submit_basic_decision(
  challenge_id bigint,
  decision text,
  allocation_percent smallint,
  reasoning_option_id bigint,
  risk_option_id bigint,
  change_option_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  release_date date;
  eastern_today date := private.eastern_release_date(statement_timestamp());
  saved public.challenge_submissions%rowtype;
  result jsonb;
  outcome_result jsonb;
begin
  if caller_id is null then raise exception 'authentication required'; end if;

  select challenge.publish_date into strict release_date
  from public.daily_challenges as challenge
  where challenge.id = submit_basic_decision.challenge_id
    and challenge.is_published;

  if release_date > eastern_today then raise exception 'this challenge has not been released yet'; end if;

  if release_date = eastern_today then
    insert into public.challenge_submissions (
      user_id, challenge_id, submission_mode, decision, allocation_percent,
      confidence_percent, selected_reasoning_option_id,
      selected_risk_option_id, selected_change_option_id
    ) values (
      caller_id, challenge_id, 'basic', decision, allocation_percent,
      60, reasoning_option_id, risk_option_id, change_option_id
    ) returning * into saved;

    return jsonb_build_object(
      'status', case when saved.is_replay then 'replay' else 'official' end,
      'is_official', saved.is_official,
      'submission_id', saved.id
    );
  end if;

  result := private.basic_v4_result(
    challenge_id, decision, allocation_percent,
    reasoning_option_id, risk_option_id, change_option_id
  );

  select jsonb_build_object(
    'challenge_id', outcome.challenge_id,
    'outcome_title', outcome.outcome_title,
    'outcome_summary', outcome.outcome_summary,
    'result_label', outcome.result_label,
    'benchmark_label', outcome.benchmark_label,
    'benchmark_result', outcome.benchmark_result,
    'learning_points', outcome.learning_points
  ) into outcome_result
  from public.challenge_outcomes as outcome
  where outcome.challenge_id = submit_basic_decision.challenge_id;

  return result || jsonb_build_object(
    'status', 'practice',
    'is_official', false,
    'outcome', outcome_result
  );
end;
$$;

revoke execute on function public.submit_basic_decision(bigint, text, smallint, bigint, bigint, bigint)
  from public, anon;
grant execute on function public.submit_basic_decision(bigint, text, smallint, bigint, bigint, bigint)
  to authenticated;
