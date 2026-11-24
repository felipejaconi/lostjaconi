export function normalizeCostCenterKey(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,;:/\\_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const REMOVED_COST_CENTER_KEYS = new Set([
  "lost wind unipessoal lda",
  "lost wind unipessoal",
  "lost wind lda",
  "producao armazem",
]);

export function isRemovedCostCenterName(value: unknown): boolean {
  const key = normalizeCostCenterKey(value);
  if (!key) return false;
  return REMOVED_COST_CENTER_KEYS.has(key);
}
