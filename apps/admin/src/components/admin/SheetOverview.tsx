"use client";

import { useState } from "react";
import type { SheetOverviewData } from "./types";
import styles from "./sheet.module.css";

type Tab = "people" | "gifts" | "tables";

const TABS: { key: Tab; label: string }[] = [
  { key: "people", label: "Convidados" },
  { key: "gifts", label: "Presentes" },
  { key: "tables", label: "Mesas" },
];

const ATTENDANCE = {
  yes: { label: "Vem", className: styles.chipYes },
  no: { label: "Não vem", className: styles.chipNo },
  "": { label: "Por responder", className: styles.chipPending },
} as const;

/** Read-only spreadsheet view of the same data as the Google Sheet, with tabs at the bottom like the sheet. */
export function SheetOverview({
  data,
  sheetUrl,
  coupleNames,
}: {
  data: SheetOverviewData;
  sheetUrl: string | null;
  coupleNames: string;
}) {
  const [tab, setTab] = useState<Tab>("people");
  const going = data.people.filter((p) => p.attendance === "yes").length;
  const notGoing = data.people.filter((p) => p.attendance === "no").length;
  const pending = data.people.length - going - notGoing;

  return (
    <div className={styles.wrap}>
      <section className={styles.sheet} aria-label="Folha de cálculo">
        <div className={styles.bar}>
          <span className={styles.fileName}>{coupleNames} — Casamento</span>
          {sheetUrl ? (
            <a className={styles.sync} href={sheetUrl} target="_blank" rel="noopener noreferrer">
              <span className={styles.syncDot} />
              Sincronizado com o convite · abrir no Google Sheets
            </a>
          ) : (
            <span className={styles.sync}>Modo demo · Google Sheets não configurado</span>
          )}
        </div>

        <div className={styles.body} role="tabpanel" id={`sheet-${tab}`} aria-labelledby={`sheet-tab-${tab}`}>
          {tab === "people" && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.rowNumber} aria-label="Linha" />
                  <th>Pessoa</th>
                  <th>Convite</th>
                  <th>Link pessoal</th>
                  <th>Mesa</th>
                  <th>Enviado</th>
                  <th>Aberto</th>
                  <th>Resposta</th>
                  <th>Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {data.people.length === 0 && (
                  <tr>
                    <td colSpan={9} className={styles.empty}>Ainda não há convidados.</td>
                  </tr>
                )}
                {data.people.map((p, i) => (
                  <tr key={`${p.link}-${i}`}>
                    <td className={styles.rowNumber}>{i + 2}</td>
                    <td className={styles.strong}>{p.name}</td>
                    <td className={styles.muted}>{p.invite}</td>
                    <td className={styles.link}>{p.link}</td>
                    <td>{p.table}</td>
                    <td className={styles.muted}>{p.sent}</td>
                    <td className={styles.muted}>{p.opened}</td>
                    <td>
                      <span className={`${styles.chip} ${ATTENDANCE[p.attendance].className}`}>
                        {ATTENDANCE[p.attendance].label}
                      </span>
                    </td>
                    <td className={`${styles.muted} ${styles.wrapText}`}>{p.message}</td>
                  </tr>
                ))}
                <tr className={styles.totalRow}>
                  <td />
                  <td colSpan={8}>
                    Total · {going} vêm · {notGoing} não vêm · {pending} por responder
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {tab === "gifts" && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.rowNumber} aria-label="Linha" />
                  <th>Presente</th>
                  <th>Estado</th>
                  <th>Reservado por</th>
                  <th>Convite</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {data.gifts.length === 0 && (
                  <tr>
                    <td colSpan={6} className={styles.empty}>Ainda não há presentes.</td>
                  </tr>
                )}
                {data.gifts.map((g, i) => (
                  <tr key={`${g.title}-${i}`}>
                    <td className={styles.rowNumber}>{i + 2}</td>
                    <td>{g.title}</td>
                    <td>
                      <span className={`${styles.chip} ${g.reserved ? styles.chipReserved : styles.chipPending}`}>
                        {g.reserved ? "Reservado" : "Livre"}
                      </span>
                    </td>
                    <td>{g.reservedBy}</td>
                    <td className={styles.muted}>{g.link}</td>
                    <td className={styles.muted}>{g.reservedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "tables" && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.rowNumber} aria-label="Linha" />
                  <th className={styles.num}>N.º</th>
                  <th>Nome da mesa</th>
                  <th className={styles.num}>Lugares</th>
                  <th className={styles.num}>Ocupados</th>
                  <th>Quem está sentado</th>
                </tr>
              </thead>
              <tbody>
                {data.tables.map((t, i) => (
                  <tr key={t.number}>
                    <td className={styles.rowNumber}>{i + 2}</td>
                    <td className={styles.num}>{t.number}</td>
                    <td className={styles.bold}>{t.name}</td>
                    <td className={styles.num}>{t.capacity}</td>
                    <td className={`${styles.num} ${t.used > t.capacity ? styles.over : ""}`}>{t.used}</td>
                    <td className={`${styles.muted} ${styles.wrapText}`}>{t.guests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Separadores da folha">
          {TABS.map((t) => (
            <button
              key={t.key}
              id={`sheet-tab-${t.key}`}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              aria-controls={`sheet-${t.key}`}
              className={styles.tab}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
