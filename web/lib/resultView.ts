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

export function materialLabel(
  key: string,
  quote?: Pick<BundleQuote, "count36" | "count38" | "count48">,
): string {
  const parsed = parseMaterialKey(key);
  if (!parsed) return key;
  const { name, thickness } = parsed;
  if (name.startsWith("小割") || name.startsWith("垂木")) return name;
  if (/ベニヤ|ランバー|ポリ板|突板/.test(name)) {
    const stock = sheetStockLabel(quote);
    return stock ? `${thickness}mm${name} ${stock}` : `${thickness}mm${name}`;
  }
  return `${name} ${thickness}mm`;
}

function sheetStockLabel(
  quote?: Pick<BundleQuote, "count36" | "count38" | "count48">,
): string {
  if (!quote) return "";
  const kinds = [
    quote.count36 > 0 ? "3×6" : "",
    quote.count38 > 0 ? "3×8" : "",
    quote.count48 > 0 ? "4×8" : "",
  ].filter(Boolean);
  return kinds.length === 1 ? kinds[0] : "";
}

export function stockCountText(quote: BundleQuote): string {
  if (quote.stickCut) {
    const n = quote.stickCut.bars.length;
    return n > 0 ? `${n}本` : "定尺に載らない";
  }
  const parts: string[] = [];
  if (quote.count36 > 0) parts.push(`3×6 ${quote.count36}枚`);
  if (quote.count38 > 0) parts.push(`3×8 ${quote.count38}枚`);
  if (quote.count48 > 0) parts.push(`4×8 ${quote.count48}枚`);
  if (parts.length === 1) {
    const n = quote.count36 + quote.count38 + quote.count48;
    return `${n}枚`;
  }
  return parts.join(" ／ ");
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

export function frameKindShortName(materialKey: string): string {
  const parsed = parseMaterialKey(materialKey);
  const name = parsed?.name ?? materialKey;
  if (name.startsWith("小割")) return "小割";
  if (name.startsWith("垂木")) return "垂木";
  return name.replace(/\s+\d+(\.\d+)?$/, "").trim() || name;
}

export function stickRoleLabel(name: string, materialKey: string): string {
  const kind = frameKindShortName(materialKey);
  if (isStileName(name) || isVStileName(name)) return `縦残（${kind}）`;
  if (isRailName(name)) return `横桟（${kind}）`;
  return kind;
}

export function isStickMemberName(name: string): boolean {
  return isStileName(name) || isRailName(name) || isVStileName(name);
}

export type StickLine = {
  label: string;
  length: number;
  count: number;
};

export function stickMemberLines(members: Member[]): StickLine[] {
  const map = new Map<string, StickLine>();
  for (const item of members) {
    if (!isStickMemberName(item.name)) continue;
    const label = stickRoleLabel(item.name, item.materialKey);
    const key = `${label}\t${item.length}`;
    const prev = map.get(key);
    if (prev) prev.count += item.qty;
    else map.set(key, { label, length: item.length, count: item.qty });
  }
  return [...map.values()].sort((a, b) => {
    const rank = (label: string) =>
      label.startsWith("縦残") ? 0 : label.startsWith("横桟") ? 1 : 2;
    return rank(a.label) - rank(b.label) || a.label.localeCompare(b.label, "ja") || b.length - a.length;
  });
}

export type MaterialCut = {
  key: string;
  label: string;
  cut: StickCut;
};

export function stickCutsByMaterial(members: Member[]): MaterialCut[] {
  const byKey = new Map<string, Member[]>();
  for (const item of members) {
    if (!isStickMemberName(item.name)) continue;
    const list = byKey.get(item.materialKey) ?? [];
    list.push(item);
    byKey.set(item.materialKey, list);
  }
  const out: MaterialCut[] = [];
  for (const [key, items] of byKey) {
    const parsed = parseMaterialKey(key);
    const stock = parsed ? linearStockLength(parsed.name) : null;
    if (stock == null) continue;
    out.push({
      key,
      label: materialLabel(key),
      cut: packSticks(piecesFromMembers(items), stock),
    });
  }
  return out;
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
