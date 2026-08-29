import type { StickCut } from "@/lib/stickCut";

export function StickCutPreview({
  cut,
  id,
}: {
  cut: StickCut;
  id: string;
}) {
  if (cut.bars.length === 0) return null;
  return (
    <ol className="stick-cuts">
      {cut.bars.map((bar, index) => (
        <li key={`${id}-bar-${index}`}>
          <span className="stick-cut-line">
            定尺 {cut.stockLength}mm
            {bar.pieces.length > 0
              ? `　${bar.pieces.map((piece) => piece.length).join(" ＋ ")}`
              : ""}
            {bar.leftover > 0 ? `　余り ${bar.leftover}mm` : ""}
          </span>
          <span className="stick-bar" aria-hidden="true">
            {bar.pieces.map((piece, pieceIndex) => (
              <span
                key={`${piece.name}-${pieceIndex}`}
                className="stick-seg"
                style={{
                  flexGrow: piece.length,
                  flexBasis: 0,
                }}
              >
                {piece.length}
              </span>
            ))}
            {bar.leftover > 0 ? (
              <span
                className="stick-seg is-left"
                style={{
                  flexGrow: bar.leftover,
                  flexBasis: 0,
                }}
              />
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
