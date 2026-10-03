import { createBrowserClient } from "@supabase/ssr";
import { fetchWithTimeout } from "./fetch";
import { getSupabaseConfig } from "./config";

export function createClient() {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return null;
  return createBrowserClient(url, key, { global: { fetch: fetchWithTimeout } });
}
