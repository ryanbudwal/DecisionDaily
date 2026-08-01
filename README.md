# DecisionLab

DecisionLab is a daily financial decision-making platform inspired by Wordle. Every signed-in user receives the same challenge each day, submits a decision and written reasoning before seeing the outcome, and is scored on decision quality rather than profit alone.

## Current product

- One shared daily challenge
- Email/password authentication through Supabase
- Google sign-in button (requires Google OAuth credentials in Supabase)
- Locked, one-time submissions
- Deterministic reasoning and risk-management score
- Outcome hidden until submission
- Permanent archive with category filters
- Practice access to missed challenges
- Private per-user submission history

## Local setup

Copy `.env.example` to `.env.local` and add the project's public Supabase URL and publishable key. Never place a service-role key or OAuth client secret in a `NEXT_PUBLIC_` variable.

```bash
npm install
npm run dev
```

The browser is allowed to receive the Supabase URL and publishable key. Security is enforced in Postgres with row-level security; private keys remain only in Supabase's dashboard.

## Database

The original deployed schema is documented in [`supabase/schema.sql`](supabase/schema.sql), with forward changes recorded under [`supabase/migrations`](supabase/migrations). Challenge outcomes are stored separately from prompts so row-level security can keep them hidden until the current user submits. Submissions have no update or delete policy, making each decision append-only and locked.

Categories currently supported: economics, investing, personal finance, real estate, and crypto.
