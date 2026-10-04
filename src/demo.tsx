import { createRoot } from "react-dom/client";
import { AssistantWorkbench } from "./AssistantWorkbench";
import type { AskAssistant } from "./client";

const demoAsk: AskAssistant = async ({ question }) => {
  await new Promise((resolve) => setTimeout(resolve, 650));
  return { answer: `这是演示回答。接入服务端后，AI 会基于当前实验知识库回答“${question}”。` };
};

createRoot(document.getElementById("root")!).render(
  <main style={{ background: "#f6f8fc", minHeight: "100vh", padding: "34px clamp(20px, 4vw, 56px)" }}>
    <AssistantWorkbench experimentName="通用物理实验问答（演示）" ask={demoAsk} />
  </main>,
);
