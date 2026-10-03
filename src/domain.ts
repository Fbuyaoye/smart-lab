export type NumericRow = Record<string, unknown>;

export type FieldDefinition = {
  key: string;
  label: string;
  unit?: string;
  required: boolean;
  min?: number;
  max?: number;
};

export type LinearRegressionDefinition = {
  kind: "linear-regression";
  xKey: string;
  yKey: string;
  minRows: number;
  minR2?: number;
};

export type ExperimentSpec = {
  id: string;
  version: number;
  name: string;
  fields: FieldDefinition[];
  analysis: LinearRegressionDefinition;
  aiContext: {
    principle: string;
    procedure: string;
    commonIssues: string;
  };
  reportSections: string[];
};

export type NormalizedRow = Record<string, number>;

export type RegressionPoint = {
  row: number;
  x: number;
  y: number;
  predictedY: number;
  residual: number;
  standardizedResidual: number | null;
};

export type RegressionResult = {
  slope: number;
  intercept: number;
  rSquared: number;
  rmse: number;
  slopeStandardError: number | null;
  points: RegressionPoint[];
};

export type AnalysisResult = {
  experimentId: string;
  experimentVersion: number;
  algorithmVersion: string;
  inputRows: NormalizedRow[];
  result: RegressionResult;
  warnings: string[];
};
