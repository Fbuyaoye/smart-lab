import { createRoot } from "react-dom/client";
import { CurveFitWorkbench } from "./CurveFitWorkbench";

createRoot(document.getElementById("root")!).render(
  <main style={{ padding: "24px", background: "#f8fafc", minHeight: "100vh" }}>
    <CurveFitWorkbench />
  </main>,
);
