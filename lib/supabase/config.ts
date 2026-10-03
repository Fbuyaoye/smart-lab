// Keep direct NEXT_PUBLIC_* references so Next.js can include the configured
// values in the browser bundle. Deployment changes require a new build.
export function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
      || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
      || "",
  };
}

export function getSupabaseConfigurationError() {
  const { url, key } = getSupabaseConfig();
  const missing = [];
  if (!url) missing.push("Supabase 项目地址");
  if (!key) missing.push("Supabase 公开 API key");
  return missing.length
    ? `登录服务缺少${missing.join("和")}。请由网站管理员补全配置后重新启动或部署网站。`
    : "";
}
