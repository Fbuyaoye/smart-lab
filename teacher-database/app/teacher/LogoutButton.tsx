"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function logout() {
    const supabase = createClient();
    if (!supabase) return;
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/teacher/login");
    router.refresh();
  }
  return <button className="sidebar-logout" type="button" onClick={logout} disabled={loading}>{loading ? "退出中…" : "退出登录"}</button>;
}
