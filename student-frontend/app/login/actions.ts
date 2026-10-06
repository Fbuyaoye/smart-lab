"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

type LoginResult = {
    error?: string;
};

export async function loginWithStudentId(
    studentId: string,
    password: string
): Promise<LoginResult> {
    const supabase = await createClient();

    if (!supabase) {
        return { error: "Supabase 未配置" };
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
        return { error: "服务器配置不完整" };
    }

    try {
        // 使用 Service Role 查询学生对应的 users.id
        const admin = createAdminClient(url, serviceRoleKey);

        const { data: userRow, error: userError } = await admin
            .from("users")
            .select("id")
            .eq("student_id", studentId)
            .maybeSingle();

        if (userError) {
            console.error("查询学生失败:", userError);
            return { error: "登录失败，请稍后再试" };
        }

        if (!userRow) {
            return { error: "学号或密码错误" };
        }

        // 根据 users.id 找到对应的 Supabase Auth 用户
        const {
            data: { user },
            error: authUserError,
        } = await admin.auth.admin.getUserById(userRow.id);

        if (authUserError || !user?.email) {
            console.error("查询 Auth 用户失败:", authUserError);
            return { error: "登录失败，请检查账号配置" };
        }

        // 使用真正的 Supabase Auth 登录
        const { error: loginError } =
            await supabase.auth.signInWithPassword({
                email: user.email,
                password,
            });

        if (loginError) {
            console.error("密码登录失败:", loginError);
            return { error: "学号或密码错误" };
        }

        return {};
    } catch (error) {
        console.error("登录异常:", error);
        return { error: "登录失败，请稍后再试" };
    }
}