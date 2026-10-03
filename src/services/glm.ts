import { AppError } from "../errors.js";

type AiMessage = {
  role: "system" | "user";
  content: string;
};

/** Calls Zhipu AI's OpenAI-compatible chat-completions endpoint from the server only. */
export async function askGlm(messages: AiMessage[]): Promise<string> {
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) throw new AppError(503, "GLM_API_KEY is not configured.");

  const timeoutMs = Number(process.env.GLM_TIMEOUT_MS ?? "30000");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(process.env.GLM_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GLM_MODEL ?? "glm-4-flash",
        temperature: 0.2,
        stream: false,
        messages,
      }),
      signal: controller.signal,
    });
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    if (!response.ok) throw new AppError(502, payload.error?.message ?? "GLM request failed.");

    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) throw new AppError(502, "GLM returned no content.");
    return content;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError(504, "GLM request timed out.");
    }
    throw new AppError(502, "GLM is unavailable.");
  } finally {
    clearTimeout(timer);
  }
}
