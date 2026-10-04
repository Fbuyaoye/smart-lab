import { NextRequest, NextResponse } from "next/server";

const maxNotesLength = 5_000;

export async function POST(request: NextRequest) {
    const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
    > | null;

    if (!body) {
        return NextResponse.json(
            { error: "请求数据无效。" },
            { status: 400 },
        );
    }

    if (
        typeof body.experimentId !== "string" ||
        !body.experimentId.trim()
    ) {
        return NextResponse.json(
            { error: "缺少实验标识。" },
            { status: 400 },
        );
    }

    if (!Array.isArray(body.rawData)) {
        return NextResponse.json(
            { error: "缺少实验原始数据。" },
            { status: 400 },
        );
    }

    if (
        body.analysisSummary !== undefined &&
        typeof body.analysisSummary !== "string"
    ) {
        return NextResponse.json(
            { error: "数据分析结果格式不正确。" },
            { status: 400 },
        );
    }

    if (
        body.studentNotes !== undefined &&
        (typeof body.studentNotes !== "string" ||
            body.studentNotes.length > maxNotesLength)
    ) {
        return NextResponse.json(
            { error: "学生备注不能超过 5000 个字符。" },
            { status: 400 },
        );
    }

    const serviceUrl = process.env.AI_SERVICE_URL;
    const serviceToken = process.env.AI_SERVICE_TOKEN;

    if (!serviceUrl || !serviceToken) {
        return NextResponse.json(
            { error: "AI 服务尚未配置。" },
            { status: 503 },
        );
    }

    try {
        const upstream = await fetch(
            `${serviceUrl.replace(/\/$/, "")}/v1/ai/report`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${serviceToken}`,
                },
                body: JSON.stringify({
                    experimentId: body.experimentId,
                    rawData: body.rawData,
                    analysisSummary: body.analysisSummary ?? "",
                    studentNotes: body.studentNotes ?? "",
                }),
                cache: "no-store",
            },
        );

        const payload = await upstream
            .json()
            .catch(() => ({ error: "AI 服务返回了无效响应。" }));

        return NextResponse.json(payload, { status: upstream.status });
    } catch {
        return NextResponse.json(
            { error: "暂时无法连接 AI 服务。" },
            { status: 502 },
        );
    }
}