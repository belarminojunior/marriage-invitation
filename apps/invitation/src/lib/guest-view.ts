import "server-only";
import type { GuestGift, GuestInvite } from "@/components/invitation/types";
import { getStore } from "@wedding/core/data/store";
import type { Gift, Invite, SeatingTable } from "@wedding/core/data/types";

export function toGuestInvite(invite: Invite, tables: SeatingTable[]): GuestInvite {
  return {
    id: invite.id,
    label: invite.label,
    people: invite.people,
    message: invite.message,
    tableName: tables.find((t) => t.number === invite.tableNumber)?.name ?? null,
  };
}

/** Strips who reserved each gift; the guest only learns whether it is free, taken, or theirs. */
export function toGuestGifts(gifts: Gift[], inviteId: string | null): GuestGift[] {
  return gifts.map((g) => ({
    id: g.id,
    title: g.title,
    category: g.category,
    state: inviteId && g.inviteId === inviteId ? "mine" : g.inviteId || g.reservedBy ? "taken" : "free",
  }));
}

export async function loadGuestGifts(inviteId: string | null) {
  return toGuestGifts(await getStore().listGifts(), inviteId);
}
