import assert from "node:assert/strict";
import test from "node:test";
import { linearRegression } from "../src/algorithms/linear-regression.js";

test("fits an exact line", () => {
  const result = linearRegression([1, 2, 3, 4], [3, 5, 7, 9]);
  assert.equal(result.slope, 2);
  assert.equal(result.intercept, 1);
  assert.equal(result.rSquared, 1);
  assert.equal(result.rmse, 0);
});

test("reports residuals without removing measurements", () => {
  const result = linearRegression([1, 2, 3, 4], [2, 4, 6, 12]);
  assert.equal(result.points.length, 4);
  assert.notEqual(result.points[3].residual, 0);
  assert.ok(result.rSquared < 1);
});
