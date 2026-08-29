"use client";

import type { ReactNode } from "react";
import type { ProductKind } from "@/lib/qa";

function IsoSvg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 96 72" className="iso-svg" aria-hidden>
      {children}
    </svg>
  );
}

function PanelIcon() {
  return (
    <IsoSvg>
      <path d="M20 30 L50 16 L78 30 L48 44 Z" fill="#d2b48c" />
      <path d="M20 30 L20 36 L48 50 L48 44 Z" fill="#8d6a3e" />
      <path d="M48 44 L48 50 L78 36 L78 30 Z" fill="#b08958" />
    </IsoSvg>
  );
}

function OkidaiIcon() {
  return (
    <IsoSvg>
      <path d="M18 40 L48 26 L78 40 L48 54 Z" fill="#c4a574" />
      <path d="M18 40 L18 48 L48 62 L48 54 Z" fill="#8d6a3e" />
      <path d="M48 54 L48 62 L78 48 L78 40 Z" fill="#a67c4e" />
      <path d="M28 46 L28 58 L34 61 L34 49 Z" fill="#6e4f2e" />
      <path d="M62 46 L62 58 L68 55 L68 43 Z" fill="#5c4126" />
    </IsoSvg>
  );
}

function HakomonoIcon() {
  return (
    <IsoSvg>
      <path d="M24 28 L48 16 L72 28 L48 40 Z" fill="#d2b48c" />
      <path d="M24 28 L24 52 L48 64 L48 40 Z" fill="#8b6914" opacity="0.85" />
      <path d="M48 40 L48 64 L72 52 L72 28 Z" fill="#c4a574" />
      <path d="M30 36 L48 27 L66 36 L48 45 Z" fill="#efe6d4" />
      <path d="M36 42 L36 54 L48 60 L48 48 Z" fill="#deb887" />
    </IsoSvg>
  );
}

function DoorIcon() {
  return (
    <IsoSvg>
      <path d="M22 22 L48 10 L74 22 L48 34 Z" fill="#c4a574" />
      <path d="M22 22 L22 56 L48 68 L48 34 Z" fill="#8d6a3e" />
      <path d="M48 34 L48 68 L74 56 L74 22 Z" fill="#b08958" />
      <path d="M28 30 L44 38 L44 58 L28 50 Z" fill="#efe6d4" stroke="#6b3a1f" strokeWidth="0.8" />
      <path d="M52 38 L68 30 L68 50 L52 58 Z" fill="#efe6d4" stroke="#6b3a1f" strokeWidth="0.8" />
      <circle cx="41" cy="46" r="1.4" fill="#6b3a1f" />
      <circle cx="55" cy="46" r="1.4" fill="#6b3a1f" />
    </IsoSvg>
  );
}

function CounterIcon() {
  return (
    <IsoSvg>
      <path d="M14 34 L50 18 L82 34 L46 50 Z" fill="#d2b48c" />
      <path d="M14 34 L14 44 L46 60 L46 50 Z" fill="#7a5230" />
      <path d="M46 50 L46 60 L82 44 L82 34 Z" fill="#a67c4e" />
      <path d="M14 34 L46 50 L46 56 L14 40 Z" fill="#5c3a21" />
    </IsoSvg>
  );
}

const ICONS: Record<ProductKind, () => ReactNode> = {
  パネル: PanelIcon,
  箱: OkidaiIcon,
  箱物: HakomonoIcon,
  扉付き: DoorIcon,
  カウンター: CounterIcon,
};

const PRODUCTS: { value: ProductKind; ready: boolean }[] = [
  { value: "パネル", ready: true },
  { value: "箱", ready: true },
  { value: "箱物", ready: false },
  { value: "扉付き", ready: false },
  { value: "カウンター", ready: false },
];

export function ProductIcon({ kind }: { kind: ProductKind }) {
  const Icon = ICONS[kind];
  return <Icon />;
}

export function ProductPick({
  onPick,
}: {
  onPick: (value: ProductKind) => void;
}) {
  return (
    <div className="icon-pick">
      {PRODUCTS.map((item) => {
        const Icon = ICONS[item.value];
        return (
          <button
            key={item.value}
            type="button"
            className="icon-btn"
            disabled={!item.ready}
            onClick={() => onPick(item.value)}
          >
            <span className="icon-stage">
              <span className="icon-spin">
                <Icon />
              </span>
            </span>
            <span className="icon-name">{item.value}</span>
            {!item.ready ? <span className="choice-soon">準備中</span> : null}
          </button>
        );
      })}
    </div>
  );
}
