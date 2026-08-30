import { USABLE_36, USABLE_38, USABLE_48, fitsOn } from "./stock";
import { boardKindOf, linearStockLength, type SheetKind } from "./catalog";
import type { Member } from "./model";
import { packSticks, piecesFromMembers, type StickCut } from "./stickCut";

export const LEDGER_STORAGE_KEY = "hanjizu.ledger.csv";
export const LEDGER_NAME_KEY = "hanjizu.ledger.name";

export type LedgerRow = {
  use: string;
  name: string;
  thickness: number;
  price36?: number;
  price48?: number;
};

export type BundleQuote = {
  key: string;
  yen: number | null;
  count36: number;
  count38: number;
  count48: number;
  meters: number;
  note?: string;
  stickCut?: StickCut;
};

function parseYen(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function parseLedger(csv: string): LedgerRow[] {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/);
  const rows: LedgerRow[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split(",");
    const name = (cols[1] ?? "").trim();
    const thickness = Number(cols[2]);
    if (!name || !Number.isFinite(thickness)) continue;
    rows.push({
      use: (cols[0] ?? "").trim(),
      name,
      thickness,
      price36: parseYen(cols[3] ?? ""),
      price48: parseYen(cols[4] ?? ""),
    });
  }
  return rows;
}

export function parseMaterialKey(
  key: string,
): { name: string; thickness: number } | null {
  const m = key.match(/^(.*)\s+([\d.]+)$/);
  if (!m) return null;
  return { name: m[1], thickness: Number(m[2]) };
}

export function findLedgerRow(
  rows: LedgerRow[],
  name: string,
  thickness: number,
): LedgerRow | undefined {
  return rows.find(
    (row) => row.name === name && Math.abs(row.thickness - thickness) < 0.05,
  );
}

export function boardOptions(
  rows: LedgerRow[],
  kind: SheetKind,
): { name: string; thickness: number; key: string }[] {
  const seen = new Set<string>();
  const out: { name: string; thickness: number; key: string }[] = [];
  for (const row of rows) {
    if (boardKindOf(row.name) !== kind) continue;
    const key = `${row.name} ${row.thickness}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: row.name, thickness: row.thickness, key });
  }
  return out;
}

function pieceArea(item: Member): number {
  return item.length * item.width * item.qty;
}

function allFit(
  members: Member[],
  sheet: typeof USABLE_36,
): boolean {
  return members.every((item) =>
    fitsOn(item.length, item.width, sheet, item.canRotate),
  );
}

export function quoteBundle(
  key: string,
  members: Member[],
  rows: LedgerRow[],
): BundleQuote {
  const parsed = parseMaterialKey(key);
  const meters =
    members.reduce((sum, item) => sum + item.length * item.qty, 0) / 1000;
  const stockLength = parsed ? linearStockLength(parsed.name) : null;

  if (stockLength != null) {
    const stickCut = packSticks(piecesFromMembers(members), stockLength);
    const unfitNote =
      stickCut.unfit.length > 0
        ? `${stickCut.unfit.map((item) => `${item.name} ${item.length}mm`).join("、")}は定尺に載らない（継ぎは後回し）`
        : undefined;
    return {
      key,
      yen: null,
      count36: 0,
      count38: 0,
      count48: 0,
      meters,
      stickCut,
      note: unfitNote,
    };
  }

  if (!parsed) {
    return {
      key,
      yen: null,
      count36: 0,
      count38: 0,
      count48: 0,
      meters,
      note: "材料キーが読めない",
    };
  }

  const hint = members.find((item) => item.stockHint)?.stockHint;
  const area = members.reduce((sum, item) => sum + pieceArea(item), 0);
  const a36 = USABLE_36.length * USABLE_36.width;
  const a38 = USABLE_38.length * USABLE_38.width;
  const a48 = USABLE_48.length * USABLE_48.width;
  const n36 = allFit(members, USABLE_36) ? Math.max(1, Math.ceil(area / a36)) : 0;
  const n38 = allFit(members, USABLE_38) ? Math.max(1, Math.ceil(area / a38)) : 0;
  const n48 = allFit(members, USABLE_48) ? Math.max(1, Math.ceil(area / a48)) : 0;

  if (hint === "3x8") {
    return {
      key,
      yen: null,
      count36: 0,
      count38: n38,
      count48: 0,
      meters,
      note:
        n38 > 0
          ? "3×8の単価は台帳にまだない"
          : "定尺に載らない",
    };
  }

  const row = findLedgerRow(rows, parsed.name, parsed.thickness);
  if (!row) {
    return {
      key,
      yen: null,
      count36: hint === "4x8" ? 0 : n36,
      count38: 0,
      count48: hint === "4x8" ? n48 : 0,
      meters,
      note: "台帳に合致する企画がありません",
    };
  }

  const candidates: { count36: number; count38: number; count48: number; yen: number }[] =
    [];
  if (hint !== "4x8" && n36 > 0 && row.price36 != null) {
    candidates.push({ count36: n36, count38: 0, count48: 0, yen: n36 * row.price36 });
  }
  if (hint !== "3x6" && n48 > 0 && row.price48 != null) {
    candidates.push({ count36: 0, count38: 0, count48: n48, yen: n48 * row.price48 });
  }
  if (candidates.length === 0) {
    return {
      key,
      yen: null,
      count36: hint === "4x8" ? 0 : n36,
      count38: 0,
      count48: hint === "3x6" ? 0 : n48,
      meters,
      note: "定尺単価が空、または定尺に載らない",
    };
  }
  const best = candidates.reduce((a, b) => (a.yen <= b.yen ? a : b));
  return {
    key,
    yen: best.yen,
    count36: best.count36,
    count38: best.count38,
    count48: best.count48,
    meters,
  };
}

export function quoteTotal(quotes: BundleQuote[]): number | null {
  if (quotes.some((q) => q.yen == null)) return null;
  return quotes.reduce((sum, q) => sum + (q.yen ?? 0), 0);
}

export function yenText(n: number): string {
  return `${Math.round(n).toLocaleString("ja-JP")}円`;
}
