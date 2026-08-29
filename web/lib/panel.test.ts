import assert from "node:assert/strict";
import { test } from "node:test";
import { boxFromAnswers, membersFromAnswers } from "./box";
import {
  HANSEI_SHORT_MM,
  KOGARA,
  MAX_NAKA_NOKORI_MM,
  PANEL_FACE_T_MM,
  TARUKI,
  nakaCount,
  panelMembers,
} from "./panel";
import { defaultAnswers, nextStep, pathFor, type QaAnswers } from "./qa";

function panelAnswers(patch: Partial<QaAnswers> = {}): QaAnswers {
  return {
    ...defaultAnswers(),
    product: "パネル",
    width: 900,
    height: 1800,
    sides: "片面",
    boneUse: "成使い",
    railKind: "全部小割",
    faceMaterial: "ラワンベニヤ",
    ...patch,
  };
}

test("900幅・成使いなら中骨は1本で中残は450以下", () => {
  const inner = 900 - 2 * KOGARA.short;
  const n = nakaCount(inner, KOGARA.short, MAX_NAKA_NOKORI_MM);
  assert.equal(n, 1);
  const gap = (inner - n * KOGARA.short) / (n + 1);
  assert.equal(gap, 420);
  assert.ok(gap <= MAX_NAKA_NOKORI_MM);
});

test("基本パネル 1800×900 成使い・全部小割・片面", () => {
  const answers = panelAnswers();
  const members = membersFromAnswers(answers);
  const byName = Object.fromEntries(members.map((item) => [item.name, item]));

  assert.equal(byName["左縦"].length, 1800);
  assert.equal(byName["左縦"].width, 20);
  assert.equal(byName["左縦"].thickness, 30);
  assert.equal(byName["右縦"].length, 1800);

  assert.equal(byName["上桟"].length, 900 - 2 * 20 - HANSEI_SHORT_MM);
  assert.equal(byName["上桟"].length, 859);
  assert.equal(byName["上桟"].width, 20);
  assert.equal(byName["下桟"].length, 859);
  assert.equal(byName["上桟"].materialKey, "小割 20×30 30");

  assert.equal(byName["中骨1"].length, 1800 - 2 * 20);
  assert.equal(byName["中骨1"].width, 20);
  assert.equal(members.filter((item) => item.name.startsWith("中骨")).length, 1);

  assert.equal(byName["面材 表"].length, 1800);
  assert.equal(byName["面材 表"].width, 900);
  assert.equal(byName["面材 表"].thickness, PANEL_FACE_T_MM);
  assert.equal(byName["面材 表"].materialKey, "ラワンベニヤ 3");
  assert.equal(
    members.some((item) => item.name === "面材 裏"),
    false,
  );

  const box = boxFromAnswers(answers).boxes[0];
  assert.equal(box.height, 30 + PANEL_FACE_T_MM);
  assert.equal(box.faces.front, undefined);
});

test("上下桟を垂木にすると成は30のまま面巾が40", () => {
  const members = panelMembers(panelAnswers({ railKind: "上下垂木" }));
  const top = members.find((item) => item.name === "上桟");
  const naka = members.find((item) => item.name === "中骨1");
  assert.ok(top);
  assert.ok(naka);
  assert.equal(top.width, TARUKI.long);
  assert.equal(top.thickness, 30);
  assert.equal(top.materialKey, "垂木 30×40 30");
  assert.equal(naka.length, 1800 - 2 * TARUKI.long);
  assert.equal(members.find((item) => item.name === "左縦")?.materialKey, "小割 20×30 30");
});

test("横使いでは成20・面巾30で、上下垂木は出さない", () => {
  const members = panelMembers(panelAnswers({ boneUse: "横使い" }));
  const stile = members.find((item) => item.name === "左縦");
  const rail = members.find((item) => item.name === "上桟");
  assert.ok(stile);
  assert.ok(rail);
  assert.equal(stile.thickness, 20);
  assert.equal(stile.width, 30);
  assert.equal(rail.length, 900 - 2 * 30 - HANSEI_SHORT_MM);
  assert.equal(rail.materialKey, "小割 20×30 20");
});

test("横勝ちなら横桟が通り、縦と中骨を1mm短くする", () => {
  const members = panelMembers(
    panelAnswers({ width: 1800, height: 900, frameWin: "横勝ち" }),
  );
  const top = members.find((item) => item.name === "上桟");
  const stile = members.find((item) => item.name === "左縦");
  const naka = members.find((item) => item.name === "中骨1");
  assert.ok(top);
  assert.ok(stile);
  assert.ok(naka);
  assert.equal(top.length, 1800);
  assert.equal(stile.length, 900 - 2 * 20 - HANSEI_SHORT_MM);
  assert.equal(naka.length, stile.length);
});

test("両面なら面材が表裏出る", () => {
  const members = panelMembers(panelAnswers({ sides: "両面" }));
  assert.ok(members.some((item) => item.name === "面材 表"));
  assert.ok(members.some((item) => item.name === "面材 裏"));
});

test("パネルの質問は寸法のあと骨へ。横使いと縦長では出ない枝を聞かない", () => {
  assert.equal(nextStep("product", panelAnswers()), "size");
  assert.equal(
    nextStep("product", { ...defaultAnswers(), product: "箱" }),
    "topSection",
  );

  const tall = panelAnswers({ boneUse: "成使い" });
  assert.deepEqual(pathFor(tall), [
    "product",
    "size",
    "boneUse",
    "railKind",
    "materials",
    "done",
  ]);

  const yokotsukai = panelAnswers({ boneUse: "横使い" });
  assert.equal(pathFor(yokotsukai).includes("railKind"), false);

  const wide = panelAnswers({ width: 1800, height: 900 });
  assert.ok(pathFor(wide).includes("frameWin"));
  assert.equal(nextStep("railKind", wide), "frameWin");
});
