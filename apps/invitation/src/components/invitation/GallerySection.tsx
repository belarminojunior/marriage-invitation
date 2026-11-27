"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CloseIcon } from "@wedding/core/icons";
import styles from "./invitation.module.css";

const tileTones = ["", styles.placeholderDark, "", styles.placeholderGold, styles.placeholderDark];

function Photo({ photos, index, tone }: { photos: string[]; index: number; tone?: string }) {
  const src = photos[index];
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={`Foto ${index + 1} da sessão pré-casamento`} loading="lazy" />;
  }
  return (
    <span className={`${styles.placeholder} ${tone ?? styles.placeholderDark}`} style={{ width: "100%", height: "100%" }}>
      Foto {index + 1}
    </span>
  );
}

/** 6 · Pre-wedding photo session: five-tile mosaic and a full-screen lightbox. */
export function GallerySection({ photos, quote }: { photos: string[]; quote: string }) {
  const [index, setIndex] = useState(-1);
  const total = photos.length;
  const open = index >= 0;
  const touchStart = useRef<number | null>(null);
  const extra = total - 4;

  const prev = () => setIndex((i) => (i - 1 + total) % total);
  const next = () => setIndex((i) => (i + 1) % total);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIndex(-1);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + total) % total);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % total);
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, total]);

  if (total === 0) return null;

  return (
    <section className={styles.section}>
      <div className={`${styles.column} ${styles.gallery}`}>
        <div className={styles.galleryHeader}>
          <p className={styles.eyebrow}>Sessão pré-casamento</p>
          <h2 className={styles.scriptTitle}>Os nossos momentos</h2>
        </div>

        <div className={styles.galleryGrid}>
          {Array.from({ length: Math.min(5, total) }, (_, i) => {
            const isMore = i === 4 && extra > 1;
            return (
              <button
                key={i}
                type="button"
                className={`${styles.tile} ${i === 0 ? styles.tileTall : ""}`}
                onClick={() => setIndex(i)}
                aria-label={isMore ? `Abrir foto ${i + 1} e ver todas` : `Abrir foto ${i + 1}`}
              >
                <Photo photos={photos} index={i} tone={tileTones[i]} />
                {isMore && (
                  <span className={styles.tileMoreOverlay}>
                    <span className={styles.tileMoreCount}>+{extra}</span>
                    <span className={styles.tileMoreLabel}>Ver todas</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {quote && <p className={styles.galleryQuote}>{quote}</p>}
      </div>

      {open && (
        <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label="Galeria de fotos">
          <div className={styles.lightboxBar}>
            <span>
              {index + 1} / {total}
            </span>
            <button type="button" className={`${styles.roundButton} ${styles.closeButton}`} onClick={() => setIndex(-1)} aria-label="Fechar galeria" autoFocus>
              <CloseIcon size={18} />
            </button>
          </div>
          <div
            className={styles.lightboxStage}
            onTouchStart={(e) => (touchStart.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchStart.current === null) return;
              const dx = e.changedTouches[0].clientX - touchStart.current;
              touchStart.current = null;
              if (dx > 50) prev();
              if (dx < -50) next();
            }}
          >
            {photos[index] ? (
              <Photo photos={photos} index={index} />
            ) : (
              <span className={`${styles.placeholder} ${styles.placeholderDark}`} style={{ width: "100%", height: "100%", fontSize: 11, letterSpacing: 2 }}>
                Foto {index + 1} · deslize
              </span>
            )}
          </div>
          <div className={styles.lightboxNav}>
            <button type="button" className={styles.roundButton} onClick={prev} aria-label="Foto anterior">
              <ChevronLeft size={18} />
            </button>
            <button type="button" className={styles.roundButton} onClick={next} aria-label="Foto seguinte">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
