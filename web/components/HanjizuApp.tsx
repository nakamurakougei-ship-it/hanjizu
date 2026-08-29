"use client";

import { useEffect, useState } from "react";
import {
  FACE_MATERIAL_OPTS,
  FRAME_KINDS,
  MATERIAL_OPTS,
  SHEET_FACES,
  STEP_TITLES,
  asksFaceStock,
  defaultAnswers,
  frameKindLogLine,
  logSteps,
  nextStep,
  pathFor,
  prevStep,
  questionFor,
  railFitLogLine,
  stileExtraLogLine,
  type BoneUse,
  type FaceBuild,
  type FrameKind,
  type FrameWin,
  type JoinKind,
  type MaterialOpt,
  type PanelSides,
  type QaAnswers,
  type FaceStock,
  type RailFit,
  type StileExtra,
  type RailKind,
  type SheetFace,
  type SheetUse,
  type StepId,
  type TopSection,
} from "@/lib/qa";
import {
  defaultFrameThickness,
  frameKindHint,
  isNamedTimberKind,
  isSheetKind,
  sheetMaterialName,
  stickOf,
} from "@/lib/catalog";
import { useLedger } from "@/lib/useLedger";

import { ProductIcon, ProductPick } from "@/components/ProductPick";
import { MemberList } from "@/components/MemberList";
import {
  freshPanelAnswers,
  newPanelId,
  panelSummaryLine,
  toPanelEntry,
  upsertPanel,
  type PanelEntry,
} from "@/lib/job";
import { DEFAULT_RAIL_PITCH_MM } from "@/lib/panel";

type Choice<T extends string> = {
  value: T;
  label: string;
  hint?: string;
  ready: boolean;
};

function ChoiceRow<T extends string>({
  choices,
  onPick,
  wide,
}: {
  choices: Choice<T>[];
  onPick: (value: T) => void;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "choice-row is-wide" : "choice-row"}>
      {choices.map((choice) => (
        <button
          key={choice.value}
          type="button"
          className="choice"
          disabled={!choice.ready}
          onClick={() => onPick(choice.value)}
        >
          <span className="choice-label">{choice.label}</span>
          {choice.hint ? <span className="choice-hint">{choice.hint}</span> : null}
          {!choice.ready ? <span className="choice-soon">準備中</span> : null}
        </button>
      ))}
    </div>
  );
}

function answerLine(
  step: Exclude<StepId, "done">,
  answers: QaAnswers,
  current: StepId,
): string {
  if (step === "product") return answers.product ?? "";
  if (step === "construction") return answers.construction ?? "";
  if (step === "topSection") {
    if (answers.topSection === "平板") return "平板（見附＝実厚）";
    return answers.topSection ?? "";
  }
  if (step === "join") return answers.join ?? "";
  if (step === "panelName") return answers.name?.trim() ?? "";
  if (step === "size") {
    if (answers.product === "パネル") {
      return `${answers.width} × ${answers.height} mm ${answers.sides ?? ""}`;
    }
    return `${answers.width} × ${answers.depth} × ${answers.height} mm`;
  }
  if (step === "railFit") return railFitLogLine(answers, current);
  if (step === "faceStock") return answers.faceStock ?? "";
  if (step === "railPitch") {
    return answers.railPitch != null ? `${answers.railPitch}mm` : "";
  }
  if (step === "stileExtra") return stileExtraLogLine(answers, current);
  if (step === "frameKind") return frameKindLogLine(answers, current);
  if (step === "boneUse") return answers.boneUse ?? "";
  if (step === "railKind") return answers.railKind ?? "";
  if (step === "frameWin") return answers.frameWin ?? "縦勝ち";
  if (step === "sheetUse") {
    return answers.sheetUse === "割き" ? "割いた幅を厚みにする" : answers.sheetUse === "厚み" ? "厚みを使う" : "";
  }
  if (step === "materials") return `${answers.faceMaterial ?? ""} 3mm`;
  if (step === "qty") {
    return answers.qty != null ? `${answers.qty}枚` : "";
  }
  if (step === "finish") {
    return `長手 ${answers.finishLong} ／ 短手 ${answers.finishShort}`;
  }
  return `${answers.lumberT} mm`;
}

export function HanjizuApp() {
  const [hasBg, setHasBg] = useState(true);
  const [answers, setAnswers] = useState<QaAnswers>(defaultAnswers);
  const [step, setStep] = useState<StepId>("product");
  const [panels, setPanels] = useState<PanelEntry[]>([]);
  const [addingAnother, setAddingAnother] = useState(false);
  const [entering, setEntering] = useState(true);

  const [opening, setOpening] = useState(true);
  const [openingOut, setOpeningOut] = useState(false);
  const ledger = useLedger();
  const decided = logSteps(step, answers);
  const currentLog =
    step === "done" ? [] : decided.filter((id) => id !== "product");
  const showProduct = Boolean(answers.product) && step !== "product";
  const panelFollowUp =
    answers.product === "パネル" && step !== "product" && step !== "done";
  const roster =
    step === "done"
      ? panels
      : panels.filter((item) => item.id !== answers.panelId);
  const backTo =
    step === "panelName" && addingAnother && roster.length > 0
      ? ("morePanels" as const)
      : prevStep(step, answers);

  useEffect(() => {
    fetch("/hanjizu-bg-blue.png", { method: "HEAD" })
      .then((res) => setHasBg(res.ok))
      .catch(() => setHasBg(false));
  }, []);

  useEffect(() => {
    document.body.classList.toggle("no-bg", !hasBg);
  }, [hasBg]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOpening(false);
      return;
    }
    const fade = window.setTimeout(() => setOpeningOut(true), 3400);
    const done = window.setTimeout(() => setOpening(false), 4000);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(done);
    };
  }, []);

  function goTo(next: StepId) {
    setEntering(false);
    window.setTimeout(() => {
      setStep(next);
      setEntering(true);
    }, 140);
  }

  function rewind(to: StepId) {
    setAnswers((prev) => {
      const next = { ...prev };
      const order = pathFor(prev);
      const at = order.indexOf(to);
      const forget: Record<string, () => void> = {
        product: () => {
          delete next.product;
        },
        construction: () => {
          delete next.construction;
        },
        topSection: () => {
          delete next.topSection;
        },
        join: () => {
          delete next.join;
        },
        panelName: () => {
          delete next.name;
        },
        railFit: () => {
          delete next.railFit;
          delete next.railAllow;
        },
        railAllow: () => {
          delete next.railAllow;
        },
        railPitch: () => {
          delete next.railPitch;
        },
        faceStock: () => {
          delete next.faceStock;
        },
        stileExtra: () => {
          delete next.stileExtra;
          delete next.stileExtraN;
        },
        stileExtraN: () => {
          delete next.stileExtraN;
        },
        frameKind: () => {
          delete next.frameKind;
          delete next.sheetFace;
        },
        sheetFace: () => {
          delete next.sheetFace;
        },
        boneUse: () => {
          delete next.boneUse;
        },
        railKind: () => {
          delete next.railKind;
        },
        frameWin: () => {
          delete next.frameWin;
        },
        frameStock: () => {
          delete next.frameMaterial;
          delete next.frameThickness;
        },
        sheetUse: () => {
          delete next.sheetUse;
        },
        materials: () => {
          delete next.faceMaterial;
        },
        qty: () => {
          delete next.qty;
        },
      };
      for (const id of Object.keys(forget)) {
        const i = order.indexOf(id as StepId);
        if (i >= 0 && at <= i) forget[id]();
      }
      if (to === "product") {
        delete next.construction;
        delete next.topSection;
        delete next.join;
        delete next.frameKind;
        delete next.boneUse;
        delete next.railKind;
        delete next.frameWin;
        delete next.frameMaterial;
        delete next.frameThickness;
        delete next.sheetFace;
        delete next.sheetUse;
        delete next.sides;
        delete next.faceMaterial;
        delete next.railFit;
        delete next.railAllow;
        delete next.railPitch;
        delete next.faceStock;
        delete next.stileExtra;
        delete next.stileExtraN;
        delete next.name;
        delete next.qty;
        delete next.panelId;
      }
      return next;
    });
    if (to === "product") {
      setPanels([]);
      setAddingAnother(false);
    }
    goTo(to);
  }

  function editSavedPanel(id: string) {
    const entry = panels.find((item) => item.id === id);
    if (!entry) return;
    setAddingAnother(false);
    setAnswers(entry.answers);
    goTo("panelName");
  }

  function goBack() {
    if (step === "panelName" && addingAnother && panels.length > 0) {
      const last = panels[panels.length - 1];
      setAddingAnother(false);
      setPanels(panels.slice(0, -1));
      setAnswers(last.answers);
      goTo("morePanels");
      return;
    }
    if (step === "panelName" && !addingAnother && panels.length > 0) {
      goTo("done");
      return;
    }
    if (backTo) rewind(backTo);
  }

  return (
    <main className={`stage ${opening ? "is-opening" : "is-ready"}`}>
      {opening ? (
        <div
          className={`opening ${openingOut ? "out" : ""}`}
          role="img"
          aria-label="判じ図"
        >
          <p className="opening-title">判じ図</p>
        </div>
      ) : null}

      <div className="settings">
      <section className="ask" aria-live="polite" aria-hidden={opening}>
        <div
          className={`card ${entering ? "in" : ""}${panelFollowUp ? " is-panel-follow" : ""}`}
        >
        {step === "done" ? (
          <p className="question q-live">
            仕様を受けました。決めた項目を押すと、そこからやり直せます。
          </p>
        ) : (
          <>
            <p className="question q-live">
              {questionFor(step, answers)}
            </p>
            {panelFollowUp ? (
              <p className="question q-panel-matter">パネルの詳細を尋ねます</p>
            ) : null}
          </>
        )}

        <div className="card-body">
          {showProduct || panels.length > 0 || currentLog.length > 0 ? (
            <ul className="log">
              {showProduct ? (
                <li>
                  <button
                    type="button"
                    className="log-item is-product"
                    onClick={() => rewind("product")}
                  >
                    {answers.product ? (
                      <span className="log-icon">
                        <ProductIcon kind={answers.product} />
                      </span>
                    ) : null}
                    <span className="log-text">
                      <span className="decided-key">{STEP_TITLES.product}</span>
                      <span className="decided-val">{answers.product}</span>
                    </span>
                  </button>
                </li>
              ) : null}
              {roster.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className="log-item is-saved-panel"
                    onClick={() => editSavedPanel(entry.id)}
                  >
                    <span className="log-text">
                      <span className="decided-key">パネル</span>
                      <span className="decided-val">
                        {panelSummaryLine(entry.answers)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {currentLog.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    className="log-item"
                    onClick={() => rewind(id)}
                  >
                    <span className="log-text">
                      <span className="decided-key">{STEP_TITLES[id]}</span>
                      <span className="decided-val">
                        {answerLine(id, answers, step)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {step === "done" ? (
            <div className="parts-mobile">
              <MemberList answers={answers} panels={panels} ledger={ledger} />
            </div>
          ) : (
            <div className="now">
            {step === "product" ? (
              <ProductPick
                onPick={(value) => {
                  const next =
                    value === "パネル"
                      ? {
                          ...answers,
                          product: value,
                          panelId: answers.panelId ?? newPanelId(),
                          width: 900,
                          height: 1800,
                          sides: "片面" as const,
                        }
                      : { ...answers, product: value };
                  setAnswers(next);
                  goTo(nextStep("product", next));
                }}
              />
            ) : null}

            {step === "construction" ? (
              <ChoiceRow
                choices={[
                  { value: "ベニヤ", label: "ベニヤ", ready: true },
                  { value: "フラッシュ", label: "フラッシュ", ready: true },
                  { value: "厚い箱パネル", label: "厚い箱パネル", hint: "子の箱", ready: true },
                ]}
                onPick={(value: FaceBuild) => {
                  const next = { ...answers, construction: value };
                  setAnswers(next);
                  goTo(nextStep("construction", next));
                }}
              />
            ) : null}

            {step === "topSection" ? (
              <ChoiceRow
                choices={[
                  { value: "平板", label: "平板", hint: "見附＝実厚", ready: true },
                  { value: "コの字", label: "コの字", hint: "幕板で見附", ready: false },
                  { value: "厚い箱", label: "厚い箱パネル", ready: false },
                ]}
                onPick={(value: TopSection) => {
                  const next = { ...answers, topSection: value };
                  setAnswers(next);
                  goTo(nextStep("topSection", next));
                }}
              />
            ) : null}

            {step === "join" ? (
              <ChoiceRow
                choices={[
                  { value: "天勝ち", label: "天勝ち", hint: "側は実厚の下面まで", ready: true },
                  { value: "側勝ち", label: "側勝ち", ready: false },
                ]}
                onPick={(value: JoinKind) => {
                  const next = { ...answers, join: value };
                  setAnswers(next);
                  goTo(nextStep("join", next));
                }}
              />
            ) : null}

            {step === "panelName" ? (
              <form
                className="composer-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const typed = answers.name?.trim();
                  const next = {
                    ...answers,
                    name: typed || `パネル${panels.length + 1}`,
                    panelId: answers.panelId ?? newPanelId(),
                  };
                  setAnswers(next);
                  goTo(nextStep("panelName", next));
                }}
              >
                <p className="now-ask">パネルの名称は？</p>
                <label>
                  名称
                  <input
                    type="text"
                    value={answers.name ?? ""}
                    placeholder="入力してください"
                    onChange={(event) =>
                      setAnswers((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <button type="submit" className="next">
                  この名称で進む
                </button>
              </form>
            ) : null}

            {step === "size" ? (
              <form
                className={`composer-form${answers.product === "パネル" ? " panel-size" : ""}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  const next =
                    answers.product === "パネル" && !answers.sides
                      ? { ...answers, sides: "片面" as const }
                      : answers;
                  setAnswers(next);
                  goTo(nextStep("size", next));
                }}
              >
                <div className="dims">
                  <label>
                    {answers.product === "パネル" ? "横（幅）" : "巾 W"}
                    <input
                      type="number"
                      min={1}
                      value={answers.width}
                      onChange={(event) =>
                        setAnswers((prev) => ({
                          ...prev,
                          width: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  {answers.product === "パネル" ? (
                    <label>
                      縦（高さ）
                      <input
                        type="number"
                        min={1}
                        value={answers.height}
                        onChange={(event) =>
                          setAnswers((prev) => ({
                            ...prev,
                            height: Number(event.target.value),
                          }))
                        }
                      />
                    </label>
                  ) : (
                    <label>
                      奥行 D
                      <input
                        type="number"
                        min={1}
                        value={answers.depth}
                        onChange={(event) =>
                          setAnswers((prev) => ({
                            ...prev,
                            depth: Number(event.target.value),
                          }))
                        }
                      />
                    </label>
                  )}
                  {answers.product === "パネル" ? null : (
                    <label>
                      高さ H
                      <input
                        type="number"
                        min={1}
                        value={answers.height}
                        onChange={(event) =>
                          setAnswers((prev) => ({
                            ...prev,
                            height: Number(event.target.value),
                          }))
                        }
                      />
                    </label>
                  )}
                </div>
                {answers.product === "パネル" ? (
                  <div className="choice-row side-toggle">
                    {(["片面", "両面"] as PanelSides[]).map((value, index) => (
                      <span key={value} className="side-pair">
                        {index > 0 ? (
                          <span className="side-dot" aria-hidden="true">
                            ・
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className={`choice${answers.sides === value ? " is-on" : ""}`}
                          aria-pressed={answers.sides === value}
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, sides: value }))
                          }
                        >
                          <span className="choice-label">{value}</span>
                          {answers.sides === value ? (
                            <span className="choice-hint">選択中</span>
                          ) : null}
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <button type="submit" className="next">
                  この寸法で進む
                </button>
              </form>
            ) : null}

            {step === "railFit" ? (
              <>
                <p className="now-ask">横桟の長さは、枠材の寸面通りですか。余裕を設けますか。</p>
                <ChoiceRow
                  choices={[
                    {
                      value: "寸面通り",
                      label: "枠材寸面通りで計算",
                      ready: true,
                    },
                    {
                      value: "余裕",
                      label: "余裕を設ける",
                      hint: "ミリを次で入れる",
                      ready: true,
                    },
                  ]}
                  onPick={(value: RailFit) => {
                    const next = { ...answers, railFit: value };
                    if (value === "寸面通り") delete next.railAllow;
                    setAnswers(next);
                    goTo(nextStep("railFit", next));
                  }}
                />
              </>
            ) : null}

            {step === "railAllow" ? (
              <form
                className="composer-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const n = Math.max(0, Number(answers.railAllow ?? 1));
                  const next = { ...answers, railAllow: n };
                  setAnswers(next);
                  goTo(nextStep("railAllow", next));
                }}
              >
                <p className="now-ask">横桟の余裕は、何ミリですか。</p>
                <label>
                  余裕
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={answers.railAllow ?? 1}
                    onChange={(event) =>
                      setAnswers((prev) => ({
                        ...prev,
                        railAllow: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                <button type="submit" className="next">
                  この余裕で進む
                </button>
              </form>
            ) : null}

            {step === "faceStock" ? (
              <>
                <p className="now-ask">
                  横幅が 3×6 を超えるので、面材は 3×6 で作りますか。4×8 も含めますか。
                </p>
                <ChoiceRow
                  choices={[
                    {
                      value: "3×6",
                      label: "3×6で作る",
                      hint: "縦の継ぎと繋ぎ材",
                      ready: true,
                    },
                    {
                      value: "4×8込み",
                      label: "4×8も含める",
                      ready: true,
                    },
                  ]}
                  onPick={(value: FaceStock) => {
                    const next = { ...answers, faceStock: value };
                    setAnswers(next);
                    goTo(nextStep("faceStock", next));
                  }}
                />
              </>
            ) : null}

            {step === "frameKind" ? (
              <>
                <p className="now-ask">枠材は何を使いますか？</p>
                <ChoiceRow
                wide
                choices={FRAME_KINDS.map((value) => ({
                  value,
                  label: value,
                  hint: frameKindHint(value),
                  ready: true,
                }))}
                onPick={(value: FrameKind) => {
                  const next = { ...answers, frameKind: value };
                  if (value !== "小割") delete next.railKind;
                  if (isNamedTimberKind(value) || isSheetKind(value)) {
                    delete next.boneUse;
                    delete next.railKind;
                    delete next.frameWin;
                    delete next.faceMaterial;
                    delete next.sheetUse;
                    delete next.sheetFace;
                    if (isNamedTimberKind(value)) {
                      next.frameMaterial = value;
                      if (next.frameThickness == null) {
                        next.frameThickness = defaultFrameThickness(value);
                      }
                    } else {
                      delete next.frameMaterial;
                      delete next.frameThickness;
                    }
                  } else {
                    delete next.frameMaterial;
                    delete next.frameThickness;
                    delete next.sheetFace;
                    delete next.sheetUse;
                  }
                  setAnswers(next);
                  goTo(nextStep("frameKind", next));
                }}
              />
              </>
            ) : null}

            {step === "boneUse" ? (
              <>
                <p className="now-ask">枠材の向きを選択</p>
                <ChoiceRow
                  choices={(() => {
                    const spec = stickOf(
                      answers.frameKind === "垂木" ? "垂木" : "小割",
                    );
                    return [
                      {
                        value: "成使い" as const,
                        label: "成使い",
                        hint: `成 ${spec.long}mm`,
                        ready: true,
                      },
                      {
                        value: "横使い" as const,
                        label: "横使い",
                        hint: `成 ${spec.short}mm`,
                        ready: true,
                      },
                    ];
                  })()}
                  onPick={(value: BoneUse) => {
                    const next = { ...answers, boneUse: value };
                    if (value === "横使い") delete next.railKind;
                    setAnswers(next);
                    goTo(nextStep("boneUse", next));
                  }}
                />
              </>
            ) : null}

            {step === "railKind" ? (
              <ChoiceRow
                choices={[
                  { value: "全部小割", label: "全部小割", ready: true },
                  {
                    value: "上下垂木",
                    label: "上下桟は垂木",
                    hint: "30×40。成は小割に合わせる",
                    ready: true,
                  },
                ]}
                onPick={(value: RailKind) => {
                  const next = { ...answers, railKind: value };
                  setAnswers(next);
                  goTo(nextStep("railKind", next));
                }}
              />
            ) : null}

            {step === "frameWin" ? (
              <ChoiceRow
                choices={[
                  { value: "横勝ち", label: "横勝ちにする", ready: true },
                  { value: "縦勝ち", label: "縦勝ちのまま", ready: true },
                ]}
                onPick={(value: FrameWin) => {
                  const next = { ...answers, frameWin: value };
                  setAnswers(next);
                  goTo(nextStep("frameWin", next));
                }}
              />
            ) : null}

            {step === "sheetFace" && isSheetKind(answers.frameKind) ? (
              <>
                <p className="now-ask">ラワンですか、シナですか。</p>
                <ChoiceRow
                  choices={SHEET_FACES.map((value) => ({
                    value,
                    label: value,
                    ready: true,
                  }))}
                  onPick={(value: SheetFace) => {
                    const kind = answers.frameKind;
                    if (!isSheetKind(kind)) return;
                    const next = {
                      ...answers,
                      sheetFace: value,
                      frameMaterial: sheetMaterialName(kind, value),
                    };
                    if (next.frameThickness == null) {
                      next.frameThickness = defaultFrameThickness(kind);
                    }
                    setAnswers(next);
                    goTo(nextStep("sheetFace", next));
                  }}
                />
              </>
            ) : null}

            {step === "frameStock" &&
            (isNamedTimberKind(answers.frameKind) ||
              isSheetKind(answers.frameKind)) ? (
              <form
                className="composer-form panel-size"
                onSubmit={(event) => {
                  event.preventDefault();
                  const kind = answers.frameKind;
                  const t =
                    answers.frameThickness ?? defaultFrameThickness(kind);
                  const material = isSheetKind(kind)
                    ? (answers.frameMaterial ??
                      (answers.sheetFace
                        ? sheetMaterialName(kind, answers.sheetFace)
                        : kind))
                    : kind;
                  const next = {
                    ...answers,
                    frameMaterial: material,
                    frameThickness: t,
                  };
                  setAnswers(next);
                  goTo(nextStep("frameStock", next));
                }}
              >
                <p className="now-ask">{questionFor("frameStock", answers)}</p>
                <div className="dims">
                  <label>
                    厚み
                    <input
                      type="number"
                      min={1}
                      step={0.5}
                      value={
                        answers.frameThickness ??
                        defaultFrameThickness(answers.frameKind)
                      }
                      onChange={(event) =>
                        setAnswers((prev) => ({
                          ...prev,
                          frameThickness: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                </div>
                <button type="submit" className="next">
                  この厚みで進む
                </button>
              </form>
            ) : null}

            {step === "sheetUse" ? (
              <>
                <p className="now-ask">厚みの使い方を選択</p>
                <ChoiceRow
                  choices={[
                    {
                      value: "厚み" as const,
                      label: "厚みを使う",
                      hint: "プレスなど",
                      ready: true,
                    },
                    {
                      value: "割き" as const,
                      label: "割いた幅を厚みにする",
                      hint: "厚パネル",
                      ready: true,
                    },
                  ]}
                  onPick={(value: SheetUse) => {
                    const next = { ...answers, sheetUse: value };
                    setAnswers(next);
                    goTo(nextStep("sheetUse", next));
                  }}
                />
              </>
            ) : null}

            {step === "materials" ? (
              <ChoiceRow
                choices={FACE_MATERIAL_OPTS.map((name) => ({
                  value: name,
                  label: `${name} 3mm`,
                  ready: true,
                }))}
                onPick={(value: string) => {
                  const next = { ...answers, faceMaterial: value };
                  setAnswers(next);
                  goTo(nextStep("materials", next));
                }}
              />
            ) : null}

            {step === "railPitch" ? (
              <form
                className="composer-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const n = Math.max(
                    1,
                    Number(answers.railPitch ?? DEFAULT_RAIL_PITCH_MM),
                  );
                  const next = { ...answers, railPitch: n };
                  setAnswers(next);
                  goTo(nextStep("railPitch", next));
                }}
              >
                <p className="now-ask">横桟の間隔は、何ミリですか。</p>
                <label>
                  間隔
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={answers.railPitch ?? DEFAULT_RAIL_PITCH_MM}
                    onChange={(event) =>
                      setAnswers((prev) => ({
                        ...prev,
                        railPitch: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                <button type="submit" className="next">
                  この間隔で進む
                </button>
              </form>
            ) : null}

            {step === "stileExtra" ? (
              <>
                <p className="now-ask">中に縦残を追加しますか？</p>
                <ChoiceRow
                  choices={
                    asksFaceStock(answers)
                      ? [
                          {
                            value: "入れる",
                            label: "追加する",
                            hint: "横幅が 3×6 を超えるので必要",
                            ready: true,
                          },
                        ]
                      : [
                          {
                            value: "入れる",
                            label: "追加する",
                            hint: "金物下地など",
                            ready: true,
                          },
                          {
                            value: "入れない",
                            label: "入れない",
                            ready: true,
                          },
                        ]
                  }
                  onPick={(value: StileExtra) => {
                    const next = { ...answers, stileExtra: value };
                    if (value === "入れない") delete next.stileExtraN;
                    setAnswers(next);
                    goTo(nextStep("stileExtra", next));
                  }}
                />
              </>
            ) : null}

            {step === "stileExtraN" ? (
              <form
                className="composer-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const n = Math.max(1, Math.floor(Number(answers.stileExtraN ?? 1)));
                  const next = {
                    ...answers,
                    stileExtra: "入れる" as StileExtra,
                    stileExtraN: n,
                  };
                  setAnswers(next);
                  goTo(nextStep("stileExtraN", next));
                }}
              >
                <p className="now-ask">縦残は何列入れますか？</p>
                <label>
                  列数
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={answers.stileExtraN ?? 1}
                    onChange={(event) =>
                      setAnswers((prev) => ({
                        ...prev,
                        stileExtraN: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                <button type="submit" className="next">
                  この列数で進む
                </button>
              </form>
            ) : null}

            {step === "qty" ? (
              <form
                className="composer-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const n = Math.max(1, Math.floor(answers.qty ?? 1));
                  const next = { ...answers, qty: n };
                  setAnswers(next);
                  goTo(nextStep("qty", next));
                }}
              >
                <p className="now-ask">製作枚数は、何枚ですか。</p>
                <label>
                  枚数
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={answers.qty ?? 1}
                    onChange={(event) =>
                      setAnswers((prev) => ({
                        ...prev,
                        qty: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                <button type="submit" className="next">
                  この枚数で進む
                </button>
              </form>
            ) : null}

            {step === "morePanels" ? (
              <>
                <p className="now-ask">次のパネルを入力しますか？</p>
                <ChoiceRow
                  choices={[
                    {
                      value: "入力する",
                      label: "入力する",
                      hint: "名称から続けます",
                      ready: true,
                    },
                    {
                      value: "入力しない",
                      label: "入力しない",
                      hint: "結果を出します",
                      ready: true,
                    },
                  ]}
                  onPick={(value: string) => {
                    const entry = toPanelEntry(answers);
                    if (value === "入力する") {
                      setAddingAnother(true);
                      setPanels((prev) => upsertPanel(prev, entry));
                      setAnswers(freshPanelAnswers());
                      goTo("panelName");
                      return;
                    }
                    setAddingAnother(false);
                    setPanels((prev) => upsertPanel(prev, entry));
                    goTo("done");
                  }}
                />
              </>
            ) : null}

            {step === "finish" ? (
              <form
                className="composer-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  goTo(nextStep("finish", answers));
                }}
              >
                <label>
                  長手（前後）
                  <select
                    value={answers.finishLong}
                    onChange={(event) =>
                      setAnswers((prev) => ({
                        ...prev,
                        finishLong: event.target.value as MaterialOpt,
                      }))
                    }
                  >
                    {MATERIAL_OPTS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  短手（左右）
                  <select
                    value={answers.finishShort}
                    onChange={(event) =>
                      setAnswers((prev) => ({
                        ...prev,
                        finishShort: event.target.value as MaterialOpt,
                      }))
                    }
                  >
                    {MATERIAL_OPTS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="next">
                  この仕上げで進む
                </button>
              </form>
            ) : null}

            {step === "thickness" ? (
              <form
                className="composer-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  goTo(nextStep("thickness", answers));
                }}
              >
                <label>
                  実厚 (mm)
                  <input
                    type="number"
                    min={1}
                    step={0.5}
                    value={answers.lumberT}
                    onChange={(event) =>
                      setAnswers((prev) => ({
                        ...prev,
                        lumberT: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                <button type="submit" className="next">
                  仕様を確定する
                </button>
              </form>
            ) : null}
            </div>
          )}

          {backTo ||
          (step === "panelName" && (addingAnother || panels.length > 0)) ? (
            <button
              type="button"
              className="back"
              onClick={() => goBack()}
            >
              ひとつ前の設定に戻る
            </button>
          ) : null}
        </div>
        </div>
      </section>
      </div>

      <section className="sheets" aria-label="木取図" aria-hidden={opening}>
        {step === "done" ? (
          <MemberList answers={answers} panels={panels} ledger={ledger} />
        ) : null}
      </section>
    </main>
  );
}
