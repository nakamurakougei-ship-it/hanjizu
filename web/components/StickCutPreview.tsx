import { SAW_KERF_MM, type StickCut } from "@/lib/stickCut";

export function StickCutPreview({
  cut,
  id,
}: {
  cut: StickCut;
  id: string;
}) {
  if (cut.bars.length === 0) return null;
  const kerf = cut.kerf ?? SAW_KERF_MM;
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
            {bar.pieces.flatMap((piece, pieceIndex) => {
              const segs = [];
              if (pieceIndex > 0 && kerf > 0) {
                segs.push(
                  <span
                    key={`${id}-k-${index}-${pieceIndex}`}
                    className="stick-seg is-kerf"
                    style={{ flexGrow: kerf, flexBasis: 0 }}
                    title={`刃厚 ${kerf}mm`}
                  />,
                );
              }
              segs.push(
                <span
                  key={`${id}-p-${index}-${pieceIndex}`}
                  className="stick-seg"
                  style={{
                    flexGrow: piece.length,
                    flexBasis: 0,
                  }}
                >
                  {piece.length}
                </span>,
              );
              return segs;
            })}
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
