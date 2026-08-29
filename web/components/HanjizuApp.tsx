"use client";

import { useEffect, useState } from "react";
import {
  FACE_MATERIAL_OPTS,
  MATERIAL_OPTS,
  STEP_TITLES,
  decidedSteps,
  defaultAnswers,
  nextStep,
  pathFor,
  prevStep,
  questionFor,
  type BoneUse,
  type FaceBuild,
  type FrameWin,
  type JoinKind,
  type MaterialOpt,
  type PanelSides,
  type QaAnswers,
  type RailKind,
  type StepId,
  type TopSection,
} from "@/lib/qa";

import { ProductIcon, ProductPick } from "@/components/ProductPick";
import { MemberList } from "@/components/MemberList";

type Choice<T extends string> = {
  value: T;
  label: string;
  hint?: string;
  ready: boolean;
};

function ChoiceRow<T extends string>({
  choices,
  onPick,
}: {
  choices: Choice<T>[];
  onPick: (value: T) => void;
}) {
  return (
    <div className="choice-row">
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

function answerLine(step: Exclude<StepId, "done">, answers: QaAnswers): string {
  if (step === "product") return answers.product ?? "";
  if (step === "construction") return answers.construction ?? "";
  if (step === "topSection") {
    if (answers.topSection === "平板") return "平板（見附＝実厚）";
    return answers.topSection ?? "";
  }
  if (step === "join") return answers.join ?? "";
  if (step === "size") {
    if (answers.product === "パネル") {
      return `${answers.width} × ${answers.height} mm ${answers.sides ?? ""}`;
    }
    return `${answers.width} × ${answers.depth} × ${answers.height} mm`;
  }
  if (step === "boneUse") return answers.boneUse ?? "";
  if (step === "railKind") return answers.railKind ?? "";
  if (step === "frameWin") return answers.frameWin ?? "縦勝ち";
  if (step === "materials") return `${answers.faceMaterial ?? ""} 3mm`;
  if (step === "finish") {
    return `長手 ${answers.finishLong} ／ 短手 ${answers.finishShort}`;
  }
  return `${answers.lumberT} mm`;
}

export function HanjizuApp() {
  const [hasBg, setHasBg] = useState(true);
  const [answers, setAnswers] = useState<QaAnswers>(defaultAnswers);
  const [step, setStep] = useState<StepId>("product");
  const [entering, setEntering] = useState(true);

  const [opening, setOpening] = useState(true);
  const [openingOut, setOpeningOut] = useState(false);
  const decided = decidedSteps(step, answers);
  const panelFollowUp =
    answers.product === "パネル" && step !== "product" && step !== "done";
  const backTo = prevStep(step, answers);

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
        boneUse: () => {
          delete next.boneUse;
        },
        railKind: () => {
          delete next.railKind;
        },
        frameWin: () => {
          delete next.frameWin;
        },
        materials: () => {
          delete next.faceMaterial;
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
        delete next.boneUse;
        delete next.railKind;
        delete next.frameWin;
        delete next.sides;
        delete next.faceMaterial;
      }
      return next;
    });
    goTo(to);
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
          {decided.length > 0 ? (
            <ul className="log">
              {decided.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    className={id === "product" ? "log-item is-product" : "log-item"}
                    onClick={() => rewind(id)}
                  >
                    {id === "product" && answers.product ? (
                      <span className="log-icon">
                        <ProductIcon kind={answers.product} />
                      </span>
                    ) : null}
                    <span className="log-text">
                      <span className="decided-key">{STEP_TITLES[id]}</span>
                      <span className="decided-val">
                        {answerLine(id, answers)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {step === "done" ? (
            <div className="parts-mobile">
              <MemberList answers={answers} />
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

            {step === "boneUse" ? (
              <>
                <p className="now-ask">骨の向きを選択</p>
                <ChoiceRow
                  choices={[
                    { value: "成使い", label: "成使い", hint: "成 30mm", ready: true },
                    { value: "横使い", label: "横使い", hint: "成 20mm", ready: true },
                  ]}
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

          {backTo ? (
            <button
              type="button"
              className="back"
              onClick={() => rewind(backTo)}
            >
              ひとつ前の設定に戻る
            </button>
          ) : null}
        </div>
        </div>
      </section>
      </div>

      <section className="sheets" aria-label="木取図" aria-hidden={opening}>
        {step === "done" ? <MemberList answers={answers} /> : null}
      </section>
    </main>
  );
}
