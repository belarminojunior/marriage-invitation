"use client";

import { useState, useTransition, type FormEvent } from "react";
import { submitRsvp } from "@/app/actions/guest";
import { wedding } from "@/config/wedding";
import { CheckIcon, ChevronRight, GiftIcon, HeartOutline } from "@/components/icons";
import { joinNames } from "@/lib/data/invite-helpers";
import type { Attendance } from "@/lib/data/types";
import type { GuestInvite } from "./types";
import styles from "./invitation.module.css";

interface RsvpSectionProps {
  invite: GuestInvite | null;
  weddingDayLabel: string;
}

/** 5 · RSVP: one yes/no per person of the invite, plus an optional message. */
export function RsvpSection({ invite, weddingDayLabel }: RsvpSectionProps) {
  return (
    <section id="rsvp" className={`${styles.section} ${styles.glowTopLeft}`}>
      <div className={`${styles.column} ${styles.rsvp}`}>
        <div className={styles.rsvpHeader}>
          <h2 className={styles.scriptTitle}>Contamos consigo?</h2>
          <p className={styles.deadline}>{wedding.rsvpDeadlineLabel}</p>
        </div>
        {invite ? (
          <RsvpForm invite={invite} weddingDayLabel={weddingDayLabel} />
        ) : (
          <p className={styles.noInvite}>
            Para confirmar a sua presença, abra o link pessoal que recebeu dos noivos.
          </p>
        )}
      </div>
    </section>
  );
}

function RsvpForm({ invite, weddingDayLabel }: { invite: GuestInvite; weddingDayLabel: string }) {
  const people = invite.people;
  const alreadyAnswered = people.every((p) => p.attendance !== "");

  const [answers, setAnswers] = useState<Attendance[]>(() => people.map((p) => p.attendance));
  const [message, setMessage] = useState(invite.message);
  const [sent, setSent] = useState(alreadyAnswered);
  const [tableName, setTableName] = useState(invite.tableName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const answered = answers.filter(Boolean).length;
  const complete = answered === people.length;
  const going = people.filter((_, i) => answers[i] === "yes").map((p) => p.name);
  const anyYes = going.length > 0;
  const missing = people.length - answered;

  const setAnswer = (index: number, value: Attendance) =>
    setAnswers((current) => current.map((a, i) => (i === index ? value : a)));

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!complete || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await submitRsvp(invite.id, answers, message);
      if (result.ok) {
        setTableName(result.data.tableName);
        setSent(true);
      } else {
        setError(result.error);
      }
    });
  };

  if (sent) {
    return (
      <div className={styles.thanks} role="status">
        <HeartOutline size={64} color="var(--gold-text)" />
        <p className={styles.thanksTitle}>{anyYes ? "Até breve!" : "Vão fazer-nos falta"}</p>
        <p className={styles.thanksBody}>
          {anyYes
            ? `Presença confirmada para ${joinNames(going)}. Mal podemos esperar por celebrar convosco no dia ${weddingDayLabel}.`
            : "Obrigado por nos avisarem. Vamos pensar em vocês no nosso grande dia."}
        </p>
        {anyYes && tableName && (
          <div className={styles.tableCard}>
            <span className={styles.tableCardLabel}>A vossa mesa</span>
            <span className={styles.tableCardName}>{tableName}</span>
          </div>
        )}
        <a href="#gifts" className={styles.pillDark} style={{ minHeight: 52, padding: "0 26px", fontSize: 12, letterSpacing: 2 }}>
          <GiftIcon size={18} />
          Escolher um presente
        </a>
        <button type="button" className={styles.pillOutline} style={{ minHeight: 44, letterSpacing: 2 }} onClick={() => setSent(false)}>
          Alterar resposta
        </button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.formIntro}>
        <span className={styles.formIntroLabel}>Convite pessoal para {invite.label}</span>
        <span className={styles.formIntroText}>
          {people.length === 1 ? "Confirme a sua presença:" : "Confirme cada pessoa deste convite:"}
        </span>
      </div>

      <ul className={styles.peopleList}>
        {people.map((person, i) => {
          const answer = answers[i];
          return (
            <li key={`${person.name}-${i}`} className={`${styles.personRow} ${answer ? styles.personRowAnswered : ""}`}>
              <span className={`${styles.avatar} ${answer === "yes" ? styles.avatarGoing : ""}`} aria-hidden="true">
                {person.name.charAt(0).toUpperCase()}
              </span>
              <span className={styles.personName}>{person.name}</span>
              <div role="group" aria-label={`Presença de ${person.name}`} className={styles.choice}>
                <button
                  type="button"
                  className={`${styles.choiceButton} ${styles.choiceYes}`}
                  aria-pressed={answer === "yes"}
                  onClick={() => setAnswer(i, "yes")}
                >
                  Vou
                </button>
                <button
                  type="button"
                  className={`${styles.choiceButton} ${styles.choiceNo}`}
                  aria-pressed={answer === "no"}
                  onClick={() => setAnswer(i, "no")}
                >
                  Não vou
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <p className={styles.summary} aria-live="polite">
        {complete
          ? `${going.length} de ${people.length} ${people.length === 1 ? "pessoa confirmada" : "pessoas confirmadas"}.`
          : `Falta responder por ${missing} ${missing === 1 ? "pessoa" : "pessoas"}.`}
      </p>

      <label className={styles.fieldLabel}>
        Mensagem para os noivos
        <textarea
          className={styles.textarea}
          rows={3}
          maxLength={1000}
          placeholder="Opcional — uma mensagem ou restrições alimentares"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <button type="submit" className={styles.submit} aria-disabled={!complete || pending}>
        <CheckIcon size={18} />
        {pending ? "A enviar…" : "Confirmar presença"}
      </button>

      <a href="#gifts" className={styles.linkCard}>
        <GiftIcon size={20} stroke="var(--bronze)" />
        <span className={styles.linkCardText}>Ver a lista de presentes</span>
        <ChevronRight size={16} />
      </a>
    </form>
  );
}
