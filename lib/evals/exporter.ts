import JSZip from "jszip";
import { stringify } from "yaml";
import type { InterviewRow } from "@/lib/interview/store";
import type { EvidenceRow, RuleRow } from "@/lib/rules/repository";
import type { ScenarioRow } from "./store";

/**
 * Builds the executable eval suite ZIP. The layout and YAML shapes are the
 * public export contract (docs/architecture.md ADR-5) — changes are breaking.
 */

export type ExportInput = {
  interview: InterviewRow;
  rules: RuleRow[];
  evidence: EvidenceRow[];
  scenarios: ScenarioRow[];
};

const SCENARIO_TYPES = ["normal", "contrastive", "boundary", "adversarial"] as const;

export function buildSpecification(input: ExportInput): string {
  const specRules = input.rules.filter((r) => r.status === "confirmed" || r.status === "unresolved");
  return stringify({
    spec_version: 1,
    agent: {
      name: input.interview.agentName,
      description: input.interview.agentDescription,
    },
    rules: specRules.map((r) => ({
      id: r.id,
      when: r.condition,
      expect: r.expectedBehavior,
      exceptions: r.exceptions,
      status: r.status,
      provenance: {
        interview_turns: r.interviewSources,
        context_sources: r.contextSources,
      },
    })),
  });
}

export function buildEvalsYaml(scenarios: ScenarioRow[], type: (typeof SCENARIO_TYPES)[number]): string {
  return stringify({
    scenarios: scenarios
      .filter((s) => s.type === type)
      .map((s) => ({
        id: s.slug,
        type: s.type,
        input: s.input,
        expected: { action: s.expectedBehavior },
        covers: s.ruleIds,
        grader: s.grader,
      })),
  });
}

export function buildEvalConfig(input: ExportInput): string {
  return stringify({
    agent: { name: input.interview.agentName },
    target: { endpoint: "http://localhost:8000/act" },
    grading: { rubric_model: "google/gemma-4-31b-it" },
  });
}

export function buildProvenance(input: ExportInput): string {
  return JSON.stringify(
    {
      interview_id: input.interview.id,
      agent: input.interview.agentName,
      rules: input.rules.map((r) => ({
        id: r.id,
        condition: r.condition,
        status: r.status,
        interview_turns: r.interviewSources,
        context_sources: r.contextSources,
      })),
      evidence: input.evidence.map((e) => ({
        rule_id: e.ruleId,
        source: e.source,
        relationship: e.relationship,
      })),
    },
    null,
    2,
  );
}

export function buildGradersPy(scenarios: ScenarioRow[]): string {
  const rubrics = scenarios.filter((s) => s.grader === "rubric" && s.criteria.length > 0);
  const entries = rubrics
    .map((s) => `    ${JSON.stringify(s.slug)}: [\n${s.criteria.map((c) => `        ${JSON.stringify(c)},`).join("\n")}\n    ],`)
    .join("\n");
  return `"""Grader reference for this exported suite.

The EvalInterview runner (evalinterview) uses RUBRICS below for scenarios whose
grader is "rubric". deterministic grading is plain action equality.
"""

RUBRICS = {
${entries}
}


def deterministic(actual, expected):
    return actual.get("action") == expected.get("action")
`;
}

export function buildReadme(input: ExportInput): string {
  return `# ${input.interview.agentName} — eval suite

Exported from EvalInterview. Self-contained: no access to the app required.

## Layout

- \`behavior/specification.yaml\` — the reviewed behavior spec with provenance
- \`evals/*.yaml\` — scenarios by type (normal, contrastive, boundary, adversarial)
- \`graders/graders.py\` — grading reference + rubric criteria
- \`sources/provenance.json\` — interview turns and context sources per rule
- \`eval_config.yaml\` — point \`target.endpoint\` at the agent under test

## Run

\`\`\`bash
pip install evalinterview  # or: pip install -e ./eval-runner from the repo
# edit eval_config.yaml → target.endpoint
evalinterview run .
\`\`\`

The target endpoint receives POST { "input": <scenario input> } and must
respond with JSON containing an "action" field.
`;
}

export async function buildEvalSuiteZip(input: ExportInput): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("behavior/specification.yaml", buildSpecification(input));
  for (const type of SCENARIO_TYPES) {
    zip.file(`evals/${type}.yaml`, buildEvalsYaml(input.scenarios, type));
  }
  zip.file("graders/graders.py", buildGradersPy(input.scenarios));
  zip.file("sources/provenance.json", buildProvenance(input));
  zip.file("eval_config.yaml", buildEvalConfig(input));
  zip.file("README.md", buildReadme(input));
  return zip.generateAsync({ type: "nodebuffer" });
}
