-- Decision Daily V1: one shared daily scenario and an authoritative scoring rubric.

drop index if exists public.daily_challenges_category_date_idx;

alter table public.daily_challenges
drop column if exists category;

create or replace function private.calculate_submission_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reasoning_words integer := 0;
  change_words integer := 0;
  risk_count integer := 0;
  detailed_risk_count integer := 0;
  allocation_cap integer := 0;
  reasoning_points integer := 0;
  risk_points integer := 0;
  falsifiability_points integer := 0;
  sizing_points integer := 0;
  confidence_points integer := 0;
  reasoning_feedback text;
  risk_feedback text;
  falsifiability_feedback text;
  sizing_feedback text;
  confidence_feedback text;
begin
  if new.user_id is distinct from (select auth.uid()) then
    raise exception 'submission user must match the authenticated user';
  end if;

  reasoning_words := cardinality(
    regexp_split_to_array(trim(new.reasoning), E'\\s+')
  );
  change_words := cardinality(
    regexp_split_to_array(trim(new.change_my_mind), E'\\s+')
  );
  risk_count := cardinality(new.risks);

  select count(*)::integer
  into detailed_risk_count
  from unnest(new.risks) as risk
  where char_length(trim(risk)) >= 20;

  reasoning_points := case
    when reasoning_words >= 180 then 24
    when reasoning_words >= 120 then 21
    when reasoning_words >= 80 then 18
    when reasoning_words >= 50 then 14
    else 10
  end;

  if new.reasoning ~ '[0-9]' then
    reasoning_points := reasoning_points + 3;
  end if;
  if lower(new.reasoning) ~ E'\\m(because|therefore|however|although|but|while|versus|trade-off|tradeoff)\\M' then
    reasoning_points := reasoning_points + 3;
  end if;
  reasoning_points := least(30, reasoning_points);

  risk_points := case
    when risk_count >= 4 then 16
    when risk_count = 3 then 14
    when risk_count = 2 then 11
    else 7
  end;
  risk_points := risk_points + least(5, detailed_risk_count);
  if lower(array_to_string(new.risks, ' ')) ~ E'\\m(if|could|because|lead|result|impact|downside)\\M' then
    risk_points := risk_points + 4;
  end if;
  risk_points := least(25, risk_points);

  falsifiability_points := case
    when change_words >= 35 then 14
    when change_words >= 20 then 11
    when change_words >= 10 then 7
    else 5
  end;
  if lower(new.change_my_mind) ~ E'\\m(if|unless|until|above|below|increase|decrease|rise|fall|within)\\M' then
    falsifiability_points := falsifiability_points + 3;
  end if;
  if new.change_my_mind ~ '[0-9]' then
    falsifiability_points := falsifiability_points + 3;
  end if;
  falsifiability_points := least(20, falsifiability_points);

  allocation_cap := case
    when new.confidence_percent <= 40 then 20
    when new.confidence_percent <= 60 then 35
    when new.confidence_percent <= 75 then 50
    when new.confidence_percent <= 90 then 65
    else 80
  end;
  sizing_points := case
    when new.allocation_percent <= allocation_cap then 15
    when new.allocation_percent <= allocation_cap + 15 then 10
    else 5
  end;

  confidence_points := case
    when new.confidence_percent between 40 and 80 then 10
    when new.confidence_percent between 25 and 90 then 7
    else 4
  end;

  reasoning_feedback := case
    when reasoning_points >= 25 then 'Your reasoning is detailed and connects evidence to trade-offs.'
    when reasoning_points >= 18 then 'Your case has a useful foundation; connect more evidence to the conclusion.'
    else 'Develop the argument further by weighing evidence, alternatives, and trade-offs.'
  end;
  risk_feedback := case
    when risk_points >= 21 then 'You identified several specific downside paths and their possible effects.'
    when risk_points >= 14 then 'You identified meaningful risks; make each one more specific and explain its impact.'
    else 'Add multiple distinct downside scenarios and explain how each could affect the decision.'
  end;
  falsifiability_feedback := case
    when falsifiability_points >= 16 then 'You named a concrete signal that could invalidate your view.'
    when falsifiability_points >= 10 then 'Your view can change; make the trigger more measurable and specific.'
    else 'State a clear condition, threshold, or new fact that would make you reconsider.'
  end;
  sizing_feedback := case
    when sizing_points = 15 then 'Your capital at risk is disciplined relative to your stated confidence.'
    when sizing_points = 10 then 'Your allocation is somewhat aggressive relative to your stated confidence.'
    else 'Your allocation is much more aggressive than your stated confidence supports.'
  end;
  confidence_feedback := case
    when confidence_points = 10 then 'Your confidence leaves room for uncertainty.'
    when confidence_points = 7 then 'Your confidence is strong; be sure the evidence supports it.'
    else 'Extreme confidence is difficult to justify under uncertainty.'
  end;

  new.score := reasoning_points + risk_points + falsifiability_points + sizing_points + confidence_points;
  new.scoring_breakdown := jsonb_build_object(
    'reasoning', jsonb_build_object('score', reasoning_points, 'max', 30, 'feedback', reasoning_feedback),
    'risk_management', jsonb_build_object('score', risk_points, 'max', 25, 'feedback', risk_feedback),
    'falsifiability', jsonb_build_object('score', falsifiability_points, 'max', 20, 'feedback', falsifiability_feedback),
    'position_sizing', jsonb_build_object('score', sizing_points, 'max', 15, 'feedback', sizing_feedback),
    'confidence_discipline', jsonb_build_object('score', confidence_points, 'max', 10, 'feedback', confidence_feedback)
  );

  return new;
end;
$$;

revoke execute on function private.calculate_submission_score() from public, anon, authenticated;

drop trigger if exists score_challenge_submission on public.challenge_submissions;
create trigger score_challenge_submission
before insert on public.challenge_submissions
for each row execute function private.calculate_submission_score();

drop function if exists public.calculate_submission_score();

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
    scoring_breakdown,
    rubric_version
  )
  values (
    new.id,
    coalesce((new.scoring_breakdown -> 'reasoning' ->> 'score')::smallint, 0),
    coalesce((new.scoring_breakdown -> 'risk_management' ->> 'score')::smallint, 0),
    coalesce((new.scoring_breakdown -> 'falsifiability' ->> 'score')::smallint, 0),
    coalesce((new.scoring_breakdown -> 'position_sizing' ->> 'score')::smallint, 0),
    coalesce((new.scoring_breakdown -> 'confidence_discipline' ->> 'score')::smallint, 0),
    new.score,
    new.scoring_breakdown,
    2
  );

  return new;
end;
$$;

revoke execute on function private.persist_submission_score() from public, anon, authenticated;

