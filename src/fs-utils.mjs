import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";

/**
 * Recursively copy a directory, skipping files that already exist at the target.
 * With force=true, overwrites existing files (except those matching protectedPaths).
 * Returns { created: string[], skipped: string[], updated: string[] } with relative paths.
 */
export function copyDirSafe(srcDir, destDir, { baseDir, force = false, protectedPaths = [] } = {}) {
  const root = baseDir || destDir;
  const created = [];
  const skipped = [];
  const updated = [];

  if (!existsSync(srcDir)) {
    throw new Error(`Source directory does not exist: ${srcDir}`);
  }

  const entries = readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);
    const relPath = relative(root, destPath);

    if (entry.isDirectory()) {
      const sub = copyDirSafe(srcPath, destPath, { baseDir: root, force, protectedPaths });
      created.push(...sub.created);
      skipped.push(...sub.skipped);
      updated.push(...sub.updated);
    } else {
      if (existsSync(destPath)) {
        const normalizedRel = relPath.replace(/\\/g, "/");
        if (force && !protectedPaths.some(p => normalizedRel.startsWith(p))) {
          mkdirSync(dirname(destPath), { recursive: true });
          copyFileSync(srcPath, destPath);
          updated.push(relPath);
        } else {
          skipped.push(relPath);
        }
      } else {
        mkdirSync(dirname(destPath), { recursive: true });
        copyFileSync(srcPath, destPath);
        created.push(relPath);
      }
    }
  }

  return { created, skipped, updated };
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
