import { createClient } from "@supabase/supabase-js";

const supabaseUrl = ((import.meta.env as { VITE_SUPABASE_URL?: string }).VITE_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = ((import.meta.env as { VITE_SUPABASE_ANON_KEY?: string }).VITE_SUPABASE_ANON_KEY ?? "").trim();

export const supabaseConfigError = (() => {
  if (!supabaseUrl) return "ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL";
  if (!supabaseAnonKey) return "ยังไม่ได้ตั้งค่า VITE_SUPABASE_ANON_KEY";
  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== "https:") return "VITE_SUPABASE_URL ต้องขึ้นต้นด้วย https://";
  } catch {
    return "VITE_SUPABASE_URL ไม่ถูกต้อง";
  }
  return null;
})();

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
