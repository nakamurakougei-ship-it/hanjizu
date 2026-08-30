import {
  KOGARA,
  TARUKI,
  isNamedTimberKind,
  isSheetKind,
  isStickKind,
  stickFace,
  stickName,
  stickSei,
  timberOf,
  type StickKind,
} from "./catalog";
import type { Member } from "./model";
import {
  asksFaceStock,
  faceMaterialName,
  faceSidesDiffer,
  stockHintOf,
  type FaceStock,
  type QaAnswers,
} from "./qa";
import { splitByPanelWidth } from "./split";
import { USABLE_36, USABLE_38, USABLE_48 } from "./stock";

export { KOGARA, TARUKI };

/** 横桟の余裕。寸面通りなら 0。余裕なら入力ミリ（未入力は 1） */
export function railShortMm(answers: QaAnswers): number {
  if (answers.railFit !== "余裕") return 0;
  const n = answers.railAllow;
  if (n == null || !Number.isFinite(n) || n < 0) return 1;
  return n;
}

/** 半生材の横桟に使う余裕の目安（質問の初期値） */
export const HANSEI_SHORT_MM = 1;
/** 横桟ピッチの初期値。仕上がり高さ ÷ ピッチの端数切捨て − 1 が中の本数 */
export const DEFAULT_RAIL_PITCH_MM = 450;
export const PANEL_FACE_T_MM = 3;

export function kogaraSei(use: "成使い" | "横使い"): number {
  return stickSei("小割", use);
}

export function kogaraFace(use: "成使い" | "横使い"): number {
  return stickFace("小割", use);
}

export function railPitchMm(answers: QaAnswers): number {
  const n = answers.railPitch;
  if (n == null || !Number.isFinite(n) || n <= 0) return DEFAULT_RAIL_PITCH_MM;
  return n;
}

/** 上下を除く中の横桟本数。端数切捨て。例: 1800÷450→3本、1800÷300→5本 */
export function midRailCount(height: number, pitch: number): number {
  if (height <= 0 || pitch <= 0) return 0;
  return Math.max(0, Math.floor(height / pitch) - 1);
}

export function extraStileColumns(answers: QaAnswers): number {
  if (!asksFaceStock(answers) && answers.stileExtra !== "入れる") return 0;
  const n = Math.floor(Number(answers.stileExtraN));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** 横桟勝ちの縦残1列分。高さ − 横桟幅×本数 を隙間数で割る */
export function extraStileSegLength(height: number, railFaces: number[]): number {
  if (railFaces.length === 0) return height;
  const remaining = height - railFaces.reduce((sum, face) => sum + face, 0);
  const gaps = Math.max(1, railFaces.length - 1);
  return Math.max(0, remaining / gaps);
}

function railFaceList(top: number, mid: number, bottom: number, midCount: number): number[] {
  return [top, ...Array.from({ length: midCount }, () => mid), bottom];
}

function extraStileSpec(
  answers: QaAnswers,
  frame: { sei: number; fw: number; materialName: string },
): { width: number; thickness: number; materialName: string } {
  if (answers.frameKind === "小割" || answers.frameKind == null) {
    const use = answers.boneUse ?? "成使い";
    const sameAsFrame =
      answers.stileExtraMat === "小割" ||
      (answers.stileExtraMat == null && use === "横使い");
    if (sameAsFrame) {
      return {
        width: kogaraFace(use),
        thickness: kogaraSei(use),
        materialName: stickName("小割"),
      };
    }
    return {
      width: TARUKI.long,
      thickness: frame.sei,
      materialName: stickName("垂木"),
    };
  }
  return {
    width: frame.fw,
    thickness: frame.sei,
    materialName: frame.materialName,
  };
}

export function extraStilePlaneNote(answers: QaAnswers): string | null {
  if (answers.stileExtraMat !== "垂木を削る") return null;
  return `垂木を${kogaraSei("横使い")}mmに削る条件で木取図を作成`;
}

function pushExtraStiles(
  out: Member[],
  answers: QaAnswers,
  opts: {
    sei: number;
    fw: number;
    materialName: string;
    railFaces: number[];
    height: number;
  },
): void {
  const columns = extraStileColumns(answers);
  if (columns <= 0) return;
  const gaps = Math.max(1, opts.railFaces.length - 1);
  const spec = extraStileSpec(answers, {
    sei: opts.sei,
    fw: opts.fw,
    materialName: opts.materialName,
  });
  out.push(
    stick({
      id: "panel-vstile",
      name: "縦残",
      length: extraStileSegLength(opts.height, opts.railFaces),
      width: spec.width,
      thickness: spec.thickness,
      materialName: spec.materialName,
      qty: columns * gaps,
    }),
  );
}

export function faceSpecOf(
  answers: QaAnswers,
  side: "front" | "back",
): { stock: FaceStock; material: string; thick: number } {
  const differ = faceSidesDiffer(answers);
  const back = side === "back" && differ;
  return {
    stock: (back ? answers.faceStockBack : answers.faceStock) ?? "3×6",
    material: faceMaterialName(
      back ? answers.faceKindBack : answers.faceKind,
      back ? answers.faceWoodBack : answers.faceWood,
    ),
    thick: (back ? answers.faceThickBack : answers.faceThick) ?? PANEL_FACE_T_MM,
  };
}

function stockUsableWidth(stock: FaceStock): number {
  if (stock === "3×8") return USABLE_38.width;
  if (stock === "4×8") return USABLE_48.width;
  return USABLE_36.width;
}

function pushFaces(
  out: Member[],
  answers: QaAnswers,
  height: number,
  width: number,
): void {
  const front = faceSpecOf(answers, "front");
  const faces = [
    skin("panel-face", "面材 表", height, width, front.material, front.thick, front.stock),
  ];
  if (answers.sides === "両面") {
    const back = faceSpecOf(answers, "back");
    faces.push(
      skin(
        "panel-face-back",
        "面材 裏",
        height,
        width,
        back.material,
        back.thick,
        back.stock,
      ),
    );
  }
  out.push(
    ...faces.flatMap((item) => {
      const hint = item.stockHint;
      const stock: FaceStock =
        hint === "3x8" ? "3×8" : hint === "4x8" ? "4×8" : "3×6";
      const maxW = stockUsableWidth(stock);
      return width > maxW ? splitByPanelWidth([item], width, height, maxW) : [item];
    }),
  );
}

function stick(input: {
  id: string;
  name: string;
  length: number;
  width: number;
  thickness: number;
  materialName: string;
  qty?: number;
}): Member {
  const thick = input.thickness;
  const keyThick = Number.isInteger(thick) ? String(thick) : thick.toFixed(1);
  return {
    id: input.id,
    name: input.name,
    boxId: "パネル",
    faceId: "top",
    role: "core",
    length: input.length,
    width: input.width,
    thickness: thick,
    construction: "flush",
    materialKey: `${input.materialName} ${keyThick}`,
    qty: input.qty ?? 1,
    joint: "straight",
    canRotate: true,
  };
}

function midRailLength(
  tateWin: boolean,
  width: number,
  stileFace: number,
  short: number,
): number {
  return tateWin ? width - 2 * stileFace - short : width - short;
}

function pushMidRails(
  out: Member[],
  answers: QaAnswers,
  spec: { length: number; width: number; thickness: number; materialName: string },
): void {
  const n = midRailCount(answers.height, railPitchMm(answers));
  for (let i = 0; i < n; i += 1) {
    out.push(
      stick({
        id: `panel-naka-${i}`,
        name: `中桟${i + 1}`,
        ...spec,
      }),
    );
  }
}

function skin(
  id: string,
  name: string,
  length: number,
  width: number,
  material: string,
  thick: number = PANEL_FACE_T_MM,
  stock?: FaceStock,
): Member {
  const keyThick = Number.isInteger(thick) ? String(thick) : String(thick);
  return {
    id,
    name,
    boxId: "パネル",
    faceId: "top",
    role: "core",
    length: Math.max(length, width),
    width: Math.min(length, width),
    thickness: thick,
    construction: "plywood",
    materialKey: `${material} ${keyThick}`,
    qty: 1,
    joint: "t-joint",
    canRotate: true,
    stockHint: stockHintOf(stock),
  };
}

function boardPanel(answers: QaAnswers): Member[] {
  const W = answers.width;
  const H = answers.height;
  const t = answers.frameThickness ?? 15;
  const material =
    answers.frameMaterial ??
    (answers.frameKind === "ベニヤ" ? "ラワンベニヤ" : "ラワンランバー");
  const keyThick = Number.isInteger(t) ? String(t) : String(t);
  const core: Member = {
    id: "panel-core",
    name: "芯",
    boxId: "パネル",
    faceId: "top",
    role: "core",
    length: Math.max(H, W),
    width: Math.min(H, W),
    thickness: t,
    construction: "thick",
    materialKey: `${material} ${keyThick}`,
    qty: 1,
    joint: "straight",
    canRotate: true,
  };
  const maxW = stockUsableWidth(answers.faceStock ?? "3×6");
  return W > maxW ? splitByPanelWidth([core], W, H, maxW) : [core];
}

function frameSticks(
  answers: QaAnswers,
  dims: { sei: number; fw: number; materialName: string; withFace: boolean },
): Member[] {
  const W = answers.width;
  const H = answers.height;
  const { sei, fw, materialName } = dims;
  const tateWin = answers.frameWin !== "横勝ち";
  const short = railShortMm(answers);
  const railLen = midRailLength(tateWin, W, fw, short);
  const out: Member[] = [];

  if (tateWin) {
    out.push(
      stick({
        id: "panel-stile-l",
        name: "左縦",
        length: H,
        width: fw,
        thickness: sei,
        materialName,
      }),
      stick({
        id: "panel-stile-r",
        name: "右縦",
        length: H,
        width: fw,
        thickness: sei,
        materialName,
      }),
      stick({
        id: "panel-rail-t",
        name: "上桟",
        length: railLen,
        width: fw,
        thickness: sei,
        materialName,
      }),
      stick({
        id: "panel-rail-b",
        name: "下桟",
        length: railLen,
        width: fw,
        thickness: sei,
        materialName,
      }),
    );
  } else {
    out.push(
      stick({
        id: "panel-rail-t",
        name: "上桟",
        length: railLen,
        width: fw,
        thickness: sei,
        materialName,
      }),
      stick({
        id: "panel-rail-b",
        name: "下桟",
        length: railLen,
        width: fw,
        thickness: sei,
        materialName,
      }),
      stick({
        id: "panel-stile-l",
        name: "左縦",
        length: H - 2 * fw,
        width: fw,
        thickness: sei,
        materialName,
      }),
      stick({
        id: "panel-stile-r",
        name: "右縦",
        length: H - 2 * fw,
        width: fw,
        thickness: sei,
        materialName,
      }),
    );
  }

  pushMidRails(out, answers, {
    length: railLen,
    width: fw,
    thickness: sei,
    materialName,
  });

  const mid = midRailCount(H, railPitchMm(answers));
  pushExtraStiles(out, answers, {
    sei,
    fw,
    materialName,
    railFaces: railFaceList(fw, fw, fw, mid),
    height: H,
  });

  if (dims.withFace) {
    pushFaces(out, answers, H, W);
  }

  return out;
}

function stickPanel(answers: QaAnswers, kind: StickKind): Member[] {
  const use = answers.boneUse ?? "成使い";
  const sei = stickSei(kind, use);
  const fw = stickFace(kind, use);
  const railsTaruki = kind === "小割" && use === "成使い" && answers.railKind === "上下垂木";
  if (!railsTaruki) {
    return frameSticks(answers, {
      sei,
      fw,
      materialName: stickName(kind),
      withFace: true,
    });
  }
  const railFace = TARUKI.long;
  const railName = stickName("垂木");
  const frameName = stickName(kind);
  const W = answers.width;
  const H = answers.height;
  const tateWin = answers.frameWin !== "横勝ち";
  const short = railShortMm(answers);
  const railLen = midRailLength(tateWin, W, fw, short);
  const out: Member[] = [];
  if (tateWin) {
    out.push(
      stick({
        id: "panel-stile-l",
        name: "左縦",
        length: H,
        width: fw,
        thickness: sei,
        materialName: frameName,
      }),
      stick({
        id: "panel-stile-r",
        name: "右縦",
        length: H,
        width: fw,
        thickness: sei,
        materialName: frameName,
      }),
      stick({
        id: "panel-rail-t",
        name: "上桟",
        length: railLen,
        width: railFace,
        thickness: sei,
        materialName: railName,
      }),
      stick({
        id: "panel-rail-b",
        name: "下桟",
        length: railLen,
        width: railFace,
        thickness: sei,
        materialName: railName,
      }),
    );
  } else {
    out.push(
      stick({
        id: "panel-rail-t",
        name: "上桟",
        length: railLen,
        width: railFace,
        thickness: sei,
        materialName: railName,
      }),
      stick({
        id: "panel-rail-b",
        name: "下桟",
        length: railLen,
        width: railFace,
        thickness: sei,
        materialName: railName,
      }),
      stick({
        id: "panel-stile-l",
        name: "左縦",
        length: H - 2 * railFace,
        width: fw,
        thickness: sei,
        materialName: frameName,
      }),
      stick({
        id: "panel-stile-r",
        name: "右縦",
        length: H - 2 * railFace,
        width: fw,
        thickness: sei,
        materialName: frameName,
      }),
    );
  }
  pushMidRails(out, answers, {
    length: railLen,
    width: fw,
    thickness: sei,
    materialName: frameName,
  });
  const mid = midRailCount(H, railPitchMm(answers));
  pushExtraStiles(out, answers, {
    sei,
    fw,
    materialName: frameName,
    railFaces: railFaceList(railFace, fw, railFace, mid),
    height: H,
  });
  pushFaces(out, answers, H, W);
  return out;
}

export function panelMembers(answers: QaAnswers): Member[] {
  const kind = answers.frameKind ?? "小割";
  if (isNamedTimberKind(kind)) {
    const spec = timberOf(kind);
    const t = answers.frameThickness ?? 21;
    return frameSticks(answers, {
      sei: t,
      fw: spec.width,
      materialName: kind,
      withFace: true,
    });
  }
  if (isSheetKind(kind)) {
    if (answers.sheetUse === "割き") {
      const t = answers.frameThickness ?? 15;
      const name = answers.frameMaterial ?? kind;
      return frameSticks(answers, {
        sei: t,
        fw: t,
        materialName: name,
        withFace: true,
      });
    }
    return boardPanel(answers);
  }
  if (isStickKind(kind)) return stickPanel(answers, kind);
  return stickPanel(answers, "小割");
}

export function panelSei(answers: QaAnswers): number {
  const kind = answers.frameKind ?? "小割";
  if (isNamedTimberKind(kind)) return answers.frameThickness ?? 21;
  if (isSheetKind(kind)) return answers.frameThickness ?? 15;
  return stickSei(kind, answers.boneUse ?? "成使い");
}

/** 枠の成＋面材。厚み使いの芯だけのときは面材を足さない。 */
export function panelSkinCount(answers: QaAnswers): number {
  if (isSheetKind(answers.frameKind) && answers.sheetUse !== "割き") return 0;
  return answers.sides === "両面" ? 2 : 1;
}

export function faceThicknessOf(
  answers: QaAnswers,
  side: "front" | "back",
): number {
  if (isSheetKind(answers.frameKind) && answers.sheetUse !== "割き") return 0;
  if (side === "back" && answers.sides !== "両面") return 0;
  return faceSpecOf(answers, side).thick;
}

export function panelFinishThickness(answers: QaAnswers): number {
  return (
    panelSei(answers) +
    faceThicknessOf(answers, "front") +
    faceThicknessOf(answers, "back")
  );
}
