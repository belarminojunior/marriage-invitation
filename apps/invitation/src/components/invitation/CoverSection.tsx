"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { wedding } from "@wedding/core/wedding";
import { ChevronDown, ImageIcon, MusicIcon, PauseIcon, PlayIcon } from "@wedding/core/icons";
import styles from "./invitation.module.css";

interface CoverSectionProps {
  guestLabel: string | null;
  dateLabel: string;
}

/** 1 · Cover with the couple's photo and the floating music player. */
export function CoverSection({ guestLabel, dateLabel }: CoverSectionProps) {
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
      {wedding.coverPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.coverPhoto} src={wedding.coverPhoto} alt={`${wedding.bride} e ${wedding.groom}`} />
      ) : (
        <div className={styles.coverPlaceholder}>
          <div className={styles.coverPlaceholderLabel}>
            <ImageIcon size={40} strokeWidth={1.4} />
            <span>Foto do casal · ecrã inteiro</span>
          </div>
        </div>
      )}
      <div className={styles.coverShade} />

      <audio ref={audioRef} src={wedding.song.src} loop preload="none" />
      <div className={styles.player}>
        <div className={styles.playerDisc}>
          <MusicIcon size={18} />
        </div>
        <div className={styles.playerInfo}>
          <div className={styles.playerRow}>
            <div className={styles.playerText}>
              <span className={styles.playerTitle}>{wedding.song.title}</span>
              <span className={styles.playerArtist}>{wedding.song.artist}</span>
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

      <div className={styles.coverContent}>
        {guestLabel && <p className={styles.coverFor}>Para {guestLabel}</p>}
        <p className={styles.coverKicker} style={guestLabel ? undefined : { marginTop: 0 }}>
          Vamos casar-nos
        </p>
        <h1 className={styles.coverNames}>
          {wedding.bride}
          <br />
          <span className={styles.coverAmp}>&amp;</span>
          <br />
          {wedding.groom}
        </h1>
        <div className={styles.coverMeta}>
          <span>{wedding.weekdayLabel}</span>
          <span className={styles.dot} />
          <span className={styles.coverDate}>{dateLabel}</span>
          <span className={styles.dot} />
          <span>{wedding.cityLabel}</span>
        </div>
        <div className={styles.parents}>
          <span className={styles.parentsLabel}>Com a bênção dos pais</span>
          <div className={styles.parentsGrid}>
            <p>
              {wedding.parents.bride[0]}
              <br />&amp; {wedding.parents.bride[1]}
            </p>
            <p>
              {wedding.parents.groom[0]}
              <br />&amp; {wedding.parents.groom[1]}
            </p>
          </div>
        </div>
        <button type="button" className={styles.openButton} onClick={openInvitation}>
          Abrir convite
          <ChevronDown size={16} strokeWidth={1.6} />
        </button>
      </div>
    </section>
  );
}
