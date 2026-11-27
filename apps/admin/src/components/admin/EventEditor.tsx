"use client";

import { useState, useTransition, type ReactNode } from "react";
import { upload } from "@vercel/blob/client";
import { saveEvent } from "@/app/actions/event";
import { ChevronLeft, ChevronRight, CloseIcon, ImageIcon, MusicIcon, PlusIcon } from "@wedding/core/icons";
import { SCHEDULE_ICONS, SCHEDULE_ICON_LABELS, type EventSettings, type ScheduleIcon } from "@wedding/core/event";
import { HostHeader, useToast } from "./HostChrome";
import styles from "./event.module.css";
import host from "./host.module.css";

/** Large phone photos are shrunk in the browser before upload, so the invitation loads fast. */
async function shrinkImage(file: File, maxSide = 2000): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1_500_000) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.85));
}

async function uploadFile(file: File, folder: "fotos" | "musica"): Promise<string> {
  const body = folder === "fotos" ? await shrinkImage(file) : file;
  const ext = folder === "fotos" && body !== file ? "jpg" : (file.name.split(".").pop() || "bin").toLowerCase();
  const result = await upload(`evento/${folder}/${Date.now()}.${ext}`, body, {
    access: "public",
    handleUploadUrl: "/api/upload",
    contentType: folder === "fotos" && body !== file ? "image/jpeg" : file.type || undefined,
  });
  return result.url;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {hint && <p className={styles.hint}>{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {multiline ? (
        <textarea className={styles.textarea} value={value} placeholder={placeholder} rows={3} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={styles.input} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

export function EventEditor({
  initial,
  uploadsEnabled,
  sheetUrl,
}: {
  initial: EventSettings;
  uploadsEnabled: boolean;
  sheetUrl: string | null;
}) {
  const [event, setEvent] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { show, toast } = useToast();

  const dirty = JSON.stringify(event) !== JSON.stringify(saved);
  const set = <K extends keyof EventSettings>(key: K, value: EventSettings[K]) => setEvent((e) => ({ ...e, [key]: value }));

  const persist = (patch: Partial<EventSettings>, message: string) =>
    startTransition(async () => {
      try {
        const next = await saveEvent(patch);
        setSaved(next);
        setEvent((current) => ({ ...current, ...patch }));
        show(message);
      } catch {
        show("Não foi possível guardar. Tente outra vez.");
      }
    });

  const onSave = () => persist(event, "Evento guardado");

  /** Uploads are saved straight away, so a photo is never lost by forgetting to press "Guardar". */
  const onUpload = async (files: FileList | null, folder: "fotos" | "musica", apply: (urls: string[]) => Partial<EventSettings>) => {
    if (!files || files.length === 0) return;
    setBusy(folder === "fotos" ? `A carregar ${files.length} ${files.length === 1 ? "foto" : "fotos"}…` : "A carregar a música…");
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) urls.push(await uploadFile(file, folder));
      const patch = apply(urls);
      setEvent((e) => ({ ...e, ...patch }));
      persist(patch, folder === "fotos" ? "Foto(s) carregada(s)" : "Música carregada");
    } catch (error) {
      show(`Não foi possível carregar: ${(error as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const setScheduleItem = (index: number, patch: Partial<EventSettings["schedule"][number]>) =>
    set("schedule", event.schedule.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const movePhoto = (index: number, delta: number) => {
    const photos = [...event.galleryPhotos];
    const target = index + delta;
    if (target < 0 || target >= photos.length) return;
    [photos[index], photos[target]] = [photos[target], photos[index]];
    persist({ galleryPhotos: photos }, "Ordem das fotos guardada");
  };

  const removePhoto = (index: number) => {
    if (!confirm("Tirar esta foto da galeria?")) return;
    persist({ galleryPhotos: event.galleryPhotos.filter((_, i) => i !== index) }, "Foto removida");
  };

  return (
    <>
      <HostHeader title="Evento" stats={[]} sheetUrl={sheetUrl} />

      <div className={styles.page}>
        <Section title="Lista de presentes" hint="Quando está desligada, os convidados não veem a lista de presentes no convite.">
          <label className={styles.switchRow}>
            <input
              type="checkbox"
              role="switch"
              checked={event.giftsEnabled}
              onChange={(e) => persist({ giftsEnabled: e.target.checked }, e.target.checked ? "Lista de presentes visível" : "Lista de presentes escondida")}
            />
            <span>{event.giftsEnabled ? "Visível para os convidados" : "Escondida dos convidados"}</span>
          </label>
        </Section>

        <Section title="Noivos">
          <div className={styles.grid}>
            <Field label="Noiva" value={event.bride} onChange={(v) => set("bride", v)} />
            <Field label="Noivo" value={event.groom} onChange={(v) => set("groom", v)} />
            <Field label="Monograma (iniciais)" value={event.monogram} onChange={(v) => set("monogram", v.toUpperCase())} />
          </div>
          <div className={styles.grid}>
            <Field label="Pais da noiva (um por linha)" value={event.brideParents} multiline onChange={(v) => set("brideParents", v)} />
            <Field label="Pais do noivo (um por linha)" value={event.groomParents} multiline onChange={(v) => set("groomParents", v)} />
          </div>
        </Section>

        <Section title="Data e local">
          <div className={styles.grid}>
            <Field label="Data" type="date" value={event.date} onChange={(v) => set("date", v)} />
            <Field label="Hora da cerimónia" type="time" value={event.time} onChange={(v) => set("time", v)} />
            <Field label="Cidade" value={event.city} onChange={(v) => set("city", v)} />
          </div>
          <Field label="Prazo de resposta (texto)" value={event.rsvpDeadline} placeholder="Responda até 15 de janeiro de 2027" onChange={(v) => set("rsvpDeadline", v)} />
          <div className={styles.grid}>
            <Field label="Nome do local" value={event.venueName} onChange={(v) => set("venueName", v)} />
            <Field label="Endereço curto" value={event.venueShortAddress} onChange={(v) => set("venueShortAddress", v)} />
          </div>
          <Field label="Endereço completo" value={event.venueAddress} onChange={(v) => set("venueAddress", v)} />
          <Field
            label="Pesquisa no mapa (Google Maps / Waze)"
            value={event.mapQuery}
            placeholder="Nome do local, cidade, país"
            onChange={(v) => set("mapQuery", v)}
          />
          <Field label="Nota de estacionamento" value={event.parkingNote} multiline onChange={(v) => set("parkingNote", v)} />
        </Section>

        <Section title="Convite e programa">
          <Field label="Texto do convite" value={event.invitationText} multiline onChange={(v) => set("invitationText", v)} />
          <ul className={styles.schedule}>
            {event.schedule.map((item, i) => (
              <li key={i} className={styles.scheduleRow}>
                <label className="visually-hidden" htmlFor={`icon-${i}`}>Ícone do momento {i + 1}</label>
                <select
                  id={`icon-${i}`}
                  className={styles.select}
                  value={item.icon}
                  onChange={(e) => setScheduleItem(i, { icon: e.target.value as ScheduleIcon })}
                >
                  {SCHEDULE_ICONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {SCHEDULE_ICON_LABELS[icon]}
                    </option>
                  ))}
                </select>
                <input
                  className={styles.input}
                  aria-label={`Momento ${i + 1}`}
                  value={item.label}
                  onChange={(e) => setScheduleItem(i, { label: e.target.value })}
                />
                <input
                  className={`${styles.input} ${styles.timeInput}`}
                  aria-label={`Hora do momento ${i + 1}`}
                  type="time"
                  value={item.time}
                  onChange={(e) => setScheduleItem(i, { time: e.target.value })}
                />
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={`Tirar ${item.label || "este momento"} do programa`}
                  onClick={() => set("schedule", event.schedule.filter((_, j) => j !== i))}
                >
                  <CloseIcon size={16} />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={styles.addButton}
            onClick={() => set("schedule", [...event.schedule, { icon: "party", label: "", time: "" }])}
          >
            <PlusIcon size={14} />
            Adicionar momento
          </button>
          <div className={styles.grid}>
            <Field label="Versículo ou frase" value={event.verseText} multiline onChange={(v) => set("verseText", v)} />
            <Field label="Referência" value={event.verseReference} onChange={(v) => set("verseReference", v)} />
          </div>
        </Section>

        <Section title="Capa e música" hint={uploadsEnabled ? undefined : "O carregamento de ficheiros ainda não está configurado."}>
          <div className={styles.mediaRow}>
            <div className={styles.coverPreview}>
              {event.coverPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={event.coverPhotoUrl} alt="Foto da capa" />
              ) : (
                <span className={styles.emptyMedia}>
                  <ImageIcon size={28} />
                  Sem foto da capa
                </span>
              )}
            </div>
            <div className={styles.mediaActions}>
              <label className={styles.uploadButton} aria-disabled={!uploadsEnabled || !!busy}>
                <input
                  type="file"
                  accept="image/*"
                  disabled={!uploadsEnabled || !!busy}
                  onChange={(e) => onUpload(e.target.files, "fotos", ([url]) => ({ coverPhotoUrl: url }))}
                />
                {event.coverPhotoUrl ? "Trocar foto da capa" : "Carregar foto da capa"}
              </label>
              {event.coverPhotoUrl && (
                <button type="button" className={styles.linkButton} onClick={() => persist({ coverPhotoUrl: "" }, "Foto da capa removida")}>
                  Remover foto
                </button>
              )}
            </div>
          </div>

          <div className={styles.mediaRow}>
            <div className={styles.songIcon}>
              <MusicIcon size={22} />
            </div>
            <div className={styles.mediaActions}>
              {event.songUrl ? (
                <audio controls preload="none" src={event.songUrl} className={styles.audio} />
              ) : (
                <span className={styles.hint}>Sem música — o leitor não aparece no convite.</span>
              )}
              <label className={styles.uploadButton} aria-disabled={!uploadsEnabled || !!busy}>
                <input
                  type="file"
                  accept="audio/*"
                  disabled={!uploadsEnabled || !!busy}
                  onChange={(e) => onUpload(e.target.files, "musica", ([url]) => ({ songUrl: url }))}
                />
                {event.songUrl ? "Trocar música" : "Carregar música (MP3)"}
              </label>
              {event.songUrl && (
                <button type="button" className={styles.linkButton} onClick={() => persist({ songUrl: "" }, "Música removida")}>
                  Remover música
                </button>
              )}
            </div>
          </div>
          <div className={styles.grid}>
            <Field label="Título da música" value={event.songTitle} onChange={(v) => set("songTitle", v)} />
            <Field label="Artista" value={event.songArtist} onChange={(v) => set("songArtist", v)} />
          </div>
        </Section>

        <Section title="Galeria" hint="Sessão pré-casamento. Sem fotos, a galeria não aparece no convite.">
          <ul className={styles.photos}>
            {event.galleryPhotos.map((src, i) => (
              <li key={src} className={styles.photo}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Foto ${i + 1}`} loading="lazy" />
                <div className={styles.photoBar}>
                  <button type="button" aria-label={`Mover foto ${i + 1} para trás`} disabled={i === 0} onClick={() => movePhoto(i, -1)}>
                    <ChevronLeft size={14} />
                  </button>
                  <button type="button" aria-label={`Remover foto ${i + 1}`} onClick={() => removePhoto(i)}>
                    <CloseIcon size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Mover foto ${i + 1} para a frente`}
                    disabled={i === event.galleryPhotos.length - 1}
                    onClick={() => movePhoto(i, 1)}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </li>
            ))}
            <li>
              <label className={`${styles.photo} ${styles.photoAdd}`} aria-disabled={!uploadsEnabled || !!busy}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={!uploadsEnabled || !!busy}
                  onChange={(e) => onUpload(e.target.files, "fotos", (urls) => ({ galleryPhotos: [...event.galleryPhotos, ...urls] }))}
                />
                <PlusIcon size={22} />
                Adicionar fotos
              </label>
            </li>
          </ul>
          <Field label="Frase da galeria" value={event.galleryQuote} multiline onChange={(v) => set("galleryQuote", v)} />
        </Section>
      </div>

      <div className={styles.saveBar}>
        <span className={styles.saveState}>{busy ?? (pending ? "A guardar…" : dirty ? "Alterações por guardar" : "Tudo guardado")}</span>
        <button type="button" className={host.darkButton} disabled={!dirty || pending || !!busy} onClick={onSave}>
          Guardar
        </button>
      </div>
      {toast}
    </>
  );
}
