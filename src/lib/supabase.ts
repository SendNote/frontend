import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../supabase";
import "dotenv";

// Safely access environment variables using static access for bundler compatibility
// @ts-ignore
// const supabaseUrl =
//   import.meta.env?.BUN_PUBLIC_SUPABASE_URL ??
//   (typeof process !== "undefined"
//     ? process.env?.BUN_PUBLIC_SUPABASE_URL
//     : undefined);

// // @ts-ignore
// const supabaseAnonKey =
//   import.meta.env?.BUN_PUBLIC_SUPABASE_ANON_KEY ??
//   (typeof process !== "undefined"
//     ? process.env?.BUN_PUBLIC_SUPABASE_ANON_KEY
//     : undefined);

const supabaseUrl = process.env.BUN_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.BUN_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
