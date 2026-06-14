import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderDossierBlock } from "../src/dossier-block.mjs";
import { markFor } from "../src/crew-cmd.mjs";

// fileURLToPath, not import.meta.dirname — engines >=18 and dirname landed in 20.11.
const REPO = fileURLToPath(new URL("..", import.meta.url));
const BIN = join(REPO, "bin", "roleos.mjs");

const run = (args, cwd = REPO) =>
  execFileSync(process.execPath, [BIN, ...args], { cwd, encoding: "utf8" });

describe("roleos crew — roster", () => {
  it("lists dossier roles and registry specialists with basis-labelled grades", () => {
    const out = run(["crew"]);
    assert.ok(out.includes("Crew report — 66 members (2 registry specialists)"));
    assert.ok(out.includes("Token Budget Analyst"));
    assert.ok(out.includes("L5 · certified"));
    assert.ok(out.includes("· assessed"));
    assert.ok(out.includes("Judge"));
  });

  it("never renders a fabricated band — unmeasured says so", () => {
    const out = run(["crew", "judge"]);
    assert.ok(out.includes("band unmeasured"));
    assert.ok(!/band \d/.test(out));
  });
});

describe("roleos crew <role> — the sheet", () => {
  it("shows the VERBATIM injected operating-posture block (honesty contract)", () => {
    const out = run(["crew", "judge"]);
    const injected = renderDossierBlock("Judge");
    for (const line of injected.split("\n")) {
      assert.ok(out.includes(line), `sheet must contain injected line verbatim: ${line}`);
    }
    assert.ok(out.includes("what you read is what the model gets"));
  });

  it("renders the certified specialist from the committed registry", () => {
    // The events ledger is gitignored runtime state — technique earning is covered by the
    // fixture suites in specialist-record.test.mjs; here we assert committed truth only.
    const out = run(["crew", "Token Budget Analyst"]);
    assert.ok(out.includes("L5 · certified"));
    assert.ok(out.includes("budgeter-14b600-soup"));
    assert.ok(out.includes("FORM    unmonitored"));
  });

  it("shows the honest techniques empty state for unearned roles", () => {
    const out = run(["crew", "judge"]);
    assert.ok(out.includes("none earned yet — techniques derive from certification and field receipts"));
  });

  it("errors with a hint for an unknown crew member", () => {
    let failed = false;
    try {
      run(["crew", "Nonexistent Zorp"]);
    } catch (e) {
      failed = true;
      assert.equal(e.status, 1);
      assert.ok(String(e.stderr).includes("No crew member matches"));
    }
    assert.ok(failed, "unknown role must exit non-zero");
  });

  it("works from a bare directory (no ledgers): dossier config + honest empty record", () => {
    const dir = mkdtempSync(join(tmpdir(), "roleos-crew-bare-"));
    try {
      const out = run(["crew", "judge"], dir);
      assert.ok(out.includes("certification: none on the registry (basis: assessed)"));
      assert.ok(out.includes("field: no run history in this repo"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("roleos crew --programs — the curriculum tech tree", () => {
  it("honest unavailable state when the export cannot be found", () => {
    // Force the override to a missing path so the sibling-readouts default is bypassed deterministically.
    const out = execFileSync(process.execPath, [BIN, "crew", "--programs"], {
      cwd: REPO, encoding: "utf8",
      env: { ...process.env, ROLEOS_CURRICULUM_PATH: join(tmpdir(), "roleos-no-such-curriculum.json") },
    });
    assert.ok(out.includes("Training programs — curriculum tech tree"));
    assert.ok(out.includes("ROLEOS_CURRICULUM_PATH"));
  });

  it("renders roots, prerequisites, and the unverified-until-S6.3 honesty footer", () => {
    const dir = mkdtempSync(join(tmpdir(), "roleos-programs-"));
    try {
      mkdirSync(join(dir, ".role-os"), { recursive: true });
      writeFileSync(join(dir, ".role-os", "curriculum.json"), JSON.stringify({
        schema: "roleos-curriculum/v1",
        techniques: [
          { id: 1, slug: "qlora", name: "QLoRA", lane: "llm", evidence_strength: "measured-on-rig" },
          { id: 2, slug: "dpo", name: "DPO", lane: "llm", evidence_strength: "reproduced-from-source" },
        ],
        edges: [{ from: 1, to: 2, signals: { explicit_predecessor: true, stage_chain: true } }],
      }));
      const out = run(["crew", "--programs"], dir);
      assert.ok(out.includes("status: provisional"));
      assert.ok(out.includes("QLoRA"), "root technique shown");
      assert.ok(out.includes("QLoRA → DPO"), "prerequisite edge shown");
      assert.ok(out.includes("unverified"), "edge evidence tag shown");
      assert.ok(out.includes("UNVERIFIED until S6.3"), "honesty footer shown");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("a measured-but-unverified edge surfaces the S6.3 MEASURED receipt block + a distinct footer", () => {
    const dir = mkdtempSync(join(tmpdir(), "roleos-programs-"));
    try {
      mkdirSync(join(dir, ".role-os"), { recursive: true });
      writeFileSync(join(dir, ".role-os", "curriculum.json"), JSON.stringify({
        schema: "roleos-curriculum/v1",
        techniques: [
          { id: 1, slug: "unet", name: "UNet-only baseline", lane: "diffusion", evidence_strength: "measured-on-rig" },
          { id: 2, slug: "tegate", name: "TE trigger gating", lane: "diffusion", evidence_strength: "reproduced-from-source" },
        ],
        edges: [{ from: 1, to: 2, signals: { explicit_predecessor: true },
                  measured: { n_receipts: 0, has_delta: false, note: "NEGATIVE TRANSFER (honest-hypothesis confirmed). Foundation makes gating weaker." } }],
      }));
      const out = run(["crew", "--programs"], dir);
      assert.ok(out.includes("measured (S6.3"), "edge tagged measured");
      assert.ok(out.includes("S6.3 MEASURED"), "receipt subsection rendered");
      assert.ok(out.includes("NEGATIVE TRANSFER"), "the finding note is surfaced");
      assert.ok(out.includes("MEASURED at S6.3"), "footer acknowledges the real result");
      assert.ok(!out.includes("UNVERIFIED until S6.3"), "stale all-unverified footer suppressed once a measured edge exists");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe("roleos crew --preview <technique>", () => {
  const withCurriculum = (techniques) => {
    const dir = mkdtempSync(join(tmpdir(), "roleos-preview-"));
    mkdirSync(join(dir, ".role-os"), { recursive: true });
    writeFileSync(join(dir, ".role-os", "curriculum.json"),
      JSON.stringify({ schema: "roleos-curriculum/v1", techniques, edges: [] }));
    return dir;
  };

  it("awaiting-S6.3 when the technique has no preview data yet", () => {
    const dir = withCurriculum([{ id: 1, slug: "qlora", name: "QLoRA", preview: {} }]);
    try {
      const out = run(["crew", "--preview", "qlora"], dir);
      assert.ok(out.includes("Recipe preview — QLoRA"));
      assert.ok(out.includes("S6.3"));
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("renders predicted outcome + forgetting when the KB has measured data", () => {
    const dir = withCurriculum([{
      id: 1, slug: "qlora", name: "QLoRA", engine_recipe_ref: "training-qlora-5090",
      preview: {
        difficulty_signal: "exam-flip-consistency",
        mixing_law: { tier: "law-predicted", predicted_loss: 1.2, predicted_steps_to_cert: 600 },
        calibration_params: 4000000000, calibration_tokens: 100000000,
        replay_fraction: 0.01, measured_forgetting: 0.05,
      },
    }]);
    try {
      const out = run(["crew", "--preview", "qlora"], dir);
      assert.ok(out.includes("PREDICTED OUTCOME"));
      assert.ok(out.includes("predicted loss: 1.2"));
      assert.ok(out.includes("FORGETTING RISK"));
      assert.ok(out.includes("recommended replay: 1%"));
      assert.ok(out.includes("engine recipe: training-qlora-5090"));
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("errors for an unknown technique", () => {
    const dir = withCurriculum([{ id: 1, slug: "qlora", name: "QLoRA", preview: {} }]);
    let failed = false;
    try { run(["crew", "--preview", "nonexistent"], dir); }
    catch (e) { failed = true; assert.equal(e.status, 1); assert.ok(String(e.stderr).includes("No technique matches")); }
    finally { rmSync(dir, { recursive: true, force: true }); }
    assert.ok(failed, "unknown technique must exit non-zero");
  });
});

describe("marks (GlyphStudio placeholders)", () => {
  it("is deterministic by crew pack and defaults for registry-only roles", () => {
    assert.equal(markFor([{ pack: "brainstorm" }]), markFor([{ pack: "brainstorm" }]));
    assert.notEqual(markFor([{ pack: "brainstorm" }]), markFor([{ pack: "engineering" }]));
    assert.equal(markFor(null), "·");
  });
});
