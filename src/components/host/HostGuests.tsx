"use client";

import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import { createInvite, markInviteSent, setInviteTable } from "@/app/actions/host";
import { coupleNames } from "@/config/wedding";
import { CopyIcon, PlusIcon, SendIcon } from "@/components/icons";
import type { InviteStatus } from "@/lib/data/types";
import { HostHeader, useToast } from "./HostChrome";
import type { HostInviteRow, HostTableRow } from "./types";
import styles from "./host.module.css";

const STATUS_LABEL: Record<InviteStatus, string> = {
  new: "Por enviar",
  sent: "Enviado",
  opened: "Aberto",
  accepted: "Aceite",
  declined: "Recusou",
};

type Filter = "all" | "pending" | "accepted" | "declined";

const isPending = (r: HostInviteRow) => r.status === "new" || r.status === "sent" || r.status === "opened";
const FILTERS: { key: Filter; label: string; match: (r: HostInviteRow) => boolean }[] = [
  { key: "all", label: "Todos", match: () => true },
  { key: "pending", label: "Pendentes", match: isPending },
  { key: "accepted", label: "Aceites", match: (r) => r.status === "accepted" },
  { key: "declined", label: "Recusaram", match: (r) => r.status === "declined" },
];

type Change = { id: string; patch: Partial<HostInviteRow> };

function whatsappUrl(row: HostInviteRow) {
  const text = `Olá ${row.label}! Com muita alegria convidamos-vos para o casamento de ${coupleNames}. Este é o vosso convite pessoal: ${row.link}`;
  const phone = row.phone.replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function HostGuests({ invites, tables, sheetUrl }: { invites: HostInviteRow[]; tables: HostTableRow[]; sheetUrl: string | null }) {
  const [rows, applyChange] = useOptimistic(invites, (current, change: Change) =>
    current.map((r) => (r.id === change.id ? { ...r, ...change.patch } : r)),
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();
  const { show, toast } = useToast();

  const accepted = rows.filter((r) => r.status === "accepted");
  const visible = rows.filter(FILTERS.find((f) => f.key === filter)!.match);

  const onAdd = (event: FormEvent) => {
    event.preventDefault();
    const names = draft.split(",").map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) return;
    setDraft("");
    startTransition(async () => {
      const invite = await createInvite(names);
      if (invite) show(`Link pessoal criado para ${names[0]}`);
    });
  };

  const onTable = (row: HostInviteRow, value: string) => {
    const tableNumber = value ? Number(value) : null;
    startTransition(async () => {
      applyChange({ id: row.id, patch: { tableNumber } });
      await setInviteTable(row.id, tableNumber);
    });
  };

  const onCopy = async (row: HostInviteRow) => {
    try {
      await navigator.clipboard.writeText(row.link);
      show("Link copiado");
    } catch {
      show(row.link);
    }
  };

  const onSend = (row: HostInviteRow) => {
    window.open(whatsappUrl(row), "_blank", "noopener,noreferrer");
    show(`A abrir o WhatsApp para ${row.people[0]}…`);
    if (row.status === "new") {
      startTransition(async () => {
        applyChange({ id: row.id, patch: { status: "sent" } });
        await markInviteSent(row.id);
      });
    }
  };

  return (
    <>
      <HostHeader
        title="Convidados"
        sheetUrl={sheetUrl}
        stats={[
          { value: rows.length, label: "Convites" },
          { value: accepted.length, label: "Aceites", highlight: true },
          { value: rows.filter(isPending).length, label: "Pendentes" },
          { value: accepted.reduce((t, r) => t + r.going.length, 0), label: "Pessoas" },
        ]}
      />

      <form className={styles.addForm} onSubmit={onAdd}>
        <label className="visually-hidden" htmlFor="new-invite">
          Nomes das pessoas deste convite, separados por vírgula
        </label>
        <input
          id="new-invite"
          className={styles.input}
          type="text"
          placeholder="Nomes: Ana, Carlos…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className={styles.squareButton} aria-label="Adicionar convite e criar link">
          <PlusIcon size={20} />
        </button>
      </form>

      <div className={styles.filters}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={styles.filter}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label} · {rows.filter(f.match).length}
          </button>
        ))}
      </div>

      <ul className={styles.list}>
        {visible.length === 0 && <li className={styles.empty}>Nenhum convite aqui.</li>}
        {visible.map((row) => (
          <li key={row.id} className={styles.card}>
            <div className={styles.cardRow}>
              <div className={styles.cardText}>
                <span className={styles.cardTitle}>{row.label}</span>
                <span className={styles.cardSub}>
                  {row.status === "accepted"
                    ? `Vêm: ${row.going.join(", ")} (${row.going.length} de ${row.people.length})`
                    : `${row.people.length} ${row.people.length === 1 ? "pessoa" : "pessoas"} no convite`}
                </span>
              </div>
              <span className={`${styles.chip} ${styles[`chip_${row.status}`]}`}>{STATUS_LABEL[row.status]}</span>
            </div>

            <label className={styles.selectLabel}>
              Mesa
              <select
                className={`${styles.select} ${row.tableNumber ? "" : styles.selectUnassigned}`}
                value={row.tableNumber ?? ""}
                onChange={(e) => onTable(row, e.target.value)}
              >
                <option value="">Sem mesa</option>
                {tables.map((t) => (
                  <option key={t.number} value={t.number}>
                    {t.number} · {t.name}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.cardRow} style={{ gap: 8 }}>
              <span className={styles.linkText}>{row.displayLink}</span>
              <button type="button" className={styles.iconButton} onClick={() => onCopy(row)} aria-label={`Copiar link pessoal de ${row.label}`}>
                <CopyIcon size={16} />
              </button>
              <button type="button" className={styles.darkButton} onClick={() => onSend(row)}>
                <SendIcon size={14} />
                {row.status === "new" ? "WhatsApp" : "Reenviar"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {toast}
    </>
  );
}
