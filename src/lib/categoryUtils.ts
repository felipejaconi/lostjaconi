export const CATEGORY_ORDER = [
  "carne",
  "peixe",
  "hortifruti",
  "frutas",
  "legumes",
  "mercearia",
  "laticinios",
  "congelados",
  "bebidas",
  "vinhos",
  "limpeza",
  "embalagem",
  "enbalagem",
  "diversos"
];

export function getCategoryScore(catName: string): number {
  if (!catName) return 999;
  const name = catName.toLowerCase().trim();
  const index = CATEGORY_ORDER.findIndex(c => name.includes(c));
  return index !== -1 ? index : 999;
}

export function sortGroupedCategories(entries: [string, any[]][]): [string, any[]][] {
  return [...entries].sort((a, b) => {
    return getCategoryScore(a[0]) - getCategoryScore(b[0]);
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
