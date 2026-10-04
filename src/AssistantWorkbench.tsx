import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import {
  type AskAssistant,
  type AssistantMessage,
  createQaClient,
  sanitizeQuestion,
} from "./client";
import "./assistant.css";

export type AssistantWorkbenchProps = {
  experimentId: string;
  experimentName: string;
  ask?: AskAssistant;
  quickQuestions?: string[];
  initialMessage?: string;
};

const DEFAULT_QUESTIONS = [
  "本实验的核心原理是什么？",
  "实验中最容易出现哪些误差？",
  "数据异常时应该如何排查？",
  "实验结论应当如何表述？",
];

function makeMessage(role: AssistantMessage["role"], content: string): AssistantMessage {
  return { id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`, role, content, createdAt: Date.now() };
}

export function AssistantWorkbench({
  experimentId,
  experimentName,
  ask = createQaClient(),
  quickQuestions = DEFAULT_QUESTIONS,
  initialMessage = "你好，我是 AI 实验助教。你可以问我实验原理、操作步骤、数据处理和误差分析相关的问题。",
}: AssistantWorkbenchProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>(() => [makeMessage("assistant", initialMessage)]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const remaining = 2_000 - question.length;
  const canSubmit = Boolean(sanitizeQuestion(question)) && !loading;
  const history = useMemo(() => messages.slice(-10).map(({ role, content }) => ({ role, content })), [messages]);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const submitted = sanitizeQuestion(question);
    if (!submitted || loading) return;

    const studentMessage = makeMessage("student", submitted);
    setMessages((current) => [...current, studentMessage]);
    setQuestion("");
    setError("");
    setLoading(true);
    try {
      const response = await ask({ experimentId, question: submitted, history: [...history, { role: "student", content: submitted }] });
      setMessages((current) => [...current, makeMessage("assistant", response.answer)]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "AI 助手暂时无法回答，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  const onTextKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  return (
    <section className="ai-assistant" aria-label="AI 实验助教">
      <header className="ai-assistant-heading">
        <div>
          <p>AI 实验助教</p>
          <h1>实验知识问答</h1>
          <span>{experimentName}</span>
        </div>
        <button type="button" className="ai-assistant-clear" onClick={() => { setMessages([makeMessage("assistant", initialMessage)]); setError(""); }}>
          清空对话
        </button>
      </header>

      <div className="ai-assistant-layout">
        <aside className="ai-assistant-tips">
          <h2>可以这样问</h2>
          <div className="ai-assistant-quick-list">
            {quickQuestions.map((item) => (
              <button key={item} type="button" onClick={() => setQuestion(item)}>{item}</button>
            ))}
          </div>
          <div className="ai-assistant-boundary">
            <strong>回答范围</strong>
            <span>实验原理、步骤、误差、数据处理与报告表达。</span>
          </div>
        </aside>

        <section className="ai-assistant-chat">
          <div className="ai-assistant-messages" aria-live="polite">
            {messages.map((message) => (
              <article className={`ai-assistant-message ${message.role}`} key={message.id}>
                <div className="ai-assistant-avatar" aria-hidden="true">{message.role === "assistant" ? "AI" : "我"}</div>
                <div className="ai-assistant-bubble">{message.content}</div>
              </article>
            ))}
            {loading && <article className="ai-assistant-message assistant"><div className="ai-assistant-avatar" aria-hidden="true">AI</div><div className="ai-assistant-bubble ai-assistant-thinking">正在思考…</div></article>}
          </div>

          <form className="ai-assistant-composer" onSubmit={(event) => void send(event)}>
            <label htmlFor="assistant-question">输入你的实验问题</label>
            <textarea id="assistant-question" value={question} maxLength={2_000} onKeyDown={onTextKeyDown} onChange={(event) => setQuestion(event.target.value)} placeholder="例如：为什么需要进行多次测量？" />
            <div className="ai-assistant-actions">
              <span>{remaining} 字符可输入</span>
              <button type="submit" disabled={!canSubmit}>{loading ? "回答中…" : "发送问题"}</button>
            </div>
            {error && <p className="ai-assistant-error" role="alert">{error}</p>}
          </form>
        </section>
      </div>
    </section>
  );
}
