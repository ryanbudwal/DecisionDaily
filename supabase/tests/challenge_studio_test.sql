begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(17);

insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'studio-owner@decision.invalid', '{"provider":"email","providers":["email"],"can_manage_challenges":true}', '{}', now(), now()),
  ('55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'studio-user@decision.invalid', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('66666666-6666-4666-8666-666666666666', 'authenticated', 'authenticated', 'studio-anonymous@decision.invalid', '{"provider":"anonymous","providers":["anonymous"],"can_manage_challenges":true}', '{}', now(), now());

delete from private.challenge_managers;
insert into private.challenge_managers (user_id) values ('44444444-4444-4444-8444-444444444444');

update public.daily_challenges
set publish_date = date '1900-01-01'
where publish_date = public.current_release_date();

create temp table dd_studio_payload (payload jsonb);
insert into dd_studio_payload values (jsonb_build_object(
  'challenge_mode', 'basic',
  'slug', 'studio-security-test',
  'publish_date', public.current_release_date(),
  'difficulty', 'intermediate',
  'title', 'Studio security test',
  'subtitle', 'A private draft used only inside a rolled-back test.',
  'scenario', repeat('A complete financial decision scenario with enough context for both Basic and Advanced players. ', 2),
  'decision_prompt', 'As an investor, what would you do today?',
  'evidence', jsonb_build_array(
    jsonb_build_object('label','Growth','value','12%','detail','Revenue increased year over year.','tone','positive'),
    jsonb_build_object('label','Debt','value','$40M','detail','Debt is due within the next two years.','tone','negative')
  ),
  'decision_options', jsonb_build_array('Buy','Hold','Reduce','Avoid'),
  'source_note', 'Test source note.',
  'basic_choices', jsonb_build_array(
    jsonb_build_object('prompt_type','reasoning','option_text','Reasoning option one','points',30,'feedback','Reasoning feedback one'),
    jsonb_build_object('prompt_type','reasoning','option_text','Reasoning option two','points',24,'feedback','Reasoning feedback two'),
    jsonb_build_object('prompt_type','reasoning','option_text','Reasoning option three','points',18,'feedback','Reasoning feedback three'),
    jsonb_build_object('prompt_type','reasoning','option_text','Reasoning option four','points',8,'feedback','Reasoning feedback four'),
    jsonb_build_object('prompt_type','risk','option_text','Risk option one','points',25,'feedback','Risk feedback one'),
    jsonb_build_object('prompt_type','risk','option_text','Risk option two','points',20,'feedback','Risk feedback two'),
    jsonb_build_object('prompt_type','risk','option_text','Risk option three','points',14,'feedback','Risk feedback three'),
    jsonb_build_object('prompt_type','risk','option_text','Risk option four','points',6,'feedback','Risk feedback four'),
    jsonb_build_object('prompt_type','change_mind','option_text','Signal option one','points',20,'feedback','Signal feedback one'),
    jsonb_build_object('prompt_type','change_mind','option_text','Signal option two','points',16,'feedback','Signal feedback two'),
    jsonb_build_object('prompt_type','change_mind','option_text','Signal option three','points',11,'feedback','Signal feedback three'),
    jsonb_build_object('prompt_type','change_mind','option_text','Signal option four','points',5,'feedback','Signal feedback four')
  ),
  'outcome', jsonb_build_object(
    'outcome_title','The test outcome stayed protected',
    'outcome_summary','This protected result exists only to verify that draft and outcome access remain secure.',
    'result_label','Approximately +10%',
    'benchmark_label','Test benchmark',
    'benchmark_result','Approximately +4%',
    'learning_points',jsonb_build_array('Protect unpublished work.','Confirm before publishing.')
  )
));

create temp table dd_studio_created (id bigint);
grant select on dd_studio_payload to authenticated;
grant select, insert on dd_studio_created to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated","is_anonymous":false,"app_metadata":{"can_manage_challenges":true}}', true);
insert into dd_studio_created select public.save_challenge_draft(payload) from dd_studio_payload;
reset role;

select is((select count(*) from public.daily_challenges where id = (select id from dd_studio_created)), 1::bigint, 'owner can save a complete challenge draft');
select ok(not (select is_published from public.daily_challenges where id = (select id from dd_studio_created)), 'saved challenge remains private');
select is((select count(*) from public.basic_choice_options where challenge_id = (select id from dd_studio_created)), 12::bigint, 'draft stores all twelve Basic cards');
select is((select count(*) from private.basic_choice_scores score join public.basic_choice_options choice on choice.id = score.option_id where choice.challenge_id = (select id from dd_studio_created)), 12::bigint, 'private scores are stored outside frontend-readable tables');
select is((select count(*) from public.challenge_outcomes where challenge_id = (select id from dd_studio_created)), 1::bigint, 'protected outcome is stored with the draft');

set local role authenticated;
select is(
  (select count(*) from jsonb_array_elements(public.list_challenge_studio()) item where (item ->> 'id')::bigint = (select id from dd_studio_created) and jsonb_array_length(item -> 'basic_choices') = 12),
  1::bigint,
  'owner studio can review the full private draft'
);
select public.save_challenge_draft(
  jsonb_set(jsonb_set((select payload from dd_studio_payload), '{id}', to_jsonb((select id from dd_studio_created))), '{title}', '"Edited studio test"'::jsonb)
);
reset role;
select is((select title from public.daily_challenges where id = (select id from dd_studio_created)), 'Edited studio test', 'owner can edit an unpublished draft');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","is_anonymous":false,"app_metadata":{}}', true);
select throws_ok('select public.list_challenge_studio()', 'P0001', 'Only the Decision Daily owner can manage challenges', 'regular users cannot list private studio content');
select throws_ok('select public.save_challenge_draft((select payload from dd_studio_payload))', 'P0001', 'Only the Decision Daily owner can manage challenges', 'regular users cannot save challenge drafts');
select throws_ok('select public.publish_challenge((select id from dd_studio_created))', 'P0001', 'Only the Decision Daily owner can manage challenges', 'regular users cannot publish challenges');

select set_config('request.jwt.claims', '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated","is_anonymous":true,"app_metadata":{"can_manage_challenges":true}}', true);
select throws_ok('select public.list_challenge_studio()', 'P0001', 'Only the Decision Daily owner can manage challenges', 'anonymous users remain blocked even with a forged-looking claim');

select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated","is_anonymous":false,"app_metadata":{"can_manage_challenges":true}}', true);
select public.publish_challenge((select id from dd_studio_created));
reset role;
select ok((select is_published from public.daily_challenges where id = (select id from dd_studio_created)), 'owner can explicitly publish a reviewed draft');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","is_anonymous":false,"app_metadata":{}}', true);
select is((select count(*) from public.daily_challenges where id = (select id from dd_studio_created)), 1::bigint, 'players can see the published same-day challenge');
select is((select count(*) from public.basic_choice_options where challenge_id = (select id from dd_studio_created)), 12::bigint, 'players can see published Basic card text');
select is((select count(*) from public.challenge_outcomes where challenge_id = (select id from dd_studio_created)), 0::bigint, 'players cannot query the protected outcome before a valid result');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated","is_anonymous":false,"app_metadata":{"can_manage_challenges":true}}', true);
select throws_ok(
  'select public.save_challenge_draft(jsonb_set((select payload from dd_studio_payload), ''{id}'', to_jsonb((select id from dd_studio_created))))',
  'P0001',
  'Only unpublished challenges can be edited',
  'published challenges are locked against later edits'
);
reset role;

select is((select publish_date from public.daily_challenges where id = (select id from dd_studio_created)), public.current_release_date(), 'publication uses the actual Toronto release date');

select * from finish();
rollback;
