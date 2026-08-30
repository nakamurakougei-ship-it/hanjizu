"use client";

import { SheetPreview } from "@/components/SheetPreview";
import { StickCutPreview } from "@/components/StickCutPreview";
import {
  bundleByMaterial,
  membersFromAnswers,
} from "@/lib/box";
import {
  extraStilePlaneNote,
} from "@/lib/panel";
import {
  membersFromPanel,
  panelDisplayName,
  panelSidesLabel,
  type PanelEntry,
} from "@/lib/job";
import { packFaceSheets } from "@/lib/sheet";
import { quoteBundle, yenText } from "@/lib/ledger";
import {
  materialLabel,
  quoteAvailableTotal,
  stockCountText,
  stickCutsByMaterial,
  stickMemberLines,
} from "@/lib/resultView";
import type { Member } from "@/lib/model";
import type { QaAnswers } from "@/lib/qa";
import type { LedgerControls } from "@/lib/useLedger";

function isFaceOrCore(item: Member): boolean {
  return /面材/.test(item.name) || /芯/.test(item.name);
}

export function MemberList({
  answers,
  panels = [],
  ledger,
}: {
  answers: QaAnswers;
  panels?: PanelEntry[];
  ledger: LedgerControls;
}) {
  if (answers.product !== "箱" && answers.product !== "パネル") return null;
  const panelList =
    answers.product === "パネル" && panels.length > 0
      ? panels
      : answers.product === "パネル"
        ? [{ id: "current", answers }]
        : [];
  const members =
    panelList.length > 0
      ? panelList.flatMap((entry) => membersFromPanel(entry.answers))
      : membersFromAnswers(answers);
  const bundles = bundleByMaterial(members);
  if (bundles.length === 0) return null;
  const quotes = bundles.map((bundle) =>
    quoteBundle(bundle.key, bundle.members, ledger.rows),
  );
  const total = quoteAvailableTotal(quotes);

  return (
    <div className="parts">
      <section className="parts-estimate">
        <h2 className="parts-estimate-title">使用材料一覧</h2>
        <ul className="parts-stock">
          {quotes.map((quote) => {
            const count = stockCountText(quote);
            if (!count) return null;
            return (
              <li key={quote.key}>
                <span className="parts-stock-name">
                  {materialLabel(quote.key)}
                </span>
                <span className="parts-stock-count">{count}</span>
              </li>
            );
          })}
        </ul>
        <p className="parts-total">
          {total.yen != null ? yenText(total.yen) : "金額は台帳が揃い次第"}
          {total.yen != null && total.missing
            ? "（枠材の単価は台帳にまだない）"
            : null}
        </p>
      </section>

      {panelList.length > 0
        ? panelList.map((entry) => {
            const part = membersFromPanel(entry.answers);
            const lines = stickMemberLines(part);
            const cuts = stickCutsByMaterial(part);
            const planeNote = extraStilePlaneNote(entry.answers);
            const faces = part.filter(isFaceOrCore);
            const sheets = packFaceSheets(faces);
            const sheetTitle = faces.some((item) =>
              item.materialKey.includes("ベニヤ"),
            )
              ? "ベニヤの木取図"
              : "板の木取図";
            return (
              <section key={entry.id} className="parts-panel">
                <h2 className="parts-panel-name">
                  {panelDisplayName(entry.answers)} {panelSidesLabel(entry.answers)}
                </h2>
                {planeNote ? <p className="sheet-note">{planeNote}</p> : null}
                {lines.length > 0 ? (
                  <ul className="parts-stick-lines">
                    {lines.map((line) => (
                      <li key={`${line.label}-${line.length}`}>
                        {line.label} {line.length}mm　{line.count}本
                      </li>
                    ))}
                  </ul>
                ) : null}
                {cuts.map((group) => (
                  <div key={group.key} className="parts-rail">
                    <p className="parts-stick-label">
                      {group.label}　定尺 {group.cut.stockLength}mm
                      {group.cut.kerf > 0 ? `　刃厚 ${group.cut.kerf}mm` : ""}
                    </p>
                    <StickCutPreview
                      cut={group.cut}
                      id={`${entry.id}-stick-${group.key}`}
                    />
                  </div>
                ))}
                {faces.length > 0 ? (
                  <div className="parts-sheets">
                    <p className="parts-stick-label">{sheetTitle}</p>
                    {sheets.sheets.map((sheet, index) => (
                      <SheetPreview
                        key={`${entry.id}-sheet-${index}`}
                        sheet={sheet}
                        panelName={panelDisplayName(entry.answers)}
                      />
                    ))}
                    {sheets.unfit.length > 0 ? (
                      <p className="sheet-note">
                        {sheets.unfit.map((item) => item.name).join("、")}
                        は定尺一枚に載らない（分割は後回し）
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })
        : null}

      <label className="ledger-pick">
        台帳
        <span className="ledger-name">
          {ledger.fromFile ? ledger.fileName : "サンプル"}
        </span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) ledger.loadFile(file);
            event.target.value = "";
          }}
        />
        {ledger.fromFile ? (
          <button type="button" className="ledger-reset" onClick={ledger.resetSample}>
            サンプルに戻す
          </button>
        ) : null}
      </label>
    </div>
  );
}
