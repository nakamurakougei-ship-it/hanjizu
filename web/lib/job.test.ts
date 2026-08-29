import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultAnswers } from "./qa";
import { membersFromJob, membersFromPanel, panelSummaryLine } from "./job";

function panel(patch: Record<string, unknown> = {}) {
  return {
    ...defaultAnswers(),
    product: "パネル" as const,
    name: "玄関袖",
    width: 900,
    height: 1800,
    sides: "片面" as const,
    frameKind: "小割" as const,
    boneUse: "成使い" as const,
    railKind: "全部小割" as const,
    faceMaterial: "ラワンベニヤ",
    qty: 1,
    ...patch,
  };
}

test("枚数は部材のqtyに掛ける", () => {
  const one = membersFromPanel(panel({ qty: 1 }));
  const two = membersFromPanel(panel({ qty: 2 }));
  assert.equal(two[0]?.qty, (one[0]?.qty ?? 0) * 2);
  assert.ok(one.some((item) => item.name === "玄関袖 左縦"));
});

test("複数パネルは名称とサイズで見分け、同じ材料は一つの束に載る", () => {
  const members = membersFromJob([
    { id: "a", answers: panel({ name: "玄関袖", qty: 2 }) },
    { id: "b", answers: panel({ name: "間仕切り", width: 1200, qty: 1 }) },
  ]);
  assert.ok(members.some((item) => item.name.startsWith("玄関袖 ")));
  assert.ok(members.some((item) => item.name.startsWith("間仕切り ")));
  assert.equal(
    panelSummaryLine(panel({ name: "玄関袖", qty: 2 })),
    "玄関袖 900 × 1800 mm 2枚",
  );
});
