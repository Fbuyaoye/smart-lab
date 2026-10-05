export type ReviewModelConfig = {
  endpoint: string;
  apiKey: string;
  model: string;
  provider: "teacher-review-toolkit" | "deepseek";
};

/**
 * The toolkit is expected to expose an OpenAI-compatible chat-completions
 * endpoint. Keeping this server-only makes the trained model key unavailable
 * to the browser. DeepSeek remains the compatibility fallback for deployments
 * that have not configured the toolkit yet.
 */
export function getReviewModelConfig(): ReviewModelConfig | null {
  const toolkitEndpoint = process.env.TEACHER_REVIEW_API_URL?.trim();
  const toolkitKey = process.env.TEACHER_REVIEW_API_KEY?.trim() ?? "";
  const toolkitModel = process.env.TEACHER_REVIEW_MODEL?.trim();
  if (toolkitEndpoint && toolkitModel) {
    return {
      endpoint: toolkitEndpoint,
      apiKey: toolkitKey,
      model: toolkitModel,
      provider: "teacher-review-toolkit",
    };
  }

  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim() ?? "";
  if (deepseekKey) {
    return {
      endpoint: "https://api.deepseek.com/chat/completions",
      apiKey: deepseekKey,
      model: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat",
      provider: "deepseek",
    };
  }
  return null;
}

export function getReviewModelConfigurationError() {
  if (getReviewModelConfig()) return "";
  if (process.env.AI_SERVICE_URL?.trim() && !process.env.AI_SERVICE_TOKEN?.trim()) {
    return "已配置 AI_SERVICE_URL，但缺少 AI_SERVICE_TOKEN。请填写 AI 服务的服务间令牌并重启开发服务。";
  }
  if (process.env.TEACHER_REVIEW_API_URL?.trim() && !process.env.TEACHER_REVIEW_MODEL?.trim()) {
    return "已配置教师评阅模型地址，但缺少 TEACHER_REVIEW_MODEL。";
  }
  return "尚未配置教师评阅模型。请至少配置 AI_SERVICE_URL + AI_SERVICE_TOKEN，或 DEEPSEEK_API_KEY；修改 .env.local 后重启开发服务。";
}
