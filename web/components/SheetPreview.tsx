import { sheetForPiece } from "@/lib/sheet";
import type { Member } from "@/lib/model";

export function SheetPreview({ member }: { member: Member }) {
  const sheet = sheetForPiece(member.length, member.width, member.canRotate);
  if (!sheet) {
    return <p className="sheet-note">定尺一枚に載らない分割は、後回しです。</p>;
  }

  const scale = 180 / sheet.length;
  const sw = sheet.length * scale;
  const sh = sheet.width * scale;
  let pw = member.length * scale;
  let ph = member.width * scale;
  if (pw > sw || ph > sh) {
    pw = member.width * scale;
    ph = member.length * scale;
  }

  return (
    <figure className="sheet-fig">
      <figcaption className="parts-key">
        {sheet.name}（有効 {sheet.length} × {sheet.width}）
      </figcaption>
      <svg
        className="sheet-svg"
        viewBox={`0 0 ${sw} ${sh}`}
        width={sw}
        height={sh}
        aria-label={`${sheet.name} の木取図`}
      >
        <rect x="0" y="0" width={sw} height={sh} className="sheet-stock" />
        <rect x="1" y="1" width={pw - 2} height={ph - 2} className="sheet-piece" />
        <text x={pw / 2} y={ph / 2} className="sheet-label">
          {member.name}
        </text>
      </svg>
    </figure>
  );
}
