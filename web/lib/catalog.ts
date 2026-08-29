/** 寸面・種類の正本。Q&A と部材出しはここを見る。単価は台帳（ledger）側。 */

export const FRAME_KINDS = [
  "小割",
  "垂木",
  "ジェルトン",
  "LVL",
  "クランパヤン",
  "ベニヤ",
  "ランバー",
] as const;

export type FrameKind = (typeof FRAME_KINDS)[number];

export type StickKind = "小割" | "垂木";
export type NamedTimberKind = "ジェルトン" | "LVL" | "クランパヤン";
export type SheetKind = "ベニヤ" | "ランバー";
export type BoardKind = NamedTimberKind | SheetKind;
export const SHEET_FACES = ["ラワン", "シナ"] as const;
export type SheetFace = (typeof SHEET_FACES)[number];

export type StickSpec = {
  kind: StickKind;
  short: number;
  long: number;
  label: string;
  stockLength: number;
};

/** 半生材の定尺長さ */
export const STICK_STOCK_MM = 4000;
/** ジェルトン・LVL・クランパヤンの定尺長さ */
export const TIMBER_STOCK_MM = 2430;

export const STICK_CATALOG: readonly StickSpec[] = [
  { kind: "小割", short: 20, long: 30, label: "20×30", stockLength: STICK_STOCK_MM },
  { kind: "垂木", short: 30, long: 40, label: "30×40", stockLength: STICK_STOCK_MM },
];

export type NamedTimberSpec = {
  kind: NamedTimberKind;
  /** 面巾。厚み（成）は現場で数値入力する */
  width: number;
  stockLength: number;
};

export const NAMED_TIMBER_CATALOG: readonly NamedTimberSpec[] = [
  { kind: "ジェルトン", width: 45, stockLength: TIMBER_STOCK_MM },
  { kind: "LVL", width: 50, stockLength: TIMBER_STOCK_MM },
  { kind: "クランパヤン", width: 45, stockLength: TIMBER_STOCK_MM },
];

export function timberOf(kind: NamedTimberKind): NamedTimberSpec {
  const found = NAMED_TIMBER_CATALOG.find((item) => item.kind === kind);
  if (!found) throw new Error(`timber catalog missing: ${kind}`);
  return found;
}

export function isStickKind(kind: FrameKind | undefined): kind is StickKind {
  return kind === "小割" || kind === "垂木";
}

export function isNamedTimberKind(
  kind: FrameKind | undefined,
): kind is NamedTimberKind {
  return kind === "ジェルトン" || kind === "LVL" || kind === "クランパヤン";
}

export function isSheetKind(kind: FrameKind | undefined): kind is SheetKind {
  return kind === "ベニヤ" || kind === "ランバー";
}

export function sheetMaterialName(kind: SheetKind, face: SheetFace): string {
  return `${face}${kind}`;
}

export function defaultFrameThickness(kind: FrameKind | undefined): number {
  return isNamedTimberKind(kind) ? 21 : 15;
}

export function isBoardKind(kind: FrameKind | undefined): kind is BoardKind {
  return isNamedTimberKind(kind) || isSheetKind(kind);
}

export function stickOf(kind: StickKind): StickSpec {
  const found = STICK_CATALOG.find((item) => item.kind === kind);
  if (!found) throw new Error(`stick catalog missing: ${kind}`);
  return found;
}

export function stickName(kind: StickKind): string {
  const spec = stickOf(kind);
  return `${spec.kind} ${spec.label}`;
}

export function stickSei(kind: StickKind, use: "成使い" | "横使い"): number {
  const spec = stickOf(kind);
  return use === "成使い" ? spec.long : spec.short;
}

export function stickFace(kind: StickKind, use: "成使い" | "横使い"): number {
  const spec = stickOf(kind);
  return use === "成使い" ? spec.short : spec.long;
}

export function boardKindOf(materialName: string): SheetKind | NamedTimberKind | null {
  if (materialName.includes("ジェルトン")) return "ジェルトン";
  if (materialName.includes("LVL")) return "LVL";
  if (materialName.includes("クランパヤン")) return "クランパヤン";
  if (materialName.includes("ランバー")) return "ランバー";
  if (materialName.includes("ベニヤ") || materialName.includes("合板")) {
    return "ベニヤ";
  }
  return null;
}

/** 枠材の定尺。板（ベニヤ・ランバー）は null。木取りはイタドリ側。 */
export function linearStockLength(materialName: string): number | null {
  if (materialName.startsWith("小割") || materialName.startsWith("垂木")) {
    return STICK_STOCK_MM;
  }
  const kind = boardKindOf(materialName);
  if (kind && isNamedTimberKind(kind)) return TIMBER_STOCK_MM;
  return null;
}

export function frameKindHint(kind: FrameKind): string {
  if (kind === "小割") return "20×30";
  if (kind === "垂木") return "30×40";
  if (isNamedTimberKind(kind)) return `幅 ${timberOf(kind).width}mm`;
  return "厚パネル";
}

export const KOGARA = stickOf("小割");
export const TARUKI = stickOf("垂木");
