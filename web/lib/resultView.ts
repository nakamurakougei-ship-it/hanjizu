import { linearStockLength } from "./catalog";
import { parseMaterialKey, type BundleQuote } from "./ledger";
import type { Member } from "./model";
import { packSticks, piecesFromMembers, type StickCut } from "./stickCut";

export function isStileName(name: string): boolean {
  return /(?:^|\s)(左縦|右縦)$/.test(name);
}

export function stileMembers(members: Member[]): Member[] {
  return members.filter((item) => isStileName(item.name));
}

export function stileCount(members: Member[]): number {
  return stileMembers(members).reduce((sum, item) => sum + item.qty, 0);
}

export function materialLabel(key: string): string {
  const parsed = parseMaterialKey(key);
  if (!parsed) return key;
  const { name, thickness } = parsed;
  if (name.startsWith("小割") || name.startsWith("垂木")) return name;
  return `${name} ${thickness}mm`;
}

export function stockCountText(quote: BundleQuote): string {
  if (quote.stickCut) {
    const n = quote.stickCut.bars.length;
    return n > 0 ? `${n}本` : "定尺に載らない";
  }
  if (quote.count36 > 0 && quote.count48 > 0) {
    return `3×6 ${quote.count36}枚 ／ 4×8 ${quote.count48}枚`;
  }
  if (quote.count36 > 0) return `3×6 ${quote.count36}枚`;
  if (quote.count48 > 0) return `4×8 ${quote.count48}枚`;
  return "";
}

export function quoteAvailableTotal(quotes: BundleQuote[]): {
  yen: number | null;
  missing: boolean;
} {
  const priced = quotes.filter((item) => item.yen != null);
  const missing = quotes.some((item) => item.yen == null);
  if (priced.length === 0) return { yen: null, missing };
  return {
    yen: priced.reduce((sum, item) => sum + (item.yen ?? 0), 0),
    missing,
  };
}

export function stileCut(members: Member[]): StickCut | null {
  const stiles = stileMembers(members);
  if (stiles.length === 0) return null;
  const parsed = parseMaterialKey(stiles[0]?.materialKey ?? "");
  const stock = parsed ? linearStockLength(parsed.name) : null;
  if (stock == null) return null;
  const pieces = piecesFromMembers(stiles).map((piece) => ({
    ...piece,
    name: "縦残",
  }));
  return packSticks(pieces, stock);
}

export function isRailName(name: string): boolean {
  return /(?:^|\s)(上桟|下桟|中桟\d+)$/.test(name);
}

export function railKindLabel(materialKey: string): string {
  const parsed = parseMaterialKey(materialKey);
  const name = parsed?.name ?? materialKey;
  if (name.startsWith("小割")) return "横桟（小割）";
  if (name.startsWith("垂木")) return "横桟（垂木）";
  return `横桟（${name}）`;
}

export type RailGroup = {
  key: string;
  label: string;
  count: number;
  cut: StickCut | null;
};

export function isVStileName(name: string): boolean {
  return /(?:^|\s)縦残$/.test(name);
}

export function vStileKindLabel(materialKey: string): string {
  const parsed = parseMaterialKey(materialKey);
  const name = parsed?.name ?? materialKey;
  if (name.startsWith("小割")) return "縦残（小割）";
  if (name.startsWith("垂木")) return "縦残（垂木）";
  return `縦残（${name}）`;
}

export function vStileGroups(members: Member[]): RailGroup[] {
  const extra = members.filter((item) => isVStileName(item.name));
  const byKey = new Map<string, Member[]>();
  for (const item of extra) {
    const list = byKey.get(item.materialKey) ?? [];
    list.push(item);
    byKey.set(item.materialKey, list);
  }
  return [...byKey.entries()].map(([key, items]) => {
    const parsed = parseMaterialKey(key);
    const stock = parsed ? linearStockLength(parsed.name) : null;
    const label = vStileKindLabel(key);
    const count = items.reduce((sum, item) => sum + item.qty, 0);
    const pieces = piecesFromMembers(items).map((piece) => ({
      ...piece,
      name: label,
    }));
    return {
      key,
      label,
      count,
      cut: stock != null ? packSticks(pieces, stock) : null,
    };
  });
}

export function railGroups(members: Member[]): RailGroup[] {
  const rails = members.filter((item) => isRailName(item.name));
  const byKey = new Map<string, Member[]>();
  for (const item of rails) {
    const list = byKey.get(item.materialKey) ?? [];
    list.push(item);
    byKey.set(item.materialKey, list);
  }
  return [...byKey.entries()].map(([key, items]) => {
    const parsed = parseMaterialKey(key);
    const stock = parsed ? linearStockLength(parsed.name) : null;
    const label = railKindLabel(key);
    const count = items.reduce((sum, item) => sum + item.qty, 0);
    const pieces = piecesFromMembers(items).map((piece) => ({
      ...piece,
      name: label,
    }));
    return {
      key,
      label,
      count,
      cut: stock != null ? packSticks(pieces, stock) : null,
    };
  });
}
