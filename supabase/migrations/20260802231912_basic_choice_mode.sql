-- DecisionLab V1: fast Basic mode with public choices and private scoring weights.

create table public.basic_choice_options (
  id bigint generated always as identity primary key,
  challenge_id bigint not null references public.daily_challenges(id) on delete cascade,
  prompt_type text not null check (prompt_type in ('reasoning', 'risk', 'change_mind')),
  option_key text not null check (char_length(option_key) between 2 and 20),
  option_text text not null check (char_length(option_text) between 10 and 240),
  display_order smallint not null check (display_order between 1 and 8),
  created_at timestamptz not null default now(),
  unique (challenge_id, prompt_type, option_key),
  unique (challenge_id, prompt_type, display_order)
);

create index basic_choice_options_challenge_prompt_idx
on public.basic_choice_options (challenge_id, prompt_type, display_order);

alter table public.basic_choice_options enable row level security;

create policy "users read choices for available challenges"
on public.basic_choice_options for select
to authenticated
using (
  exists (
    select 1
    from public.daily_challenges as challenge
    where challenge.id = basic_choice_options.challenge_id
      and challenge.is_published
      and challenge.publish_date <= current_date
  )
);

revoke all on public.basic_choice_options from anon, authenticated;
grant select on public.basic_choice_options to authenticated;

create table private.basic_choice_scores (
  option_id bigint primary key references public.basic_choice_options(id) on delete cascade,
  points smallint not null check (points between 0 and 30),
  feedback text not null check (char_length(feedback) between 10 and 300)
);

alter table private.basic_choice_scores enable row level security;
revoke all on private.basic_choice_scores from public, anon, authenticated;

alter table public.challenge_submissions
add column submission_mode text not null default 'basic'
  check (submission_mode in ('basic', 'advanced')),
add column selected_reasoning_option_id bigint
  references public.basic_choice_options(id),
add column selected_risk_option_id bigint
  references public.basic_choice_options(id),
add column selected_change_option_id bigint
  references public.basic_choice_options(id);

with seed (slug, prompt_type, option_key, option_text, points, feedback, display_order) as (
  values
  ('supplier-shock-pricing-decision','reasoning','r1','Use a smaller phased increase to offset a persistent cost shock while testing customer price sensitivity.',30,'This balances the margin pressure with uncertainty about how customers will react.',1),
  ('supplier-shock-pricing-decision','reasoning','r2','Absorb the full increase because the company has enough cash to wait six months.',18,'Cash runway buys time, but absorbing the entire increase leaves the margin decline unresolved.',2),
  ('supplier-shock-pricing-decision','reasoning','r3','Raise prices immediately because the 92% retention rate proves customers will stay.',22,'Retention is useful evidence, but the surveys warn that customers are becoming more price-sensitive.',3),
  ('supplier-shock-pricing-decision','reasoning','r4','Pause expansion because avoiding any pricing decision is the safest response.',12,'Pausing expansion may conserve cash, but it does not directly address the ongoing cost increase.',4),
  ('supplier-shock-pricing-decision','risk','k1','Customers may reduce purchases or switch brands after a price increase.',25,'Demand loss is the central risk because surveys already show greater price sensitivity.',1),
  ('supplier-shock-pricing-decision','risk','k2','Margins may keep falling if the company absorbs costs for too long.',21,'Persistent input inflation could materially weaken profitability.',2),
  ('supplier-shock-pricing-decision','risk','k3','Competitors may announce similar price increases.',9,'A competitor increase could actually make the company response easier, so this is not the main downside.',3),
  ('supplier-shock-pricing-decision','risk','k4','The company may use part of its 18-month cash runway.',13,'Cash use matters, but the available runway gives management some room to respond.',4),
  ('supplier-shock-pricing-decision','change_mind','c1','Early sales data shows little customer loss after a small test increase.',20,'A measurable demand response directly tests whether customers will accept higher prices.',1),
  ('supplier-shock-pricing-decision','change_mind','c2','The ingredient cost returns close to its previous level much sooner than expected.',17,'A temporary cost shock would reduce the need for a lasting price response.',2),
  ('supplier-shock-pricing-decision','change_mind','c3','The company reports higher total revenue next quarter.',9,'Revenue alone may rise because of price and does not reveal customer loss or margin quality.',3),
  ('supplier-shock-pricing-decision','change_mind','c4','A competitor launches a new advertising campaign.',5,'Advertising activity does not directly resolve the pricing and margin trade-off.',4),

  ('variable-mortgage-reset','reasoning','r1','Pay a modest fixed-rate premium to protect a household already spending 34% of income on housing.',30,'This connects the value of certainty to the household’s limited payment flexibility.',1),
  ('variable-mortgage-reset','reasoning','r2','Remain variable because interest rates could eventually fall.',19,'Rates may fall, but this view gives limited weight to the current affordability pressure.',2),
  ('variable-mortgage-reset','reasoning','r3','Make a prepayment to reduce interest costs, while preserving enough of the emergency fund.',25,'This can improve the balance sheet, but only if it does not weaken the household safety buffer.',3),
  ('variable-mortgage-reset','reasoning','r4','Extend amortization because the smallest monthly payment is always the best option.',11,'Lower payments help today, but the statement ignores the increase in lifetime interest cost.',4),
  ('variable-mortgage-reset','risk','k1','Further rate increases could push the household budget beyond a comfortable level.',25,'The payment burden is already elevated, making another increase the clearest downside.',1),
  ('variable-mortgage-reset','risk','k2','A large prepayment could leave too little emergency cash.',22,'Liquidity risk matters because the household currently has only five months of expenses saved.',2),
  ('variable-mortgage-reset','risk','k3','The refinancing fee may slightly increase the cost of switching.',12,'The fee matters, but it is modest relative to three years of payment uncertainty.',3),
  ('variable-mortgage-reset','risk','k4','The market value of the home could move next year.',6,'Home value changes are less relevant to the immediate payment and rate decision.',4),
  ('variable-mortgage-reset','change_mind','c1','The offered fixed-rate premium changes materially or the rate outlook shifts.',20,'The price of certainty and the expected direction of rates directly affect the choice.',1),
  ('variable-mortgage-reset','change_mind','c2','The household loses income or its emergency fund falls below three months.',18,'A weaker safety buffer would make predictable payments more valuable.',2),
  ('variable-mortgage-reset','change_mind','c3','Nearby homes begin selling at higher prices.',6,'Local selling prices do not materially change the household’s monthly affordability.',3),
  ('variable-mortgage-reset','change_mind','c4','A neighbour chooses a different mortgage product.',4,'Another household may have completely different income, debt, and risk tolerance.',4),

  ('duplex-cash-flow-test','reasoning','r1','Renegotiate because the roof cost and narrow debt-coverage cushion are not reflected in the asking case.',30,'This combines the major known expense with the property’s limited room for error.',1),
  ('duplex-cash-flow-test','reasoning','r2','Buy at asking because the cap rate beats comparable properties and vacancy is low.',22,'The valuation and rental demand are positive, but this underweights the roof reserve and thin cushion.',2),
  ('duplex-cash-flow-test','reasoning','r3','Wait for an inspection and verified rent information before deciding.',27,'More diligence directly addresses the largest unknowns without rejecting the opportunity outright.',3),
  ('duplex-cash-flow-test','reasoning','r4','Walk away because any property needing repairs is a poor investment.',10,'Repairs are not automatically disqualifying when they are understood and reflected in the price.',4),
  ('duplex-cash-flow-test','risk','k1','The roof replacement could erase cash flow while debt coverage is already thin.',25,'The known capital expense is especially important because the property has little cash-flow cushion.',1),
  ('duplex-cash-flow-test','risk','k2','The below-market unit may not be easy or legal to reprice quickly.',21,'Projected upside may be delayed by lease terms, regulation, or tenant turnover timing.',2),
  ('duplex-cash-flow-test','risk','k3','Vacancy could rise from its currently low level.',18,'A weaker rental market would pressure an investment with limited debt coverage.',3),
  ('duplex-cash-flow-test','risk','k4','Comparable properties may continue trading near a 5% cap rate.',7,'Comparable pricing supports the valuation more than it threatens it.',4),
  ('duplex-cash-flow-test','change_mind','c1','An inspection and contractor quote confirm the roof cost and cash flow still covers a realistic reserve.',20,'Verified repair costs and adjusted debt coverage directly test whether the investment is viable.',1),
  ('duplex-cash-flow-test','change_mind','c2','Lease review shows when and how the below-market rent can legally change.',17,'This clarifies whether the expected rental upside is realistic.',2),
  ('duplex-cash-flow-test','change_mind','c3','The seller says they are motivated to close quickly.',9,'Motivation matters only if it produces a better price or terms.',3),
  ('duplex-cash-flow-test','change_mind','c4','The units receive fresh paint before closing.',4,'Cosmetic work does not resolve the roof, rent, or debt-coverage questions.',4),

  ('crypto-treasury-allocation','reasoning','r1','Limit any allocation to 1–2% so the company preserves acquisition flexibility while testing the idea.',30,'A small position recognizes the excess cash while limiting volatility and liquidity risk.',1),
  ('crypto-treasury-allocation','reasoning','r2','Reject the proposal because the acquisition horizon makes volatile treasury assets difficult to match with planned cash needs.',25,'This directly connects asset volatility with the company’s possible use of cash.',2),
  ('crypto-treasury-allocation','reasoning','r3','Approve 5% because the company has $35 million above its reserve target.',18,'Excess cash creates capacity, but it does not by itself justify the size of a volatile allocation.',3),
  ('crypto-treasury-allocation','reasoning','r4','Approve 10% because the company has no near-term debt maturities.',8,'The absence of debt does not remove acquisition, volatility, governance, or liquidity risks.',4),
  ('crypto-treasury-allocation','risk','k1','A major drawdown could reduce cash available when an acquisition opportunity appears.',25,'The mismatch between a volatile asset and a possible near-term cash need is the central risk.',1),
  ('crypto-treasury-allocation','risk','k2','The board may create governance and reputation concerns without a clear treasury policy.',20,'A speculative treasury decision needs defined limits, custody rules, and oversight.',2),
  ('crypto-treasury-allocation','risk','k3','Custody or operational failures could cause losses or disruption.',15,'Institutional custody reduces this risk but does not eliminate it.',3),
  ('crypto-treasury-allocation','risk','k4','The company might miss some upside if cryptocurrency prices rise.',6,'Missing upside is an opportunity cost, not the main downside risk to corporate liquidity.',4),
  ('crypto-treasury-allocation','change_mind','c1','The acquisition plan, maximum drawdown limit, and sale rules become clearly defined.',20,'A formal policy and known cash horizon directly improve the quality of the treasury decision.',1),
  ('crypto-treasury-allocation','change_mind','c2','Longer-term evidence shows lower volatility and useful diversification against the company’s other assets.',17,'Better risk and correlation evidence would strengthen the diversification case.',2),
  ('crypto-treasury-allocation','change_mind','c3','The cryptocurrency price rises sharply over the next month.',6,'A short price move does not establish that the asset fits the company’s treasury needs.',3),
  ('crypto-treasury-allocation','change_mind','c4','Several competing software companies announce similar purchases.',8,'Peer activity may be informative, but it does not replace an analysis of this company’s needs.',4),

  ('subscription-company-crossroads','reasoning','r1','Reduce or avoid because weaker guidance and an elevated valuation outweigh the impressive historical growth.',30,'This weighs forward-looking customer risk against past growth and the price still implied by the market.',1),
  ('subscription-company-crossroads','reasoning','r2','Buy because the stock is 42% below its high and subscriber growth was strong last year.',16,'A lower share price and past growth do not show that the current valuation is attractive.',2),
  ('subscription-company-crossroads','reasoning','r3','Hold until customer churn reveals whether the pricing change caused temporary anger or lasting damage.',27,'Waiting for retention evidence directly addresses the largest uncertainty.',3),
  ('subscription-company-crossroads','reasoning','r4','Buy because management says the separation is necessary for the digital future.',10,'Management’s narrative needs support from customer behavior and financial results.',4),
  ('subscription-company-crossroads','risk','k1','Customers may cancel because the new structure feels like a forced price increase.',25,'Customer churn is the most direct threat identified by the scenario and guidance.',1),
  ('subscription-company-crossroads','risk','k2','The elevated valuation may fall further if long-term growth expectations reset.',22,'High expectations leave the share price vulnerable to weaker growth.',2),
  ('subscription-company-crossroads','risk','k3','Management may execute the service transition poorly.',18,'Operational mistakes could deepen customer dissatisfaction and slow the digital strategy.',3),
  ('subscription-company-crossroads','risk','k4','The share price may decline again tomorrow.',7,'Price movement is an outcome, not an explanation of the underlying business risk.',4),
  ('subscription-company-crossroads','change_mind','c1','Retention stabilizes after the pricing change and management stops lowering customer guidance.',20,'Customer retention and guidance directly test whether the relationship damage is temporary.',1),
  ('subscription-company-crossroads','change_mind','c2','The digital strategy produces stronger margins and attractive customer economics.',17,'Improved economics could justify accepting slower near-term customer growth.',2),
  ('subscription-company-crossroads','change_mind','c3','The share price rebounds toward its previous high.',6,'A price rebound alone does not resolve customer or valuation concerns.',3),
  ('subscription-company-crossroads','change_mind','c4','Management gives a confident television interview.',7,'Confidence is less useful than measurable retention, guidance, and unit economics.',4)
), inserted as (
  insert into public.basic_choice_options (
    challenge_id, prompt_type, option_key, option_text, display_order
  )
  select challenge.id, seed.prompt_type, seed.option_key, seed.option_text, seed.display_order
  from seed
  join public.daily_challenges as challenge on challenge.slug = seed.slug
  on conflict (challenge_id, prompt_type, option_key) do update
  set option_text = excluded.option_text,
      display_order = excluded.display_order
  returning id, challenge_id, prompt_type, option_key
)
insert into private.basic_choice_scores (option_id, points, feedback)
select inserted.id, seed.points, seed.feedback
from inserted
join public.daily_challenges as challenge on challenge.id = inserted.challenge_id
join seed on seed.slug = challenge.slug
  and seed.prompt_type = inserted.prompt_type
  and seed.option_key = inserted.option_key
on conflict (option_id) do update
set points = excluded.points,
    feedback = excluded.feedback;

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

  if new.submission_mode <> 'basic' then
    raise exception 'advanced mode is not available yet';
  end if;

  if not exists (
    select 1 from public.daily_challenges as challenge
    where challenge.id = new.challenge_id
      and challenge.decision_options ? new.decision
  ) then
    raise exception 'decision is not available for this challenge';
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
    'position_sizing', jsonb_build_object(
      'score', sizing_points,
      'max', 15,
      'feedback', case
        when sizing_points = 15 then 'Your capital at risk is disciplined relative to your confidence.'
        when sizing_points = 10 then 'Your allocation is somewhat aggressive relative to your confidence.'
        else 'Your allocation is much more aggressive than your confidence supports.'
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
    3
  );

  return new;
end;
$$;

revoke execute on function private.persist_submission_score() from public, anon, authenticated;

