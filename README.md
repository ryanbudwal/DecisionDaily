# Decision Daily

Decision Daily is a shared financial decision-making game. Players choose cards in a Basic Daily challenge or write an analysis for an Advanced Weekly challenge. The outcome stays hidden until they submit, and the score measures their decision process.

## Current product

- Shared Basic Daily and Advanced Weekly challenges
- Email/password accounts and optional guest play through Supabase
- Locked official submissions and repeatable archive practice
- Deterministic reasoning and risk-management score
- Outcome hidden until submission
- Permanent chronological archive
- Practice access to missed challenges
- Private per-user submission history

## Project map

- `app/` contains the Next.js routes and global styles.
- `components/` contains shared auth, challenge, layout, profile, and score UI.
- `lib/` contains the Supabase client and database queries used by those routes.
- `types/` describes the data each UI flow reads or writes.
- `supabase/schema.sql` bootstraps the database; `supabase/migrations/` evolves it; `supabase/tests/` holds database checks.
- `content/` holds a public-safe index of scheduled challenges.

## Local setup

Copy `.env.example` to `.env.local` and add the project's public Supabase URL and publishable key. Never place a service-role key or OAuth client secret in a `NEXT_PUBLIC_` variable.

```bash
npm install
npm run dev
```

## Release checks and deployment

Run the local release checks before deploying:

```bash
npm run check
```

To deploy on Vercel, import this repository as a Next.js project. Vercel detects the framework and uses `npm run build` automatically. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` under the project's Environment Variables for Development, Preview, and Production, then deploy. The same values can be set locally in `.env.local`.

Before a public launch, configure the production site URL and allowed redirect URLs in Supabase Auth, enable anonymous sign-ins for guest mode, and configure a production SMTP provider for account-confirmation and password-reset mail. Keep Google OAuth disabled unless the Google sign-in UI is restored.

The browser is allowed to receive the Supabase URL and publishable key. Security is enforced in Postgres with row-level security; private keys remain only in Supabase's dashboard.

## Database

[`supabase/schema.sql`](supabase/schema.sql) is the initial database schema. Apply it before the timestamped files under [`supabase/migrations`](supabase/migrations), in order. The migrations evolve that baseline into the current schema; the initial file is not a snapshot of the current database. Challenge outcomes are stored separately from prompts so row-level security can keep them hidden until the current user submits. Submissions have no update or delete policy, making each decision append-only and locked.

Published scenarios remain in chronological order for practice.

## Scheduled Basic Daily scenarios

[`content/basic-daily-2026-10-13.json`](content/basic-daily-2026-10-13.json) lists the ten simulated cases scheduled in the DecisionDaily Supabase project for October 13–22, 2026. The complete prompts, evidence, choice cards, private scores, and outcomes are stored in Supabase. The index omits unreleased scenario text and protected answers so publishing the repository does not reveal them. All companies and figures in this batch are fictional.

The October 13 case is available now. The other cases are stored as published releases, but database row-level security reveals each one to players only on or after its `publish_date`, using the America/Toronto release date. Outcomes remain hidden until the player submits a decision.
