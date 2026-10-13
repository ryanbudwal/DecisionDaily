import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

for (const name of required) {
  const value = process.env[name];
  if (!value || value.includes("your-project") || value.includes("your-supabase")) {
    throw new Error(`${name} must be configured before building Decision Daily.`);
  }
}

if (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.startsWith("sb_secret_")) {
  throw new Error("A secret Supabase key must never be included in the browser build.");
}
