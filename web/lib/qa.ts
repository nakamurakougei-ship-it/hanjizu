import {
  isNamedTimberKind,
  isSheetKind,
  isStickKind,
  sheetMaterialName,
  type FrameKind,
  type SheetFace,
} from "./catalog";
import { USABLE_36, fitsOn } from "./stock";

export const MATERIAL_OPTS = [
  "仕上げ無し",
  "メラミン",
  "ポリ板 (2.5mm)",
  "ポリ板 (4.0mm)",
  "シナベニヤ / 突板",
  "木口テープ",
] as const;

export type MaterialOpt = (typeof MATERIAL_OPTS)[number];

export const FINISH_THICK_MM: Record<MaterialOpt, number> = {
  仕上げ無し: 0,
  メラミン: 1,
  "ポリ板 (2.5mm)": 2.5,
  "ポリ板 (4.0mm)": 4.0,
  "シナベニヤ / 突板": 3,
  木口テープ: 0.5,
};

export const YOTORI_MM = 10;

export function isSheetFinish(opt: MaterialOpt | undefined): boolean {
  return opt != null && opt !== "仕上げ無し" && opt !== "木口テープ";
}

export type { FrameKind, SheetFace } from "./catalog";
export { FRAME_KINDS, SHEET_FACES } from "./catalog";

export type ProductKind = "パネル" | "箱" | "箱物" | "扉付き" | "カウンター";
export type FaceBuild = "ベニヤ" | "フラッシュ" | "厚い箱パネル";
export type TopSection = "平板" | "コの字" | "厚い箱";
export type JoinKind = "天勝ち" | "側勝ち";
export type BoneUse = "成使い" | "横使い";
export type RailKind = "全部小割" | "上下垂木";
export type FrameWin = "縦勝ち" | "横勝ち";
export type PanelSides = "片面" | "両面";
export type SheetUse = "厚み" | "割き";
export type RailFit = "寸面通り" | "余裕";
export type FaceStock = "3×6" | "3×8" | "4×8";
export type FaceSame = "はい" | "いいえ";
export type FaceKind = "ベニヤ" | "ランバー";
export type FaceWood = "ラワン" | "突板" | "ポリ板" | "ランバー";
export type StileExtra = "入れる" | "入れない";
export type StileExtraMat = "小割" | "垂木" | "垂木を削る";

export const FACE_STOCK_OPTS = ["3×6", "3×8", "4×8"] as const;
export const FACE_KIND_OPTS = ["ベニヤ", "ランバー"] as const;
export const FACE_WOOD_OPTS = ["ラワン", "突板", "ポリ板", "ランバー"] as const;
export const FACE_THICK_OPTS = [2.5, 3, 4, 5.5, 9, 12, 15, 18, 21, 24, 30] as const;

export function faceMaterialName(
  kind: FaceKind = "ベニヤ",
  wood: FaceWood = "ラワン",
): string {
  if (wood === "ポリ板") return "ポリ板";
  if (wood === "突板") return kind === "ランバー" ? "突板ランバー" : "突板ベニヤ";
  if (wood === "ランバー") return kind === "ベニヤ" ? "ランバーベニヤ" : "ランバー";
  return kind === "ランバー" ? "ラワンランバー" : "ラワンベニヤ";
}

export function stockHintOf(stock: FaceStock | undefined): "3x6" | "3x8" | "4x8" {
  if (stock === "3×8") return "3x8";
  if (stock === "4×8") return "4x8";
  return "3x6";
}

export type QaAnswers = {
  product?: ProductKind;
  construction?: FaceBuild;
  topSection?: TopSection;
  join?: JoinKind;
  frameKind?: FrameKind;
  boneUse?: BoneUse;
  railKind?: RailKind;
  frameWin?: FrameWin;
  frameMaterial?: string;
  frameThickness?: number;
  sheetFace?: SheetFace;
  sheetUse?: SheetUse;
  railFit?: RailFit;
  railAllow?: number;
  railPitch?: number;
  faceStock?: FaceStock;
  faceSame?: FaceSame;
  faceKind?: FaceKind;
  faceWood?: FaceWood;
  faceThick?: number;
  faceStockBack?: FaceStock;
  faceKindBack?: FaceKind;
  faceWoodBack?: FaceWood;
  faceThickBack?: number;
  stileExtra?: StileExtra;
  stileExtraN?: number;
  stileExtraMat?: StileExtraMat;
  sides?: PanelSides;
  faceMaterial?: string;
  name?: string;
  qty?: number;
  panelId?: string;
  width: number;
  depth: number;
  height: number;
  finishLong: MaterialOpt;
  finishShort: MaterialOpt;
  lumberT: number;
};

export type StepId =
  | "product"
  | "panelName"
  | "construction"
  | "topSection"
  | "join"
  | "size"
  | "railFit"
  | "railAllow"
  | "faceStock"
  | "faceSame"
  | "faceKind"
  | "faceWood"
  | "faceThick"
  | "faceStockBack"
  | "faceKindBack"
  | "faceWoodBack"
  | "faceThickBack"
  | "railPitch"
  | "stileExtra"
  | "stileExtraN"
  | "stileExtraMat"
  | "frameKind"
  | "boneUse"
  | "railKind"
  | "frameWin"
  | "sheetFace"
  | "frameStock"
  | "sheetUse"
  | "materials"
  | "qty"
  | "morePanels"
  | "finish"
  | "thickness"
  | "done";

const BOX_PATH: StepId[] = [
  "product",
  "topSection",
  "join",
  "size",
  "finish",
  "thickness",
  "done",
];

export function asksRailPitch(answers: QaAnswers): boolean {
  if (isStickKind(answers.frameKind)) return true;
  if (isNamedTimberKind(answers.frameKind)) return true;
  return isSheetKind(answers.frameKind) && answers.sheetUse === "割き";
}

/** 横幅が 3×6 の巾を超えるとき。縦が 3×6 の長さを超えるのは別枝。 */
export function asksFaceStock(answers: QaAnswers): boolean {
  if (answers.product !== "パネル") return false;
  if (answers.width <= USABLE_36.width) return false;
  return !fitsOn(answers.height, answers.width, USABLE_36, true);
}

/** 小割・垂木の面材。定尺・種類・厚みを聞く。 */
export function asksFaceMaterials(answers: QaAnswers): boolean {
  return answers.product === "パネル" && isStickKind(answers.frameKind);
}

export function faceSidesDiffer(answers: QaAnswers): boolean {
  return answers.sides === "両面" && answers.faceSame === "いいえ";
}

function faceStockQuestion(wide: boolean, side?: "表" | "裏"): string {
  const who = side ? `${side}の` : "";
  return wide
    ? `横幅が910mmを超えるので確認です。${who}面材は3×6と3×8と4×8のどれを使いますか？`
    : `${who}面材は何を使いますか？`;
}

function pushFaceMaterialSteps(path: StepId[], answers: QaAnswers) {
  if (answers.sides === "両面") path.push("faceSame");
  path.push("faceStock");
  path.push("faceKind");
  path.push("faceWood");
  path.push("faceThick");
  if (faceSidesDiffer(answers)) {
    path.push("faceStockBack");
    path.push("faceKindBack");
    path.push("faceWoodBack");
    path.push("faceThickBack");
  }
}

/** 小割枠で中の縦残を入れるときだけ、何を使うかを聞く。 */
export function asksStileExtraMat(answers: QaAnswers): boolean {
  if (answers.frameKind !== "小割") return false;
  if (asksFaceStock(answers)) return true;
  return answers.stileExtra === "入れる";
}

function pushStileExtraSteps(path: StepId[], answers: QaAnswers) {
  path.push("stileExtra");
  if (asksFaceStock(answers) || answers.stileExtra === "入れる") {
    path.push("stileExtraN");
    if (asksStileExtraMat(answers)) path.push("stileExtraMat");
  }
}

export function pathFor(answers: QaAnswers): StepId[] {
  if (answers.product !== "パネル") return BOX_PATH;
  const path: StepId[] = ["product", "panelName", "size", "frameKind"];
  if (isStickKind(answers.frameKind)) {
    path.push("boneUse");
    if (answers.frameKind === "小割" && answers.boneUse !== "横使い") {
      path.push("railKind");
    }
    if (answers.width > answers.height) path.push("frameWin");
  } else if (isNamedTimberKind(answers.frameKind)) {
    path.push("frameStock");
  } else if (isSheetKind(answers.frameKind)) {
    path.push("sheetFace");
    path.push("frameStock");
    path.push("sheetUse");
  }
  path.push("railFit");
  if (answers.railFit === "余裕") path.push("railAllow");
  if (asksFaceMaterials(answers)) pushFaceMaterialSteps(path, answers);
  if (asksFaceStock(answers) && asksRailPitch(answers)) {
    pushStileExtraSteps(path, answers);
  }
  if (asksRailPitch(answers)) {
    path.push("railPitch");
    if (!asksFaceStock(answers)) pushStileExtraSteps(path, answers);
  }
  path.push("qty");
  path.push("morePanels");
  path.push("done");
  return path;
}

export function defaultAnswers(): QaAnswers {
  return {
    width: 2000,
    depth: 1000,
    height: 150,
    finishLong: "メラミン",
    finishShort: "メラミン",
    lumberT: 15,
  };
}

export function nextStep(current: StepId, answers: QaAnswers): StepId {
  const path = pathFor(answers);
  const i = path.indexOf(current);
  if (i < 0) return path[1] ?? "done";
  return path[Math.min(i + 1, path.length - 1)];
}

export function prevStep(current: StepId, answers: QaAnswers): StepId | null {
  const path = pathFor(answers);
  const i = path.indexOf(current);
  if (i <= 0) return null;
  return path[i - 1] ?? null;
}

export function stepIndex(id: StepId, answers: QaAnswers): number {
  return pathFor(answers).indexOf(id);
}

export function questionFor(step: StepId, answers: QaAnswers): string {
  if (step === "done") return "";
  if (step === "product") return "何を作りますかな？";
  if (step === "panelName") return "パネルの名称は？";
  if (step === "construction") return "作りは、どれですか。";
  if (step === "topSection") return "天の断面は、どれですか。";
  if (step === "join") return "側板との当たりは、どちらですか。";
  if (step === "size") {
    return answers.product === "パネル"
      ? "幅と高さと、面材は片面ですか両面ですか。"
      : "仕上がり寸法を入れてください。";
  }
  if (step === "railFit") return "横桟の長さは、枠材の寸面通りですか。余裕を設けますか。";
  if (step === "railAllow") return "横桟の余裕は、何ミリですか。";
  if (step === "railPitch") return "横桟の間隔は、何ミリですか。";
  if (step === "faceSame") return "両面とも同じ面材を使いますか？";
  if (step === "faceStock") return faceStockQuestion(asksFaceStock(answers));
  if (step === "faceKind") return "面材は、ベニヤですか。ランバーですか。";
  if (step === "faceWood") return "面材は、ラワン・突板・ポリ板・ランバーのどれですか。";
  if (step === "faceThick") return "面材の厚みは、何ミリですか。";
  if (step === "faceStockBack") return faceStockQuestion(asksFaceStock(answers), "裏");
  if (step === "faceKindBack") return "裏の面材は、ベニヤですか。ランバーですか。";
  if (step === "faceWoodBack") return "裏の面材は、ラワン・突板・ポリ板・ランバーのどれですか。";
  if (step === "faceThickBack") return "裏の面材の厚みは、何ミリですか。";
  if (step === "stileExtra") return "中に縦残を追加しますか？";
  if (step === "stileExtraN") return "縦残は何列入れますか？";
  if (step === "stileExtraMat") {
    return answers.boneUse === "横使い"
      ? "中の縦残は、小割の平ですか。垂木を20mmに削りますか。"
      : "中の縦残は、何を使いますか。";
  }
  if (step === "frameKind") return "枠材は何を使いますか？";
  if (step === "boneUse") return "枠材の向きを選択";
  if (step === "railKind") return "上下桟は、小割のままですか。垂木にしますか。";
  if (step === "frameWin") return "幅のほうが長いので、横を勝ちにしますか。";
  if (step === "sheetFace") return "ラワンですか、シナですか。";
  if (step === "frameStock") {
    if (isNamedTimberKind(answers.frameKind)) {
      return `${answers.frameKind ?? "枠材"}の厚みは、何ミリですか。`;
    }
    if (isSheetKind(answers.frameKind)) {
      const name =
        answers.frameMaterial ??
        (answers.sheetFace
          ? sheetMaterialName(answers.frameKind, answers.sheetFace)
          : answers.frameKind);
      return `${name}の厚みは、何ミリですか。`;
    }
    return "枠材の厚みは、何ミリですか。";
  }
  if (step === "sheetUse") return "厚みの使い方を選択";
  if (step === "materials") return "面材は、どれにしますか。";
  if (step === "qty") return "製作枚数は、何枚ですか。";
  if (step === "morePanels") return "次のパネルを入力しますか？";
  if (step === "finish") return "長手と短手の仕上げは、どれですか。";
  if (answers.product === "パネル") return "実厚は、何ミリですか。";
  return "天板の実厚は、何ミリですか。";
}

export const STEP_TITLES: Record<Exclude<StepId, "done">, string> = {
  product: "作る物",
  panelName: "名称",
  construction: "作り",
  topSection: "天の断面",
  join: "当たり",
  size: "仕上がり寸法",
  railFit: "横桟の長さ",
  railAllow: "横桟の余裕",
  faceStock: "面材の定尺",
  faceSame: "表裏の面材",
  faceKind: "面材の種類",
  faceWood: "面材の木",
  faceThick: "面材の厚み",
  faceStockBack: "裏の定尺",
  faceKindBack: "裏の種類",
  faceWoodBack: "裏の木",
  faceThickBack: "裏の厚み",
  railPitch: "横桟の間隔",
  stileExtra: "縦残",
  stileExtraN: "縦残の列数",
  stileExtraMat: "縦残の材料",
  frameKind: "枠材",
  boneUse: "枠材の向き",
  railKind: "上下桟",
  frameWin: "枠の勝ち",
  sheetFace: "木",
  frameStock: "枠材の厚み",
  sheetUse: "厚みの使い方",
  materials: "面材",
  qty: "枚数",
  morePanels: "次のパネル",
  finish: "仕上げ",
  thickness: "実厚",
};

export const FACE_MATERIAL_OPTS = ["ラワンベニヤ", "シナベニヤ"] as const;

export function decidedSteps(
  step: StepId,
  answers: QaAnswers,
): Exclude<StepId, "done">[] {
  return pathFor(answers).filter(
    (id): id is Exclude<StepId, "done"> =>
      id !== "done" && stepIndex(id, answers) < stepIndex(step, answers),
  );
}

const FOLDED_FRAME_STEPS: ReadonlySet<StepId> = new Set([
  "sheetFace",
  "frameStock",
  "railAllow",
  "stileExtraN",
  "stileExtraMat",
  "faceKind",
  "faceWood",
  "faceThick",
  "faceStockBack",
  "faceKindBack",
  "faceWoodBack",
  "faceThickBack",
  "morePanels",
]);

export function logSteps(
  step: StepId,
  answers: QaAnswers,
): Exclude<StepId, "done">[] {
  return decidedSteps(step, answers).filter((id) => !FOLDED_FRAME_STEPS.has(id));
}

function stepAlreadyDecided(
  id: StepId,
  current: StepId,
  answers: QaAnswers,
): boolean {
  const at = stepIndex(id, answers);
  const now = stepIndex(current, answers);
  return at >= 0 && (now < 0 || at < now);
}

export function frameKindLogLine(answers: QaAnswers, current: StepId): string {
  const kind = answers.frameKind ?? "";
  if (!kind) return "";
  const bits: string[] = [kind];
  if (
    isSheetKind(kind) &&
    answers.sheetFace &&
    stepAlreadyDecided("sheetFace", current, answers)
  ) {
    bits.push(answers.sheetFace);
  }
  if (
    (isNamedTimberKind(kind) || isSheetKind(kind)) &&
    answers.frameThickness != null &&
    stepAlreadyDecided("frameStock", current, answers)
  ) {
    bits.push(`${answers.frameThickness}mm`);
  }
  return bits.join(" ");
}

export function railFitLogLine(answers: QaAnswers, current: StepId): string {
  if (answers.railFit === "寸面通り") return "寸面通り";
  if (answers.railFit !== "余裕") return "";
  if (
    answers.railAllow != null &&
    stepAlreadyDecided("railAllow", current, answers)
  ) {
    return `余裕 ${answers.railAllow}mm`;
  }
  return "余裕を設ける";
}

export function stileExtraLogLine(answers: QaAnswers, current: StepId): string {
  if (answers.stileExtra === "入れない") return "入れない";
  if (answers.stileExtra !== "入れる") return "";
  const bits: string[] = [];
  if (
    answers.stileExtraN != null &&
    stepAlreadyDecided("stileExtraN", current, answers)
  ) {
    bits.push(`${answers.stileExtraN}列`);
  }
  if (
    answers.stileExtraMat &&
    stepAlreadyDecided("stileExtraMat", current, answers)
  ) {
    bits.push(
      answers.stileExtraMat === "垂木を削る" ? "垂木を20mmに削る" : answers.stileExtraMat,
    );
  }
  if (bits.length > 0) return bits.join(" ");
  return "追加する";
}

function facePickLine(
  stock?: FaceStock,
  kind?: FaceKind,
  wood?: FaceWood,
  thick?: number,
): string {
  const bits: string[] = [];
  if (stock) bits.push(stock);
  if (kind) bits.push(kind);
  if (wood) bits.push(wood);
  if (thick != null) bits.push(`${thick}mm`);
  return bits.join(" ");
}

export function faceLogLine(answers: QaAnswers, current: StepId): string {
  if (answers.faceSame === "いいえ") {
    const front = facePickLine(
      answers.faceStock,
      answers.faceKind,
      answers.faceWood,
      answers.faceThick,
    );
    const back = facePickLine(
      answers.faceStockBack,
      answers.faceKindBack,
      answers.faceWoodBack,
      answers.faceThickBack,
    );
    if (front && back && stepAlreadyDecided("faceThickBack", current, answers)) {
      return `表 ${front} ／ 裏 ${back}`;
    }
    if (front) return `表 ${front}`;
  }
  return facePickLine(
    answers.faceStock,
    stepAlreadyDecided("faceKind", current, answers) ? answers.faceKind : undefined,
    stepAlreadyDecided("faceWood", current, answers) ? answers.faceWood : undefined,
    stepAlreadyDecided("faceThick", current, answers) ? answers.faceThick : undefined,
  );
}
