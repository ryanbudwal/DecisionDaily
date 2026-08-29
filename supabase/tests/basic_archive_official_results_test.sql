begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(22);

select is(private.eastern_release_date('2026-03-08 04:59:59+00'), date '2026-03-07', 'Toronto date remains prior day before spring midnight');
select is(private.eastern_release_date('2026-03-08 05:00:00+00'), date '2026-03-08', 'Toronto date changes at spring midnight');
select is(private.eastern_release_date('2026-11-01 04:00:00+00'), date '2026-11-01', 'Toronto date handles the fall DST boundary');

insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'official-test@decision.invalid', '{"provider":"email","providers":["email"],"can_replay":true}', '{}', now(), now()),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'practice-test@decision.invalid', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'direct-test@decision.invalid', '{"provider":"email","providers":["email"]}', '{}', now(), now());

create temp table dd_test_context as
select challenge.id as challenge_id,
       challenge.decision_options ->> 0 as decision,
       max(choice.id) filter (where choice.prompt_type = 'reasoning') as reasoning_id,
       max(choice.id) filter (where choice.prompt_type = 'risk') as risk_id,
       max(choice.id) filter (where choice.prompt_type = 'change_mind') as change_id
from public.daily_challenges as challenge
join public.basic_choice_options as choice on choice.challenge_id = challenge.id
where challenge.is_published
  and exists (select 1 from public.challenge_outcomes outcome where outcome.challenge_id = challenge.id)
group by challenge.id, challenge.decision_options
having count(distinct choice.prompt_type) = 3
order by challenge.id
limit 1;

update public.daily_challenges
set publish_date = public.current_release_date()
where id = (select challenge_id from dd_test_context);

create temp table dd_results (label text primary key, result jsonb);
grant select on dd_test_context to authenticated;
grant select, insert on dd_results to authenticated;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated","app_metadata":{}}', true);
insert into public.challenge_submissions (
  user_id,
  challenge_id,
  submission_mode,
  decision,
  allocation_percent,
  confidence_percent,
  selected_reasoning_option_id,
  selected_risk_option_id,
  selected_change_option_id
)
select
  '33333333-3333-4333-8333-333333333333',
  challenge_id,
  'basic',
  decision,
  10,
  60,
  reasoning_id,
  risk_id,
  change_id
from dd_test_context;
reset role;

select is(
  (select count(*) from public.challenge_submissions where user_id = '33333333-3333-4333-8333-333333333333' and is_official),
  1::bigint,
  'direct same-day submissions still pass through the invoker trigger'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","app_metadata":{"can_replay":true}}', true);
insert into dd_results
select 'official', public.submit_basic_decision(challenge_id, decision, 10::smallint, reasoning_id, risk_id, change_id)
from dd_test_context;
reset role;

select is((select result ->> 'status' from dd_results where label = 'official'), 'official', 'same-day Basic result is official');
select is((select count(*) from public.challenge_submissions where user_id = '11111111-1111-4111-8111-111111111111' and is_official), 1::bigint, 'official result is stored once');
select is((select rubric_version from public.scores where submission_id = (select id from public.challenge_submissions where user_id = '11111111-1111-4111-8111-111111111111' and is_official)), 4, 'official Basic result uses rubric v4');
select is((select position_sizing_score from public.scores where submission_id = (select id from public.challenge_submissions where user_id = '11111111-1111-4111-8111-111111111111' and is_official)), 25::smallint, 'rubric v4 uses Basic position sizing without confidence');
select is((select current_streak from public.profiles where id = '11111111-1111-4111-8111-111111111111'), 1, 'official result updates the streak');

set local role authenticated;
insert into dd_results
select 'replay', public.submit_basic_decision(challenge_id, decision, 10::smallint, reasoning_id, risk_id, change_id)
from dd_test_context;
reset role;
select is((select result ->> 'status' from dd_results where label = 'replay'), 'replay', 'privileged same-day replay works');
select is((select count(*) from public.challenge_submissions where user_id = '11111111-1111-4111-8111-111111111111' and is_official), 1::bigint, 'replay cannot replace the official result');

update public.daily_challenges
set publish_date = public.current_release_date() - 1
where id = (select challenge_id from dd_test_context);
select ok((select is_official from public.challenge_submissions where user_id = '11111111-1111-4111-8111-111111111111' and attempt_number = 1), 'official status remains stored after challenge enters archive');
select is((select count(*) from public.scores where submission_id in (select id from public.challenge_submissions where user_id = '11111111-1111-4111-8111-111111111111' and is_official)), 1::bigint, 'official score remains permanently available to profile calculations');

create temp table dd_before_practice as
select (select count(*) from public.challenge_submissions where user_id = '11111111-1111-4111-8111-111111111111') as submissions,
       (select count(*) from public.scores join public.challenge_submissions on challenge_submissions.id = scores.submission_id where challenge_submissions.user_id = '11111111-1111-4111-8111-111111111111') as scores,
       (select current_streak from public.profiles where id = '11111111-1111-4111-8111-111111111111') as streak;

set local role authenticated;
insert into dd_results
select 'practice', public.submit_basic_decision(challenge_id, decision, 10::smallint, reasoning_id, risk_id, change_id)
from dd_test_context;
insert into dd_results
select 'practice-again', public.submit_basic_decision(challenge_id, decision, 10::smallint, reasoning_id, risk_id, change_id)
from dd_test_context;
reset role;

select is((select result ->> 'status' from dd_results where label = 'practice'), 'practice', 'late Basic play is archive practice');
select is((select (result ->> 'rubric_version')::integer from dd_results where label = 'practice'), 4, 'archive practice uses the same Basic rubric v4');
select ok((select result -> 'outcome' is not null from dd_results where label = 'practice'), 'archive practice reveals the protected outcome');
select is((select count(*) from public.challenge_submissions where user_id = '11111111-1111-4111-8111-111111111111'), (select submissions from dd_before_practice), 'repeated archive practice saves no submissions');
select is((select count(*) from public.scores join public.challenge_submissions on challenge_submissions.id = scores.submission_id where challenge_submissions.user_id = '11111111-1111-4111-8111-111111111111'), (select scores from dd_before_practice), 'archive practice saves no scores');
select is((select current_streak from public.profiles where id = '11111111-1111-4111-8111-111111111111'), (select streak from dd_before_practice), 'archive practice changes no profile statistics');

create temp table dd_outcome_visibility (visible_count bigint);
grant select, insert on dd_outcome_visibility to authenticated;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","app_metadata":{}}', true);
insert into dd_outcome_visibility select count(*) from public.challenge_outcomes where challenge_id = (select challenge_id from dd_test_context);
insert into dd_results
select 'second-user-practice', public.submit_basic_decision(challenge_id, decision, 10::smallint, reasoning_id, risk_id, change_id)
from dd_test_context;
reset role;

select is((select visible_count from dd_outcome_visibility), 0::bigint, 'outcome cannot be queried before a valid result');
select ok((select result -> 'outcome' is not null from dd_results where label = 'second-user-practice'), 'valid archive practice reveals outcome transiently');
select is((select count(*) from public.challenge_submissions where user_id = '22222222-2222-4222-8222-222222222222'), 0::bigint, 'archive practice leaves no identifiable submission');

select * from finish();
rollback;
