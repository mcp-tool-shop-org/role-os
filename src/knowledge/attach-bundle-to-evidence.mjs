/**
 * Attach retrieval provenance to Role OS evidence items.
 *
 * When a role cites retrieved knowledge in its output, this wires
 * the citation back to the retrieval bundle for full traceability.
 */

/**
 * Create an evidence provenance record from a retrieved chunk.
 *
 * @param {Object} chunk - A RetrievedChunk from the bundle
 * @returns {Object} EvidenceProvenance
 */
export function provenanceFromChunk(chunk) {
  return {
    source_id: chunk.source_id,
    document_id: chunk.document_id,
    chunk_id: chunk.chunk_id,
    trust_tier: chunk.metadata?.trust_tier ?? "general",
    freshness_status: chunk.metadata?.freshness?.status ?? "undated",
    citation_reference: chunk.citation?.reference ?? `chunk:${chunk.chunk_id}`,
  };
}

/**
 * Attach provenance to an existing evidence item.
 *
 * @param {Object} evidenceItem - Role OS evidence entry (mutable)
 * @param {Object} chunk - The RetrievedChunk that backs this evidence
 * @returns {Object} The mutated evidence item
 */
export function attachProvenance(evidenceItem, chunk) {
  evidenceItem.provenance = provenanceFromChunk(chunk);
  return evidenceItem;
}

/**
 * Bulk-attach provenance to evidence items that match retrieved chunks by reference.
 *
 * @param {Object[]} evidenceItems - Array of evidence entries
 * @param {Object} bundle - RetrievalBundle
 * @returns {Object[]} Updated evidence items (mutated in place)
 */
export function reconcileEvidenceWithBundle(evidenceItems, bundle) {
  if (!bundle?.selected?.length) return evidenceItems;

  // Build lookup by citation reference
  const chunkByRef = new Map();
  for (const chunk of bundle.selected) {
    if (chunk.citation?.reference) {
      chunkByRef.set(chunk.citation.reference, chunk);
    }
  }

  for (const item of evidenceItems) {
    if (item.reference && chunkByRef.has(item.reference)) {
      attachProvenance(item, chunkByRef.get(item.reference));
    }
  }

  return evidenceItems;
}
