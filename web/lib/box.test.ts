import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FLUSH_RAIL_MM,
  boxFromAnswers,
  emptyBox,
  membersFromAnswers,
  membersFromProduct,
} from "./box";
import { YOTORI_MM, defaultAnswers, nextStep } from "./qa";

test("無い面・空洞・厚み違いはエラーにしない", () => {
  const box = emptyBox("空", 1000, 500, 200);
  box.faces.top = { id: "top", thickness: 15, construction: "plywood" };
  box.faces.left = { id: "left", thickness: 21, construction: "plywood" };
  const members = membersFromProduct({ boxes: [box] });
  assert.ok(members.some((m) => m.faceId === "top"));
  assert.ok(members.some((m) => m.faceId === "left" && m.thickness === 21));
  assert.equal(
    members.filter((m) => m.faceId === "bottom" || m.faceId === "right").length,
    0,
  );
});

test("箱・平板・天勝ちは天・前・後だけで、底と左右は出さない", () => {
  const answers = {
    ...defaultAnswers(),
    product: "箱" as const,
    topSection: "平板" as const,
    join: "天勝ち" as const,
    width: 2000,
    depth: 1000,
    height: 150,
    lumberT: 15,
    finishLong: "メラミン" as const,
    finishShort: "メラミン" as const,
  };
  const product = boxFromAnswers(answers);
  const box = product.boxes[0];
  assert.ok(box.faces.top);
  assert.ok(box.faces.front);
  assert.ok(box.faces.back);
  assert.equal(box.faces.bottom, undefined);
  assert.equal(box.faces.left, undefined);
  assert.equal(box.faces.right, undefined);
  assert.equal(box.faces.top?.appearance, 15);
  assert.equal(box.joins["top-side"], "top");

  const members = membersFromAnswers(answers);
  const names = members.map((m) => m.name);
  assert.ok(names.includes("前"));
  assert.ok(names.includes("後"));
  assert.ok(names.includes("天 前枠"));
  assert.ok(names.includes("天 仕上げ表"));
  assert.ok(names.includes("天 仕上げ裏"));
  assert.equal(names.includes("底"), false);
  assert.equal(names.includes("左"), false);
  assert.equal(names.includes("右"), false);
});

test("天勝ちの前・後は実厚の下面までの高さ", () => {
  const members = membersFromAnswers({
    ...defaultAnswers(),
    product: "箱",
    topSection: "平板",
    join: "天勝ち",
    height: 150,
    lumberT: 15,
    finishShort: "メラミン",
    finishLong: "メラミン",
  });
  const front = members.find((m) => m.name === "前");
  assert.ok(front);
  assert.equal(front.width, 135);
  assert.equal(front.length, 2000 - 1 * 2);
});

test("フラッシュの仕上げはヨトリ付き、心材は仕上げ厚を引く", () => {
  const members = membersFromAnswers({
    ...defaultAnswers(),
    product: "箱",
    topSection: "平板",
    join: "天勝ち",
    width: 2000,
    depth: 1000,
    lumberT: 15,
    finishLong: "メラミン",
    finishShort: "メラミン",
  });
  const skin = members.find((m) => m.name === "天 仕上げ表");
  assert.ok(skin);
  assert.equal(skin.length, 2000 + YOTORI_MM * 2);
  assert.equal(skin.width, 1000 + YOTORI_MM * 2);
  assert.equal(skin.materialKey, "メラミン 1");

  const rail = members.find((m) => m.name === "天 前枠");
  assert.ok(rail);
  assert.equal(rail.length, 2000 - 2);
  assert.equal(rail.width, FLUSH_RAIL_MM);
  assert.equal(rail.materialKey, "ラワンランバー 15");
});

test("パネルは天断面と当たりを持たず、寸法へ進む", () => {
  const product = boxFromAnswers({
    ...defaultAnswers(),
    product: "パネル",
    width: 900,
    height: 1800,
    sides: "片面",
    boneUse: "成使い",
  });
  const box = product.boxes[0];
  assert.ok(box.faces.top);
  assert.equal(box.faces.front, undefined);
  assert.equal(box.faces.bottom, undefined);
  assert.equal(box.children.length, 0);
  assert.equal(box.joins["top-side"], undefined);

  assert.equal(
    nextStep("product", { ...defaultAnswers(), product: "パネル" }),
    "size",
  );
  assert.equal(
    nextStep("product", { ...defaultAnswers(), product: "箱" }),
    "topSection",
  );
});
