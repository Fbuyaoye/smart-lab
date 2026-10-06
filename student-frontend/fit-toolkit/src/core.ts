export type Point = { x: number; y: number };

export type FitModel =
  | "linear"
  | "quadratic"
  | "cubic"
  | "exponential"
  | "logarithmic"
  | "power";

export type FitMetrics = {
  rSquared: number;
  adjustedRSquared: number | null;
  rmse: number;
  aic: number;
  bic: number;
};

export type FitResult = {
  model: FitModel;
  equation: string;
  parameters: Record<string, number>;
  metrics: FitMetrics;
  fittedPoints: Point[];
  residuals: Array<Point & { residual: number }>;
  warnings: string[];
};

export class FitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FitError";
  }
}

type FitShape = {
  parameterCount: number;
  parameters: Record<string, number>;
  equation: string;
  evaluate: (x: number) => number;
  warnings: string[];
};

const LABELS: Record<FitModel, string> = {
  linear: "线性拟合",
  quadratic: "二次多项式",
  cubic: "三次多项式",
  exponential: "指数拟合",
  logarithmic: "对数拟合",
  power: "幂函数拟合",
};

export const FIT_MODELS: Array<{ id: FitModel; label: string }> = [
  { id: "linear", label: LABELS.linear },
  { id: "quadratic", label: LABELS.quadratic },
  { id: "cubic", label: LABELS.cubic },
  { id: "exponential", label: LABELS.exponential },
  { id: "logarithmic", label: LABELS.logarithmic },
  { id: "power", label: LABELS.power },
];

function numberText(value: number): string {
  if (Math.abs(value) < 1e-10) return "0";
  return Number(value.toPrecision(6)).toString();
}

function requirePoints(points: Point[], minimum: number): void {
  if (points.length < minimum) {
    throw new FitError(`当前模型至少需要 ${minimum} 组有效数据。`);
  }
  if (!points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))) {
    throw new FitError("每个 x 和 y 都必须是有效数字。");
  }
  const xRange = Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x));
  if (xRange === 0) throw new FitError("x 数据不能全部相同。");
}

function solveLinearSystem(matrix: number[][], vector: number[]): number[] {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (Math.abs(augmented[pivot][column]) < 1e-12) {
      throw new FitError("当前数据无法唯一确定这条曲线，请增加数据或更换模型。");
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const pivotValue = augmented[column][column];
    for (let current = column; current <= size; current += 1) augmented[column][current] /= pivotValue;

    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let current = column; current <= size; current += 1) {
        augmented[row][current] -= factor * augmented[column][current];
      }
    }
  }
  return augmented.map((row) => row[size]);
}

function polynomialFit(points: Point[], degree: number): FitShape {
  requirePoints(points, degree + 1);
  const dimension = degree + 1;
  const matrix = Array.from({ length: dimension }, (_, row) =>
    Array.from({ length: dimension }, (_, column) =>
      points.reduce((sum, point) => sum + point.x ** (row + column), 0),
    ),
  );
  const vector = Array.from({ length: dimension }, (_, power) =>
    points.reduce((sum, point) => sum + point.y * point.x ** power, 0),
  );
  const coefficients = solveLinearSystem(matrix, vector);
  const parameterNames = ["c", "b", "a", "d"];
  const parameters = Object.fromEntries(
    coefficients.map((value, index) => [parameterNames[index] ?? `p${index}`, value]),
  );
  const terms = coefficients
    .map((coefficient, power) => ({ coefficient, power }))
    .reverse()
    .filter(({ coefficient }) => Math.abs(coefficient) > 1e-12)
    .map(({ coefficient, power }, index) => {
      const absolute = numberText(Math.abs(coefficient));
      const variable = power === 0 ? "" : power === 1 ? "x" : `x^${power}`;
      const term = `${absolute}${variable ? ` ${variable}` : ""}`;
      if (index === 0) return coefficient < 0 ? `-${term}` : term;
      return coefficient < 0 ? `- ${term}` : `+ ${term}`;
    })
    .join(" ");

  return {
    parameterCount: dimension,
    parameters,
    equation: `y = ${terms || "0"}`,
    evaluate: (x) => coefficients.reduce((sum, coefficient, power) => sum + coefficient * x ** power, 0),
    warnings: degree > 1 ? ["高阶曲线可能会把测量噪声也拟合进去，请结合实验规律选择模型。"] : [],
  };
}

function transformedLinearFit(
  points: Point[],
  transformX: (x: number) => number,
  transformY: (y: number) => number,
): { slope: number; intercept: number } {
  const transformed = points.map((point) => ({ x: transformX(point.x), y: transformY(point.y) }));
  const line = polynomialFit(transformed, 1);
  return { slope: line.parameters.b, intercept: line.parameters.c };
}

function exponentialFit(points: Point[]): FitShape {
  requirePoints(points, 2);
  if (points.some((point) => point.y <= 0)) throw new FitError("指数拟合要求所有 y 大于 0。");
  const { slope, intercept } = transformedLinearFit(points, (x) => x, (y) => Math.log(y));
  const a = Math.exp(intercept);
  return {
    parameterCount: 2,
    parameters: { a, b: slope },
    equation: `y = ${numberText(a)} e^(${numberText(slope)} x)`,
    evaluate: (x) => a * Math.exp(slope * x),
    warnings: ["指数拟合使用了对数变换，请确认这种误差假设符合当前实验。"],
  };
}

function logarithmicFit(points: Point[]): FitShape {
  requirePoints(points, 2);
  if (points.some((point) => point.x <= 0)) throw new FitError("对数拟合要求所有 x 大于 0。");
  const { slope, intercept } = transformedLinearFit(points, (x) => Math.log(x), (y) => y);
  return {
    parameterCount: 2,
    parameters: { a: slope, b: intercept },
    equation: `y = ${numberText(slope)} ln(x) + ${numberText(intercept)}`,
    evaluate: (x) => slope * Math.log(x) + intercept,
    warnings: [],
  };
}

function powerFit(points: Point[]): FitShape {
  requirePoints(points, 2);
  if (points.some((point) => point.x <= 0 || point.y <= 0)) {
    throw new FitError("幂函数拟合要求所有 x 和 y 都大于 0。");
  }
  const { slope, intercept } = transformedLinearFit(points, (x) => Math.log(x), (y) => Math.log(y));
  const a = Math.exp(intercept);
  return {
    parameterCount: 2,
    parameters: { a, b: slope },
    equation: `y = ${numberText(a)} x^${numberText(slope)}`,
    evaluate: (x) => a * x ** slope,
    warnings: ["幂函数拟合使用了对数变换，请确认这种误差假设符合当前实验。"],
  };
}

function createShape(points: Point[], model: FitModel): FitShape {
  switch (model) {
    case "linear":
      return polynomialFit(points, 1);
    case "quadratic":
      return polynomialFit(points, 2);
    case "cubic":
      return polynomialFit(points, 3);
    case "exponential":
      return exponentialFit(points);
    case "logarithmic":
      return logarithmicFit(points);
    case "power":
      return powerFit(points);
  }
}

function metrics(points: Point[], shape: FitShape): FitMetrics {
  const predictions = points.map((point) => shape.evaluate(point.x));
  const residuals = points.map((point, index) => point.y - predictions[index]);
  const sse = residuals.reduce((sum, value) => sum + value ** 2, 0);
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const sst = points.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);
  const rSquared = sst === 0 ? 1 : 1 - sse / sst;
  const degreesOfFreedom = points.length - shape.parameterCount;
  const adjustedRSquared = degreesOfFreedom > 0
    ? 1 - (1 - rSquared) * (points.length - 1) / degreesOfFreedom
    : null;
  const mse = Math.max(sse / points.length, Number.EPSILON);
  return {
    rSquared,
    adjustedRSquared,
    rmse: Math.sqrt(sse / points.length),
    aic: points.length * Math.log(mse) + 2 * shape.parameterCount,
    bic: points.length * Math.log(mse) + Math.log(points.length) * shape.parameterCount,
  };
}

export function fitCurve(points: Point[], model: FitModel): FitResult {
  const shape = createShape(points, model);
  const minimumX = Math.min(...points.map((point) => point.x));
  const maximumX = Math.max(...points.map((point) => point.x));
  const fittedPoints = Array.from({ length: 180 }, (_, index) => {
    const x = minimumX + ((maximumX - minimumX) * index) / 179;
    return { x, y: shape.evaluate(x) };
  }).filter((point) => Number.isFinite(point.y));
  if (fittedPoints.length < 2) throw new FitError("拟合曲线包含无效数值，请检查数据范围。");

  return {
    model,
    equation: shape.equation,
    parameters: shape.parameters,
    metrics: metrics(points, shape),
    fittedPoints,
    residuals: points.map((point) => ({ ...point, residual: point.y - shape.evaluate(point.x) })),
    warnings: shape.warnings,
  };
}
