"use server";

import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/data/store";
import { GiftTakenError, type Attendance } from "@/lib/data/types";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const MESSAGE_MAX_LENGTH = 1000;

export async function submitRsvp(
  inviteId: string,
  attendance: Attendance[],
  message: string,
): Promise<ActionResult<{ tableName: string | null }>> {
  const store = getStore();
  const invite = await store.getInvite(inviteId);
  if (!invite) return { ok: false, error: "Convite não encontrado." };

  const valid =
    attendance.length === invite.people.length && attendance.every((a) => a === "yes" || a === "no");
  if (!valid) return { ok: false, error: "Responda por cada pessoa do convite." };

  const updated = await store.updateInvite(inviteId, {
    attendance,
    message: message.trim().slice(0, MESSAGE_MAX_LENGTH),
  });

  let tableName: string | null = null;
  if (updated.tableNumber) {
    const tables = await store.listTables();
    tableName = tables.find((t) => t.number === updated.tableNumber)?.name ?? null;
  }

  revalidatePath(`/i/${inviteId}`);
  return { ok: true, data: { tableName } };
}

export async function reserveGift(inviteId: string, giftId: string): Promise<ActionResult> {
  const store = getStore();
  const invite = await store.getInvite(inviteId);
  if (!invite) return { ok: false, error: "Convite não encontrado." };

  try {
    await store.reserveGift(giftId, inviteId, invite.label);
  } catch (error) {
    if (error instanceof GiftTakenError) {
      return { ok: false, error: "Este presente acabou de ser escolhido por outro convidado." };
    }
    throw error;
  }

  revalidatePath(`/i/${inviteId}`);
  return { ok: true, data: undefined };
}
