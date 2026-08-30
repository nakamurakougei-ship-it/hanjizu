import type { Member } from "./model";
import { fitsOn, USABLE_36, USABLE_38, USABLE_48, type SheetSize } from "./stock";

export function sheetForPiece(
  length: number,
  width: number,
  canRotate: boolean,
): SheetSize | null {
  if (fitsOn(length, width, USABLE_36, canRotate)) return USABLE_36;
  if (fitsOn(length, width, USABLE_38, canRotate)) return USABLE_38;
  if (fitsOn(length, width, USABLE_48, canRotate)) return USABLE_48;
  return null;
}

export type PlacedSheetPiece = {
  name: string;
  x: number;
  y: number;
  length: number;
  width: number;
};

export type PackedSheet = {
  stock: SheetSize;
  pieces: PlacedSheetPiece[];
};

type FreeRect = {
  x: number;
  y: number;
  length: number;
  width: number;
};

type LoosePiece = {
  name: string;
  length: number;
  width: number;
  canRotate: boolean;
};

function orient(
  length: number,
  width: number,
  stock: SheetSize,
  canRotate: boolean,
): { length: number; width: number } | null {
  if (length <= stock.length && width <= stock.width) {
    return { length, width };
  }
  if (canRotate && width <= stock.length && length <= stock.width) {
    return { length: width, width: length };
  }
  return null;
}

function expandMembers(members: Member[]): LoosePiece[] {
  const out: LoosePiece[] = [];
  for (const item of members) {
    const n = Math.max(1, Math.floor(item.qty));
    for (let i = 0; i < n; i += 1) {
      out.push({
        name: n > 1 ? `${item.name} ${i + 1}` : item.name,
        length: item.length,
        width: item.width,
        canRotate: item.canRotate,
      });
    }
  }
  return out;
}

function packOnto(
  pieces: LoosePiece[],
  stock: SheetSize,
): { sheets: PackedSheet[]; leftover: LoosePiece[] } {
  const leftover: LoosePiece[] = [];
  const sheets: { stock: SheetSize; pieces: PlacedSheetPiece[]; free: FreeRect[] }[] =
    [];

  function placeOnSheet(
    sheet: (typeof sheets)[number],
    piece: LoosePiece,
  ): boolean {
    const size = orient(piece.length, piece.width, sheet.stock, piece.canRotate);
    if (!size) return false;
    const index = sheet.free.findIndex(
      (rect) => size.length <= rect.length && size.width <= rect.width,
    );
    if (index < 0) return false;
    const rect = sheet.free[index];
    sheet.free.splice(index, 1);
    sheet.pieces.push({
      name: piece.name,
      x: rect.x,
      y: rect.y,
      length: size.length,
      width: size.width,
    });
    const right = rect.length - size.length;
    const below = rect.width - size.width;
    if (right > 0.5) {
      sheet.free.push({
        x: rect.x + size.length,
        y: rect.y,
        length: right,
        width: size.width,
      });
    }
    if (below > 0.5) {
      sheet.free.push({
        x: rect.x,
        y: rect.y + size.width,
        length: rect.length,
        width: below,
      });
    }
    return true;
  }

  const ordered = pieces
    .slice()
    .sort((a, b) => b.length * b.width - a.length * a.width);

  for (const piece of ordered) {
    if (!orient(piece.length, piece.width, stock, piece.canRotate)) {
      leftover.push(piece);
      continue;
    }
    let placed = false;
    for (const sheet of sheets) {
      if (placeOnSheet(sheet, piece)) {
        placed = true;
        break;
      }
    }
    if (!placed) {
      const sheet = {
        stock,
        pieces: [] as PlacedSheetPiece[],
        free: [
          { x: 0, y: 0, length: stock.length, width: stock.width },
        ],
      };
      placeOnSheet(sheet, piece);
      sheets.push(sheet);
    }
  }

  return {
    sheets: sheets.map(({ stock: size, pieces: placed }) => ({
      stock: size,
      pieces: placed,
    })),
    leftover,
  };
}

function stockOfHint(hint: Member["stockHint"]): SheetSize {
  if (hint === "3x8") return USABLE_38;
  if (hint === "4x8") return USABLE_48;
  return USABLE_36;
}

/** 同じ定尺に載る部材を仮詰め。行割り・余り詰めの本実装はイタドリ移植。 */
export function packFaceSheets(members: Member[]): {
  sheets: PackedSheet[];
  unfit: LoosePiece[];
} {
  const byHint = new Map<NonNullable<Member["stockHint"]> | "3x6", Member[]>();
  for (const item of members) {
    const hint = item.stockHint ?? "3x6";
    const list = byHint.get(hint) ?? [];
    list.push(item);
    byHint.set(hint, list);
  }
  const sheets: PackedSheet[] = [];
  const unfit: LoosePiece[] = [];
  const order: Array<NonNullable<Member["stockHint"]>> = ["3x6", "3x8", "4x8"];
  for (const hint of order) {
    const group = byHint.get(hint);
    if (!group || group.length === 0) continue;
    const preferred = stockOfHint(hint);
    const rest = [USABLE_36, USABLE_38, USABLE_48].filter(
      (stock) => stock.name !== preferred.name,
    );
    let leftover = expandMembers(group);
    const first = packOnto(leftover, preferred);
    sheets.push(...first.sheets);
    leftover = first.leftover;
    for (const stock of rest) {
      if (leftover.length === 0) break;
      const packed = packOnto(leftover, stock);
      sheets.push(...packed.sheets);
      leftover = packed.leftover;
    }
    unfit.push(...leftover);
  }
  return { sheets, unfit };
}

export function shortFaceLabel(fullName: string, panelName: string): string {
  const prefix = `${panelName} `;
  const trimmed = fullName.startsWith(prefix)
    ? fullName.slice(prefix.length)
    : fullName;
  return trimmed.replace(/^面材\s+/, "");
}
