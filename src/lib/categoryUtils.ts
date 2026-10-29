export const CATEGORY_ORDER: string[] = [
  "CARNES",
  "CONGELADOS",
  "REFRIGERADOS",
  "MERCEARIA",
  "HORTIFRUTI",
  "EMBALAGENS",
  "BEBIDAS",
  "LIMPEZA",
  "PEIXE",
  "SOBREMESA",
  "PRODUÇÃO ARMAZEM"
];

// Priority matchers to map category names (including plurals and variations) to the new order
const CATEGORY_MATCHERS: { index: number; matches: string[] }[] = [
  { index: 0, matches: ["carne", "carnes", "acougue", "açougue"] },
  { index: 1, matches: ["congelado", "congelados"] },
  { index: 2, matches: ["refrigerado", "refrigerados", "frios"] },
  { index: 3, matches: ["mercearia", "secos", "graos", "grãos"] },
  { index: 4, matches: ["hortifruti", "hortalica", "hortaliça", "fruta", "frutas", "legume", "legumes", "verdura", "verduras"] },
  { index: 5, matches: ["embalagem", "embalagens", "enbalagem", "enbalagens", "descartavel", "descartaveis"] },
  { index: 6, matches: ["bebida", "bebidas", "vinho", "vinhos", "cerveja", "cervejas", "refrigerante", "refrigerantes"] },
  { index: 7, matches: ["limpeza", "higiene", "quimico", "quimicos"] },
  { index: 8, matches: ["peixe", "peixes", "pescado", "pescados", "frutos do mar"] },
  { index: 9, matches: ["sobremesa", "sobremesas", "doce", "doces"] },
  { index: 10, matches: ["produção armazem", "producao armazem", "produção", "producao"] }
];

export function getCategoryScore(catName: string): number {
  if (!catName) return 999;
  const normalized = catName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  for (const item of CATEGORY_MATCHERS) {
    for (const m of item.matches) {
      const normMatcher = m.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (normalized.includes(normMatcher) || normMatcher.includes(normalized)) {
        return item.index;
      }
    }
  }

  return 999;
}

export function sortGroupedCategories(entries: [string, any[]][]): [string, any[]][] {
  return [...entries].sort((a, b) => {
    const scoreA = getCategoryScore(a[0]);
    const scoreB = getCategoryScore(b[0]);
    if (scoreA !== scoreB) return scoreA - scoreB;
    return a[0].localeCompare(b[0]);
  });
}

export function sortItemsByCategoryName<T>(items: T[], getCatName: (item: T) => string): T[] {
  return [...items].sort((a, b) => {
    const sA = getCategoryScore(getCatName(a));
    const sB = getCategoryScore(getCatName(b));
    if (sA !== sB) return sA - sB;
    return 0;
  });
}

export function sortCategories<T>(categories: T[], getName: (cat: T) => string = (c: any) => c?.nome || c?.name || String(c)): T[] {
  return [...categories].sort((a, b) => {
    const sA = getCategoryScore(getName(a));
    const sB = getCategoryScore(getName(b));
    if (sA !== sB) return sA - sB;
    return getName(a).localeCompare(getName(b));
  });
} 
