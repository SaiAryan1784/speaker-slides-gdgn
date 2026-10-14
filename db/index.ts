import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "./schema";

let instance: ReturnType<typeof create> | undefined;

function create() {
  return drizzle(neon(env().DATABASE_URL), { schema });
}

/** Lazy so importing this module never touches the network or env at build time. */
export function db() {
  return (instance ??= create());
}

export * from "./schema";
