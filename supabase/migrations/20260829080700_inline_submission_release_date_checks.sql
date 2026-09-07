create or replace function private.prepare_submission_attempt()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_attempt integer;
  release_date date;
  eastern_today date := (statement_timestamp() at time zone 'America/Toronto')::date;
begin
  if new.user_id is distinct from (select auth.uid()) then
    raise exception 'Submissions can only be created for the authenticated user';
  end if;

  select challenge.publish_date
    into strict release_date
  from public.daily_challenges as challenge
  where challenge.id = new.challenge_id
    and challenge.is_published;

  if release_date > eastern_today then
    raise exception 'This challenge has not been released yet';
  end if;

  if new.submission_mode = 'basic' and release_date < eastern_today then
    raise exception 'Archive Basic decisions must use submit_basic_decision';
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
      raise unique_violation using message = 'A submission already exists for this challenge';
    end if;

    new.attempt_number := next_attempt + 1;
    new.is_replay := true;
  end if;

  new.is_official := not new.is_replay and release_date = eastern_today;

  return new;
end;
$$;

revoke execute on function private.prepare_submission_attempt() from public, anon, authenticated;
