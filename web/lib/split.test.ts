import assert from "node:assert/strict";
import { test } from "node:test";
import { splitByPanelHeight, splitByPanelWidth, splitOversize } from "./split";
import { USABLE_36, USABLE_48, fitsSomeStock } from "./stock";
import type { Member } from "./model";

function piece(length: number, width: number, extra?: Partial<Member>): Member {
  return {
    id: "p",
    name: "パネル",
    boxId: "パネル",
    faceId: "top",
    role: "core",
    length,
    width,
    thickness: 15,
    construction: "plywood",
    materialKey: "ラワンベニヤ 15",
    qty: 1,
    joint: "t-joint",
    canRotate: true,
    ...extra,
  };
}

test("定尺に載る部材は分割しない", () => {
  const parts = splitOversize([piece(1800, 900)]);
  assert.equal(parts.length, 1);
  assert.equal(parts[0].length, 1800);
  assert.equal(parts[0].width, 900);
});

test("4×8にだけ載る部材はまだ継がない", () => {
  const parts = splitOversize([piece(2400, 1200)]);
  assert.equal(parts.length, 1);
});

test("両方に載らない面は必ず分割し、片は4×8に載る", () => {
  const parts = splitOversize([piece(3000, 2000)]);
  assert.ok(parts.length >= 3);
  for (const part of parts) {
    assert.ok(
      fitsSomeStock(part.length, part.width, part.canRotate),
      `${part.name} ${part.length}x${part.width} が定尺に載らない`,
    );
  }
  const names = parts.map((p) => p.name).join(" ");
  assert.ok(names.includes("主"));
  assert.ok(names.includes("巾残"));
  assert.ok(names.includes("エンド"));
});

test("長さだけ超える見え面は長さ継ぎ", () => {
  const parts = splitOversize([piece(3000, 900)]);
  assert.equal(parts.length, 2);
  assert.equal(parts[0].length, USABLE_48.length);
  assert.equal(parts[1].length, 3000 - USABLE_48.length);
});

test("長い部材は載るまで繰り返す", () => {
  const parts = splitOversize([piece(5000, 900)]);
  assert.ok(parts.length >= 3);
  for (const part of parts) {
    assert.ok(fitsSomeStock(part.length, part.width, true));
  }
});

test("横幅が広い面は巾だけ3×6に分け、縦は切らない", () => {
  const parts = splitByPanelWidth([piece(1800, 1200)], 1200, 1800);
  assert.equal(parts.length, 2);
  assert.ok(parts.every((part) => part.length === 1800));
  assert.equal(
    parts.reduce((sum, part) => sum + part.width, 0),
    1200,
  );
  assert.ok(parts.every((part) => part.width <= USABLE_36.width));

  const tall = splitByPanelWidth([piece(2000, 1200)], 1200, 2000);
  assert.ok(tall.every((part) => part.length === 2000));
});

test("縦長パネルは長さ方向に割り、横長なら巾方向", () => {
  const tall = splitByPanelHeight([piece(2000, 900)], 2000, 900);
  assert.equal(tall.length, 2);
  assert.ok(tall.every((part) => part.width === 900));
  assert.equal(
    tall.reduce((sum, part) => sum + part.length, 0),
    2000,
  );
  assert.ok(tall.every((part) => part.length <= USABLE_36.length));

  const wide = splitByPanelHeight([piece(2500, 2000)], 2000, 2500);
  assert.ok(wide.every((part) => part.length === 2500));
  assert.equal(
    wide.reduce((sum, part) => sum + part.width, 0),
    2000,
  );
  assert.ok(wide.every((part) => part.width <= USABLE_36.length));
});
