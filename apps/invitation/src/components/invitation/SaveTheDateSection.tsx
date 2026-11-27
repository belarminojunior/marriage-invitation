import type { EventSettings } from "@wedding/core/event";
import { CalendarPlusIcon, PinIcon } from "@wedding/core/icons";
import { WEEKDAYS_PT, weddingDateDots, weddingMonth } from "@wedding/core/wedding-date";
import styles from "./invitation.module.css";

/** 2 · Save the date: monogram and month calendar with the day circled by a heart. */
export function SaveTheDateSection({ event }: { event: EventSettings }) {
  const { title, cells } = weddingMonth(event.date);

  return (
    <section id="save-the-date" className={`${styles.section} ${styles.glowTopLeft}`}>
      <div className={`${styles.column} ${styles.saveTheDate}`}>
        <p className={styles.saveTitle}>
          Reserve a data
          <br />
          do nosso casamento
        </p>

        <div className={styles.monogram} aria-hidden="true">
          <span className={styles.monogramLetters}>{event.monogram}</span>
          <span className={styles.monogramNames}>
            <span>{event.bride}</span>
            <span className={styles.plus}>+</span>
            <span>{event.groom}</span>
          </span>
        </div>

        <div className={styles.calendar}>
          <h2 className={styles.calendarTitle}>{title}</h2>
          <div className={styles.calendarGrid}>
            {WEEKDAYS_PT.map((label, i) => (
              <span key={label} className={`${styles.weekday} ${i >= 5 ? styles.weekend : ""}`}>
                {label}
              </span>
            ))}
            {cells.map((cell, i) => (
              <span
                key={i}
                className={`${styles.day} ${cell.weekend ? styles.weekend : ""} ${cell.isWeddingDay ? styles.weddingDay : ""}`}
                aria-label={cell.isWeddingDay ? `${cell.day} — dia do casamento` : undefined}
              >
                {cell.isWeddingDay && (
                  <svg className={styles.dayHeart} width="50" height="46" viewBox="0 0 50 46" fill="none" aria-hidden="true">
                    <path
                      d="M25 42C14 34 4 26 4 15.5 4 9 9 4 15 4c4.5 0 8 2.6 10 6.5C27 6.6 30.5 4 35 4c6 0 11 5 11 11.5C46 26 36 34 25 42z"
                      stroke="var(--gold-text)"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                <span className={styles.dayLabel}>{cell.day ?? ""}</span>
              </span>
            ))}
          </div>
        </div>

        <div className={styles.saveFooter}>
          <p className={styles.dateLine}>{weddingDateDots(event.date)}</p>
          <p className={styles.place}>
            <PinIcon size={14} />
            {event.venueShortAddress}
          </p>
          <a href="/api/calendar" className={styles.pillDark} style={{ marginTop: 6, minHeight: 44, fontSize: 11, letterSpacing: 2 }}>
            <CalendarPlusIcon size={15} />
            Adicionar ao calendário
          </a>
        </div>
      </div>
    </section>
  );
}
