create table private.challenge_managers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  singleton boolean not null default true unique check (singleton),
  created_at timestamptz not null default now()
);

alter table private.challenge_managers enable row level security;
revoke all on private.challenge_managers from public, anon, authenticated;

insert into private.challenge_managers (user_id)
select "user".id
from auth.users as "user"
where lower("user".email) = 'ryanbudwal14@gmail.com'
  and coalesce("user".is_anonymous, false) = false
order by "user".created_at
limit 1;

do $$
begin
  if (select count(*) from private.challenge_managers) <> 1 then
    raise exception 'Exactly one existing owner account must be registered for Challenge Studio';
  end if;
end;
$$;

create or replace function private.is_challenge_manager()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
    and exists (
      select 1
      from private.challenge_managers as manager
      where manager.user_id = (select auth.uid())
    );
$$;

revoke execute on function private.is_challenge_manager() from public, anon, authenticated;

create or replace function public.can_manage_challenges()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_challenge_manager();
$$;

revoke execute on function public.can_manage_challenges() from public, anon;
grant execute on function public.can_manage_challenges() to authenticated;

create or replace function public.save_challenge_draft(payload jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id bigint;
  next_number bigint;
  draft_slug text := lower(btrim(payload ->> 'slug'));
  draft_publish_date date;
  draft_difficulty text := btrim(payload ->> 'difficulty');
  draft_title text := btrim(payload ->> 'title');
  draft_subtitle text := btrim(payload ->> 'subtitle');
  draft_scenario text := btrim(payload ->> 'scenario');
  draft_prompt text := btrim(payload ->> 'decision_prompt');
  draft_source text := nullif(btrim(payload ->> 'source_note'), '');
  draft_evidence jsonb := payload -> 'evidence';
  draft_decisions jsonb := payload -> 'decision_options';
  draft_choices jsonb := payload -> 'basic_choices';
  draft_outcome jsonb := payload -> 'outcome';
  choice_item record;
  inserted_option_id bigint;
begin
  if not private.is_challenge_manager() then
    raise exception 'Only the Decision Daily owner can manage challenges';
  end if;

  if jsonb_typeof(payload) <> 'object' then
    raise exception 'Challenge payload must be an object';
  end if;

  begin
    draft_publish_date := (payload ->> 'publish_date')::date;
  exception when others then
    raise exception 'Enter a valid release date';
  end;

  if draft_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(draft_slug) > 100 then
    raise exception 'Slug must use lowercase letters, numbers and hyphens';
  end if;
  if draft_difficulty not in ('beginner', 'intermediate', 'advanced') then
    raise exception 'Choose a valid difficulty';
  end if;
  if char_length(draft_title) not between 3 and 120
    or char_length(draft_subtitle) not between 3 and 180
    or char_length(draft_scenario) not between 60 and 4000
    or char_length(draft_prompt) not between 10 and 300 then
    raise exception 'Complete the title, subtitle, scenario and decision prompt';
  end if;

  if jsonb_typeof(draft_evidence) <> 'array'
    or jsonb_array_length(draft_evidence) not between 2 and 8
    or exists (
      select 1
      from jsonb_array_elements(draft_evidence) as item(value)
      where jsonb_typeof(value) <> 'object'
        or btrim(value ->> 'label') = ''
        or btrim(value ->> 'value') = ''
        or btrim(value ->> 'detail') = ''
        or coalesce(value ->> 'tone', '') not in ('positive', 'negative', 'neutral')
    ) then
    raise exception 'Add 2–8 complete evidence cards';
  end if;

  if jsonb_typeof(draft_decisions) <> 'array'
    or jsonb_array_length(draft_decisions) not between 2 and 6
    or exists (
      select 1
      from jsonb_array_elements(draft_decisions) as item(value)
      where jsonb_typeof(value) <> 'string' or btrim(value #>> '{}') = ''
    ) then
    raise exception 'Add 2–6 decision options';
  end if;

  if jsonb_typeof(draft_choices) <> 'array'
    or jsonb_array_length(draft_choices) <> 12
    or (select count(*) from jsonb_array_elements(draft_choices) item where item ->> 'prompt_type' = 'reasoning') <> 4
    or (select count(*) from jsonb_array_elements(draft_choices) item where item ->> 'prompt_type' = 'risk') <> 4
    or (select count(*) from jsonb_array_elements(draft_choices) item where item ->> 'prompt_type' = 'change_mind') <> 4
    or exists (
      select 1
      from jsonb_array_elements(draft_choices) as item(value)
      where btrim(value ->> 'option_text') = ''
        or btrim(value ->> 'feedback') = ''
        or case value ->> 'prompt_type'
          when 'reasoning' then (value ->> 'points')::integer not between 0 and 30
          when 'risk' then (value ->> 'points')::integer not between 0 and 25
          when 'change_mind' then (value ->> 'points')::integer not between 0 and 20
          else true
        end
    ) then
    raise exception 'Add four complete Basic cards for each scoring category';
  end if;

  if jsonb_typeof(draft_outcome) <> 'object'
    or btrim(draft_outcome ->> 'outcome_title') = ''
    or btrim(draft_outcome ->> 'outcome_summary') = ''
    or btrim(draft_outcome ->> 'result_label') = ''
    or jsonb_typeof(draft_outcome -> 'learning_points') <> 'array'
    or jsonb_array_length(draft_outcome -> 'learning_points') < 1 then
    raise exception 'Complete the protected outcome and learning points';
  end if;

  if nullif(payload ->> 'id', '') is not null then
    target_id := (payload ->> 'id')::bigint;

    update public.daily_challenges
    set slug = draft_slug,
        publish_date = draft_publish_date,
        difficulty = draft_difficulty,
        title = draft_title,
        subtitle = draft_subtitle,
        scenario = draft_scenario,
        decision_prompt = draft_prompt,
        evidence = draft_evidence,
        decision_options = draft_decisions,
        source_note = draft_source
    where id = target_id and not is_published;

    if not found then
      raise exception 'Only unpublished challenges can be edited';
    end if;

    delete from public.basic_choice_options where challenge_id = target_id;
  else
    lock table public.daily_challenges in share row exclusive mode;
    select coalesce(max(challenge_number), 0) + 1 into next_number
    from public.daily_challenges;

    insert into public.daily_challenges (
      slug, challenge_number, publish_date, difficulty, title, subtitle,
      scenario, decision_prompt, evidence, decision_options, source_note, is_published
    ) values (
      draft_slug, next_number, draft_publish_date, draft_difficulty, draft_title,
      draft_subtitle, draft_scenario, draft_prompt, draft_evidence, draft_decisions,
      draft_source, false
    )
    returning id into target_id;
  end if;

  for choice_item in
    select value,
           row_number() over (partition by value ->> 'prompt_type' order by ordinality) as display_order
    from jsonb_array_elements(draft_choices) with ordinality as choices(value, ordinality)
  loop
    insert into public.basic_choice_options (
      challenge_id, prompt_type, option_key, option_text, display_order
    ) values (
      target_id,
      choice_item.value ->> 'prompt_type',
      case choice_item.value ->> 'prompt_type'
        when 'reasoning' then 'r'
        when 'risk' then 'k'
        else 'c'
      end || choice_item.display_order,
      btrim(choice_item.value ->> 'option_text'),
      choice_item.display_order
    )
    returning id into inserted_option_id;

    insert into private.basic_choice_scores (option_id, points, feedback)
    values (
      inserted_option_id,
      (choice_item.value ->> 'points')::smallint,
      btrim(choice_item.value ->> 'feedback')
    );
  end loop;

  insert into public.challenge_outcomes (
    challenge_id, outcome_title, outcome_summary, result_label,
    benchmark_label, benchmark_result, learning_points
  ) values (
    target_id,
    btrim(draft_outcome ->> 'outcome_title'),
    btrim(draft_outcome ->> 'outcome_summary'),
    btrim(draft_outcome ->> 'result_label'),
    nullif(btrim(draft_outcome ->> 'benchmark_label'), ''),
    nullif(btrim(draft_outcome ->> 'benchmark_result'), ''),
    draft_outcome -> 'learning_points'
  )
  on conflict (challenge_id) do update
  set outcome_title = excluded.outcome_title,
      outcome_summary = excluded.outcome_summary,
      result_label = excluded.result_label,
      benchmark_label = excluded.benchmark_label,
      benchmark_result = excluded.benchmark_result,
      learning_points = excluded.learning_points;

  return target_id;
exception
  when unique_violation then
    raise exception 'That release date or slug is already in use';
  when invalid_text_representation then
    raise exception 'Check the date and hidden Basic point values';
end;
$$;

revoke execute on function public.save_challenge_draft(jsonb) from public, anon;
grant execute on function public.save_challenge_draft(jsonb) to authenticated;

create or replace function public.list_challenge_studio()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.is_challenge_manager() then
    raise exception 'Only the Decision Daily owner can manage challenges';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', challenge.id,
      'slug', challenge.slug,
      'challenge_number', challenge.challenge_number,
      'publish_date', challenge.publish_date,
      'difficulty', challenge.difficulty,
      'title', challenge.title,
      'subtitle', challenge.subtitle,
      'scenario', challenge.scenario,
      'decision_prompt', challenge.decision_prompt,
      'evidence', challenge.evidence,
      'decision_options', challenge.decision_options,
      'source_note', challenge.source_note,
      'is_published', challenge.is_published,
      'basic_choices', coalesce((
        select jsonb_agg(jsonb_build_object(
          'prompt_type', choice.prompt_type,
          'option_text', choice.option_text,
          'points', score.points,
          'feedback', score.feedback
        ) order by
          case choice.prompt_type when 'reasoning' then 1 when 'risk' then 2 else 3 end,
          choice.display_order)
        from public.basic_choice_options as choice
        join private.basic_choice_scores as score on score.option_id = choice.id
        where choice.challenge_id = challenge.id
      ), '[]'::jsonb),
      'outcome', (
        select jsonb_build_object(
          'outcome_title', outcome.outcome_title,
          'outcome_summary', outcome.outcome_summary,
          'result_label', outcome.result_label,
          'benchmark_label', outcome.benchmark_label,
          'benchmark_result', outcome.benchmark_result,
          'learning_points', outcome.learning_points
        )
        from public.challenge_outcomes as outcome
        where outcome.challenge_id = challenge.id
      )
    ) order by challenge.publish_date desc, challenge.challenge_number desc
  ), '[]'::jsonb)
  into result
  from public.daily_challenges as challenge;

  return result;
end;
$$;

revoke execute on function public.list_challenge_studio() from public, anon;
grant execute on function public.list_challenge_studio() to authenticated;

create or replace function public.publish_challenge(challenge_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  release_date date;
  published boolean;
begin
  if not private.is_challenge_manager() then
    raise exception 'Only the Decision Daily owner can manage challenges';
  end if;

  select challenge.publish_date, challenge.is_published
  into release_date, published
  from public.daily_challenges as challenge
  where challenge.id = publish_challenge.challenge_id;

  if not found then
    raise exception 'Challenge not found';
  end if;
  if published then
    return jsonb_build_object('status', 'published', 'publish_date', release_date);
  end if;
  if release_date < (statement_timestamp() at time zone 'America/Toronto')::date then
    raise exception 'A daily challenge cannot be published with a past release date';
  end if;
  if (select count(*) from public.basic_choice_options choice where choice.challenge_id = publish_challenge.challenge_id) <> 12
    or not exists (select 1 from public.challenge_outcomes outcome where outcome.challenge_id = publish_challenge.challenge_id) then
    raise exception 'Complete the Basic cards and protected outcome before publishing';
  end if;

  update public.daily_challenges
  set is_published = true
  where id = publish_challenge.challenge_id;

  return jsonb_build_object('status', 'published', 'publish_date', release_date);
end;
$$;

revoke execute on function public.publish_challenge(bigint) from public, anon;
grant execute on function public.publish_challenge(bigint) to authenticated;
