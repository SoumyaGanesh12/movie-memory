import "server-only";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().startsWith("postgres"),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Print only the names of bad variables, never their values.
  const names = parsed.error.issues.map((issue) => issue.path.join("."));
  throw new Error(`Invalid or missing environment variables: ${names.join(", ")}`);
}

export const env = parsed.data;