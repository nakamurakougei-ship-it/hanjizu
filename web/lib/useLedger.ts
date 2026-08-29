"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LEDGER_NAME_KEY,
  LEDGER_STORAGE_KEY,
  parseLedger,
  type LedgerRow,
} from "./ledger";

export type LedgerControls = {
  rows: LedgerRow[];
  fileName: string;
  fromFile: boolean;
  loadFile: (file: File) => void;
  resetSample: () => void;
};

export function useLedger(): LedgerControls {
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("hanjizu_daifukucho.csv");
  const [fromFile, setFromFile] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(LEDGER_STORAGE_KEY);
    const savedName = window.localStorage.getItem(LEDGER_NAME_KEY);
    if (saved) {
      setCsv(saved);
      setFileName(savedName || "事業所の台帳.csv");
      setFromFile(true);
      return;
    }
    fetch("/hanjizu_daifukucho.csv")
      .then((res) => (res.ok ? res.text() : ""))
      .then((text) => {
        setCsv(text);
        setFileName("hanjizu_daifukucho.csv");
        setFromFile(false);
      })
      .catch(() => {
        setCsv("");
      });
  }, []);

  const loadFile = useCallback((file: File) => {
    void file.text().then((text) => {
      window.localStorage.setItem(LEDGER_STORAGE_KEY, text);
      window.localStorage.setItem(LEDGER_NAME_KEY, file.name);
      setCsv(text);
      setFileName(file.name);
      setFromFile(true);
    });
  }, []);

  const resetSample = useCallback(() => {
    window.localStorage.removeItem(LEDGER_STORAGE_KEY);
    window.localStorage.removeItem(LEDGER_NAME_KEY);
    fetch("/hanjizu_daifukucho.csv")
      .then((res) => (res.ok ? res.text() : ""))
      .then((text) => {
        setCsv(text);
        setFileName("hanjizu_daifukucho.csv");
        setFromFile(false);
      });
  }, []);

  const rows: LedgerRow[] = parseLedger(csv);
  return { rows, fileName, fromFile, loadFile, resetSample };
}
