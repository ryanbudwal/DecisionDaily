alter table public.profiles
  add column risk_tolerance text not null default 'Medium',
  add column strength text not null default 'Long-term thinking',
  add column weakness text not null default 'Overconfidence during high volatility',
  add column decision_style text not null default 'Growth-oriented',
  add column most_common_mistake text not null default 'Ignoring downside scenarios',
  add column assessment_updated_at timestamptz not null default now();

alter table public.profiles
  add constraint profiles_risk_tolerance_length check (char_length(risk_tolerance) between 1 and 40),
  add constraint profiles_strength_length check (char_length(strength) between 1 and 160),
  add constraint profiles_weakness_length check (char_length(weakness) between 1 and 160),
  add constraint profiles_decision_style_length check (char_length(decision_style) between 1 and 80),
  add constraint profiles_most_common_mistake_length check (char_length(most_common_mistake) between 1 and 160);

comment on column public.profiles.risk_tolerance is 'Server-calculated risk posture derived from locked decisions.';
comment on column public.profiles.strength is 'Server-calculated decision-making strength.';
comment on column public.profiles.weakness is 'Server-calculated decision-making weakness.';
comment on column public.profiles.decision_style is 'Server-calculated decision style.';
comment on column public.profiles.most_common_mistake is 'Server-calculated recurring decision error.';
comment on column public.profiles.assessment_updated_at is 'When the server last recalculated the decision profile.';

-- Assessment columns intentionally remain absent from the authenticated update grant.
-- Users can read their own assessment through the existing profile RLS policy,
-- while only trusted server-side code can change these derived values.
