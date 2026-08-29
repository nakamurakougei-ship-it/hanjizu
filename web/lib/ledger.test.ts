import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  boardOptions,
  findLedgerRow,
  parseLedger,
  quoteBundle,
} from "./ledger";

const csv = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../public/hanjizu_daifukucho.csv"),
  "utf8",
);

test("台帳CSVからラワンベニヤ3mmの3×6単価が読める", () => {
  const rows = parseLedger(csv);
  const row = findLedgerRow(rows, "ラワンベニヤ", 3);
  assert.ok(row);
  assert.equal(row?.price36, 1380);
  assert.ok(boardOptions(rows, "ランバー").some((item) => item.thickness === 15));
});

test("1800×900の面材は3×6一枚の単価になる", () => {
  const rows = parseLedger(csv);
  const quote = quoteBundle(
    "ラワンベニヤ 3",
    [
      {
        id: "a",
        name: "面材 表",
        boxId: "パネル",
        faceId: "top",
        role: "core",
        length: 1800,
        width: 900,
        thickness: 3,
        construction: "plywood",
        materialKey: "ラワンベニヤ 3",
        qty: 1,
        joint: "t-joint",
        canRotate: true,
      },
    ],
    rows,
  );
  assert.equal(quote.count36, 1);
  assert.equal(quote.count48, 0);
  assert.equal(quote.yen, 1380);
});

test("小割は定尺4000から本数を出す", () => {
  const rows = parseLedger(csv);
  const quote = quoteBundle(
    "小割 20×30 30",
    [
      {
        id: "s",
        name: "左縦",
        boxId: "パネル",
        faceId: "top",
        role: "core",
        length: 1800,
        width: 20,
        thickness: 30,
        construction: "flush",
        materialKey: "小割 20×30 30",
        qty: 2,
        joint: "straight",
        canRotate: true,
      },
    ],
    rows,
  );
  assert.equal(quote.yen, null);
  assert.equal(quote.meters, 3.6);
  assert.equal(quote.stickCut?.stockLength, 4000);
  assert.equal(quote.stickCut?.bars.length, 1);
});
