"use client";

import { useSyncExternalStore } from "react";
import styles from "./invitation.module.css";

function subscribe(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}

const currentSecond = () => Math.floor(Date.now() / 1000);
const noTimeOnServer = () => null;

const pad = (n: number) => String(n).padStart(2, "0");

export function Countdown({ target }: { target: string }) {
  const now = useSyncExternalStore(subscribe, currentSecond, noTimeOnServer);
  const targetSecond = Math.floor(new Date(target).getTime() / 1000);
  const diff = now === null ? null : Math.max(0, targetSecond - now);

  const units =
    diff === null
      ? [["–", "Dias"], ["––", "Horas"], ["––", "Min"], ["––", "Seg"]]
      : [
          [String(Math.floor(diff / 86400)), "Dias"],
          [pad(Math.floor((diff % 86400) / 3600)), "Horas"],
          [pad(Math.floor((diff % 3600) / 60)), "Min"],
          [pad(diff % 60), "Seg"],
        ];

  return (
    <div className={styles.countdownGrid} role="timer" aria-live="off">
      {units.map(([value, label]) => (
        <div key={label} className={styles.countdownUnit}>
          <span className={styles.countdownValue}>{value}</span>
          <span className={styles.countdownLabel}>{label}</span>
        </div>
      ))}
    </div>
  );
}
