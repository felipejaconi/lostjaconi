export function formatDynamicBracketText(text: string | null, qty: number | undefined | null, bypassZeroCheck: boolean = false): string | null {
  if (!text) return text;
  
  const safeQty = Number(qty) || 0;
  if (safeQty <= 0 && !bypassZeroCheck) return text;
  
  return text.replace(/([\d]+[.,]?[\d]*)\s*(g|kg)?/i, (match, numStr, unit) => {
    const val = parseFloat(numStr.replace(',', '.'));
    if (!isNaN(val)) {
      let total = val * (safeQty < 0 ? 0 : safeQty);
      let newUnit = unit ? unit.toLowerCase() : '';

      if (newUnit === 'g' && total >= 1000) {
        total = total / 1000;
        newUnit = 'kg';
      }

      const formattedTotal = Number.isInteger(total) ? total.toString() : total.toFixed(2).replace('.', ',');
      return `${formattedTotal}${newUnit}`;
    }
    return match;
  });
}
