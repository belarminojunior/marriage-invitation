"use client";

import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import { addGift, releaseGift, removeGift } from "@/app/actions/host";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { HostHeader } from "./HostChrome";
import type { HostGiftRow } from "./types";
import styles from "./host.module.css";

type Change = { kind: "release" | "remove"; id: string } | { kind: "add"; title: string };

export function HostGifts({ gifts, sheetUrl }: { gifts: HostGiftRow[]; sheetUrl: string | null }) {
  const [items, apply] = useOptimistic(gifts, (current, change: Change) => {
    if (change.kind === "add") return [...current, { id: `pending-${current.length}`, title: change.title, reservedBy: "", phone: "" }];
    if (change.kind === "remove") return current.filter((g) => g.id !== change.id);
    return current.map((g) => (g.id === change.id ? { ...g, reservedBy: "", phone: "" } : g));
  });
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();
  const taken = items.filter((g) => g.reservedBy).length;

  const onAdd = (event: FormEvent) => {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    startTransition(async () => {
      apply({ kind: "add", title });
      await addGift(title);
    });
  };

  const run = (change: Change, task: () => Promise<void>) =>
    startTransition(async () => {
      apply(change);
      await task();
    });

  return (
    <>
      <HostHeader
        title="Presentes"
        sheetUrl={sheetUrl}
        stats={[
          { value: items.length, label: "Presentes" },
          { value: taken, label: "Reservados", highlight: true },
          { value: items.length - taken, label: "Livres" },
        ]}
      />

      <form className={styles.addForm} onSubmit={onAdd}>
        <label className="visually-hidden" htmlFor="new-gift">
          Novo presente
        </label>
        <input
          id="new-gift"
          className={styles.input}
          type="text"
          placeholder="Adicionar presente…"
          maxLength={120}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className={styles.squareButton} aria-label="Adicionar presente">
          <PlusIcon size={20} />
        </button>
      </form>

      <ul className={styles.list} style={{ paddingTop: 8 }}>
        {items.length === 0 && <li className={styles.empty}>Ainda não há presentes na lista.</li>}
        {items.map((g) => (
          <li key={g.id} className={styles.giftRow}>
            <span className={g.reservedBy ? styles.dotTaken : styles.dotFree} />
            <div className={styles.cardText} style={{ gap: 3 }}>
              <span className={styles.cardTitle}>{g.title}</span>
              <span className={`${styles.cardSub} ${g.reservedBy ? styles.subTaken : ""}`}>
                {g.reservedBy ? `Reservado por ${g.reservedBy}${g.phone ? ` · ${g.phone}` : ""}` : "Livre — ainda ninguém"}
              </span>
            </div>
            {g.reservedBy ? (
              <button type="button" className={styles.outlineButton} onClick={() => run({ kind: "release", id: g.id }, () => releaseGift(g.id))}>
                Libertar
              </button>
            ) : (
              <button
                type="button"
                className={`${styles.iconButton} ${styles.iconButtonBare}`}
                aria-label={`Remover ${g.title}`}
                onClick={() => {
                  if (confirm(`Remover "${g.title}" da lista?`)) run({ kind: "remove", id: g.id }, () => removeGift(g.id));
                }}
              >
                <TrashIcon size={18} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
