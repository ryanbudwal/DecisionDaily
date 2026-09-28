# DecisionDaily

DecisionLab is a daily financial decision-making platform inspired by Wordle. Every signed-in user receives the same challenge each day, submits a decision and written reasoning before seeing the outcome, and is scored on decision quality rather than profit alone.

## Current product

- One shared daily challenge
- Email/password authentication through Supabase
- Email/password accounts and optional guest play
- Locked, one-time submissions
- Deterministic reasoning and risk-management score
- Outcome hidden until submission
- Permanent chronological archive
- Practice access to missed challenges
- Private per-user submission history

## Local setup

Copy `.env.example` to `.env.local` and add the project's public Supabase URL and publishable key. Never place a service-role key or OAuth client secret in a `NEXT_PUBLIC_` variable.

```bash
npm install
npm run dev
```

## Release checks and deployment

Run the full local release gate before deploying:

```bash
npm run check
npm run deploy:dry-run
```

Deploy the generated Worker to Cloudflare with:

```bash
npm run deploy
```

Before a public launch, configure the production site URL and allowed redirect URLs in Supabase Auth, enable anonymous sign-ins for guest mode, and configure a production SMTP provider for account-confirmation and password-reset mail. Keep Google OAuth disabled unless the Google sign-in UI is restored.

The browser is allowed to receive the Supabase URL and publishable key. Security is enforced in Postgres with row-level security; private keys remain only in Supabase's dashboard.

## Database

The schema scaffold is documented in [`supabase/schema.sql`](supabase/schema.sql), while the timestamped files under [`supabase/migrations`](supabase/migrations) are the source of truth for the deployed database. Challenge outcomes are stored separately from prompts so row-level security can keep them hidden until the current user submits. Submissions have no update or delete policy, making each decision append-only and locked.

Each publish date has one shared scenario. Past scenarios remain in chronological order for practice.
