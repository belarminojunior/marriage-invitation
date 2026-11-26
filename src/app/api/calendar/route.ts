import { coupleNames, wedding } from "@/config/wedding";

/** Downloads an .ics file so guests can add the wedding to their calendar. */
export function GET() {
  const start = new Date(wedding.ceremonyStart);
  const end = new Date(start.getTime() + 9 * 60 * 60 * 1000); // until the end of the party
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escape = (text: string) => text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wedding Invitation//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:wedding-${stamp(start)}@invitation`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(`Casamento de ${coupleNames}`)}`,
    `LOCATION:${escape(wedding.venue.mapQuery)}`,
    `DESCRIPTION:${escape(wedding.schedule.map((s) => `${s.time} ${s.label}`).join("\n"))}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="casamento.ics"',
    },
  });
}
