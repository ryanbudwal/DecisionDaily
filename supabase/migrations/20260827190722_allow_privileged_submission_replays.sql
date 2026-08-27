alter table public.challenge_submissions
  add column attempt_number integer not null default 1
    check (attempt_number > 0),
  add column is_replay boolean not null default false;

alter table public.challenge_submissions
  drop constraint challenge_submissions_user_id_challenge_id_key;

alter table public.challenge_submissions
  add constraint challenge_submissions_user_challenge_attempt_key
  unique (user_id, challenge_id, attempt_number);

create or replace function private.prepare_submission_attempt()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_attempt integer;
begin
  if new.user_id is distinct from (select auth.uid()) then
    raise exception 'submission user must match the authenticated user';
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

  return new;
end;
$$;

revoke execute on function private.prepare_submission_attempt() from public, anon, authenticated;

create trigger prepare_submission_attempt
before insert on public.challenge_submissions
for each row execute function private.prepare_submission_attempt();
