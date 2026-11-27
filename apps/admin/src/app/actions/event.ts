"use server";

import { refresh, revalidatePath } from "next/cache";
import { getStore } from "@wedding/core/data/store";
import { SCHEDULE_ICONS, isValidDate, type EventSettings, type ScheduleItem } from "@wedding/core/event";
import { requireHost } from "@wedding/core/host-auth";

const TEXT_LIMIT = 2000;

const text = (value: unknown, max = 200) => (typeof value === "string" ? value.trim().slice(0, max) : undefined);
const url = (value: unknown) => {
  const v = text(value, 1000);
  if (v === undefined) return undefined;
  return v === "" || /^https:\/\//.test(v) ? v : undefined;
};

/** Keeps only known fields with sensible values, so the sheet never gets junk from the form. */
function cleanPatch(input: Partial<EventSettings>): Partial<EventSettings> {
  const patch: Partial<EventSettings> = {};
  const set = <K extends keyof EventSettings>(key: K, value: EventSettings[K] | undefined) => {
    if (value !== undefined) patch[key] = value;
  };

  set("bride", text(input.bride, 60));
  set("groom", text(input.groom, 60));
  set("monogram", text(input.monogram, 4));
  if (input.date !== undefined && isValidDate(input.date)) set("date", input.date);
  if (input.time !== undefined && /^\d{2}:\d{2}$/.test(input.time)) set("time", input.time);
  set("city", text(input.city, 80));
  set("rsvpDeadline", text(input.rsvpDeadline, 120));
  set("brideParents", text(input.brideParents, 300));
  set("groomParents", text(input.groomParents, 300));
  set("songTitle", text(input.songTitle, 120));
  set("songArtist", text(input.songArtist, 120));
  set("songUrl", url(input.songUrl));
  set("coverPhotoUrl", url(input.coverPhotoUrl));
  set("invitationText", text(input.invitationText, TEXT_LIMIT));
  set("verseText", text(input.verseText, 600));
  set("verseReference", text(input.verseReference, 120));
  set("venueName", text(input.venueName, 120));
  set("venueShortAddress", text(input.venueShortAddress, 160));
  set("venueAddress", text(input.venueAddress, 300));
  set("mapQuery", text(input.mapQuery, 300));
  set("parkingNote", text(input.parkingNote, 400));
  set("galleryQuote", text(input.galleryQuote, 400));
  if (typeof input.giftsEnabled === "boolean") set("giftsEnabled", input.giftsEnabled);

  if (Array.isArray(input.schedule)) {
    set(
      "schedule",
      input.schedule
        .filter((s): s is ScheduleItem => !!s && SCHEDULE_ICONS.includes(s.icon) && typeof s.label === "string")
        .map((s) => ({ icon: s.icon, label: s.label.trim().slice(0, 60), time: String(s.time ?? "").trim().slice(0, 10) }))
        .filter((s) => s.label)
        .slice(0, 12),
    );
  }
  if (Array.isArray(input.galleryPhotos)) {
    set(
      "galleryPhotos",
      input.galleryPhotos.map(url).filter((u): u is string => !!u).slice(0, 60),
    );
  }
  return patch;
}

/** Saves the "Evento" details (or part of them) and refreshes both screens that show them. */
export async function saveEvent(input: Partial<EventSettings>) {
  await requireHost();
  const patch = cleanPatch(input);
  const event = await getStore().updateEvent(patch);
  revalidatePath("/", "layout");
  refresh();
  return event;
}
