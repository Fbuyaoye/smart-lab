import assert from "node:assert/strict";
import test from "node:test";
import { FitError, fitCurve } from "../src/core";

test("fits a linear curve and retains all input points", () => {
  const result = fitCurve([{ x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 }], "linear");
  assert.equal(result.parameters.b, 2);
  assert.equal(result.parameters.c, 1);
  assert.equal(result.metrics.rSquared, 1);
  assert.equal(result.residuals.length, 3);
  assert.equal(result.fittedPoints.length, 180);
});

test("fits a quadratic curve", () => {
  const result = fitCurve([{ x: -1, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 4 }], "quadratic");
  assert.equal(result.parameters.a, 1);
  assert.equal(result.parameters.b, 0);
  assert.equal(result.parameters.c, 0);
});

test("rejects a power curve with invalid domain data", () => {
  assert.throws(() => fitCurve([{ x: 0, y: 1 }, { x: 2, y: 4 }], "power"), FitError);
});
