import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env.local")) {
  loadEnvFile(".env.local");
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

for (const name of required) {
  const value = process.env[name];
  if (!value || value.includes("your-project") || value.includes("your-supabase")) {
    throw new Error(`${name} must be configured before building DecisionLab.`);
  }
}

if (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.startsWith("sb_secret_")) {
  throw new Error("A secret Supabase key must never be included in the browser build.");
}
