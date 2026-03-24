import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { copyDirSafe } from "./fs-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STARTER_PACK_DIR = join(__dirname, "..", "starter-pack");

export async function initCommand(args) {
  const targetDir = args[0] || ".";
  const claudeDir = join(targetDir, ".claude");

  console.log("roleos init — scaffolding Role OS into .claude/\n");

  const { created, skipped } = copyDirSafe(STARTER_PACK_DIR, claudeDir);

  if (created.length > 0) {
    console.log(`Created (${created.length}):`);
    for (const f of created) {
      console.log(`  + ${f}`);
    }
  }

  if (skipped.length > 0) {
    console.log(`\nSkipped (${skipped.length} — already exist):`);
    for (const f of skipped) {
      console.log(`  - ${f}`);
    }
  }

  if (created.length === 0 && skipped.length > 0) {
    console.log("\nRole OS is already scaffolded. No files were overwritten.");
  } else {
    console.log(`\nDone. Fill the context/ files for your project, then run:`);
    console.log(`  roleos packet new feature`);
  }
}
