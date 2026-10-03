import { AppError } from "../errors.js";

type AiMessage = {
  role: "system" | "user";
  content: string;
};

export async function askDeepSeek(messages: AiMessage[]): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new AppError(503, "DEEPSEEK_API_KEY is not configured.");
  }

  const timeoutMs = Number(process.env.DEEPSEEK_TIMEOUT_MS ?? "30000");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
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

    if (!response.ok) {
      throw new AppError(502, payload.error?.message ?? "DeepSeek request failed.");
    }

    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new AppError(502, "DeepSeek returned no content.");
    }
    return content;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError(504, "DeepSeek request timed out.");
    }
    throw new AppError(502, "DeepSeek is unavailable.");
  } finally {
    clearTimeout(timer);
  }
}
