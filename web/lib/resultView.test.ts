import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultAnswers } from "./qa";
import { membersFromPanel } from "./job";
import {
  isRailName,
  isStileName,
  materialLabel,
  railGroups,
  railKindLabel,
  stickCutsByMaterial,
  stickMemberLines,
  stockCountText,
  stileCount,
  stileCut,
  vStileGroups,
  vStileKindLabel,
} from "./resultView";
import type { BundleQuote } from "./ledger";

test("左右の縦は縦残としてまとめる", () => {
  assert.equal(isStileName("左縦"), true);
  assert.equal(isStileName("玄関袖 右縦"), true);
  assert.equal(isStileName("玄関袖 中桟1"), false);
  assert.equal(isRailName("玄関袖 中桟1"), true);
  const members = membersFromPanel({
    ...defaultAnswers(),
    product: "パネル",
    name: "玄関袖",
    width: 900,
    height: 1800,
    sides: "片面",
    frameKind: "小割",
    boneUse: "成使い",
    railKind: "全部小割",
    faceMaterial: "ラワンベニヤ",
    qty: 2,
  });
  assert.equal(stileCount(members), 4);
  const cut = stileCut(members);
  assert.ok(cut);
  assert.equal(cut?.stockLength, 4000);
  assert.ok((cut?.bars.length ?? 0) >= 1);
  assert.ok(cut?.bars.every((bar) => bar.pieces.every((p) => p.name === "縦残")));
});

test("横桟は材料ごとに分けて本数を出す", () => {
  assert.equal(railKindLabel("小割 20×30 30"), "横桟（小割）");
  assert.equal(railKindLabel("垂木 30×40 30"), "横桟（垂木）");
  assert.equal(railKindLabel("ジェルトン 24"), "横桟（ジェルトン）");

  const kogara = membersFromPanel({
    ...defaultAnswers(),
    product: "パネル",
    name: "玄関袖",
    width: 900,
    height: 1800,
    sides: "片面",
    frameKind: "小割",
    boneUse: "成使い",
    railKind: "全部小割",
    railFit: "寸面通り",
    faceMaterial: "ラワンベニヤ",
    qty: 2,
  });
  const kogaraRails = railGroups(kogara);
  assert.equal(kogaraRails.length, 1);
  assert.equal(kogaraRails[0]?.label, "横桟（小割）");
  assert.equal(kogaraRails[0]?.count, 10);
  assert.ok(kogaraRails[0]?.cut);

  const mixed = membersFromPanel({
    ...defaultAnswers(),
    product: "パネル",
    name: "玄関袖",
    width: 900,
    height: 1800,
    sides: "片面",
    frameKind: "小割",
    boneUse: "成使い",
    railKind: "上下垂木",
    railFit: "寸面通り",
    faceMaterial: "ラワンベニヤ",
    qty: 1,
  });
  const mixedRails = railGroups(mixed);
  assert.equal(mixedRails.length, 2);
  const byLabel = Object.fromEntries(mixedRails.map((g) => [g.label, g]));
  assert.equal(byLabel["横桟（垂木）"]?.count, 2);
  assert.equal(byLabel["横桟（小割）"]?.count, 3);
});

test("追加の縦残は材料ごとに分けて本数を出す", () => {
  assert.equal(vStileKindLabel("垂木 30×40 30"), "縦残（垂木）");
  const members = membersFromPanel({
    ...defaultAnswers(),
    product: "パネル",
    name: "玄関袖",
    width: 900,
    height: 1800,
    sides: "片面",
    frameKind: "小割",
    boneUse: "成使い",
    railKind: "全部小割",
    railFit: "寸面通り",
    faceMaterial: "ラワンベニヤ",
    stileExtra: "入れる",
    stileExtraN: 1,
    qty: 1,
  });
  const groups = vStileGroups(members);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.label, "縦残（垂木）");
  assert.equal(groups[0]?.count, 4);
});

test("棒の木取図は縦横を分けず材料ごとにネストする", () => {
  const members = membersFromPanel({
    ...defaultAnswers(),
    product: "パネル",
    name: "基礎パネル 1",
    width: 1200,
    height: 1800,
    sides: "両面",
    frameKind: "小割",
    boneUse: "成使い",
    railKind: "上下垂木",
    railFit: "余裕",
    railAllow: 1,
    faceStock: "3×6",
    stileExtra: "入れる",
    stileExtraN: 1,
    faceMaterial: "ラワンベニヤ",
    qty: 1,
  });
  const lines = stickMemberLines(members);
  const byLabel = Object.fromEntries(
    lines.map((line) => [`${line.label} ${line.length}`, line.count]),
  );
  assert.equal(byLabel["縦残（小割） 1800"], 2);
  assert.equal(byLabel["縦残（垂木） 415"], 4);
  assert.equal(byLabel["横桟（小割） 1159"], 3);
  assert.equal(byLabel["横桟（垂木） 1159"], 2);
  const cuts = Object.fromEntries(
    stickCutsByMaterial(members).map((item) => [item.label, item.cut.bars.length]),
  );
  assert.equal(cuts["小割 20×30"], 2);
  assert.equal(cuts["垂木 30×40"], 1);
});

test("使用材の表示は枠材が本、ベニヤは厚み＋名前＋定尺", () => {
  assert.equal(materialLabel("小割 20×30 30"), "小割 20×30");
  assert.equal(materialLabel("ラワンベニヤ 3"), "3mmラワンベニヤ");
  assert.equal(
    materialLabel("ラワンベニヤ 3", { count36: 1, count38: 0, count48: 0 }),
    "3mmラワンベニヤ 3×6",
  );
  const stick: BundleQuote = {
    key: "小割 20×30 30",
    yen: null,
    count36: 0,
    count38: 0,
    count48: 0,
    meters: 0,
    stickCut: {
      stockLength: 4000,
      kerf: 3,
      bars: [
        { pieces: [], used: 0, leftover: 4000 },
        { pieces: [], used: 0, leftover: 4000 },
      ],
      unfit: [],
    },
  };
  assert.equal(stockCountText(stick), "2本");
  const sheet: BundleQuote = {
    key: "ラワンベニヤ 3",
    yen: 1380,
    count36: 1,
    count38: 0,
    count48: 0,
    meters: 0,
  };
  assert.equal(stockCountText(sheet), "1枚");
  const sheet48: BundleQuote = {
    key: "ラワンベニヤ 3",
    yen: 2760,
    count36: 0,
    count38: 0,
    count48: 1,
    meters: 0,
  };
  assert.equal(
    materialLabel("ラワンベニヤ 3", { count36: 0, count38: 0, count48: 1 }),
    "3mmラワンベニヤ 4×8",
  );
  assert.equal(stockCountText(sheet48), "1枚");
});
