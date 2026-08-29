import { panelMembers } from "./panel";
import { defaultAnswers, type QaAnswers } from "./qa";
import type { Member } from "./model";

export type PanelEntry = {
  id: string;
  answers: QaAnswers;
};

export function newPanelId(): string {
  return `panel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function panelQty(answers: QaAnswers): number {
  const n = Math.floor(answers.qty ?? 1);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function panelDisplayName(answers: QaAnswers): string {
  const name = answers.name?.trim();
  return name ? name : "パネル";
}

export function panelSummaryLine(answers: QaAnswers): string {
  const size = `${answers.width} × ${answers.height} mm`;
  if (answers.qty == null) return `${panelDisplayName(answers)} ${size}`;
  return `${panelDisplayName(answers)} ${size} ${panelQty(answers)}枚`;
}

export function freshPanelAnswers(): QaAnswers {
  return {
    ...defaultAnswers(),
    product: "パネル",
    panelId: newPanelId(),
    width: 900,
    height: 1800,
    sides: "片面",
  };
}

export function membersFromPanel(answers: QaAnswers): Member[] {
  const n = panelQty(answers);
  const label = panelDisplayName(answers);
  return panelMembers(answers).map((item) => ({
    ...item,
    qty: item.qty * n,
    name: `${label} ${item.name}`,
    boxId: label,
  }));
}

export function membersFromJob(panels: PanelEntry[]): Member[] {
  return panels.flatMap((entry) => membersFromPanel(entry.answers));
}

export function upsertPanel(
  panels: PanelEntry[],
  entry: PanelEntry,
): PanelEntry[] {
  const i = panels.findIndex((item) => item.id === entry.id);
  if (i < 0) return [...panels, entry];
  const next = panels.slice();
  next[i] = entry;
  return next;
}

export function toPanelEntry(answers: QaAnswers): PanelEntry {
  const id = answers.panelId ?? newPanelId();
  return {
    id,
    answers: { ...answers, panelId: id, qty: panelQty(answers) },
  };
}
