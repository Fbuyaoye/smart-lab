import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  function loginRedirect(reason: string) {
    const redirect = NextResponse.redirect(new URL(`/teacher/login?error=${reason}`, request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  const isTeacherRoute = request.nextUrl.pathname.startsWith("/teacher") && request.nextUrl.pathname !== "/teacher/login";
  if (isTeacherRoute) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return loginRedirect("session-missing");
      // app_metadata is written by an administrator and is carried in the
      // freshly issued JWT. Avoid an extra remote auth call immediately after
      // login; database RLS still enforces this role on every query.
      if (session.user.app_metadata?.role === "teacher") return response;

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError && authError.name !== "AuthSessionMissingError") {
        return loginRedirect("auth-check-failed");
      } else if (!user) {
        return loginRedirect("session-missing");
      }
      const { data: isTeacher, error: roleError } = await supabase.rpc("is_teacher");
      if (roleError) {
        return loginRedirect("role-check-failed");
      }
      if (!isTeacher) return loginRedirect("teacher-only");
    } catch {
      return loginRedirect("auth-check-failed");
    }
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
