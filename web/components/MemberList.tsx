"use client";

import { SheetPreview } from "@/components/SheetPreview";
import { StickCutPreview } from "@/components/StickCutPreview";
import {
  bundleByMaterial,
  membersFromAnswers,
} from "@/lib/box";
import {
  membersFromPanel,
  panelDisplayName,
  type PanelEntry,
} from "@/lib/job";
import { quoteBundle, yenText } from "@/lib/ledger";
import {
  materialLabel,
  quoteAvailableTotal,
  stockCountText,
  stileCount,
  stileCut,
  railGroups,
  vStileGroups,
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
            const nStile = stileCount(part);
            const cut = stileCut(part);
            const extras = vStileGroups(part);
            const rails = railGroups(part);
            const faces = part.filter(isFaceOrCore);
            return (
              <section key={entry.id} className="parts-panel">
                <h2 className="parts-panel-name">
                  {panelDisplayName(entry.answers)}
                </h2>
                {nStile > 0 ? (
                  <p className="parts-stick-label">縦残 {nStile}本</p>
                ) : null}
                {cut ? (
                  <StickCutPreview cut={cut} id={`${entry.id}-stile`} />
                ) : null}
                {extras.map((group) => (
                  <div key={group.key} className="parts-rail">
                    <p className="parts-stick-label">
                      {group.label} {group.count}本
                    </p>
                    {group.cut ? (
                      <StickCutPreview
                        cut={group.cut}
                        id={`${entry.id}-vstile-${group.key}`}
                      />
                    ) : null}
                  </div>
                ))}
                {rails.map((group) => (
                  <div key={group.key} className="parts-rail">
                    <p className="parts-stick-label">
                      {group.label} {group.count}本
                    </p>
                    {group.cut ? (
                      <StickCutPreview
                        cut={group.cut}
                        id={`${entry.id}-rail-${group.key}`}
                      />
                    ) : null}
                  </div>
                ))}
                {faces.map((item) => (
                  <SheetPreview key={item.id} member={item} />
                ))}
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
