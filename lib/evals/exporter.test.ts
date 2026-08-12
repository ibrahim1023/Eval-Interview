import { describe, expect, it } from "vitest";
import type { InterviewRow } from "@/lib/interview/store";
import type { EvidenceRow, RuleRow } from "@/lib/rules/repository";
import type { ScenarioRow } from "./store";
import {
  buildEvalConfig,
  buildEvalsYaml,
  buildEvalSuiteZip,
  buildGradersPy,
  buildProvenance,
  buildSpecification,
} from "./exporter";

const interview = {
  id: "int-1",
  agentName: "Code Review Agent",
  agentDescription: "Reviews pull requests.",
} as InterviewRow;

const rules = [
  {
    id: "rule-1",
    condition: "PR contains a destructive migration",
    expectedBehavior: "Require rollback plan and verified backup, otherwise block",
    exceptions: ["Hotfixes with on-call approval"],
    status: "confirmed",
    interviewSources: ["turn_3", "turn_5"],
    contextSources: ["handbook/migrations"],
  },
  {
    id: "rule-2",
    condition: "Schema compatibility unclear",
    expectedBehavior: "Block or escalate",
    exceptions: [],
    status: "unresolved",
    interviewSources: ["turn_9"],
    contextSources: [],
  },
  {
    id: "rule-3",
    condition: "Not yet reviewed",
    expectedBehavior: "Something",
    exceptions: [],
    status: "provisional",
    interviewSources: ["turn_11"],
    contextSources: [],
  },
] as RuleRow[];

const evidence = [
  {
    id: "ev-1",
    ruleId: "rule-1",
    source: "handbook/migrations",
    content: "Destructive migrations require rollback plan and verified backup.",
    relationship: "supported",
  },
] as EvidenceRow[];

const scenarios = [
  {
    id: "sc-1",
    slug: "normal_migration_with_rollback",
    type: "normal",
    input: { pull_request: { migration: "destructive", rollback_plan: true, verified_backup: true } },
    expectedBehavior: "approve",
    grader: "deterministic",
    criteria: [],
    ruleIds: ["rule-1"],
  },
  {
    id: "sc-2",
    slug: "boundary_exactly_at_threshold",
    type: "boundary",
    input: { pull_request: { migration: "destructive", rollback_plan: true, verified_backup: false } },
    expectedBehavior: "block",
    grader: "rubric",
    criteria: ["The response blocks approval", "The response cites the missing verified backup"],
    ruleIds: ["rule-1"],
  },
] as ScenarioRow[];

const input = { interview, rules, evidence, scenarios };

describe("exporter (public contract — golden files)", () => {
  it("specification.yaml matches the golden file", async () => {
    await expect(buildSpecification(input)).toMatchFileSnapshot("golden/specification.yaml");
  });

  it("evals yaml matches golden files per type", async () => {
    await expect(buildEvalsYaml(scenarios, "normal")).toMatchFileSnapshot("golden/evals.normal.yaml");
    await expect(buildEvalsYaml(scenarios, "boundary")).toMatchFileSnapshot("golden/evals.boundary.yaml");
  });

  it("eval_config.yaml matches the golden file", async () => {
    await expect(buildEvalConfig(input)).toMatchFileSnapshot("golden/eval_config.yaml");
  });

  it("provenance.json matches the golden file", async () => {
    await expect(buildProvenance(input)).toMatchFileSnapshot("golden/provenance.json");
  });

  it("graders.py matches the golden file", async () => {
    await expect(buildGradersPy(scenarios)).toMatchFileSnapshot("golden/graders.py");
  });

  it("spec excludes provisional and conflict rules, keeps confirmed and unresolved", () => {
    const spec = buildSpecification(input);
    expect(spec).toContain("rule-1");
    expect(spec).toContain("rule-2");
    expect(spec).not.toContain("rule-3");
  });

  it("the zip contains the documented layout", async () => {
    const JSZip = (await import("jszip")).default;
    const buf = await buildEvalSuiteZip(input);
    const zip = await JSZip.loadAsync(buf);
    expect(Object.keys(zip.files).sort()).toEqual([
      "README.md",
      "behavior/",
      "behavior/specification.yaml",
      "eval_config.yaml",
      "evals/",
      "evals/adversarial.yaml",
      "evals/boundary.yaml",
      "evals/contrastive.yaml",
      "evals/normal.yaml",
      "graders/",
      "graders/graders.py",
      "sources/",
      "sources/provenance.json",
    ]);
  });
});
