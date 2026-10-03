import type { RegressionResult } from "../domain.js";
import { AppError } from "../errors.js";

export function linearRegression(x: number[], y: number[]): RegressionResult {
  if (x.length !== y.length || x.length < 2) {
    throw new AppError(400, "Linear regression requires at least two matched values.");
  }

  if (![...x, ...y].every(Number.isFinite)) {
    throw new AppError(400, "Regression inputs must be finite numbers.");
  }

  const count = x.length;
  const xMean = x.reduce((sum, value) => sum + value, 0) / count;
  const yMean = y.reduce((sum, value) => sum + value, 0) / count;
  const sxx = x.reduce((sum, value) => sum + (value - xMean) ** 2, 0);

  if (sxx === 0) {
    throw new AppError(400, "The independent-variable values cannot all be identical.");
  }

  const sxy = x.reduce(
    (sum, value, index) => sum + (value - xMean) * (y[index] - yMean),
    0,
  );
  const slope = sxy / sxx;
  const intercept = yMean - slope * xMean;
  const residuals = y.map((value, index) => value - (slope * x[index] + intercept));
  const sse = residuals.reduce((sum, value) => sum + value ** 2, 0);
  const syy = y.reduce((sum, value) => sum + (value - yMean) ** 2, 0);
  const rSquared = syy === 0 ? 1 : Math.max(0, 1 - sse / syy);
  const rmse = Math.sqrt(sse / count);
  const slopeStandardError = count > 2 ? Math.sqrt((sse / (count - 2)) / sxx) : null;

  return {
    slope,
    intercept,
    rSquared,
    rmse,
    slopeStandardError,
    points: x.map((value, index) => ({
      row: index + 1,
      x: value,
      y: y[index],
      predictedY: slope * value + intercept,
      residual: residuals[index],
      standardizedResidual: rmse === 0 ? 0 : residuals[index] / rmse,
    })),
  };
}
