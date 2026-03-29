/**
 * Resolve a role overlay from knowledge/roles/*.json.
 *
 * Returns the overlay config for a given role, or null if no overlay exists.
 * Roles without overlays fall back to shared-corpus-only retrieval.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Default overlay search paths (relative to knowledge-core root)
const OVERLAY_PATHS = [
  // Local knowledge-core checkout (development)
  join(resolve(__dirname, "..", ".."), "knowledge-core", "knowledge", "roles"),
  // Fallback: role-os local knowledge dir
  join(resolve(__dirname, ".."), "knowledge", "roles"),
];

/**
 * Resolve the overlay for a role.
 *
 * @param {string} roleId - Role identifier (e.g. "security-reviewer")
 * @param {Object} [options]
 * @param {string[]} [options.searchPaths] - Override overlay search paths
 * @returns {{ overlay: object, path: string } | null}
 */
export function resolveOverlay(roleId, options = {}) {
  const paths = options.searchPaths || OVERLAY_PATHS;

  for (const dir of paths) {
    const filePath = join(dir, `${roleId}.json`);
    if (existsSync(filePath)) {
      try {
        const data = JSON.parse(readFileSync(filePath, "utf-8"));
        if (data.version !== "1.0") {
          console.warn(`[knowledge] Overlay ${roleId}: unsupported version ${data.version}`);
          return null;
        }
        if (data.role_id !== roleId) {
          console.warn(`[knowledge] Overlay file ${roleId}.json has mismatched role_id: ${data.role_id}`);
          return null;
        }
        return { overlay: data, path: filePath };
      } catch (e) {
        console.warn(`[knowledge] Failed to parse overlay for ${roleId}:`, e.message);
        return null;
      }
    }
  }

  return null;
}

/**
 * Check if a role has an overlay available.
 *
 * @param {string} roleId
 * @param {Object} [options]
 * @returns {boolean}
 */
export function hasOverlay(roleId, options = {}) {
  return resolveOverlay(roleId, options) !== null;
}
