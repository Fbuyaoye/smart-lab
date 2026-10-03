import type {
  AnalysisResult,
  ExperimentSpec,
  FieldDefinition,
  NormalizedRow,
  NumericRow,
} from "../domain.js";
import { AppError } from "../errors.js";
import { linearRegression } from "../algorithms/linear-regression.js";

const ALGORITHM_VERSION = "linear-regression-v1";

function readNumber(value: unknown, field: FieldDefinition, rowNumber: number): number {
  if (typeof value === "string" && value.trim() === "") {
    throw new AppError(400, `Row ${rowNumber}: ${field.label} is required.`);
  }

  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new AppError(400, `Row ${rowNumber}: ${field.label} must be a finite number.`);
  }
  if (field.min !== undefined && numberValue < field.min) {
    throw new AppError(400, `Row ${rowNumber}: ${field.label} must be at least ${field.min}.`);
  }
  if (field.max !== undefined && numberValue > field.max) {
    throw new AppError(400, `Row ${rowNumber}: ${field.label} must be at most ${field.max}.`);
  }
  return numberValue;
}

function normalizeRows(spec: ExperimentSpec, rows: NumericRow[]): NormalizedRow[] {
  if (rows.length < spec.analysis.minRows) {
    throw new AppError(400, `At least ${spec.analysis.minRows} rows are required.`);
  }

  return rows.map((row, index) => {
    if (typeof row !== "object" || row === null || Array.isArray(row)) {
      throw new AppError(400, `Row ${index + 1} must be an object.`);
    }

    const normalized: NormalizedRow = {};
    for (const field of spec.fields) {
      const value = row[field.key];
      if (value === undefined || value === null) {
        if (field.required) {
          throw new AppError(400, `Row ${index + 1}: ${field.label} is required.`);
        }
        continue;
      }
      normalized[field.key] = readNumber(value, field, index + 1);
    }
    return normalized;
  });
}

export function analyzeExperiment(spec: ExperimentSpec, rows: NumericRow[]): AnalysisResult {
  const inputRows = normalizeRows(spec, rows);
  const { xKey, yKey, minR2 } = spec.analysis;
  const x = inputRows.map((row, index) => {
    const value = row[xKey];
    if (value === undefined) throw new AppError(400, `Row ${index + 1}: missing ${xKey}.`);
    return value;
  });
  const y = inputRows.map((row, index) => {
    const value = row[yKey];
    if (value === undefined) throw new AppError(400, `Row ${index + 1}: missing ${yKey}.`);
    return value;
  });
  const result = linearRegression(x, y);
  const warnings: string[] = [];

  if (minR2 !== undefined && result.rSquared < minR2) {
    warnings.push(`R-squared (${result.rSquared.toFixed(4)}) is below the experiment threshold (${minR2}).`);
  }

  const outlierRows = result.points
    .filter((point) => point.standardizedResidual !== null && Math.abs(point.standardizedResidual) > 2.5)
    .map((point) => point.row);
  if (outlierRows.length > 0) {
    warnings.push(`Rows ${outlierRows.join(", ")} have large residuals and should be reviewed. No data was removed.`);
  }

  return {
    experimentId: spec.id,
    experimentVersion: spec.version,
    algorithmVersion: ALGORITHM_VERSION,
    inputRows,
    result,
    warnings,
  };
}
