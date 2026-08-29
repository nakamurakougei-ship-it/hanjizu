import type { MaterialOpt } from "./qa";

export const FACE_IDS = [
  "top",
  "bottom",
  "front",
  "back",
  "left",
  "right",
] as const;

export type FaceId = (typeof FACE_IDS)[number];

export type Construction = "plywood" | "flush" | "thick";

export type Face = {
  id: FaceId;
  thickness: number;
  appearance?: number;
  construction: Construction;
  finishLong?: MaterialOpt;
  finishShort?: MaterialOpt;
};

export type JoinId = "top-side" | "top-apron" | "apron-side" | "bottom-side";

export type JoinWinner = "top" | "side" | "apron" | "bottom";

export type Box = {
  id: string;
  width: number;
  depth: number;
  height: number;
  faces: Partial<Record<FaceId, Face>>;
  joins: Partial<Record<JoinId, JoinWinner>>;
  children: Box[];
};

export type Product = {
  boxes: Box[];
};

export type MemberRole = "core" | "skin" | "edge";

export type Member = {
  id: string;
  name: string;
  boxId: string;
  faceId: FaceId;
  role: MemberRole;
  length: number;
  width: number;
  thickness: number;
  construction: Construction;
  materialKey: string;
  qty: number;
  joint: "t-joint" | "straight";
  canRotate: boolean;
};

export type MaterialKeyParts = {
  name: string;
  thickness: number;
};
