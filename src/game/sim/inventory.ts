import { ITEMS, type Inventory, type ItemId } from "../data/items";

export function invGet(inv: Inventory, id: ItemId): number {
  return inv[id] ?? 0;
}

export function invAdd(inv: Inventory, id: ItemId, qty: number): void {
  const v = (inv[id] ?? 0) + qty;
  if (v <= 1e-9) delete inv[id];
  else inv[id] = v;
}

export function invAddAll(inv: Inventory, other: Inventory, mult = 1): void {
  for (const [id, q] of Object.entries(other) as [ItemId, number][]) invAdd(inv, id, q * mult);
}

export function invHas(inv: Inventory, need: Inventory, mult = 1): boolean {
  for (const [id, q] of Object.entries(need) as [ItemId, number][]) {
    if ((inv[id] ?? 0) + 1e-9 < q * mult) return false;
  }
  return true;
}

export function invSub(inv: Inventory, need: Inventory, mult = 1): void {
  for (const [id, q] of Object.entries(need) as [ItemId, number][]) invAdd(inv, id, -q * mult);
}

export function invTotal(inv: Inventory): number {
  let s = 0;
  for (const q of Object.values(inv)) s += q ?? 0;
  return s;
}

export function invEntries(inv: Inventory): [ItemId, number][] {
  return (Object.entries(inv) as [ItemId, number][]).filter(([, q]) => q > 1e-9);
}

export function invValue(inv: Inventory): number {
  let s = 0;
  for (const [id, q] of invEntries(inv)) s += ITEMS[id].basePrice * q;
  return s;
}

export function invScale(inv: Inventory, mult: number, round = true): Inventory {
  const out: Inventory = {};
  for (const [id, q] of invEntries(inv)) out[id] = round ? Math.ceil(q * mult) : q * mult;
  return out;
}
