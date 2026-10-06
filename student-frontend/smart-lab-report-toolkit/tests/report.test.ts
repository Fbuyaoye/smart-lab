import assert from "node:assert/strict";
import test from "node:test";
import { createReportDraft, defaultMetadata, safePdfFilename } from "../src/report";

test("builds a complete report template with supplied analysis", () => {
  const draft = createReportDraft({ experimentId: "voltammetry", metadata: defaultMetadata("伏安特性"), rawData: [{ x: 1, y: 2 }], analysisSummary: "R² = 0.99", studentNotes: "" });
  assert.equal(draft.sections.length, 8);
  assert.match(draft.sections.find((section) => section.key === "dataAnalysis")?.content ?? "", /R² = 0.99/);
});

test("creates a safe PDF filename", () => {
  assert.equal(safePdfFilename("光电效应/实验", "张三"), "光电效应-实验-张三.pdf");
});
