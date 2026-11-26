import { wedding } from "@wedding/core/wedding";
import { CarIcon, NavigateIcon, PinIcon } from "@wedding/core/icons";
import { Countdown } from "./Countdown";
import styles from "./invitation.module.css";

/** 4 · Countdown to the ceremony, venue map and directions. */
export function VenueSection() {
  const query = encodeURIComponent(wedding.venue.mapQuery);

  return (
    <section className={styles.section}>
      <div className={styles.countdown}>
        <div className={styles.countdownInner}>
          <h2 className={styles.countdownTitle}>Faltam poucos dias</h2>
          <Countdown target={wedding.ceremonyStart} />
          <p className={styles.countdownCaption}>até ao nosso “sim”</p>
        </div>
      </div>

      <div className={styles.venue}>
        <div className={styles.venueHeader}>
          <p className={styles.eyebrow}>Onde</p>
          <h3 className={styles.venueName}>{wedding.venue.name}</h3>
          <p className={styles.venueAddress}>{wedding.venue.address}</p>
        </div>

        <div className={styles.map}>
          <iframe
            title={`Mapa: ${wedding.venue.name}`}
            src={`https://www.google.com/maps?q=${query}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <div className={styles.twoButtons}>
          <a
            className={styles.pillDark}
            href={`https://www.google.com/maps/dir/?api=1&destination=${query}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <NavigateIcon />
            Direções
          </a>
          <a
            className={styles.pillOutline}
            href={`https://waze.com/ul?q=${query}&navigate=yes`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <PinIcon />
            Waze
          </a>
        </div>

        <div className={styles.note}>
          <CarIcon size={22} />
          <p>{wedding.venue.parkingNote}</p>
        </div>
      </div>
    </section>
  );
}
