begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(13);

insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('77777777-7777-4777-8777-777777777777', 'authenticated', 'authenticated', 'track-owner@decision.invalid', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('88888888-8888-4888-8888-888888888888', 'authenticated', 'authenticated', 'track-player@decision.invalid', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('99999999-9999-4999-8999-999999999999', 'authenticated', 'authenticated', 'track-late@decision.invalid', '{"provider":"email","providers":["email"]}', '{}', now(), now());

delete from private.challenge_managers;
insert into private.challenge_managers (user_id) values ('77777777-7777-4777-8777-777777777777');

create temp table dd_track_payload as
select jsonb_build_object(
  'challenge_mode','advanced',
  'slug','advanced-track-test',
  'publish_date',public.current_release_date(),
  'difficulty','advanced',
  'title','Advanced track test',
  'subtitle','A separate weekly-labelled editorial draft.',
  'scenario',repeat('This is a complete advanced financial scenario with enough evidence and uncertainty for written analysis. ', 2),
  'decision_prompt','As an investor, what would you do today?',
  'evidence',jsonb_build_array(
    jsonb_build_object('label','Growth','value','12%','detail','Revenue increased year over year.','tone','positive'),
    jsonb_build_object('label','Debt','value','$40M','detail','Debt is due within two years.','tone','negative')
  ),
  'decision_options',jsonb_build_array('Buy','Hold','Avoid'),
  'source_note','Test source note.',
  'basic_choices','[]'::jsonb,
  'outcome',jsonb_build_object(
    'outcome_title','Advanced test outcome',
    'outcome_summary','A protected result for verifying separate editorial tracks.',
    'result_label','Approximately +8%',
    'benchmark_label','Benchmark',
    'benchmark_result','Approximately +3%',
    'learning_points',jsonb_build_array('Separate authoring does not change scoring rules.')
  )
) as payload;

create temp table dd_advanced_created (id bigint);
grant select on dd_track_payload to authenticated;
grant select, insert on dd_advanced_created to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated","is_anonymous":false,"app_metadata":{}}', true);
insert into dd_advanced_created select public.save_challenge_draft(payload) from dd_track_payload;
reset role;

select is((select count(*) from dd_advanced_created), 1::bigint, 'owner can save an Advanced Weekly draft');
select is((select challenge_mode from public.daily_challenges where id = (select id from dd_advanced_created)), 'advanced', 'advanced draft is stored in its own track');
select is((select count(*) from public.basic_choice_options where challenge_id = (select id from dd_advanced_created)), 0::bigint, 'advanced draft does not require Basic cards');

insert into public.daily_challenges (
  challenge_mode, slug, challenge_number, publish_date, difficulty, title, subtitle,
  scenario, decision_prompt, evidence, decision_options, source_note, is_published
)
select 'basic', 'basic-track-test', max(challenge_number) + 1, public.current_release_date(),
       'beginner', 'Basic track test', 'A separate Basic Daily row.',
       repeat('This is a complete Basic scenario used to verify independent release-date uniqueness. ', 2),
       'What would you do today?', '[]'::jsonb, '["Buy","Avoid"]'::jsonb, 'Test source.', true
from public.daily_challenges;

select is((select count(*) from public.daily_challenges where publish_date = public.current_release_date() and challenge_mode in ('basic','advanced')), 2::bigint, 'Basic and Advanced can use the same Eastern release date');

set local role authenticated;
select is((select count(*) from jsonb_array_elements(public.list_challenge_studio()) item where item ->> 'challenge_mode' = 'advanced' and item ->> 'slug' = 'advanced-track-test'), 1::bigint, 'Studio lists Advanced drafts in their own track');
select public.publish_challenge((select id from dd_advanced_created));
reset role;
select ok((select is_published from public.daily_challenges where id = (select id from dd_advanced_created)), 'Advanced draft publishes independently');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"88888888-8888-4888-8888-888888888888","role":"authenticated","is_anonymous":false,"app_metadata":{}}', true);
select is((select count(*) from public.daily_challenges where id = (select id from dd_advanced_created)), 1::bigint, 'players can read the separately published Advanced challenge');
select throws_ok(
  'select public.submit_basic_decision((select id from dd_advanced_created), ''Buy'', 10, 1, 1, 1)'
);
insert into public.challenge_submissions (
  user_id, challenge_id, submission_mode, decision, allocation_percent, confidence_percent,
  reasoning, risks, change_my_mind
)
values (
  '88888888-8888-4888-8888-888888888888', (select id from dd_advanced_created), 'advanced',
  'Buy', 10, 60, repeat('Detailed Advanced reasoning grounded in the available evidence. ', 2),
  array['Demand could weaken'], 'A material decline in customer retention would change my mind.'
);
reset role;

select ok((select is_official from public.challenge_submissions where user_id = '88888888-8888-4888-8888-888888888888'), 'same-day Advanced official-result rule is unchanged');
select is((select rubric_version from public.scores score join public.challenge_submissions submission on submission.id = score.submission_id where submission.user_id = '88888888-8888-4888-8888-888888888888'), 2, 'Advanced scoring rubric remains version 2');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-9999-4999-8999-999999999999","role":"authenticated","is_anonymous":false,"app_metadata":{}}', true);
select throws_ok(
  $$insert into public.challenge_submissions (user_id, challenge_id, submission_mode, decision, allocation_percent, confidence_percent, reasoning, risks, change_my_mind)
    select '99999999-9999-4999-8999-999999999999', id, 'advanced', 'Buy', 10, 60, repeat('Detailed reasoning for the wrong challenge mode. ', 2), array['Risk'], 'A material change would change my mind.'
    from public.daily_challenges where slug = 'basic-track-test'$$,
  'P0001', 'This challenge is available only in Basic mode',
  'Advanced submissions cannot target a Basic-only challenge'
);
reset role;

update public.daily_challenges set publish_date = public.current_release_date() - 1 where id = (select id from dd_advanced_created);
set local role authenticated;
insert into public.challenge_submissions (
  user_id, challenge_id, submission_mode, decision, allocation_percent, confidence_percent,
  reasoning, risks, change_my_mind
)
values (
  '99999999-9999-4999-8999-999999999999', (select id from dd_advanced_created), 'advanced',
  'Hold', 10, 60, repeat('Detailed late Advanced reasoning grounded in the evidence. ', 2),
  array['Demand could weaken'], 'A material improvement in retention would change my mind.'
);
reset role;

select ok(not (select is_official from public.challenge_submissions where user_id = '99999999-9999-4999-8999-999999999999'), 'late Advanced official-result behavior remains unchanged');
select is((select rubric_version from public.scores score join public.challenge_submissions submission on submission.id = score.submission_id where submission.user_id = '99999999-9999-4999-8999-999999999999'), 2, 'late Advanced submissions still use rubric version 2');

select * from finish();
rollback;
