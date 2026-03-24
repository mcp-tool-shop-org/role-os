import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";

/**
 * Recursively copy a directory, skipping files that already exist at the target.
 * Returns { created: string[], skipped: string[] } with relative paths.
 */
export function copyDirSafe(srcDir, destDir, baseDir = destDir) {
  const created = [];
  const skipped = [];

  if (!existsSync(srcDir)) {
    throw new Error(`Source directory does not exist: ${srcDir}`);
  }

  const entries = readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);
    const relPath = relative(baseDir, destPath);

    if (entry.isDirectory()) {
      const sub = copyDirSafe(srcPath, destPath, baseDir);
      created.push(...sub.created);
      skipped.push(...sub.skipped);
    } else {
      if (existsSync(destPath)) {
        skipped.push(relPath);
      } else {
        mkdirSync(dirname(destPath), { recursive: true });
        copyFileSync(srcPath, destPath);
        created.push(relPath);
      }
    }
  }

  return { created, skipped };
}

/**
 * Write a file, creating parent directories as needed.
 * Does NOT overwrite if the file already exists unless force is true.
 */
export function writeFileSafe(filePath, content, { force = false } = {}) {
  if (existsSync(filePath) && !force) {
    return false;
  }
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf-8");
  return true;
}

/**
 * Read a file as UTF-8, returning null if it doesn't exist.
 */
export function readFileSafe(filePath) {
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf-8");
}
