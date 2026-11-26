"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { logOut } from "@/app/actions/admin";
import { SyncIcon } from "@wedding/core/icons";
import styles from "./host.module.css";

const TABS = [
  { href: "/guests", label: "Convidados" },
  { href: "/tables", label: "Mesas" },
  { href: "/gifts", label: "Presentes" },
  { href: "/sheet", label: "Folha" },
];

export function HostTabBar() {
  const pathname = usePathname();
  return (
    <nav className={styles.tabBar} aria-label="Painel dos noivos">
      <div className={styles.tabBarInner}>
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tab} ${pathname.startsWith(tab.href) ? styles.tabActive : ""}`}
            aria-current={pathname.startsWith(tab.href) ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
        <form action={logOut}>
          <button type="submit" className={styles.logout} style={{ height: "100%" }}>
            Sair
          </button>
        </form>
      </div>
    </nav>
  );
}

export interface Stat {
  value: number;
  label: string;
  highlight?: boolean;
}

interface HostHeaderProps {
  title: string;
  stats: Stat[];
  sheetUrl: string | null;
  action?: ReactNode;
}

export function HostHeader({ title, stats, sheetUrl, action }: HostHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.headerTop}>
          <div className={styles.headerTitles}>
            <span className={styles.kicker}>Painel dos noivos</span>
            <h1 className={styles.title}>{title}</h1>
          </div>
          {action ??
            (sheetUrl ? (
              <a className={styles.syncBadge} href={sheetUrl} target="_blank" rel="noopener noreferrer">
                <SyncIcon size={12} />
                Sincronizado com Google Sheets
              </a>
            ) : (
              <span className={`${styles.syncBadge} ${styles.syncBadgeDemo}`} title="Configure o Google Sheets no ficheiro .env">
                Modo demo · sem Sheets
              </span>
            ))}
        </div>
        <div className={styles.stats} style={{ "--stat-count": stats.length } as CSSProperties}>
          {stats.map((s) => (
            <div key={s.label} className={styles.stat}>
              <span className={`${styles.statValue} ${s.highlight ? styles.statHighlight : ""}`}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

/** Small status toast that hides itself after a moment. */
export function useToast() {
  const [text, setText] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((message: string) => {
    clearTimeout(timer.current);
    setText(message);
    timer.current = setTimeout(() => setText(""), 2200);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const toast = text ? (
    <div role="status" className={styles.toast}>
      {text}
    </div>
  ) : null;

  return { show, toast };
}
