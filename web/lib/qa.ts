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

export type ProductKind = "パネル" | "箱" | "箱物" | "扉付き" | "カウンター";
export type FaceBuild = "ベニヤ" | "フラッシュ" | "厚い箱パネル";
export type TopSection = "平板" | "コの字" | "厚い箱";
export type JoinKind = "天勝ち" | "側勝ち";
export type BoneUse = "成使い" | "横使い";
export type RailKind = "全部小割" | "上下垂木";
export type FrameWin = "縦勝ち" | "横勝ち";
export type PanelSides = "片面" | "両面";

export type QaAnswers = {
  product?: ProductKind;
  construction?: FaceBuild;
  topSection?: TopSection;
  join?: JoinKind;
  boneUse?: BoneUse;
  railKind?: RailKind;
  frameWin?: FrameWin;
  sides?: PanelSides;
  faceMaterial?: string;
  width: number;
  depth: number;
  height: number;
  finishLong: MaterialOpt;
  finishShort: MaterialOpt;
  lumberT: number;
};

export type StepId =
  | "product"
  | "construction"
  | "topSection"
  | "join"
  | "size"
  | "boneUse"
  | "railKind"
  | "frameWin"
  | "materials"
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

export function pathFor(answers: QaAnswers): StepId[] {
  if (answers.product !== "パネル") return BOX_PATH;
  const path: StepId[] = ["product", "size", "boneUse"];
  if (answers.boneUse !== "横使い") path.push("railKind");
  if (answers.width > answers.height) path.push("frameWin");
  path.push("materials", "done");
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
  if (step === "construction") return "作りは、どれですか。";
  if (step === "topSection") return "天の断面は、どれですか。";
  if (step === "join") return "側板との当たりは、どちらですか。";
  if (step === "size") {
    return answers.product === "パネル"
      ? "幅と高さと、面材は片面ですか両面ですか。"
      : "仕上がり寸法を入れてください。";
  }
  if (step === "boneUse") return "骨の向きを選択";
  if (step === "railKind") return "上下桟は、小割のままですか。垂木にしますか。";
  if (step === "frameWin") return "幅のほうが長いので、横を勝ちにしますか。";
  if (step === "materials") return "面材は、どれにしますか。";
  if (step === "finish") return "長手と短手の仕上げは、どれですか。";
  if (answers.product === "パネル") return "実厚は、何ミリですか。";
  return "天板の実厚は、何ミリですか。";
}

export const STEP_TITLES: Record<Exclude<StepId, "done">, string> = {
  product: "作る物",
  construction: "作り",
  topSection: "天の断面",
  join: "当たり",
  size: "仕上がり寸法",
  boneUse: "骨の向き",
  railKind: "上下桟",
  frameWin: "枠の勝ち",
  materials: "面材",
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
