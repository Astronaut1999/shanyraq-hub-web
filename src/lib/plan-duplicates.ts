/**
 * Canonical duplicate rule: an item whose saved source_item_id points to
 * another item present in the same list repeats that item and is counted once.
 * Titles are never compared.
 */
export function duplicateIds(items: { id: string; source_item_id: string | null }[]): Set<string> {
  const present = new Set(items.map((i) => i.id));
  return new Set(items.filter((i) => i.source_item_id && present.has(i.source_item_id)).map((i) => i.id));
}
