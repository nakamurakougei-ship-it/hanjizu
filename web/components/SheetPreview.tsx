import { shortFaceLabel, type PackedSheet } from "@/lib/sheet";

export function SheetPreview({
  sheet,
  panelName,
}: {
  sheet: PackedSheet;
  panelName: string;
}) {
  const scale = 180 / sheet.stock.length;
  const sw = sheet.stock.length * scale;
  const sh = sheet.stock.width * scale;

  return (
    <figure className="sheet-fig">
      <figcaption className="parts-key">
        {sheet.stock.name === "3x6"
          ? "3×6"
          : sheet.stock.name === "3x8"
            ? "3×8"
            : "4×8"}（有効 {sheet.stock.length} ×{" "}
        {sheet.stock.width}）
        {"　"}
        {sheet.pieces
          .map((piece) => shortFaceLabel(piece.name, panelName))
          .join(" ＋ ")}
      </figcaption>
      <svg
        className="sheet-svg"
        viewBox={`0 0 ${sw} ${sh}`}
        width={sw}
        height={sh}
        aria-label={`${sheet.stock.name} の木取図`}
      >
        <rect x="0" y="0" width={sw} height={sh} className="sheet-stock" />
        {sheet.pieces.map((piece, index) => {
          const x = piece.x * scale;
          const y = piece.y * scale;
          const pw = piece.length * scale;
          const ph = piece.width * scale;
          const label = shortFaceLabel(piece.name, panelName);
          const fs = Math.max(7, Math.min(pw, ph) * 0.22);
          return (
            <g key={`${piece.name}-${index}`}>
              <rect
                x={x + 0.6}
                y={y + 0.6}
                width={Math.max(0, pw - 1.2)}
                height={Math.max(0, ph - 1.2)}
                className="sheet-piece"
              />
              <text
                x={x + pw / 2}
                y={y + ph / 2}
                fontSize={fs}
                strokeWidth={fs * 0.14}
                className="sheet-label"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
