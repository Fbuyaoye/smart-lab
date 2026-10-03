import type { ExperimentSpec } from "../domain.js";

const experiments = new Map<string, ExperimentSpec>();

export function registerExperiment(spec: ExperimentSpec): void {
  if (experiments.has(spec.id)) {
    throw new Error(`Experiment spec already registered: ${spec.id}`);
  }
  experiments.set(spec.id, spec);
}

export function getExperiment(id: string): ExperimentSpec | undefined {
  return experiments.get(id);
}

export function listExperiments(): Array<Pick<ExperimentSpec, "id" | "version" | "name">> {
  return [...experiments.values()].map(({ id, version, name }) => ({ id, version, name }));
}

// Register real experiment specifications in this module. Do not register a
// placeholder: the analysis and AI routes intentionally reject unknown IDs.
