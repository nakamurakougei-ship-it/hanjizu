export const STOCK_36 = { name: "3x6" as const, length: 1820, width: 910 };
export const STOCK_38 = { name: "3x8" as const, length: 2420, width: 910 };
export const STOCK_48 = { name: "4x8" as const, length: 2420, width: 1210 };

/** ダメ切り後の有効寸法の目安。台帳の実寸があれば後で差し替える。 */
export const DAME_MM = 10;

export type SheetSize = {
  name: "3x6" | "3x8" | "4x8";
  length: number;
  width: number;
};

export function usableSheet(stock: SheetSize): SheetSize {
  return {
    name: stock.name,
    length: stock.length - DAME_MM,
    width: stock.width - DAME_MM,
  };
}

export const USABLE_36 = usableSheet(STOCK_36);
export const USABLE_38 = usableSheet(STOCK_38);
export const USABLE_48 = usableSheet(STOCK_48);

export function fitsOn(
  length: number,
  width: number,
  sheet: SheetSize,
  canRotate: boolean,
): boolean {
  if (length <= sheet.length && width <= sheet.width) return true;
  if (canRotate && length <= sheet.width && width <= sheet.length) return true;
  return false;
}

export function fitsSomeStock(
  length: number,
  width: number,
  canRotate: boolean,
): boolean {
  return (
    fitsOn(length, width, USABLE_36, canRotate) ||
    fitsOn(length, width, USABLE_38, canRotate) ||
    fitsOn(length, width, USABLE_48, canRotate)
  );
}
