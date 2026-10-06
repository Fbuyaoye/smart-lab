import { NextRequest, NextResponse } from "next/server";

const maxNotesLength = 5_000;

type ReportDraft = {
    purpose: string;
    principle: string;
    apparatus: string;
    procedure: string;
    dataAnalysis: string;
    results: string;
    errorAnalysis: string;
    conclusion: string;
};

function isReportDraft(value: unknown): value is ReportDraft {
    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value)
    ) {
        return false;
    }

    const draft = value as Record<string, unknown>;

    const requiredKeys = [
        "purpose",
        "principle",
        "apparatus",
        "procedure",
        "dataAnalysis",
        "results",
        "errorAnalysis",
        "conclusion",
    ];

    return requiredKeys.every(
        (key) => typeof draft[key] === "string",
    );
}

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
        (
            typeof body.studentNotes !== "string" ||
            body.studentNotes.length > maxNotesLength
        )
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
            `${serviceUrl.replace(/\/$/, "")}/v1/ai/report-draft`,
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

        const payload = (await upstream.json().catch(() => null)) as {
            experimentId?: string;
            draft?: unknown;
            error?: string;
        } | null;

        if (!upstream.ok) {
            return NextResponse.json(
                {
                    error:
                        typeof payload?.error === "string"
                            ? payload.error
                            : "AI 服务生成报告失败。",
                },
                { status: upstream.status },
            );
        }

        if (!payload || !isReportDraft(payload.draft)) {
            return NextResponse.json(
                { error: "AI 服务返回的报告格式不正确。" },
                { status: 502 },
            );
        }

        return NextResponse.json({
            experimentId:
                typeof payload.experimentId === "string"
                    ? payload.experimentId
                    : body.experimentId,
            draft: payload.draft,
        });
    } catch {
        return NextResponse.json(
            { error: "暂时无法连接 AI 服务。" },
            { status: 502 },
        );
    }
}