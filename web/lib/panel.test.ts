import assert from "node:assert/strict";
import { test } from "node:test";
import { boxFromAnswers } from "./box";
import {
  DEFAULT_RAIL_PITCH_MM,
  PANEL_FACE_T_MM,
  TARUKI,
  extraStileColumns,
  extraStileSegLength,
  midRailCount,
  panelMembers,
} from "./panel";
import { packSticks, piecesFromMembers } from "./stickCut";
import {
  defaultAnswers,
  frameKindLogLine,
  logSteps,
  nextStep,
  pathFor,
  type QaAnswers,
  railFitLogLine,
  asksFaceStock,
} from "./qa";

function panelAnswers(patch: Partial<QaAnswers> = {}): QaAnswers {
  return {
    ...defaultAnswers(),
    product: "パネル",
    width: 900,
    height: 1800,
    sides: "片面",
    frameKind: "小割",
    boneUse: "成使い",
    railKind: "全部小割",
    railFit: "寸面通り",
    faceMaterial: "ラワンベニヤ",
    ...patch,
  };
}

test("横桟本数は高さ÷ピッチの端数切捨てから上下を除く", () => {
  assert.equal(midRailCount(1800, 450), 3);
  assert.equal(midRailCount(1800, 300), 5);
  assert.equal(midRailCount(1800, 400), 3);
  assert.equal(midRailCount(900, DEFAULT_RAIL_PITCH_MM), 1);
  assert.equal(midRailCount(400, 450), 0);
});

test("基本パネル 1800×900 成使い・全部小割・片面", () => {
  const answers = panelAnswers();
  const members = panelMembers(answers);
  const byName = Object.fromEntries(members.map((item) => [item.name, item]));

  assert.equal(byName["左縦"].length, 1800);
  assert.equal(byName["左縦"].width, 20);
  assert.equal(byName["左縦"].thickness, 30);
  assert.equal(byName["右縦"].length, 1800);

  assert.equal(byName["上桟"].length, 900 - 2 * 20);
  assert.equal(byName["上桟"].length, 860);
  assert.equal(byName["上桟"].width, 20);
  assert.equal(byName["下桟"].length, 860);
  assert.equal(byName["上桟"].materialKey, "小割 20×30 30");

  assert.equal(byName["中桟1"].length, 860);
  assert.equal(byName["中桟1"].width, 20);
  assert.equal(members.filter((item) => item.name.startsWith("中桟")).length, 3);

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
  const naka = members.find((item) => item.name === "中桟1");
  assert.ok(top);
  assert.ok(naka);
  assert.equal(top.width, TARUKI.long);
  assert.equal(top.thickness, 30);
  assert.equal(top.materialKey, "垂木 30×40 30");
  assert.equal(naka.length, 900 - 2 * 20);
  assert.equal(naka.materialKey, "小割 20×30 30");
  assert.equal(members.filter((item) => item.name.startsWith("中桟")).length, 3);
  assert.equal(
    members.find((item) => item.name === "左縦")?.materialKey,
    "小割 20×30 30",
  );
});

test("横使いでは成20・面巾30で、上下垂木は出さない", () => {
  const members = panelMembers(panelAnswers({ boneUse: "横使い" }));
  const stile = members.find((item) => item.name === "左縦");
  const rail = members.find((item) => item.name === "上桟");
  assert.ok(stile);
  assert.ok(rail);
  assert.equal(stile.thickness, 20);
  assert.equal(stile.width, 30);
  assert.equal(rail.length, 900 - 2 * 30);
  assert.equal(rail.materialKey, "小割 20×30 20");
});

test("余裕を設けると横桟だけ短くし、縦は寸面通り", () => {
  const members = panelMembers(
    panelAnswers({ railFit: "余裕", railAllow: 1 }),
  );
  const byName = Object.fromEntries(members.map((item) => [item.name, item]));
  assert.equal(byName["上桟"].length, 859);
  assert.equal(byName["下桟"].length, 859);
  assert.equal(byName["中桟1"].length, 859);
  assert.equal(byName["左縦"].length, 1800);
});

test("横勝ちなら横桟が通り、縦は桟の間。余裕は横桟だけ", () => {
  const flush = panelMembers(
    panelAnswers({ width: 1800, height: 900, frameWin: "横勝ち" }),
  );
  const flushTop = flush.find((item) => item.name === "上桟");
  const flushStile = flush.find((item) => item.name === "左縦");
  const flushNaka = flush.find((item) => item.name === "中桟1");
  assert.ok(flushTop);
  assert.ok(flushStile);
  assert.ok(flushNaka);
  assert.equal(flushTop.length, 1800);
  assert.equal(flushStile.length, 900 - 2 * 20);
  assert.equal(flushNaka.length, 1800);
  assert.equal(flush.filter((item) => item.name.startsWith("中桟")).length, 1);

  const short = panelMembers(
    panelAnswers({
      width: 1800,
      height: 900,
      frameWin: "横勝ち",
      railFit: "余裕",
      railAllow: 1,
    }),
  );
  assert.equal(short.find((item) => item.name === "上桟")?.length, 1799);
  assert.equal(short.find((item) => item.name === "中桟1")?.length, 1799);
  assert.equal(short.find((item) => item.name === "左縦")?.length, 860);
});

test("300ピッチなら1800高さの中桟は5本", () => {
  const members = panelMembers(panelAnswers({ railPitch: 300 }));
  assert.equal(members.filter((item) => item.name.startsWith("中桟")).length, 5);
});

test("両面なら面材が表裏出る", () => {
  const members = panelMembers(panelAnswers({ sides: "両面" }));
  assert.ok(members.some((item) => item.name === "面材 表"));
  assert.ok(members.some((item) => item.name === "面材 裏"));
});

test("パネルの質問は寸法のあと横桟の長さ、それから枠材。横使いと縦長では出ない枝を聞かない", () => {
  assert.equal(nextStep("product", panelAnswers()), "panelName");
  assert.equal(
    nextStep("product", { ...defaultAnswers(), product: "箱" }),
    "topSection",
  );

  const tall = panelAnswers({ boneUse: "成使い" });
  assert.deepEqual(pathFor(tall), [
    "product",
    "panelName",
    "size",
    "railFit",
    "frameKind",
    "boneUse",
    "railKind",
    "materials",
    "railPitch",
    "stileExtra",
    "qty",
    "morePanels",
    "done",
  ]);

  const allow = panelAnswers({ railFit: "余裕" });
  assert.ok(pathFor(allow).includes("railAllow"));
  assert.equal(nextStep("railFit", allow), "railAllow");
  assert.equal(nextStep("railFit", tall), "frameKind");

  const yokotsukai = panelAnswers({ boneUse: "横使い" });
  assert.equal(pathFor(yokotsukai).includes("railKind"), false);

  const wide = panelAnswers({ width: 1800, height: 900 });
  assert.ok(pathFor(wide).includes("frameWin"));
  assert.equal(nextStep("railKind", wide), "frameWin");
  assert.equal(nextStep("railPitch", tall), "stileExtra");
  assert.ok(pathFor({ ...tall, stileExtra: "入れる" }).includes("stileExtraN"));
});

test("枠材が垂木なら上下桟の枝は出ず、枠は全部垂木", () => {
  const answers = panelAnswers({ frameKind: "垂木" });
  assert.equal(pathFor(answers).includes("railKind"), false);
  const stile = panelMembers(answers).find((item) => item.name === "左縦");
  assert.equal(stile?.width, 30);
  assert.equal(stile?.thickness, 40);
  assert.equal(stile?.materialKey, "垂木 30×40 40");
});

test("ランバーはラワンかシナのあと厚みを聞き、厚みの使い方へ進む", () => {
  const answers = panelAnswers({
    frameKind: "ランバー",
    sheetFace: "ラワン",
    frameMaterial: "ラワンランバー",
    frameThickness: 15,
  });
  assert.deepEqual(pathFor(answers), [
    "product",
    "panelName",
    "size",
    "railFit",
    "frameKind",
    "sheetFace",
    "frameStock",
    "sheetUse",
    "qty",
    "morePanels",
    "done",
  ]);
  const members = panelMembers(answers);
  assert.equal(members.length, 1);
  assert.equal(members[0].name, "芯");
  assert.equal(members[0].thickness, 15);
  assert.equal(members[0].materialKey, "ラワンランバー 15");
});

test("ジェルトンは幅45・入力した厚みが成の枠になる", () => {
  const answers = panelAnswers({
    frameKind: "ジェルトン",
    frameMaterial: "ジェルトン",
    frameThickness: 24,
  });
  assert.deepEqual(pathFor(answers), [
    "product",
    "panelName",
    "size",
    "railFit",
    "frameKind",
    "frameStock",
    "railPitch",
    "stileExtra",
    "qty",
    "morePanels",
    "done",
  ]);
  const stile = panelMembers(answers).find((item) => item.name === "左縦");
  assert.equal(stile?.width, 45);
  assert.equal(stile?.thickness, 24);
  assert.equal(stile?.materialKey, "ジェルトン 24");
});

test("ベニヤで割きを選ぶと厚みが面巾の枠になる", () => {
  const answers = panelAnswers({
    frameKind: "ベニヤ",
    sheetFace: "ラワン",
    frameMaterial: "ラワンベニヤ",
    frameThickness: 15,
    sheetUse: "割き",
  });
  assert.ok(pathFor(answers).includes("sheetUse"));
  assert.ok(pathFor(answers).includes("railPitch"));
  assert.ok(pathFor(answers).includes("stileExtra"));
  const stile = panelMembers(answers).find((item) => item.name === "左縦");
  assert.equal(stile?.width, 15);
  assert.equal(stile?.thickness, 15);
});

test("枠材のログは種類と厚みを1行にまとめる", () => {
  const jelutong = panelAnswers({
    frameKind: "ジェルトン",
    frameMaterial: "ジェルトン",
    frameThickness: 21,
  });
  assert.equal(frameKindLogLine(jelutong, "frameStock"), "ジェルトン");
  assert.equal(frameKindLogLine(jelutong, "done"), "ジェルトン 21mm");
  assert.deepEqual(logSteps("done", jelutong), [
    "product",
    "panelName",
    "size",
    "railFit",
    "frameKind",
    "railPitch",
    "stileExtra",
    "qty",
  ]);

  const veneer = panelAnswers({
    frameKind: "ベニヤ",
    sheetFace: "シナ",
    frameMaterial: "シナベニヤ",
    frameThickness: 12,
    sheetUse: "厚み",
  });
  assert.equal(frameKindLogLine(veneer, "sheetFace"), "ベニヤ");
  assert.equal(frameKindLogLine(veneer, "frameStock"), "ベニヤ シナ");
  assert.equal(frameKindLogLine(veneer, "done"), "ベニヤ シナ 12mm");
  assert.deepEqual(logSteps("done", veneer), [
    "product",
    "panelName",
    "size",
    "railFit",
    "frameKind",
    "sheetUse",
    "qty",
  ]);
});

test("横桟の余裕はログに折りたたみ、寸面通りは数値を聞かない", () => {
  const flush = panelAnswers({ railFit: "寸面通り" });
  assert.equal(railFitLogLine(flush, "done"), "寸面通り");
  assert.equal(pathFor(flush).includes("railAllow"), false);

  const allow = panelAnswers({ railFit: "余裕", railAllow: 3 });
  assert.equal(railFitLogLine(allow, "railAllow"), "余裕を設ける");
  assert.equal(railFitLogLine(allow, "done"), "余裕 3mm");
  assert.equal(logSteps("done", allow).includes("railAllow"), false);
});

test("基本パネルの小割は定尺4000から本数を出す", () => {
  const frame = panelMembers(panelAnswers()).filter((item) =>
    item.materialKey.startsWith("小割"),
  );
  const cut = packSticks(piecesFromMembers(frame), 4000);
  assert.equal(cut.bars.length, 3);
  assert.equal(cut.unfit.length, 0);
});

test("ジェルトンの枠は定尺2430から本数を出す", () => {
  const frame = panelMembers(
    panelAnswers({
      frameKind: "ジェルトン",
      frameMaterial: "ジェルトン",
      frameThickness: 21,
    }),
  ).filter((item) => item.materialKey.startsWith("ジェルトン"));
  const cut = packSticks(piecesFromMembers(frame), 2430);
  assert.equal(cut.bars.length, 4);
  assert.equal(cut.unfit.length, 0);
});

test("横幅が3×6を超えるときだけ面材の定尺を聞き、その直後に縦残を聞く。縦長超えは聞かない", () => {
  assert.equal(asksFaceStock(panelAnswers()), false);
  assert.equal(asksFaceStock(panelAnswers({ width: 1800, height: 900 })), false);
  assert.equal(asksFaceStock(panelAnswers({ width: 900, height: 2000 })), false);
  const over = panelAnswers({ width: 1200, height: 1800 });
  assert.equal(asksFaceStock(over), true);
  assert.ok(pathFor(over).includes("faceStock"));
  assert.equal(nextStep("railFit", over), "faceStock");
  assert.equal(nextStep("faceStock", over), "stileExtra");
  assert.equal(nextStep("stileExtra", over), "stileExtraN");
  assert.equal(nextStep("stileExtraN", over), "frameKind");
  assert.equal(nextStep("railPitch", over), "qty");
  assert.ok(!pathFor(over).slice(pathFor(over).indexOf("railPitch")).includes("stileExtra"));
  assert.equal(extraStileColumns(over), 0);
  assert.equal(extraStileColumns({ ...over, stileExtraN: 1 }), 1);
  assert.equal(extraStileColumns(panelAnswers({ stileExtraN: 1 })), 0);
});

test("縦残1列は横桟の間に均等。小割枠なら繋ぎは垂木", () => {
  const faces = [20, 20, 20, 20, 20];
  assert.equal(extraStileSegLength(1800, faces), 425);
  const members = panelMembers(
    panelAnswers({ stileExtra: "入れる", stileExtraN: 1 }),
  );
  const extra = members.find((item) => item.name === "縦残");
  assert.ok(extra);
  assert.equal(extra.length, 425);
  assert.equal(extra.qty, 4);
  assert.equal(extra.width, TARUKI.long);
  assert.equal(extra.thickness, 30);
  assert.equal(extra.materialKey, "垂木 30×40 30");
});

test("ジェルトンの縦残は枠と同じ寸面", () => {
  const extra = panelMembers(
    panelAnswers({
      frameKind: "ジェルトン",
      frameMaterial: "ジェルトン",
      frameThickness: 21,
      stileExtra: "入れる",
      stileExtraN: 2,
    }),
  ).find((item) => item.name === "縦残");
  assert.ok(extra);
  assert.equal(extra.width, 45);
  assert.equal(extra.thickness, 21);
  assert.equal(extra.materialKey, "ジェルトン 21");
  assert.equal(extra.qty, 8);
});

test("1200×1800を3×6で作ると巾だけ分割する", () => {
  const members = panelMembers(
    panelAnswers({
      width: 1200,
      height: 1800,
      faceStock: "3×6",
    }),
  );
  const faces = members.filter((item) => item.name.startsWith("面材 表"));
  assert.ok(faces.length >= 2);
  assert.ok(faces.every((face) => face.length === 1800));
  assert.equal(
    faces.reduce((sum, face) => sum + face.width, 0),
    1200,
  );
  const whole = panelMembers(
    panelAnswers({
      width: 1200,
      height: 1800,
      faceStock: "4×8込み",
    }),
  ).find((item) => item.name === "面材 表");
  assert.equal(whole?.length, 1800);
  assert.equal(whole?.width, 1200);
});

