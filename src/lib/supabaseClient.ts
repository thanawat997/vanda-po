import { createClient } from "@supabase/supabase-js";

const stripOuterQuotes = (value: string) => value.replace(/^["']|["']$/g, "");
const normalizeEnv = (value?: string) => {
  const trimmed = String(value ?? "").trim();
  return trimmed ? stripOuterQuotes(trimmed) : "";
};

const supabaseUrl = normalizeEnv((import.meta.env as { VITE_SUPABASE_URL?: string }).VITE_SUPABASE_URL);
const supabaseAnonKey = normalizeEnv((import.meta.env as { VITE_SUPABASE_ANON_KEY?: string }).VITE_SUPABASE_ANON_KEY);

export const supabaseConfigError = (() => {
  if (!supabaseUrl || !supabaseAnonKey) return "ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY";
  if (supabaseUrl.startsWith("postgresql://")) return "VITE_SUPABASE_URL ต้องเป็น Project URL (https://...supabase.co) ไม่ใช่ Postgres connection string";
  if (!supabaseUrl.startsWith("https://")) return "VITE_SUPABASE_URL ต้องขึ้นต้นด้วย https://";
  return null;
})();

export const supabase = !supabaseConfigError ? createClient(supabaseUrl.replace(/\/+$/, ""), supabaseAnonKey) : null;

export const formatSupabaseError = (err: unknown) => {
  if (!err) return "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || "เกิดข้อผิดพลาด";

  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    const message = typeof obj.message === "string" ? obj.message : "";
    if (!message) return "เกิดข้อผิดพลาด";

    const details = typeof obj.details === "string" ? obj.details : "";
    const hint = typeof obj.hint === "string" ? obj.hint : "";
    const code = typeof obj.code === "string" ? obj.code : "";
    const extra = [code ? `code=${code}` : "", details ? `details=${details}` : "", hint ? `hint=${hint}` : ""].filter(Boolean).join(" | ");
    return extra ? `${message} (${extra})` : message;
  }

  return "เกิดข้อผิดพลาด";
};

export const supabaseUrlHost = (() => {
  try {
    if (!supabaseUrl) return "";
    return new URL(supabaseUrl).host;
  } catch {
    return "";
  }
})();
