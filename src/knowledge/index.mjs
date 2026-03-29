/**
 * Role OS Knowledge Integration Layer
 *
 * Wires knowledge-core retrieval into Role OS dispatch, packet, and evidence systems.
 * Phase 2: live retrieval via configureKnowledge().
 */

export { resolveOverlay, hasOverlay } from "./resolve-overlay.mjs";
export { retrieveForDispatch, configureKnowledge, isKnowledgeConfigured } from "./retrieve-for-dispatch.mjs";
export { attachBundleToPacket, hasKnowledge, getKnowledgeStatus } from "./attach-bundle-to-packet.mjs";
export { provenanceFromChunk, attachProvenance, reconcileEvidenceWithBundle } from "./attach-bundle-to-evidence.mjs";
export { applyFallbackPolicy } from "./fallback-policy.mjs";
