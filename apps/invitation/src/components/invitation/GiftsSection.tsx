"use client";

import { useState, useTransition, type FormEvent } from "react";
import { reserveGift } from "@/app/actions/guest";
import { wedding } from "@wedding/core/wedding";
import { CheckIcon, ChevronLeft, LockIcon } from "@wedding/core/icons";
import type { GuestGift, GuestInvite } from "./types";
import styles from "./invitation.module.css";

interface GiftsSectionProps {
  invite: GuestInvite | null;
  gifts: GuestGift[];
}

function subtitle(gift: GuestGift) {
  if (gift.state === "mine") return "Reservado em seu nome";
  if (gift.state === "taken") return `${gift.category ? `${gift.category} · ` : ""}já escolhido por um convidado`;
  return gift.category;
}

/** 7 · Gift registry: each gift can be reserved by exactly one invite. */
export function GiftsSection({ invite, gifts: initialGifts }: GiftsSectionProps) {
  const [gifts, setGifts] = useState(initialGifts);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = gifts.find((g) => g.id === selectedId) ?? null;
  const taken = gifts.filter((g) => g.state !== "free").length;
  const pct = gifts.length ? Math.round((taken / gifts.length) * 100) : 0;

  const setState = (id: string, state: GuestGift["state"]) =>
    setGifts((current) => current.map((g) => (g.id === id ? { ...g, state } : g)));

  const confirm = (event: FormEvent) => {
    event.preventDefault();
    if (!invite || !selected || pending) return;
    const giftId = selected.id;
    setError(null);
    startTransition(async () => {
      const result = await reserveGift(invite.id, giftId);
      if (result.ok) {
        setState(giftId, "mine");
      } else {
        setState(giftId, "taken");
        setError(result.error);
      }
      setSelectedId(null);
    });
  };

  return (
    <section id="gifts" className={styles.section}>
      <div className={`${styles.column} ${styles.gifts}`}>
        <a href="#rsvp" className={styles.backLink}>
          <ChevronLeft size={16} />
          Voltar ao convite
        </a>

        <div className={styles.giftsHeader}>
          <h2 className={styles.programTitle}>Lista de presentes</h2>
          <p className={styles.giftsIntro}>
            Escolha um presente e ele fica reservado em seu nome — mais ninguém o pode escolher.
          </p>
          <p className={styles.giftsMoney}>
            Prefere oferecer em dinheiro? {wedding.gifts.mobileMoneyLabel} <strong>{wedding.gifts.mobileMoneyNumber}</strong>
          </p>
        </div>

        <div className={styles.giftsProgress}>
          <div className={styles.giftsProgressText}>
            <span>
              {taken} de {gifts.length} reservados
            </span>
            <span>{gifts.length - taken} disponíveis</span>
          </div>
          <div className={styles.bar}>
            <div className={styles.barFill} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {!invite && (
          <p className={styles.noInvite}>Para reservar um presente, abra o link pessoal que recebeu dos noivos.</p>
        )}
        {error && <p className={styles.error} role="alert">{error}</p>}

        <ul className={styles.giftList}>
          {gifts.map((gift) => (
            <li
              key={gift.id}
              className={`${styles.giftItem} ${gift.state === "taken" ? styles.giftItemTaken : ""} ${gift.state === "mine" ? styles.giftItemMine : ""}`}
            >
              <div className={styles.giftText}>
                <span className={styles.giftTitle}>{gift.title}</span>
                {subtitle(gift) && <span className={styles.giftSub}>{subtitle(gift)}</span>}
              </div>
              {gift.state === "free" && invite && (
                <button type="button" className={styles.giftAction} onClick={() => setSelectedId(gift.id)}>
                  Vou oferecer
                </button>
              )}
              {gift.state === "taken" && (
                <span className={styles.giftState}>
                  <LockIcon size={14} />
                  Reservado
                </span>
              )}
              {gift.state === "mine" && (
                <span className={styles.giftState}>
                  <CheckIcon size={14} />
                  Seu
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {selected && invite && (
        <div className={styles.backdrop} onClick={(e) => e.target === e.currentTarget && setSelectedId(null)}>
          <form className={styles.sheet} onSubmit={confirm} role="dialog" aria-modal="true" aria-labelledby="gift-sheet-title">
            <div className={styles.sheetHandle} />
            <p className={styles.eyebrow} style={{ letterSpacing: 2 }}>Está a reservar</p>
            <p id="gift-sheet-title" className={styles.sheetTitle}>{selected.title}</p>
            <p className={styles.sheetText}>
              A reservar como <strong>{invite.label}</strong>
            </p>
            <p className={styles.sheetWarning}>
              <LockIcon size={16} />
              Depois de confirmar, este presente fica bloqueado para os outros convidados. Para mudar, fale com os noivos.
            </p>
            <div className={styles.twoButtons}>
              <button type="button" className={styles.pillOutline} onClick={() => setSelectedId(null)}>
                Cancelar
              </button>
              <button type="submit" className={styles.pillDark} aria-disabled={pending}>
                {pending ? "A reservar…" : "Confirmar presente"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
