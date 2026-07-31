import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const requirements = new Map([
  [
    "docs/AIDA_CODEX_HUMAN_RELAY.md",
    [
      "Aida-Codex 人工中继协作运行模型",
      "source:aida",
      "owner:codex",
      "status:ready-for-codex",
      "Result: CHANGES_REQUIRED",
      "Result: PASS",
      "Action: MERGE PR #<number>",
      "Action: DEPLOY COMMIT <sha>",
    ],
  ],
  [
    ".github/ISSUE_TEMPLATE/aida-codex-task.yml",
    [
      "name: Aida-Codex Task",
      "id: objective",
      "id: in_scope",
      "id: out_of_scope",
      "id: acceptance",
      "id: decisions",
      "Merge and deployment are not implicitly authorized.",
    ],
  ],
  [
    ".github/pull_request_template.md",
    [
      "## CODEX DELIVERY",
      "### Reviewed Commit",
      "### Validation",
      "### Deployment Status",
      "### Human Relay State",
    ],
  ],
  [
    ".github/AIDA_REVIEW_TEMPLATE.md",
    [
      "## AIDA REVIEW",
      "Reviewed commit:",
      "Result: PASS | CHANGES_REQUIRED",
      "Relayed by: Lao Cao",
      "Any later commit requires a new Aida review.",
    ],
  ],
  [
    ".github/LAOCAO_DECISION_TEMPLATE.md",
    [
      "## LAOCAO DECISION",
      "Action: MERGE PR #<number>",
      "DEPLOY COMMIT <sha>",
      "Merge and deployment are separate decisions.",
    ],
  ],
]);

const failures = [];

for (const [relativePath, markers] of requirements) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing required collaboration file: ${relativePath}`);
    continue;
  }

  const content = fs.readFileSync(absolutePath, "utf8");
  if (content.includes("\u0000")) {
    failures.push(`Unexpected NUL byte in collaboration file: ${relativePath}`);
  }

  for (const marker of markers) {
    if (!content.includes(marker)) {
      failures.push(`${relativePath} is missing required marker: ${marker}`);
    }
  }
}

const packageJsonPath = path.join(root, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const scripts = packageJson.scripts ?? {};

if (scripts["collab:validate"] !== "node scripts/validate-collaboration-model.mjs") {
  failures.push("package.json must expose the collab:validate command.");
}

if (!scripts["quality:pr"]?.includes("npm run collab:validate")) {
  failures.push("quality:pr must enforce the collaboration-model validation.");
}

if (failures.length > 0) {
  console.error(`Collaboration-model validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Collaboration-model validation passed: ${requirements.size} governance files and CI integration verified.`,
);
