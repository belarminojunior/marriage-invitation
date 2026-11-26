import "server-only";
import type { HostGiftRow, HostInviteRow, HostTableRow } from "@/components/host/types";
import { attendingPeople, inviteStatus, seatsNeeded } from "@/lib/data/invite-helpers";
import { getStore, isSheetsConfigured } from "@/lib/data/store";
import type { Invite } from "@/lib/data/types";
import { displayLink, personalLink } from "@/lib/site";

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
