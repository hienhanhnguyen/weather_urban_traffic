export const GAP = "gap" as const;

export type PageSlot = number | typeof GAP;

export const pageCount = (total: number, pageSize: number) =>
  pageSize > 0 ? Math.ceil(Math.max(total, 0) / pageSize) : 0;

export function pageRange(
  current: number,
  total: number,
  windowSize = 7,
): PageSlot[] {
  if (total <= windowSize) {
    return Array.from({ length: Math.max(total, 0) }, (_, index) => index + 1);
  }

  const inner = Math.max(windowSize - 4, 1);
  const before = Math.floor((inner - 1) / 2);

  const end = Math.min(total - 1, Math.max(2, current - before) + inner - 1);
  const start = Math.max(2, end - inner + 1);

  const slots: PageSlot[] = [1];

  if (start > 2) slots.push(GAP);
  for (let page = start; page <= end; page += 1) slots.push(page);
  if (end < total - 1) slots.push(GAP);

  slots.push(total);

  return slots;
}
