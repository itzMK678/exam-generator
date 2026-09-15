import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
  throw new Error(
    "Missing Supabase environment variables"
  );
}

export const supabase = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey
);