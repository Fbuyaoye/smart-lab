# Smart Lab AI Service

This is a standalone TypeScript backend for the AI and algorithm layer. It does
not modify or depend on the existing student or teacher projects.

It exposes four server-to-server endpoints:

- `POST /v1/analysis`: validates experiment rows and runs the deterministic algorithm.
- `POST /v1/ai/qa`: answers a student question from registered experiment context.
- `POST /v1/ai/report`: runs the algorithm first, then drafts a report from its result.
- `POST /v1/ai/review`: runs the algorithm first, then gives a teacher review without assigning a final grade.

## Why the service has no default experiment

The existing repository contains only demonstration experiments. A misleading
formula is worse than a missing formula, so this service deliberately rejects
unknown `experimentId` values. Register one real experiment in
`src/specs/index.ts` before using analysis or AI endpoints.

```ts
import type { ExperimentSpec } from "../domain.js";

const realExperiment: ExperimentSpec = {
  id: "replace-with-real-experiment-id",
  version: 1,
  name: "Replace with the real experiment name",
  fields: [
    { key: "x", label: "Independent measurement", unit: "unit", required: true },
    { key: "y", label: "Dependent measurement", unit: "unit", required: true },
  ],
  analysis: {
    kind: "linear-regression",
    xKey: "x",
    yKey: "y",
    minRows: 3,
    minR2: 0.98,
  },
  aiContext: {
    principle: "Write the approved experiment principle.",
    procedure: "Write the approved procedure.",
    commonIssues: "Write known mistakes and unit rules.",
  },
  reportSections: ["purpose", "method", "analysis", "error discussion", "conclusion"],
};

registerExperiment(realExperiment);
```

Keep the physical formula, allowed ranges, units, and fitting convention in the
specification review. The AI receives the calculation output but is instructed
not to recompute or replace it.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

Set a long, random `INTERNAL_API_TOKEN`. Browser applications must call their
own server route, which then calls this service with
`Authorization: Bearer <INTERNAL_API_TOKEN>`. Do not call this service directly
from a browser.

## Local AI mode: no DeepSeek, no API key

The default `AI_MODE=local` trains and runs a small local intent model with
multinomial Naive Bayes. Its response is composed strictly from the current
experiment's retrieved knowledge-base excerpts. Reports and reviews are local
templates which quote the deterministic calculation result. It never makes a
network AI call and no student data leaves this computer.

```bash
npm run train:local
npm run dev
```

The included model is trained from `training/intent-training.json`. Add checked
teaching utterances there and run `npm run train:local` again to retrain it.
This is a real, inspectable classifier for this project domain, but it is not a
general-purpose large language model: it cannot invent a missing procedure,
formula, or judgment. Import the school's approved experiment guides into the
knowledge base before relying on it in class.

## GLM mode

Set `AI_MODE=glm`, `GLM_API_KEY`, and optionally `GLM_MODEL` to call Zhipu AI
from the server. The default endpoint is Zhipu's official chat-completions URL.
The browser never receives this key. `AI_MODE=deepseek` is also available as an
explicit alternative.

## Deploy for online use

The service includes a `Dockerfile`; deploy this directory to Railway, Render,
or any Docker-capable cloud host. Do not upload `.env` or commit it to Git.
Instead, add these variables in the cloud host's secret/settings panel:

```text
AI_MODE=glm
GLM_API_KEY=your-key
GLM_MODEL=glm-4-flash
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions
INTERNAL_API_TOKEN=a-long-random-server-to-server-token
ALLOWED_ORIGIN=https://your-student-site.example
```

The Docker image includes the current knowledge-base index. Expose the
platform-provided `PORT`. In the student project, use a server-side API route
as a proxy: the browser calls the student site, and that route calls this
public service with `Authorization: Bearer <INTERNAL_API_TOKEN>`. Never place
`GLM_API_KEY` or `INTERNAL_API_TOKEN` in browser-side code.

The ready-to-copy Next.js route and its environment-variable example are under
`integration/nextjs/`. Add that route only after choosing the student project's
final Next.js integration location.

## Example request

After registering a real experiment:

```bash
curl http://localhost:8787/v1/analysis \
  -H "Authorization: Bearer $INTERNAL_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"experimentId":"replace-with-real-experiment-id","rows":[{"x":1,"y":2},{"x":2,"y":4},{"x":3,"y":6}]}'
```

## Integration boundary

The existing teacher and student projects should save raw data and the returned
`analysis` object in Supabase. The teacher project should call this service from
a server-side route only. The algorithm is deterministic and testable; ECharts
or other chart libraries should only render `analysis.result.points`.

## Verification

```bash
npm run typecheck
npm test
```
