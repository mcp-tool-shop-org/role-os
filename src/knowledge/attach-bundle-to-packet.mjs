/**
 * Attach a retrieval bundle to a Role OS packet.
 *
 * Adds packet.knowledge with the bundle and its status.
 * The prompt builder consumes this — retrieval never touches prompts directly.
 */

/**
 * Attach retrieval results to a packet object.
 *
 * @param {Object} packet - Role OS packet (mutable)
 * @param {Object} bundle - RetrievalBundle from retrieveForDispatch
 * @param {string} status - Knowledge status: strong | weak | stale | conflicted | none
 * @returns {Object} The mutated packet (for chaining)
 */
export function attachBundleToPacket(packet, bundle, status) {
  packet.knowledge = {
    retrieval_bundle: bundle,
    status,
  };
  return packet;
}

/**
 * Check if a packet has knowledge attached.
 *
 * @param {Object} packet
 * @returns {boolean}
 */
export function hasKnowledge(packet) {
  return packet.knowledge != null && packet.knowledge.status !== "none";
}

/**
 * Get the knowledge status from a packet.
 *
 * @param {Object} packet
 * @returns {string} One of: strong | weak | stale | conflicted | none
 */
export function getKnowledgeStatus(packet) {
  return packet.knowledge?.status ?? "none";
}
