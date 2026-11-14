/**
 * Pieces taken in turn from each department they come from (women's, men's, accessories...), in
 * the order each department first appears, keeping each one's own order: so a list that leads
 * with one department still shows the others near the top.
 */
export function alternateDepartments<T extends { id: string }>(items: T[], departments: Map<string, string>): T[] {
  const groups = new Map<string, T[]>();
  for (const p of items) {
    const key = departments.get(p.id) ?? "";
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const lists = [...groups.values()];
  const out: T[] = [];
  for (let i = 0; out.length < items.length; i++) for (const list of lists) if (list[i]) out.push(list[i]);
  return out;
}
