import { wedding, type ScheduleIcon } from "@wedding/core/wedding";
import { HeartSolid } from "@wedding/core/icons";
import styles from "./invitation.module.css";

const accent = "var(--gold-text)";

/** Line illustrations for each moment of the day. */
function MomentIcon({ icon }: { icon: ScheduleIcon }) {
  const common = {
    fill: "none",
    stroke: "var(--ink)",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: styles.timelineIcon,
    "aria-hidden": true,
  };
  switch (icon) {
    case "welcome":
      return (
        <svg width="44" height="44" viewBox="0 0 48 48" {...common}>
          <path d="M15 6h18l-1 12a8 8 0 0 1-16 0L15 6z" /><path d="M16 15h16" /><path d="M24 26v14M17 42h14" />
        </svg>
      );
    case "ceremony":
      return (
        <svg width="48" height="44" viewBox="0 0 52 48" {...common}>
          <circle cx="19" cy="29" r="12" /><circle cx="33" cy="29" r="12" /><path d="M30 12l3-5 3 5-3 3z" stroke={accent} />
        </svg>
      );
    case "dinner":
      return (
        <svg width="50" height="44" viewBox="0 0 56 48" {...common}>
          <circle cx="28" cy="24" r="14" /><circle cx="28" cy="24" r="9" />
          <path d="M7 8v10a3 3 0 0 0 3 3v19M4 8v8M10 8v8" /><path d="M49 40V8c-4 3-5 9-5 15h5" />
        </svg>
      );
    case "cake":
      return (
        <svg width="46" height="44" viewBox="0 0 48 48" {...common}>
          <path d="M10 30h28v12H10zM14 20h20v10H14z" />
          <path d="M10 35c3 2 5 2 7 0s4-2 7 0 4 2 7 0 4-2 7 0M14 24c2.5 1.6 4 1.6 6.6 0s4-1.6 6.6 0 4 1.6 6.8 0" />
          <path d="M6 42h36M24 20v-5" /><path d="M24 15c-2-2-2-5 0-7 2 2 2 5 0 7z" stroke={accent} />
        </svg>
      );
    case "party":
      return (
        <svg width="44" height="44" viewBox="0 0 48 48" {...common}>
          <path d="M18 34V12l20-5v22" /><path d="M18 18l20-5" /><circle cx="13" cy="34" r="5" /><circle cx="33" cy="29" r="5" />
        </svg>
      );
  }
}

/** 3 · Invitation text and the programme of the day. */
export function ProgramSection() {
  return (
    <section className={`${styles.section} ${styles.glowTopLeft}`}>
      <div className={`${styles.column} ${styles.program}`}>
        <h2 className={styles.programTitle}>Convite especial</h2>
        <p className={styles.programIntro}>{wedding.invitationText}</p>

        <div className={styles.programBadge}>Programa</div>

        <ol className={styles.timeline}>
          {wedding.schedule.map((item) => (
            <li key={item.label} className={styles.timelineItem}>
              <MomentIcon icon={item.icon} />
              <span className={styles.timelineHeart}>
                <HeartSolid size={20} color="var(--ink)" />
              </span>
              <span className={styles.timelineLabel}>{item.label}</span>
              <time className={styles.timeChip}>{item.time}</time>
            </li>
          ))}
        </ol>

        <div className={styles.verse}>
          <p className={styles.verseText}>{wedding.verse.text}</p>
          <p className={styles.verseRef}>{wedding.verse.reference}</p>
        </div>
      </div>
    </section>
  );
}
