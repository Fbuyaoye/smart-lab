import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeQuestion } from "../src/client";

test("normalizes and bounds a student question", () => {
  assert.equal(sanitizeQuestion("  为什么\n要多次测量？  "), "为什么 要多次测量？");
  assert.equal(sanitizeQuestion("a".repeat(2_001)).length, 2_000);
});
