"use client";

import { useState, useTransition } from "react";
import { deleteInvite, saveInvite } from "@/app/actions/admin";
import { CloseIcon, PlusIcon } from "@wedding/core/icons";
import type { Attendance } from "@wedding/core/data/types";
import type { HostInviteRow } from "./types";
import styles from "./host.module.css";

const ANSWERS: { value: Attendance; label: string }[] = [
  { value: "yes", label: "Vem" },
  { value: "no", label: "Não vem" },
  { value: "", label: "Sem resposta" },
];

interface Person {
  name: string;
  attendance: Attendance;
}

/** Bottom sheet to edit one invite: its name, people, WhatsApp number and each person's answer. */
export function InviteEditor({
  invite,
  onClose,
  onDone,
}: {
  invite: HostInviteRow;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [label, setLabel] = useState(invite.label);
  const [phone, setPhone] = useState(invite.phone);
  const [people, setPeople] = useState<Person[]>(
    invite.people.map((name, i) => ({ name, attendance: invite.attendance[i] ?? "" })),
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const setPerson = (index: number, patch: Partial<Person>) =>
    setPeople((list) => list.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  const onSave = () =>
    startTransition(async () => {
      const kept = people.filter((p) => p.name.trim());
      try {
        const result = await saveInvite(invite.id, {
          label,
          phone,
          names: kept.map((p) => p.name),
          attendance: kept.map((p) => p.attendance),
        });
        if (result.error) return setError(result.error);
        onDone("Convite guardado");
      } catch {
        setError("Não foi possível guardar. Tente outra vez.");
      }
    });

  const onDelete = () => {
    if (!confirm(`Apagar o convite "${invite.label}"? O link pessoal deixa de funcionar.`)) return;
    startTransition(async () => {
      try {
        await deleteInvite(invite.id);
        onDone("Convite apagado");
      } catch {
        setError("Não foi possível apagar. Tente outra vez.");
      }
    });
  };

  return (
    <div className={styles.backdrop} onClick={(e) => e.target === e.currentTarget && !pending && onClose()}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={`Editar ${invite.label}`}>
        <div className={styles.sheetHandle} />

        <label className={styles.sheetLabel}>
          Nome do convite
          <input className={styles.sheetInput} type="text" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} />
        </label>

        <label className={styles.sheetLabel}>
          WhatsApp
          <input
            className={styles.sheetInput}
            style={{ fontFamily: "var(--sans)", fontSize: 16 }}
            type="tel"
            inputMode="tel"
            placeholder="+258 84 000 0000"
            value={phone}
            maxLength={20}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>

        <span className={styles.sheetHeading}>Pessoas e respostas</span>
        <ul className={styles.peopleList}>
          {people.map((p, i) => (
            <li key={i} className={styles.personRow}>
              <div className={styles.cardRow}>
                <label className="visually-hidden" htmlFor={`person-${i}`}>
                  Nome da pessoa {i + 1}
                </label>
                <input
                  id={`person-${i}`}
                  className={styles.input}
                  type="text"
                  value={p.name}
                  maxLength={80}
                  onChange={(e) => setPerson(i, { name: e.target.value })}
                />
                {people.length > 1 && (
                  <button
                    type="button"
                    className={`${styles.iconButton} ${styles.iconButtonBare}`}
                    aria-label={`Tirar ${p.name || "esta pessoa"} do convite`}
                    onClick={() => setPeople((list) => list.filter((_, j) => j !== i))}
                  >
                    <CloseIcon size={16} />
                  </button>
                )}
              </div>
              <div className={styles.answerGroup} role="group" aria-label={`Resposta de ${p.name || "esta pessoa"}`}>
                {ANSWERS.map((a) => (
                  <button
                    key={a.value || "none"}
                    type="button"
                    className={styles.filter}
                    aria-pressed={p.attendance === a.value}
                    onClick={() => setPerson(i, { attendance: a.value })}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={styles.seatChip}
          style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6 }}
          onClick={() => setPeople((list) => [...list, { name: "", attendance: "" }])}
        >
          <PlusIcon size={14} />
          Adicionar pessoa
        </button>

        {invite.message && (
          <div className={styles.messageBox}>
            <span className={styles.sheetHeading}>Mensagem do convidado</span>
            <p>{invite.message}</p>
          </div>
        )}

        {error && (
          <p className={styles.loginError} role="alert">
            {error}
          </p>
        )}

        <button type="button" className={styles.doneButton} onClick={onSave} disabled={pending}>
          {pending ? "A guardar…" : "Guardar"}
        </button>
        <button type="button" className={styles.dangerLink} onClick={onDelete} disabled={pending}>
          Apagar convite
        </button>
      </div>
    </div>
  );
}
