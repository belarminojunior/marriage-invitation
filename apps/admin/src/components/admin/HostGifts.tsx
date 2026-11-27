"use client";

import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import { addGift, releaseGift, removeGift, renameGift } from "@/app/actions/admin";
import { saveEvent } from "@/app/actions/event";
import eventStyles from "./event.module.css";
import { PlusIcon, TrashIcon } from "@wedding/core/icons";
import { HostHeader, useToast } from "./HostChrome";
import type { HostGiftRow } from "./types";
import styles from "./host.module.css";

type Change =
  | { kind: "release" | "remove"; id: string }
  | { kind: "add"; title: string }
  | { kind: "rename"; id: string; title: string };

export function HostGifts({
  gifts,
  sheetUrl,
  giftsEnabled,
}: {
  gifts: HostGiftRow[];
  sheetUrl: string | null;
  giftsEnabled: boolean;
}) {
  const [enabled, setEnabled] = useOptimistic(giftsEnabled);
  const [items, apply] = useOptimistic(gifts, (current, change: Change) => {
    if (change.kind === "add") return [...current, { id: `pending-${current.length}`, title: change.title, reservedBy: "", phone: "" }];
    if (change.kind === "remove") return current.filter((g) => g.id !== change.id);
    if (change.kind === "rename") return current.map((g) => (g.id === change.id ? { ...g, title: change.title } : g));
    return current.map((g) => (g.id === change.id ? { ...g, reservedBy: "", phone: "" } : g));
  });
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const [, startTransition] = useTransition();
  const { show, toast } = useToast();
  const taken = items.filter((g) => g.reservedBy).length;

  const onAdd = (event: FormEvent) => {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    startTransition(async () => {
      apply({ kind: "add", title });
      try {
        await addGift(title);
      } catch {
        setDraft(title);
        show("Não foi possível adicionar. Tente outra vez.");
      }
    });
  };

  const run = (change: Change, task: () => Promise<void>) =>
    startTransition(async () => {
      apply(change);
      try {
        await task();
      } catch {
        show("Não foi possível guardar. Tente outra vez.");
      }
    });

  const finishRename = (gift: HostGiftRow) => {
    const title = editing?.title.trim() ?? "";
    setEditing(null);
    if (title && title !== gift.title) run({ kind: "rename", id: gift.id, title }, () => renameGift(gift.id, title));
  };

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

      <div className={eventStyles.section} style={{ margin: "8px 20px 0" }}>
        <label className={eventStyles.switchRow}>
          <input
            type="checkbox"
            role="switch"
            checked={enabled}
            onChange={(e) => {
              const next = e.target.checked;
              startTransition(async () => {
                setEnabled(next);
                try {
                  await saveEvent({ giftsEnabled: next });
                  show(next ? "Lista de presentes visível no convite" : "Lista de presentes escondida do convite");
                } catch {
                  show("Não foi possível guardar. Tente outra vez.");
                }
              });
            }}
          />
          <span>{enabled ? "Visível no convite" : "Escondida do convite"}</span>
        </label>
        <p className={eventStyles.hint}>
          {enabled
            ? "Os convidados veem esta lista e podem reservar um presente."
            : "Os convidados não veem a lista de presentes. Pode preparar a lista e ligá-la quando quiser."}
        </p>
      </div>

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
              {editing?.id === g.id ? (
                <input
                  className={styles.input}
                  style={{ height: 36 }}
                  type="text"
                  aria-label="Nome do presente"
                  value={editing.title}
                  maxLength={120}
                  autoFocus
                  onChange={(e) => setEditing({ id: g.id, title: e.target.value })}
                  onBlur={() => finishRename(g)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") finishRename(g);
                    if (e.key === "Escape") setEditing(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  className={styles.titleButton}
                  disabled={g.id.startsWith("pending-")}
                  onClick={() => setEditing({ id: g.id, title: g.title })}
                  aria-label={`Mudar o nome de ${g.title}`}
                >
                  {g.title}
                </button>
              )}
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
      {toast}
    </>
  );
}
