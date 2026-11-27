import { wedding } from "./wedding";

/**
 * Everything about the event that the couple fills in on the admin app's "Evento" screen.
 * It is stored in the Google Sheet ("Evento" tab) and read by the invitation on every visit,
 * so nothing guest-facing is hard-coded. `wedding.ts` only provides the first defaults.
 */
export const SCHEDULE_ICONS = ["welcome", "ceremony", "dinner", "cake", "party"] as const;
export type ScheduleIcon = (typeof SCHEDULE_ICONS)[number];

export interface ScheduleItem {
  icon: ScheduleIcon;
  label: string;
  time: string;
}

export interface EventSettings {
  bride: string;
  groom: string;
  monogram: string;
  /** Ceremony day, "YYYY-MM-DD", in the venue's time zone. */
  date: string;
  /** Ceremony start, "HH:MM". */
  time: string;
  city: string;
  rsvpDeadline: string;
  brideParents: string;
  groomParents: string;
  songTitle: string;
  songArtist: string;
  songUrl: string;
  coverPhotoUrl: string;
  invitationText: string;
  schedule: ScheduleItem[];
  verseText: string;
  verseReference: string;
  venueName: string;
  venueShortAddress: string;
  venueAddress: string;
  mapQuery: string;
  parkingNote: string;
  galleryQuote: string;
  galleryPhotos: string[];
  giftsEnabled: boolean;
}

/** The venue is in Mozambique (no daylight saving), so the ceremony time has a fixed offset. */
export const EVENT_TIME_ZONE = wedding.timeZone;
const UTC_OFFSET = "+02:00";

export const SCHEDULE_ICON_LABELS: Record<ScheduleIcon, string> = {
  welcome: "Boas-vindas (copo)",
  ceremony: "Cerimónia (alianças)",
  dinner: "Jantar (prato)",
  cake: "Bolo",
  party: "Festa (música)",
};

/** Field order and the labels shown in the "Evento" tab of the sheet. */
export const EVENT_FIELDS: { key: keyof EventSettings; label: string }[] = [
  { key: "bride", label: "Noiva" },
  { key: "groom", label: "Noivo" },
  { key: "monogram", label: "Monograma" },
  { key: "date", label: "Data (AAAA-MM-DD)" },
  { key: "time", label: "Hora da cerimónia" },
  { key: "city", label: "Cidade" },
  { key: "rsvpDeadline", label: "Prazo de resposta" },
  { key: "brideParents", label: "Pais da noiva (uma linha cada)" },
  { key: "groomParents", label: "Pais do noivo (uma linha cada)" },
  { key: "songTitle", label: "Música · título" },
  { key: "songArtist", label: "Música · artista" },
  { key: "songUrl", label: "Música · ficheiro" },
  { key: "coverPhotoUrl", label: "Foto da capa" },
  { key: "invitationText", label: "Texto do convite" },
  { key: "schedule", label: "Programa (JSON)" },
  { key: "verseText", label: "Versículo" },
  { key: "verseReference", label: "Versículo · referência" },
  { key: "venueName", label: "Local · nome" },
  { key: "venueShortAddress", label: "Local · endereço curto" },
  { key: "venueAddress", label: "Local · endereço" },
  { key: "mapQuery", label: "Local · pesquisa no mapa" },
  { key: "parkingNote", label: "Nota de estacionamento" },
  { key: "galleryQuote", label: "Galeria · frase" },
  { key: "galleryPhotos", label: "Galeria · fotos (JSON)" },
  { key: "giftsEnabled", label: "Lista de presentes visível" },
];

export function defaultEvent(): EventSettings {
  const [date, timeWithZone] = wedding.ceremonyStart.split("T");
  return {
    bride: wedding.bride,
    groom: wedding.groom,
    monogram: wedding.monogram,
    date,
    time: timeWithZone.slice(0, 5),
    city: wedding.cityLabel,
    rsvpDeadline: wedding.rsvpDeadlineLabel,
    brideParents: wedding.parents.bride.join("\n"),
    groomParents: wedding.parents.groom.join("\n"),
    songTitle: wedding.song.title,
    songArtist: wedding.song.artist,
    songUrl: "",
    coverPhotoUrl: "",
    invitationText: wedding.invitationText,
    schedule: wedding.schedule.map((s) => ({ ...s })),
    verseText: wedding.verse.text,
    verseReference: wedding.verse.reference,
    venueName: wedding.venue.name,
    venueShortAddress: wedding.venue.shortAddress,
    venueAddress: wedding.venue.address,
    mapQuery: wedding.venue.mapQuery,
    parkingNote: wedding.venue.parkingNote,
    galleryQuote: wedding.gallery.quote,
    galleryPhotos: [],
    giftsEnabled: false,
  };
}

// ---------------------------------------------------------------- storage (one text value per field)

const YES = "Sim";
const NO = "Não";

export function eventValueToText(key: keyof EventSettings, event: EventSettings): string {
  const value = event[key];
  if (typeof value === "boolean") return value ? YES : NO;
  if (Array.isArray(value)) return JSON.stringify(value);
  return value;
}

function parseJsonArray<T>(text: string, isItem: (x: unknown) => x is T): T[] | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.filter(isItem) : null;
  } catch {
    return null;
  }
}

const isString = (x: unknown): x is string => typeof x === "string" && x.trim() !== "";
const isScheduleItem = (x: unknown): x is ScheduleItem =>
  typeof x === "object" &&
  x !== null &&
  SCHEDULE_ICONS.includes((x as ScheduleItem).icon) &&
  typeof (x as ScheduleItem).label === "string" &&
  typeof (x as ScheduleItem).time === "string";

/** Builds the event from stored text values; anything missing or unreadable falls back to the default. */
export function eventFromTexts(texts: Partial<Record<string, string>>): EventSettings {
  const event = defaultEvent();
  const result: Record<string, unknown> = { ...event };
  for (const { key } of EVENT_FIELDS) {
    const text = texts[key];
    if (text === undefined) continue;
    const fallback = event[key];
    if (typeof fallback === "boolean") {
      result[key] = ["sim", "yes", "true", "1"].includes(text.trim().toLowerCase());
    } else if (key === "schedule") {
      result[key] = parseJsonArray(text, isScheduleItem) ?? fallback;
    } else if (key === "galleryPhotos") {
      result[key] = parseJsonArray(text, isString) ?? fallback;
    } else {
      result[key] = text;
    }
  }
  return result as unknown as EventSettings;
}

// ---------------------------------------------------------------- derived values

export function coupleNamesOf(event: Pick<EventSettings, "bride" | "groom">): string {
  return `${event.bride} & ${event.groom}`;
}

/** ISO date-time of the ceremony with the venue's offset, e.g. "2027-02-13T15:00:00+02:00". */
export function ceremonyStart(event: Pick<EventSettings, "date" | "time">): string {
  const time = /^\d{1,2}:\d{2}$/.test(event.time) ? event.time.padStart(5, "0") : "12:00";
  return `${event.date}T${time}:00${UTC_OFFSET}`;
}

export function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(`${date}T12:00:00Z`).getTime());
}
