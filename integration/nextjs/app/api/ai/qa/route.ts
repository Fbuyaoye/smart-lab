import { NextRequest, NextResponse } from "next/server";

const maxQuestionLength = 2_000;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.question !== "string" || !body.question.trim() || body.question.length > maxQuestionLength) {
    return NextResponse.json({ error: "问题不能为空，且不能超过 2000 个字符。" }, { status: 400 });
  }
  if (typeof body.experimentId !== "string" || !body.experimentId.trim()) {
    return NextResponse.json({ error: "缺少实验标识。" }, { status: 400 });
  }

  const serviceUrl = process.env.AI_SERVICE_URL;
  const serviceToken = process.env.AI_SERVICE_TOKEN;
  if (!serviceUrl || !serviceToken) {
    return NextResponse.json({ error: "AI 服务尚未配置。" }, { status: 503 });
  }

  try {
    const upstream = await fetch(`${serviceUrl.replace(/\/$/, "")}/v1/ai/qa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceToken}`,
      },
      body: JSON.stringify({
        experimentId: body.experimentId,
        question: body.question.trim(),
        history: Array.isArray(body.history) ? body.history : [],
      }),
      cache: "no-store",
    });
    const payload = await upstream.json().catch(() => ({ error: "AI 服务返回了无效响应。" }));
    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "暂时无法连接 AI 服务。" }, { status: 502 });
  }
}
