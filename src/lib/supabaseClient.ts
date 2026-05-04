import { createClient } from "@supabase/supabase-js";

const normalizeEnv = (value: string | undefined) => {
  const v = value?.trim();
  if (!v) return undefined;
  return v.replace(/^['"`]/, "").replace(/['"`]$/, "");
};

const supabaseUrl = normalizeEnv((import.meta.env as { VITE_SUPABASE_URL?: string }).VITE_SUPABASE_URL);
const supabaseAnonKey = normalizeEnv((import.meta.env as { VITE_SUPABASE_ANON_KEY?: string }).VITE_SUPABASE_ANON_KEY);

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } }) : null;
