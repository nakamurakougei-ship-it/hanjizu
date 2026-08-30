import assert from "node:assert/strict";
import { test } from "node:test";
import { packFaceSheets, shortFaceLabel } from "./sheet";
import type { Member } from "./model";

function face(
  name: string,
  length: number,
  width: number,
  qty = 1,
): Member {
  return {
    id: name,
    name,
    boxId: "パネル",
    faceId: "top",
    role: "skin",
    length,
    width,
    thickness: 3,
    construction: "plywood",
    materialKey: "ラワンベニヤ 3",
    qty,
    joint: "straight",
    canRotate: true,
  };
}

test("1200幅の表裏を3×6に分けると、狭い片は同じ定尺に載る", () => {
  const packed = packFaceSheets([
    face("基礎パネル 1 面材 表a", 1800, 900),
    face("基礎パネル 1 面材 表b", 1800, 300),
    face("基礎パネル 1 面材 裏a", 1800, 900),
    face("基礎パネル 1 面材 裏b", 1800, 300),
  ]);
  assert.equal(packed.sheets.length, 3);
  assert.equal(packed.unfit.length, 0);
  const counts = packed.sheets.map((sheet) => sheet.pieces.length).sort();
  assert.deepEqual(counts, [1, 1, 2]);
});

test("面材のラベルは名称と面材を外して表裏だけ残す", () => {
  assert.equal(
    shortFaceLabel("基礎パネル 1 面材 表a", "基礎パネル 1"),
    "表a",
  );
});
