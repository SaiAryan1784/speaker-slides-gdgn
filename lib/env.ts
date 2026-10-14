import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is missing"),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD is missing or shorter than 8 characters"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET is missing or shorter than 32 characters"),
});

export type Env = z.infer<typeof schema>;

/** Throws an error naming every missing/invalid variable (SEAM-8). */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const r = schema.safeParse(source);
  if (!r.success) {
    const names = r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment — ${names}`);
  }
  return r.data;
}

let cached: Env | undefined;
export function env(): Env {
  return (cached ??= parseEnv(process.env));
}
