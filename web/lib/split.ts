import type { Member } from "./model";
import {
  USABLE_36,
  USABLE_48,
  fitsSomeStock,
  type SheetSize,
} from "./stock";

const EPS = 0.01;
const MAX_DEPTH = 16;

function copyPiece(
  src: Member,
  patch: Partial<Pick<Member, "id" | "name" | "length" | "width">>,
): Member {
  return { ...src, ...patch };
}

function cutAlongLength(src: Member, maxLen: number): Member[] {
  const out: Member[] = [];
  let remain = src.length;
  let i = 0;
  while (remain > maxLen + EPS) {
    out.push(
      copyPiece(src, {
        id: `${src.id}-L${i}`,
        name: `${src.name}${letter(i)}`,
        length: maxLen,
      }),
    );
    remain -= maxLen;
    i += 1;
  }
  out.push(
    copyPiece(src, {
      id: `${src.id}-L${i}`,
      name: `${src.name}${letter(i)}`,
      length: remain,
    }),
  );
  return out;
}

function cutAlongWidth(src: Member, maxW: number): Member[] {
  const out: Member[] = [];
  let remain = src.width;
  let i = 0;
  while (remain > maxW + EPS) {
    out.push(
      copyPiece(src, {
        id: `${src.id}-W${i}`,
        name: `${src.name}${letter(i)}`,
        width: maxW,
      }),
    );
    remain -= maxW;
    i += 1;
  }
  out.push(
    copyPiece(src, {
      id: `${src.id}-W${i}`,
      name: `${src.name}${letter(i)}`,
      width: remain,
    }),
  );
  return out;
}

function letter(i: number): string {
  return String.fromCharCode("a".charCodeAt(0) + i);
}

function tJoint(src: Member, sheetL: number, sheetW: number): Member[] {
  const mainL = Math.min(src.length, sheetL);
  const mainW = Math.min(src.width, sheetW);
  const remL = src.length - mainL;
  const remW = src.width - mainW;
  const out: Member[] = [
    copyPiece(src, {
      id: `${src.id}-A`,
      name: `${src.name}A(主)`,
      length: mainL,
      width: mainW,
    }),
  ];
  if (remW > EPS) {
    out.push(
      copyPiece(src, {
        id: `${src.id}-B`,
        name: `${src.name}B(巾残)`,
        length: mainL,
        width: remW,
      }),
    );
  }
  if (remL > EPS) {
    out.push(
      copyPiece(src, {
        id: `${src.id}-C`,
        name: `${src.name}C(エンド)`,
        length: src.width,
        width: remL,
      }),
    );
  }
  return out;
}

function splitOnce(src: Member, sheet: SheetSize): Member[] {
  const overL = src.length > sheet.length + EPS;
  const overW = src.width > sheet.width + EPS;
  if (src.joint === "straight") {
    if (overL) return cutAlongLength(src, sheet.length);
    if (overW) return cutAlongWidth(src, sheet.width);
    return [src];
  }
  if (overL && overW) return tJoint(src, sheet.length, sheet.width);
  if (overL) return cutAlongLength(src, sheet.length);
  if (overW) return cutAlongWidth(src, sheet.width);
  return [src];
}

function splitOne(
  src: Member,
  sheet: SheetSize,
  done: (item: Member) => boolean,
  depth: number,
): Member[] {
  if (done(src)) return [src];
  if (depth >= MAX_DEPTH) return [src];
  const parts = splitOnce(src, sheet);
  if (parts.length === 1 && parts[0].length === src.length && parts[0].width === src.width) {
    return [src];
  }
  return parts.flatMap((part) => splitOne(part, sheet, done, depth + 1));
}

/** 3×6 にも 4×8 にも載らない部材だけ分割する。載るものは寸法のまま残す。 */
export function splitOversize(members: Member[]): Member[] {
  return members.flatMap((item) =>
    splitOne(
      item,
      USABLE_48,
      (part) => fitsSomeStock(part.length, part.width, part.canRotate),
      0,
    ),
  );
}

/** 高さが 3×6 の長さを超えるとき、長さ方向だけ分割する。 */
export function splitByPanelHeight(
  members: Member[],
  panelHeight: number,
  panelWidth: number,
  maxLength: number = USABLE_36.length,
): Member[] {
  if (panelHeight <= maxLength + EPS) return members;
  const heightIsLongSide = panelHeight >= panelWidth;
  return members.flatMap((src) =>
    heightIsLongSide ? cutAlongLength(src, maxLength) : cutAlongWidth(src, maxLength),
  );
}

/** 横幅が 3×6 の巾を超えるとき、巾方向だけ分割する。 */
export function splitByPanelWidth(
  members: Member[],
  panelWidth: number,
  panelHeight: number,
  maxWidth: number = USABLE_36.width,
): Member[] {
  if (panelWidth <= maxWidth + EPS) return members;
  const widthIsLongSide = panelWidth >= panelHeight;
  return members.flatMap((src) =>
    widthIsLongSide ? cutAlongLength(src, maxWidth) : cutAlongWidth(src, maxWidth),
  );
}
