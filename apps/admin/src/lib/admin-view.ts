import "server-only";
import type { HostGiftRow, HostInviteRow, HostTableRow, SheetOverviewData } from "@/components/admin/types";
import { attendingPeople, inviteStatus, seatsNeeded, shortDate } from "@wedding/core/data/invite-helpers";
import { getStore, isSheetsConfigured } from "@wedding/core/data/store";
import type { Invite } from "@wedding/core/data/types";
import { displayLink, personalLink } from "@wedding/core/site";

export function spreadsheetUrl(): string | null {
  return isSheetsConfigured()
    ? `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_SPREADSHEET_ID}/edit`
    : null;
}

function toRow(invite: Invite): HostInviteRow {
  return {
    id: invite.id,
    label: invite.label,
    people: invite.people.map((p) => p.name),
    going: attendingPeople(invite),
    status: inviteStatus(invite),
    tableNumber: invite.tableNumber,
    seats: seatsNeeded(invite),
    link: personalLink(invite.id),
    displayLink: displayLink(invite.id),
    phone: invite.phone,
    attendance: invite.people.map((p) => p.attendance),
    message: invite.message,
  };
}

export async function loadHostInvites(): Promise<HostInviteRow[]> {
  return (await getStore().listInvites()).map(toRow);
}

export async function loadHostTables(): Promise<HostTableRow[]> {
  return getStore().listTables();
}

export async function loadHostGifts(): Promise<HostGiftRow[]> {
  const store = getStore();
  const [gifts, invites] = await Promise.all([store.listGifts(), store.listInvites()]);
  const phones = new Map(invites.map((i) => [i.id, i.phone]));
  return gifts.map((g) => ({
    id: g.id,
    title: g.title,
    reservedBy: g.reservedBy,
    phone: phones.get(g.inviteId) ?? "",
  }));
}

export async function loadSheetOverview(): Promise<SheetOverviewData> {
  const store = getStore();
  const [invites, gifts, tables] = await Promise.all([store.listInvites(), store.listGifts(), store.listTables()]);
  const tableName = new Map(tables.map((t) => [t.number, t.name]));

  const people = invites.flatMap((invite) =>
    invite.people.map((person, i) => ({
      name: person.name,
      invite: invite.label,
      link: displayLink(invite.id),
      table: invite.tableNumber ? `${invite.tableNumber} · ${tableName.get(invite.tableNumber) ?? "?"}` : "—",
      sent: invite.sentAt ? shortDate(invite.sentAt) : "—",
      opened: invite.openedAt ? shortDate(invite.openedAt) : "—",
      attendance: person.attendance,
      message: i === 0 ? invite.message : "",
    })),
  );

  const seated = (number: number) =>
    invites
      .filter((i) => i.tableNumber === number)
      .flatMap((i) => i.people.filter((p) => p.attendance !== "no").map((p) => p.name));

  return {
    people,
    gifts: gifts.map((g) => ({
      title: g.title,
      reserved: Boolean(g.inviteId || g.reservedBy),
      reservedBy: g.reservedBy,
      link: g.inviteId ? displayLink(g.inviteId) : "",
      reservedAt: g.reservedAt,
    })),
    tables: tables.map((t) => {
      const names = seated(t.number);
      return { number: t.number, name: t.name, capacity: t.capacity, used: names.length, guests: names.join(", ") };
    }),
  };
}
