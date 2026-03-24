import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { copyDirSafe } from "./fs-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STARTER_PACK_DIR = join(__dirname, "..", "starter-pack");

// Paths that --force must never overwrite (user-filled content)
const PROTECTED_PATHS = [
  "context/",
];

export async function initCommand(args) {
  const force = args.includes("--force");
  const positional = args.filter(a => !a.startsWith("--"));
  const targetDir = positional[0] || ".";
  const claudeDir = join(targetDir, ".claude");

  console.log(`roleos init${force ? " --force" : ""} — scaffolding Role OS into .claude/\n`);

  const { created, skipped, updated } = copyDirSafe(STARTER_PACK_DIR, claudeDir, {
    force,
    protectedPaths: PROTECTED_PATHS,
  });

  if (created.length > 0) {
    console.log(`Created (${created.length}):`);
    for (const f of created) {
      console.log(`  + ${f}`);
    }
  }

  if (updated.length > 0) {
    console.log(`\nUpdated (${updated.length}):`);
    for (const f of updated) {
      console.log(`  ~ ${f}`);
    }
  }

  if (skipped.length > 0) {
    console.log(`\nSkipped (${skipped.length} — already exist):`);
    for (const f of skipped) {
      console.log(`  - ${f}`);
    }
  }

  if (created.length === 0 && updated.length === 0 && skipped.length > 0) {
    console.log("\nRole OS is already scaffolded. No files were overwritten.");
    if (!force) {
      console.log("Use --force to update canonical files (context/ files are always protected).");
    }
  } else {
    console.log(`\nDone. Fill the context/ files for your project, then run:`);
    console.log(`  roleos packet new feature`);
  }
}
