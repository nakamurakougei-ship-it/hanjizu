import assert from "node:assert/strict";
import { test } from "node:test";
import { STICK_STOCK_MM, TIMBER_STOCK_MM, linearStockLength } from "./catalog";
import { packSticks } from "./stickCut";

test("小割・垂木は4000、集成材は2430、板は棒の定尺を持たない", () => {
  assert.equal(linearStockLength("小割 20×30"), STICK_STOCK_MM);
  assert.equal(linearStockLength("垂木 30×40"), STICK_STOCK_MM);
  assert.equal(linearStockLength("ジェルトン"), TIMBER_STOCK_MM);
  assert.equal(linearStockLength("LVL"), TIMBER_STOCK_MM);
  assert.equal(linearStockLength("クランパヤン"), TIMBER_STOCK_MM);
  assert.equal(linearStockLength("ラワンベニヤ"), null);
  assert.equal(linearStockLength("シナランバー"), null);
});

test("4000の定尺から1800が2本取れる", () => {
  const cut = packSticks(
    [
      { name: "左縦", length: 1800 },
      { name: "右縦", length: 1800 },
    ],
    4000,
  );
  assert.equal(cut.bars.length, 1);
  assert.equal(cut.bars[0]?.used, 3600);
  assert.equal(cut.bars[0]?.leftover, 400);
  assert.equal(cut.unfit.length, 0);
});

test("定尺を超える部材は継がず載らないとする", () => {
  const cut = packSticks(
    [
      { name: "左縦", length: 4500 },
      { name: "上桟", length: 859 },
    ],
    4000,
  );
  assert.equal(cut.unfit.length, 1);
  assert.equal(cut.unfit[0]?.name, "左縦");
  assert.equal(cut.bars.length, 1);
  assert.equal(cut.bars[0]?.pieces[0]?.name, "上桟");
});
