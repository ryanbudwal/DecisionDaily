# DecisionLab security notes

- Never commit `.env` files, database passwords, OAuth client secrets, service-role keys, or private keys.
- The browser client may use only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Production environment values are managed by the hosting platform and are not stored in this repository.
- Supabase Row Level Security is the authorization boundary for profiles, submissions, scores, and hidden outcomes.
- Any future server-only integration must keep its secret in a server environment variable without the `NEXT_PUBLIC_` prefix.
