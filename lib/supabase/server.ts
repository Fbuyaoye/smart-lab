import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";

export function createClient() {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return null;
  const cookieStore = cookies();
  return createServerClient(url, key, {
    cookies: {
      get(name: string) { return cookieStore.get(name)?.value; },
      set(name: string, value: string, options: Record<string, unknown>) { try { cookieStore.set({ name, value, ...options }); } catch {} },
      remove(name: string, options: Record<string, unknown>) { try { cookieStore.set({ name, value: "", ...options }); } catch {} },
    },
  });
}
