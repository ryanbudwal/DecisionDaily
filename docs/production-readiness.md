# Production readiness (Vercel Hobby)

This checklist is for the first Decision Daily deployment. The repository has no Vercel project link yet, so dashboard settings and the public site have not been verified.

## Handled in the repository

- Next.js App Router builds with `npm run build`; `npm run check` also runs lint and TypeScript checks.
- Dependency versions are pinned in `package-lock.json`. Next.js and its production transitive dependencies were updated after an npm audit identified high severity issues in the older release.
- The current production dependency audit reports zero vulnerabilities. The full audit still reports five high severity findings in the development-only ESLint toolchain; npm's suggested downgrade to an older major version is unsuitable for this Next.js 16 project. Recheck those advisories when upstream fixes are released.
- Vercel Web Analytics is mounted in the root layout. It starts reporting after the dashboard feature is enabled and the new deployment receives visits.
- Baseline response headers block framing and browser features the app does not use. The app uses the browser Supabase client with a publishable key; no service-role key belongs in Vercel environment variables.
- Daily scenarios are gated by publish date in Supabase, so a single deployment does not release all scheduled content at once.

## Before the first public visit

1. Import the GitHub repository into Vercel as a Next.js project. Set the production branch to `main` and use the default build command.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Production and Preview (and Development if Vercel development environments will be used). Redeploy after changing either value because Next.js embeds public variables at build time.
3. In Supabase Auth, set the Site URL to the production Vercel URL and allow the production and preview redirect URLs needed by email confirmation and password reset. Keep anonymous sign-ins enabled for guest play. Configure production SMTP and enable leaked-password protection if available on the Supabase plan.
4. Enable Vercel Web Analytics. After deployment, visit the site and navigate to another page, then confirm the dashboard records traffic. Check sign-up, sign-in, guest mode, daily challenge, submission, and sign-out on the public URL.
5. Review Vercel Deployment Protection. Keep previews protected if collaborators do not need public preview links. Review team access and set Spend Management alerts or usage notifications available to the Hobby plan.
6. Keep a rollback path: record the last healthy Vercel deployment and use the dashboard's rollback or redeploy controls if a release fails. Check Vercel deployment logs and Supabase logs after launch.

## Follow-up work

- A strict Content Security Policy needs a deployed URL and browser validation because Next.js scripts, Supabase requests, and Vercel Analytics all need explicit allowances. Add it after checking the real response in the browser. The current headers are a baseline, not a full CSP.
- The browser talks directly to Supabase, so Vercel Function region, Function memory, Fluid Compute, ISR, distributed Function tracing, and Vercel Function rate limiting are not used by this app today. Review Supabase Auth limits separately before any public load test.
- There is no custom domain or DNS migration yet. Image optimization, font optimization, and large media storage are not active concerns in the current app.
- Enterprise-only items in Vercel's general checklist (SAML/SCIM, audit logs, multi-region failover, and Enterprise load testing) do not apply to Hobby. Advanced observability and log drains depend on plan and budget.
