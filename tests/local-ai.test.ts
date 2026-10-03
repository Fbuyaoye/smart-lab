import assert from "node:assert/strict";
import test from "node:test";
import { classifyIntent } from "../src/services/local-ai.js";

test("local intent model recognizes a data-processing question", async () => {
  const result = await classifyIntent("这些测量数据应该怎么拟合，斜率表示什么？");
  assert.equal(result.intent, "data");
  assert.ok(result.confidence > 0);
});
