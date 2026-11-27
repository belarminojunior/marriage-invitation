"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { splitLines, type EventSettings } from "@wedding/core/event";
import { weddingWeekday } from "@wedding/core/wedding-date";
import { ChevronDown, ImageIcon, MusicIcon, PauseIcon, PlayIcon } from "@wedding/core/icons";
import styles from "./invitation.module.css";

interface CoverSectionProps {
  event: EventSettings;
  guestLabel: string | null;
  dateLabel: string;
}

/** 1 · Cover with the couple's photo and the floating music player. */
export function CoverSection({ event, guestLabel, dateLabel }: CoverSectionProps) {
  const brideParents = splitLines(event.brideParents);
  const groomParents = splitLines(event.groomParents);
  const hasParents = brideParents.length > 0 || groomParents.length > 0;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
    } catch {
      // Autoplay blocked or file missing — stay paused.
    }
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void play();
    else audio.pause();
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTime);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTime);
    };
  }, []);

  const openInvitation = () => {
    void play();
    document.getElementById("save-the-date")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className={styles.cover} aria-label="Capa do convite">
      {event.coverPhotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.coverPhoto} src={event.coverPhotoUrl} alt={`${event.bride} e ${event.groom}`} />
      ) : (
        <div className={styles.coverPlaceholder}>
          <div className={styles.coverPlaceholderLabel}>
            <ImageIcon size={40} strokeWidth={1.4} />
            <span>Foto do casal · ecrã inteiro</span>
          </div>
        </div>
      )}
      <div className={styles.coverShade} />

      {event.songUrl && <audio ref={audioRef} src={event.songUrl} loop preload="none" />}
      {event.songUrl && (
      <div className={styles.player}>
        <div className={styles.playerDisc}>
          <MusicIcon size={18} />
        </div>
        <div className={styles.playerInfo}>
          <div className={styles.playerRow}>
            <div className={styles.playerText}>
              <span className={styles.playerTitle}>{event.songTitle}</span>
              <span className={styles.playerArtist}>{event.songArtist}</span>
            </div>
            <div className={`${styles.eq} ${playing ? styles.eqOn : ""}`} aria-hidden="true">
              <span /><span /><span /><span />
            </div>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button
          type="button"
          className={styles.playButton}
          onClick={toggle}
          aria-label={playing ? "Pausar música" : "Tocar música"}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>
      )}

      <div className={styles.coverContent}>
        {guestLabel && <p className={styles.coverFor}>Para {guestLabel}</p>}
        <p className={styles.coverKicker} style={guestLabel ? undefined : { marginTop: 0 }}>
          Vamos casar-nos
        </p>
        <h1 className={styles.coverNames}>
          {event.bride}
          <br />
          <span className={styles.coverAmp}>&amp;</span>
          <br />
          {event.groom}
        </h1>
        <div className={styles.coverMeta}>
          <span>{weddingWeekday(event.date)}</span>
          <span className={styles.dot} />
          <span className={styles.coverDate}>{dateLabel}</span>
          <span className={styles.dot} />
          <span>{event.city}</span>
        </div>
        {hasParents && (
          <div className={styles.parents}>
            <span className={styles.parentsLabel}>Com a bênção dos pais</span>
            <div className={styles.parentsGrid}>
              {[brideParents, groomParents].map((names, i) => (
                <p key={i}>
                  {names.map((name, j) => (
                    <span key={j}>
                      {j > 0 && (
                        <>
                          <br />&amp;{" "}
                        </>
                      )}
                      {name}
                    </span>
                  ))}
                </p>
              ))}
            </div>
          </div>
        )}
        <button type="button" className={styles.openButton} onClick={openInvitation}>
          Abrir convite
          <ChevronDown size={16} strokeWidth={1.6} />
        </button>
      </div>
    </section>
  );
}
