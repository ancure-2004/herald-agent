import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .url("NEXT_PUBLIC_API_BASE_URL must be a valid URL")
    .default("http://localhost:8000"),
});

const rawEnv = {
  NEXT_PUBLIC_API_BASE_URL:
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000",
};

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.format());
  throw new Error("Invalid frontend environment configuration. Check config/env.ts");
}

export const env = parsed.data;
