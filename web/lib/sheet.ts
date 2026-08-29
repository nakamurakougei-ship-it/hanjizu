import { fitsOn, USABLE_36, USABLE_48, type SheetSize } from "./stock";

export function sheetForPiece(
  length: number,
  width: number,
  canRotate: boolean,
): SheetSize | null {
  if (fitsOn(length, width, USABLE_36, canRotate)) return USABLE_36;
  if (fitsOn(length, width, USABLE_48, canRotate)) return USABLE_48;
  return null;
}
