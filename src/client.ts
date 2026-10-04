export type AssistantRole = "assistant" | "student";

export type AssistantMessage = {
  id: string;
  role: AssistantRole;
  content: string;
  createdAt: number;
};

export type AskAssistantInput = {
  experimentId?: string;
  question: string;
  history: Array<Pick<AssistantMessage, "role" | "content">>;
};

export type AskAssistant = (input: AskAssistantInput) => Promise<{ answer: string }>;

export function createQaClient(endpoint = "/api/ai/qa"): AskAssistant {
  return async (input) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const payload = (await response.json().catch(() => ({}))) as { answer?: unknown; error?: unknown };
    if (!response.ok) {
      throw new Error(typeof payload.error === "string" ? payload.error : "AI 助手暂时无法回答，请稍后重试。");
    }
    if (typeof payload.answer !== "string" || !payload.answer.trim()) {
      throw new Error("AI 助手没有返回有效内容。");
    }
    return { answer: payload.answer.trim() };
  };
}

export function sanitizeQuestion(question: string): string {
  return question.replace(/\s+/g, " ").trim().slice(0, 2_000);
}
