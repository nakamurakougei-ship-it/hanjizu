/** 枠材を定尺長さへ1次元詰めする。載らない部材は継がず、後回しにする。 */

export type StickPiece = {
  name: string;
  length: number;
};

export type StickBar = {
  pieces: StickPiece[];
  used: number;
  leftover: number;
};

export type StickCut = {
  stockLength: number;
  bars: StickBar[];
  unfit: StickPiece[];
};

export function packSticks(
  pieces: readonly StickPiece[],
  stockLength: number,
): StickCut {
  const unfit: StickPiece[] = [];
  const fit = pieces
    .map((piece, index) => ({ ...piece, index }))
    .filter((piece) => {
      if (piece.length > stockLength) {
        unfit.push({ name: piece.name, length: piece.length });
        return false;
      }
      return true;
    })
    .sort((a, b) => b.length - a.length || a.index - b.index);

  const bars: StickBar[] = [];
  for (const piece of fit) {
    let bar = bars.find((item) => item.used + piece.length <= stockLength);
    if (!bar) {
      bar = { pieces: [], used: 0, leftover: stockLength };
      bars.push(bar);
    }
    bar.pieces.push({ name: piece.name, length: piece.length });
    bar.used += piece.length;
    bar.leftover = stockLength - bar.used;
  }

  return { stockLength, bars, unfit };
}

export function piecesFromMembers(
  members: { name: string; length: number; qty: number }[],
): StickPiece[] {
  const out: StickPiece[] = [];
  for (const item of members) {
    const n = Math.max(0, item.qty);
    for (let i = 0; i < n; i += 1) {
      out.push({ name: item.name, length: item.length });
    }
  }
  return out;
}
