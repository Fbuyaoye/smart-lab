import assert from "node:assert/strict";
import test from "node:test";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { retrieveKnowledge } from "../src/services/knowledge.js";

test("retrieves records only from the requested experiment", async () => {
  const filePath = join(tmpdir(), `smart-lab-index-${Date.now()}.json`);
  await writeFile(filePath, JSON.stringify({ records: [
    { id: "photo:1", experimentId: "photo", experimentName: "光电效应", section: "来源摘要", text: "截止电压与频率线性关系", keywords: "光电效应 截止电压 频率" },
    { id: "hall:1", experimentId: "hall", experimentName: "霍尔效应", section: "来源摘要", text: "霍尔电压", keywords: "霍尔效应 霍尔电压" }
  ] }));
  const result = await retrieveKnowledge("photo", "截止电压怎么处理", filePath);
  assert.equal(result.experimentName, "光电效应");
  assert.equal(result.excerpts.length, 1);
  assert.match(result.excerpts[0].text, /频率/);
});
