"use client";

import { useOptimistic, useState, useTransition } from "react";
import { addTable, removeTable, setInviteTable, updateTable } from "@/app/actions/admin";
import { CloseIcon, PlusIcon } from "@wedding/core/icons";
import { HostHeader, useToast } from "./HostChrome";
import type { HostInviteRow, HostTableRow } from "./types";
import styles from "./host.module.css";

type Optimistic =
  | { kind: "seat"; inviteId: string; tableNumber: number | null }
  | { kind: "table"; number: number; patch: Partial<HostTableRow> }
  | { kind: "remove"; number: number };

interface State {
  tables: HostTableRow[];
  invites: HostInviteRow[];
}

export function HostTables({ tables, invites, sheetUrl }: State & { sheetUrl: string | null }) {
  const [state, apply] = useOptimistic<State, Optimistic>({ tables, invites }, (current, change) =>
    change.kind === "seat"
      ? { ...current, invites: current.invites.map((i) => (i.id === change.inviteId ? { ...i, tableNumber: change.tableNumber } : i)) }
      : change.kind === "remove"
        ? {
            tables: current.tables.filter((t) => t.number !== change.number),
            invites: current.invites.map((i) => (i.tableNumber === change.number ? { ...i, tableNumber: null } : i)),
          }
        : { ...current, tables: current.tables.map((t) => (t.number === change.number ? { ...t, ...change.patch } : t)) },
  );
  const [openNumber, setOpenNumber] = useState<number | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [, startTransition] = useTransition();
  const { show, toast } = useToast();

  // Declined invites don't need a seat.
  const seatable = state.invites.filter((i) => i.seats > 0);
  const used = (n: number) => seatable.filter((i) => i.tableNumber === n).reduce((t, i) => t + i.seats, 0);
  const seated = seatable.filter((i) => i.tableNumber).reduce((t, i) => t + i.seats, 0);
  const capacity = state.tables.reduce((t, x) => t + x.capacity, 0);
  const unassigned = seatable.filter((i) => !i.tableNumber);
  const open = state.tables.find((t) => t.number === openNumber) ?? null;

  const openTable = (table: HostTableRow) => {
    setNameDraft(table.name);
    setOpenNumber(table.number);
  };

  const run = (change: Optimistic, task: () => Promise<unknown>) =>
    startTransition(async () => {
      apply(change);
      try {
        await task();
      } catch {
        show("Não foi possível guardar. Tente outra vez.");
      }
    });

  const seat = (inviteId: string, tableNumber: number | null) =>
    run({ kind: "seat", inviteId, tableNumber }, () => setInviteTable(inviteId, tableNumber));

  const patchTable = (number: number, patch: { name?: string; capacity?: number }) =>
    run({ kind: "table", number, patch }, () => updateTable(number, patch));

  const close = () => {
    if (open && nameDraft.trim() && nameDraft.trim() !== open.name) patchTable(open.number, { name: nameDraft });
    setOpenNumber(null);
  };

  const onAddTable = () =>
    startTransition(async () => {
      try {
        const table = await addTable();
        openTable(table);
      } catch {
        show("Não foi possível criar a mesa. Tente outra vez.");
      }
    });

  const onRemoveTable = (table: HostTableRow) => {
    const seatedHere = state.invites.filter((i) => i.tableNumber === table.number).length;
    const warning = seatedHere ? ` ${seatedHere} ${seatedHere === 1 ? "convite fica" : "convites ficam"} sem mesa.` : "";
    if (!confirm(`Apagar a mesa ${table.number} · ${table.name}?${warning}`)) return;
    setOpenNumber(null);
    run({ kind: "remove", number: table.number }, () => removeTable(table.number));
  };

  return (
    <>
      <HostHeader
        title="Mesas"
        sheetUrl={sheetUrl}
        action={
          <button type="button" className={styles.headerButton} onClick={onAddTable} aria-label="Adicionar mesa">
            <PlusIcon size={14} />
            Mesa
          </button>
        }
        stats={[
          { value: state.tables.length, label: "Mesas" },
          { value: seated, label: "Lugares ocupados", highlight: true },
          { value: Math.max(0, capacity - seated), label: "Lugares livres" },
        ]}
      />

      <div className={styles.tablesGrid}>
        {state.tables.map((t) => {
          const u = used(t.number);
          const over = u > t.capacity;
          return (
            <button key={t.number} type="button" className={`${styles.tableCard} ${over ? styles.tableCardOver : ""}`} onClick={() => openTable(t)}>
              <span className={styles.tableNumber}>Mesa {t.number}</span>
              <span className={styles.tableName}>{t.name}</span>
              <span className={styles.meter}>
                <span
                  className={`${styles.meterFill} ${over ? styles.meterOver : ""}`}
                  style={{ display: "block", width: `${Math.min(100, Math.round((u / t.capacity) * 100))}%` }}
                />
              </span>
              <span className={styles.tableSeats}>
                {u} / {t.capacity} lugares
              </span>
            </button>
          );
        })}
      </div>

      {open && (
        <div className={styles.backdrop} onClick={(e) => e.target === e.currentTarget && close()}>
          <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={`Mesa ${open.number}`}>
            <div className={styles.sheetHandle} />
            <label className={styles.sheetLabel}>
              Mesa {open.number} · nome
              <input
                className={styles.sheetInput}
                type="text"
                value={nameDraft}
                maxLength={60}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => nameDraft.trim() && nameDraft.trim() !== open.name && patchTable(open.number, { name: nameDraft })}
              />
            </label>

            <div className={styles.sheetRow}>
              <span className={styles.sheetHeading}>Lugares</span>
              <div className={styles.stepper}>
                <button type="button" aria-label="Menos lugares" onClick={() => patchTable(open.number, { capacity: Math.max(2, open.capacity - 1) })}>
                  −
                </button>
                <span>{open.capacity}</span>
                <button type="button" aria-label="Mais lugares" onClick={() => patchTable(open.number, { capacity: Math.min(20, open.capacity + 1) })}>
                  +
                </button>
              </div>
            </div>

            <span className={styles.sheetHeading}>
              Sentados aqui · {used(open.number)} / {open.capacity}
            </span>
            <ul className={styles.seatedList}>
              {seatable
                .filter((i) => i.tableNumber === open.number)
                .map((i) => (
                  <li key={i.id} className={styles.seatedItem}>
                    <span>
                      {i.label} <small>· {i.seats} {i.seats === 1 ? "pessoa" : "pessoas"}</small>
                    </span>
                    <button type="button" className={`${styles.iconButton} ${styles.iconButtonBare}`} onClick={() => seat(i.id, null)} aria-label={`Tirar ${i.label} da mesa`}>
                      <CloseIcon size={16} />
                    </button>
                  </li>
                ))}
            </ul>

            {unassigned.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span className={styles.sheetHeading} style={{ color: "var(--text-faint)" }}>
                  Sentar um convite sem mesa
                </span>
                <div className={styles.chipsWrap}>
                  {unassigned.map((i) => (
                    <button key={i.id} type="button" className={styles.seatChip} onClick={() => seat(i.id, open.number)}>
                      + {i.label} · {i.seats}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button type="button" className={styles.doneButton} onClick={close}>
              Concluído
            </button>
            <button type="button" className={styles.dangerLink} onClick={() => onRemoveTable(open)}>
              Apagar mesa
            </button>
          </div>
        </div>
      )}
      {toast}
    </>
  );
}
