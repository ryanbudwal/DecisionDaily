-- Restore the original written-response experience as Advanced mode.

create or replace function private.calculate_submission_score()
returns trigger
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
  reasoning_feedback text;
  risk_feedback text;
  change_feedback text;
  allocation_cap integer;
  sizing_points smallint;
  confidence_points smallint;
begin
  if new.user_id is distinct from (select auth.uid()) then
    raise exception 'submission user must match the authenticated user';
  end if;

  if not exists (
    select 1 from public.daily_challenges as challenge
    where challenge.id = new.challenge_id
      and challenge.decision_options ? new.decision
  ) then
    raise exception 'decision is not available for this challenge';
  end if;

  if new.submission_mode = 'advanced' then
    if new.reasoning is null or char_length(trim(new.reasoning)) < 60 then
      raise exception 'advanced reasoning must contain at least 60 characters';
    end if;
    if new.risks is null or cardinality(new.risks) < 1 then
      raise exception 'advanced mode requires at least one risk';
    end if;
    if new.change_my_mind is null or char_length(trim(new.change_my_mind)) < 20 then
      raise exception 'advanced mode requires a change-of-mind signal';
    end if;

    reasoning_points := case
      when char_length(new.reasoning) >= 300 then 30
      when char_length(new.reasoning) >= 180 then 24
      when char_length(new.reasoning) >= 100 then 18
      else 12
    end;
    risk_points := least(25, cardinality(new.risks) * 7 + 4);
    change_points := case
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
    confidence_points := case
      when new.confidence_percent between 40 and 75 then 10
      when new.confidence_percent between 25 and 85 then 7
      else 4
    end;

    reasoning_feedback := case
      when reasoning_points = 30 then 'You developed a detailed investment case.'
      when reasoning_points >= 18 then 'Your case has a useful foundation; connect more evidence and trade-offs.'
      else 'Develop the argument further by explaining which evidence matters and why.'
    end;
    risk_feedback := case
      when risk_points >= 25 then 'You considered several different ways the decision could fail.'
      when risk_points >= 18 then 'You identified useful risks; add another distinct downside scenario.'
      else 'Identify more than one specific risk and explain its possible impact.'
    end;
    change_feedback := case
      when change_points = 20 then 'You clearly described evidence that could change your view.'
      when change_points >= 12 then 'Your view can change; make the trigger more specific and measurable.'
      else 'Name a clearer fact, threshold, or event that would make you reconsider.'
    end;

    new.score := reasoning_points + risk_points + change_points + sizing_points + confidence_points;
    new.scoring_breakdown := jsonb_build_object(
      'reasoning', jsonb_build_object('score', reasoning_points, 'max', 30, 'feedback', reasoning_feedback),
      'risk_management', jsonb_build_object('score', risk_points, 'max', 25, 'feedback', risk_feedback),
      'falsifiability', jsonb_build_object('score', change_points, 'max', 20, 'feedback', change_feedback),
      'position_sizing', jsonb_build_object(
        'score', sizing_points,
        'max', 15,
        'feedback', case
          when sizing_points = 15 then 'Your position size is conservative for an uncertain decision.'
          when sizing_points >= 7 then 'Your position size accepts meaningful risk.'
          else 'Your position size leaves little room for being wrong.'
        end
      ),
      'confidence_discipline', jsonb_build_object(
        'score', confidence_points,
        'max', 10,
        'feedback', case
          when confidence_points = 10 then 'Your confidence leaves room for uncertainty.'
          when confidence_points = 7 then 'Your confidence is strong; make sure the evidence supports it.'
          else 'Extreme confidence is difficult to justify under uncertainty.'
        end
      )
    );
    return new;
  end if;

  select choice.option_text, score.points, score.feedback
  into reasoning_text, reasoning_points, reasoning_feedback
  from public.basic_choice_options as choice
  join private.basic_choice_scores as score on score.option_id = choice.id
  where choice.id = new.selected_reasoning_option_id
    and choice.challenge_id = new.challenge_id
    and choice.prompt_type = 'reasoning';
  if not found then raise exception 'select a valid reasoning card'; end if;

  select choice.option_text, score.points, score.feedback
  into risk_text, risk_points, risk_feedback
  from public.basic_choice_options as choice
  join private.basic_choice_scores as score on score.option_id = choice.id
  where choice.id = new.selected_risk_option_id
    and choice.challenge_id = new.challenge_id
    and choice.prompt_type = 'risk';
  if not found then raise exception 'select a valid risk card'; end if;

  select choice.option_text, score.points, score.feedback
  into change_text, change_points, change_feedback
  from public.basic_choice_options as choice
  join private.basic_choice_scores as score on score.option_id = choice.id
  where choice.id = new.selected_change_option_id
    and choice.challenge_id = new.challenge_id
    and choice.prompt_type = 'change_mind';
  if not found then raise exception 'select a valid change-of-mind card'; end if;

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

  new.reasoning := reasoning_text;
  new.risks := array[risk_text];
  new.change_my_mind := change_text;
  new.score := reasoning_points + risk_points + change_points + sizing_points + confidence_points;
  new.scoring_breakdown := jsonb_build_object(
    'reasoning', jsonb_build_object('score', reasoning_points, 'max', 30, 'feedback', reasoning_feedback),
    'risk_management', jsonb_build_object('score', risk_points, 'max', 25, 'feedback', risk_feedback),
    'falsifiability', jsonb_build_object('score', change_points, 'max', 20, 'feedback', change_feedback),
    'position_sizing', jsonb_build_object('score', sizing_points, 'max', 15, 'feedback', case when sizing_points = 15 then 'Your capital at risk is disciplined relative to your confidence.' when sizing_points = 10 then 'Your allocation is somewhat aggressive relative to your confidence.' else 'Your allocation is much more aggressive than your confidence supports.' end),
    'confidence_discipline', jsonb_build_object('score', confidence_points, 'max', 10, 'feedback', case when confidence_points = 10 then 'Your confidence leaves room for uncertainty.' when confidence_points = 7 then 'Your confidence is strong; make sure the evidence supports it.' else 'Extreme confidence is difficult to justify under uncertainty.' end)
  );
  return new;
end;
$$;

revoke execute on function private.calculate_submission_score() from public, anon, authenticated;

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
    case when new.submission_mode = 'advanced' then 2 else 3 end
  );
  return new;
end;
$$;

revoke execute on function private.persist_submission_score() from public, anon, authenticated;

