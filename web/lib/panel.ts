import type { Member } from "./model";
import type { QaAnswers } from "./qa";

/** 小割 20×30 */
export const KOGARA = { short: 20, long: 30 };
/** 垂木 30×40 */
export const TARUKI = { short: 30, long: 40 };
/** 半生材の横桟（負け側）を計算より短くする */
export const HANSEI_SHORT_MM = 1;
/** 中残の最大間隔 */
export const MAX_NAKA_NOKORI_MM = 450;
export const PANEL_FACE_T_MM = 3;

export function kogaraSei(use: "成使い" | "横使い"): number {
  return use === "成使い" ? KOGARA.long : KOGARA.short;
}

export function kogaraFace(use: "成使い" | "横使い"): number {
  return use === "成使い" ? KOGARA.short : KOGARA.long;
}

export function nakaCount(inner: number, faceW: number, maxGap: number): number {
  if (inner <= 0) return 0;
  for (let n = 0; n < 80; n += 1) {
    const clear = (inner - n * faceW) / (n + 1);
    if (clear <= maxGap) return n;
  }
  return 80;
}

function stick(input: {
  id: string;
  name: string;
  length: number;
  width: number;
  thickness: number;
  materialName: string;
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
    qty: 1,
    joint: "straight",
    canRotate: true,
  };
}

function skin(id: string, name: string, length: number, width: number, material: string): Member {
  return {
    id,
    name,
    boxId: "パネル",
    faceId: "top",
    role: "core",
    length: Math.max(length, width),
    width: Math.min(length, width),
    thickness: PANEL_FACE_T_MM,
    construction: "plywood",
    materialKey: `${material} ${PANEL_FACE_T_MM}`,
    qty: 1,
    joint: "t-joint",
    canRotate: true,
  };
}

export function panelMembers(answers: QaAnswers): Member[] {
  const W = answers.width;
  const H = answers.height;
  const use = answers.boneUse ?? "成使い";
  const sei = kogaraSei(use);
  const fw = kogaraFace(use);
  const railsTaruki = use === "成使い" && answers.railKind === "上下垂木";
  const railFace = railsTaruki ? TARUKI.long : fw;
  const railName = railsTaruki ? "垂木 30×40" : "小割 20×30";
  const kogaraName = "小割 20×30";
  const tateWin = answers.frameWin !== "横勝ち";
  const innerW = W - 2 * fw;
  const naka = nakaCount(innerW, fw, MAX_NAKA_NOKORI_MM);
  const out: Member[] = [];

  if (tateWin) {
    out.push(
      stick({
        id: "panel-stile-l",
        name: "左縦",
        length: H,
        width: fw,
        thickness: sei,
        materialName: kogaraName,
      }),
      stick({
        id: "panel-stile-r",
        name: "右縦",
        length: H,
        width: fw,
        thickness: sei,
        materialName: kogaraName,
      }),
      stick({
        id: "panel-rail-t",
        name: "上桟",
        length: W - 2 * fw - HANSEI_SHORT_MM,
        width: railFace,
        thickness: sei,
        materialName: railName,
      }),
      stick({
        id: "panel-rail-b",
        name: "下桟",
        length: W - 2 * fw - HANSEI_SHORT_MM,
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
        length: W,
        width: railFace,
        thickness: sei,
        materialName: railName,
      }),
      stick({
        id: "panel-rail-b",
        name: "下桟",
        length: W,
        width: railFace,
        thickness: sei,
        materialName: railName,
      }),
      stick({
        id: "panel-stile-l",
        name: "左縦",
        length: H - 2 * railFace - HANSEI_SHORT_MM,
        width: fw,
        thickness: sei,
        materialName: kogaraName,
      }),
      stick({
        id: "panel-stile-r",
        name: "右縦",
        length: H - 2 * railFace - HANSEI_SHORT_MM,
        width: fw,
        thickness: sei,
        materialName: kogaraName,
      }),
    );
  }

  const nakaLen = tateWin
    ? H - 2 * railFace
    : H - 2 * railFace - HANSEI_SHORT_MM;
  for (let i = 0; i < naka; i += 1) {
    out.push(
      stick({
        id: `panel-naka-${i}`,
        name: `中骨${i + 1}`,
        length: nakaLen,
        width: fw,
        thickness: sei,
        materialName: kogaraName,
      }),
    );
  }

  const faceMat = answers.faceMaterial ?? "ラワンベニヤ";
  out.push(skin("panel-face", "面材 表", H, W, faceMat));
  if (answers.sides === "両面") {
    out.push(skin("panel-face-back", "面材 裏", H, W, faceMat));
  }

  return out;
}
