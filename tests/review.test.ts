import assert from "node:assert/strict";
import test from "node:test";
import { filterReports, normalizeScore, reviewStats, statusLabel } from "../src/review.js";
import type { TeacherReport } from "../src/types.js";

const reports: TeacherReport[] = [
  { id: 1, studentName: "陈同学", studentNumber: "2024001", className: "1 班", experimentName: "光电效应", experimentId: "photoelectric-effect", status: "submitted", rawData: [], calculation: {}, finalContent: "报告" },
  { id: 2, studentName: "林同学", className: "2 班", experimentName: "霍尔效应", experimentId: "hall-effect", status: "graded", rawData: [], calculation: {}, finalContent: "报告" },
  { id: 3, studentName: "王同学", className: "1 班", experimentName: "伏安特性", experimentId: "voltammetry", status: "draft", rawData: [], calculation: {}, finalContent: "" }
];

test("按状态与检索词筛选报告", () => {
  assert.deepEqual(filterReports(reports, "submitted", "陈同学").map((report) => report.id), [1]);
  assert.deepEqual(filterReports(reports, "all", "1 班").map((report) => report.id), [1, 3]);
  assert.equal(filterReports(reports, "graded", "光电").length, 0);
});

test("统计待批改与已批改数量", () => {
  assert.deepEqual(reviewStats(reports), { submitted: 1, graded: 1, pending: 1 });
});

test("仅接受 0 到 100 的分数", () => {
  assert.equal(normalizeScore("88.5"), 88.5);
  assert.equal(normalizeScore("0"), 0);
  assert.equal(normalizeScore("101"), null);
  assert.equal(normalizeScore("abc"), null);
  assert.equal(statusLabel("submitted"), "待批改");
});
