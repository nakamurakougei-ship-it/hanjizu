import {
  type Construction,
  type FaceId,
  type JoinWinner,
  type MaterialKeyParts,
  type Member,
  type MemberRole,
  type Product,
  type Box,
  type Face,
} from "./model";
import { splitOversize } from "./split";
import { panelSei, PANEL_FACE_T_MM } from "./panel";
import { membersFromPanel } from "./job";
import { isSheetKind } from "./catalog";
import {
  FINISH_THICK_MM,
  YOTORI_MM,
  isSheetFinish,
  type MaterialOpt,
  type QaAnswers,
} from "./qa";

export const FLUSH_RAIL_MM = 60;
export const THICK_SKIN_MM = 3;
export const THICK_EDGE_MM = 15;

export const FACE_LABEL: Record<FaceId, string> = {
  top: "天",
  bottom: "底",
  front: "前",
  back: "後",
  left: "左",
  right: "右",
};

const VERTICAL: FaceId[] = ["front", "back", "left", "right"];

export function emptyBox(id: string, width: number, depth: number, height: number): Box {
  return {
    id,
    width,
    depth,
    height,
    faces: {},
    joins: {},
    children: [],
  };
}

/** 無い面は載せない。厚み違いも空洞もエラーにしない。 */
export function boxFromAnswers(answers: QaAnswers): Product {
  const t = answers.lumberT;

  if (answers.product === "パネル") {
    const sei = panelSei(answers);
    const skins =
      isSheetKind(answers.frameKind) && answers.sheetUse !== "割き"
        ? 0
        : answers.sides === "両面"
          ? 2
          : 1;
    const thick = sei + PANEL_FACE_T_MM * skins;
    const box = emptyBox("パネル", answers.width, answers.height, thick);
    box.faces.top = {
      id: "top",
      thickness: thick,
      appearance: thick,
      construction: "flush",
    };
    return { boxes: [box] };
  }

  const box = emptyBox("本体", answers.width, answers.depth, answers.height);
  if (answers.product === "箱") {
    const appearance = answers.topSection === "平板" ? t : undefined;
    box.faces.top = {
      id: "top",
      thickness: t,
      appearance,
      construction: "flush",
      finishLong: answers.finishLong,
      finishShort: answers.finishShort,
    };
    box.faces.front = { id: "front", thickness: t, construction: "plywood" };
    box.faces.back = { id: "back", thickness: t, construction: "plywood" };
    if (answers.join === "天勝ち") box.joins["top-side"] = "top";
    if (answers.join === "側勝ち") box.joins["top-side"] = "side";
  }

  return { boxes: [box] };
}

function toConstruction(build: QaAnswers["construction"]): Construction {
  if (build === "フラッシュ") return "flush";
  if (build === "厚い箱パネル") return "thick";
  return "plywood";
}

function thickPanelChild(parent: Box, face: Face): Box {
  const child = emptyBox(`${parent.id}芯`, parent.width, parent.depth, face.thickness);
  child.joins["top-side"] = "top";
  child.joins["bottom-side"] = "bottom";
  child.faces.top = {
    id: "top",
    thickness: THICK_SKIN_MM,
    construction: "plywood",
    finishLong: face.finishLong,
    finishShort: face.finishShort,
  };
  child.faces.bottom = {
    id: "bottom",
    thickness: THICK_SKIN_MM,
    construction: "plywood",
  };
  for (const id of ["front", "back", "left", "right"] as const) {
    child.faces[id] = { id, thickness: THICK_EDGE_MM, construction: "plywood" };
  }
  return child;
}

function finishThick(opt: MaterialOpt | undefined): number {
  if (!opt) return 0;
  return FINISH_THICK_MM[opt];
}

function materialKey(parts: MaterialKeyParts): string {
  const thick = Number.isInteger(parts.thickness)
    ? String(parts.thickness)
    : parts.thickness.toFixed(1);
  return `${parts.name} ${thick}`;
}

function member(input: {
  id: string;
  name: string;
  boxId: string;
  faceId: FaceId;
  role: MemberRole;
  length: number;
  width: number;
  thickness: number;
  construction: Construction;
  materialName: string;
}): Member {
  const { materialName, ...rest } = input;
  const joint: Member["joint"] =
    input.role === "skin" ||
    (input.construction !== "flush" &&
      (input.faceId === "top" ||
        input.faceId === "bottom" ||
        input.faceId === "front" ||
        input.faceId === "back"))
      ? "t-joint"
      : "straight";
  return {
    ...rest,
    qty: 1,
    joint,
    canRotate: input.role !== "skin",
    materialKey: materialKey({
      name: materialName,
      thickness: input.thickness,
    }),
  };
}

function topWinner(box: Box): JoinWinner | undefined {
  return box.joins["top-side"];
}

function verticalCutHeight(box: Box, top: Face | undefined): number {
  let h = box.height;
  if (top && topWinner(box) === "top") h -= top.thickness;
  const bottom = box.faces.bottom;
  if (bottom && box.joins["bottom-side"] === "bottom") h -= bottom.thickness;
  return h;
}

function explodeFlushTop(box: Box, face: Face): Member[] {
  const longT = finishThick(face.finishLong);
  const shortT = finishThick(face.finishShort);
  const coreW = box.width - shortT * 2;
  const coreD = box.depth - longT * 2;
  const rail = Math.min(FLUSH_RAIL_MM, coreW / 2, coreD / 2);
  const prefix = box.id.startsWith("パネル") ? "パネル" : "天";
  const out: Member[] = [];

  out.push(
    member({
      id: `${box.id}-top-rail-front`,
      name: `${prefix} 前枠`,
      boxId: box.id,
      faceId: "top",
      role: "core",
      length: coreW,
      width: rail,
      thickness: face.thickness,
      construction: "flush",
      materialName: "ラワンランバー",
    }),
    member({
      id: `${box.id}-top-rail-back`,
      name: `${prefix} 後枠`,
      boxId: box.id,
      faceId: "top",
      role: "core",
      length: coreW,
      width: rail,
      thickness: face.thickness,
      construction: "flush",
      materialName: "ラワンランバー",
    }),
  );

  const sideLen = coreD - rail * 2;
  if (sideLen > 0) {
    out.push(
      member({
        id: `${box.id}-top-rail-left`,
        name: `${prefix} 左枠`,
        boxId: box.id,
        faceId: "top",
        role: "core",
        length: sideLen,
        width: rail,
        thickness: face.thickness,
        construction: "flush",
        materialName: "ラワンランバー",
      }),
      member({
        id: `${box.id}-top-rail-right`,
        name: `${prefix} 右枠`,
        boxId: box.id,
        faceId: "top",
        role: "core",
        length: sideLen,
        width: rail,
        thickness: face.thickness,
        construction: "flush",
        materialName: "ラワンランバー",
      }),
    );
  }

  out.push(...explodeFaceSkins(box, face, prefix));
  return out;
}

function explodeFaceSkins(box: Box, face: Face, prefix: string): Member[] {
  const sheetName = sheetFinishName(face);
  if (!sheetName) return [];
  const skinW = box.width + YOTORI_MM * 2;
  const skinD = box.depth + YOTORI_MM * 2;
  const skinT = finishThick(
    isSheetFinish(face.finishLong) ? face.finishLong : face.finishShort,
  );
  return [
    member({
      id: `${box.id}-${face.id}-skin-face`,
      name: `${prefix} 仕上げ表`,
      boxId: box.id,
      faceId: face.id,
      role: "skin",
      length: Math.max(skinW, skinD),
      width: Math.min(skinW, skinD),
      thickness: skinT,
      construction: face.construction,
      materialName: sheetName,
    }),
    member({
      id: `${box.id}-${face.id}-skin-back`,
      name: `${prefix} 仕上げ裏`,
      boxId: box.id,
      faceId: face.id,
      role: "skin",
      length: Math.max(skinW, skinD),
      width: Math.min(skinW, skinD),
      thickness: skinT,
      construction: face.construction,
      materialName: sheetName,
    }),
  ];
}

function sheetFinishName(face: Face): string | undefined {
  if (face.finishLong && isSheetFinish(face.finishLong)) return face.finishLong;
  if (face.finishShort && isSheetFinish(face.finishShort)) return face.finishShort;
  return undefined;
}

function partName(box: Box, face: Face): string {
  if (box.id.startsWith("パネル")) {
    if (face.id === "top") return box.id.endsWith("芯") ? "パネル 表" : "パネル";
    if (face.id === "bottom") return "パネル 裏";
    return `パネル ${FACE_LABEL[face.id]}`;
  }
  return FACE_LABEL[face.id];
}

function explodePlywood(box: Box, face: Face, length: number, width: number): Member[] {
  return [
    member({
      id: `${box.id}-${face.id}`,
      name: partName(box, face),
      boxId: box.id,
      faceId: face.id,
      role: "core",
      length,
      width,
      thickness: face.thickness,
      construction: face.construction,
      materialName: face.construction === "plywood" ? "ラワンベニヤ" : "ラワンランバー",
    }),
  ];
}

function explodeFace(box: Box, face: Face): Member[] {
  if (face.construction === "thick") return [];
  if (face.id === "top") {
    if (face.construction === "flush") return explodeFlushTop(box, face);
    const longT = finishThick(face.finishLong);
    const shortT = finishThick(face.finishShort);
    const prefix = box.id.startsWith("パネル") ? "パネル" : "天";
    return [
      ...explodePlywood(
        box,
        face,
        box.width - shortT * 2,
        box.depth - longT * 2,
      ),
      ...explodeFaceSkins(box, face, prefix),
    ];
  }

  if (VERTICAL.includes(face.id)) {
    const top = box.faces.top;
    const cutH = verticalCutHeight(box, top);
    const longT = finishThick(top?.finishLong);
    const shortT = finishThick(top?.finishShort);
    const along =
      face.id === "front" || face.id === "back"
        ? box.width - shortT * 2
        : box.depth - longT * 2;
    return explodePlywood(box, face, along, cutH);
  }

  const longT = finishThick(box.faces.top?.finishLong);
  const shortT = finishThick(box.faces.top?.finishShort);
  return explodePlywood(
    box,
    face,
    box.width - shortT * 2,
    box.depth - longT * 2,
  );
}

function explodeBox(box: Box): Member[] {
  const fromFaces = (Object.keys(box.faces) as FaceId[]).flatMap((id) => {
    const face = box.faces[id];
    return face ? explodeFace(box, face) : [];
  });
  const fromChildren = box.children.flatMap(explodeBox);
  return [...fromFaces, ...fromChildren];
}

export function membersFromProduct(product: Product): Member[] {
  return product.boxes.flatMap(explodeBox);
}

export function membersFromAnswers(answers: QaAnswers): Member[] {
  if (answers.product === "パネル") return membersFromPanel(answers);
  return splitOversize(membersFromProduct(boxFromAnswers(answers)));
}

export function bundleByMaterial(members: Member[]): {
  key: string;
  members: Member[];
}[] {
  const order: string[] = [];
  const map = new Map<string, Member[]>();
  for (const item of members) {
    const list = map.get(item.materialKey);
    if (list) list.push(item);
    else {
      map.set(item.materialKey, [item]);
      order.push(item.materialKey);
    }
  }
  return order.map((key) => ({ key, members: map.get(key) ?? [] }));
}
