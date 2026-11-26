import type { Invite, InviteStatus } from "./types";

export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

/** Default label for an invite, built from the people's names. */
export function defaultInviteLabel(names: string[]): string {
  if (names.length <= 2) return names.join(" & ");
  return `${names[0]} + ${names.length - 1}`;
}

export function inviteStatus(invite: Invite): InviteStatus {
  const answered = invite.people.filter((p) => p.attendance !== "");
  if (invite.people.length > 0 && answered.length === invite.people.length) {
    return invite.people.some((p) => p.attendance === "yes") ? "accepted" : "declined";
  }
  if (invite.openedAt) return "opened";
  if (invite.sentAt) return "sent";
  return "new";
}

export function attendingPeople(invite: Invite): string[] {
  return invite.people.filter((p) => p.attendance === "yes").map((p) => p.name);
}

/** Seats an invite takes at a table: confirmed people once answered, otherwise everyone invited. */
export function seatsNeeded(invite: Invite): number {
  const status = inviteStatus(invite);
  if (status === "declined") return 0;
  if (status === "accepted") return attendingPeople(invite).length;
  return invite.people.length;
}

export function newId(length = 4): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function nowStamp(timeZone: string): string {
  // "2026-11-20 18:02" in the venue's time zone — readable in the sheet.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

/** "2026-11-20 18:02" → "20/11" */
export function shortDate(stamp: string): string {
  const match = /^\d{4}-(\d{2})-(\d{2})/.exec(stamp);
  return match ? `${match[2]}/${match[1]}` : stamp;
}
