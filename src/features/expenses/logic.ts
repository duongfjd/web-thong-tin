/**
 * Parses quick expense input string to extract amount and note.
 * Examples: "cafe 35k", "35k cafe", "xang 1tr", "2.5tr tien dien", "an trua 50.5k"
 */
export function parseQuickExpense(input: string): { amount: number, note: string } | null {
  if (!input || input.trim() === '') return null;
  
  const normalized = input.trim().toLowerCase();
  
  // Look for amount pattern: numbers followed optionally by k/tr
  const amountRegex = /(?:^|\s)(\d+(?:[.,]\d+)?)\s*(k|tr)?(?:\s|$)/i;
  const match = normalized.match(amountRegex);
  
  if (!match) return null;
  
  const rawNumStr = match[1].replace(',', '.');
  let amount = parseFloat(rawNumStr);
  
  const suffix = match[2];
  if (suffix === 'k') amount *= 1000;
  else if (suffix === 'tr') amount *= 1000000;
  else if (amount < 1000 && !suffix && !normalized.includes('.')) {
    // e.g. "cafe 35" usually means 35k
    amount *= 1000;
  }
  
  const note = input.replace(match[0], ' ').replace(/\s+/g, ' ').trim();
  
  return {
    amount: Math.round(amount),
    note: note || 'Không có ghi chú'
  };
}
