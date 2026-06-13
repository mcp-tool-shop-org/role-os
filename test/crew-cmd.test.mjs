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
  it("honest unavailable state when no export is present", () => {
    const dir = mkdtempSync(join(tmpdir(), "roleos-programs-bare-"));
    try {
      const out = run(["crew", "--programs"], dir);
      assert.ok(out.includes("Training programs — curriculum tech tree"));
      assert.ok(out.includes("no curriculum.json export present") || out.includes("no curriculum export found"));
      assert.ok(out.includes("ROLEOS_CURRICULUM_PATH"));
    } finally { rmSync(dir, { recursive: true, force: true }); }
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
});

describe("marks (GlyphStudio placeholders)", () => {
  it("is deterministic by crew pack and defaults for registry-only roles", () => {
    assert.equal(markFor([{ pack: "brainstorm" }]), markFor([{ pack: "brainstorm" }]));
    assert.notEqual(markFor([{ pack: "brainstorm" }]), markFor([{ pack: "engineering" }]));
    assert.equal(markFor(null), "·");
  });
});
