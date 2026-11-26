"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { wedding } from "@/config/wedding";
import { getStore } from "@/lib/data/store";
import { nowStamp } from "@/lib/data/invite-helpers";
import { checkPassword, endHostSession, requireHost, startHostSession } from "@/lib/host-auth";

function refreshHost() {
  revalidatePath("/host", "layout");
}

// ---------------------------------------------------------------- session

export async function logIn(_prev: { error: string } | null, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) return { error: "Palavra-passe incorreta." };
  await startHostSession();
  redirect("/host/guests");
}

export async function logOut() {
  await endHostSession();
  redirect("/host/login");
}

// ---------------------------------------------------------------- invites

export async function createInvite(names: string[]) {
  await requireHost();
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length === 0) return null;
  const invite = await getStore().createInvite(clean);
  refreshHost();
  return invite;
}

export async function setInviteTable(inviteId: string, tableNumber: number | null) {
  await requireHost();
  await getStore().updateInvite(inviteId, { tableNumber });
  refreshHost();
}

export async function markInviteSent(inviteId: string) {
  await requireHost();
  const store = getStore();
  const invite = await store.getInvite(inviteId);
  if (invite && !invite.sentAt) {
    await store.updateInvite(inviteId, { sentAt: nowStamp(wedding.timeZone) });
    refreshHost();
  }
}

// ---------------------------------------------------------------- tables

export async function addTable() {
  await requireHost();
  const table = await getStore().addTable("Nova mesa", wedding.defaultTableCapacity);
  refreshHost();
  return table;
}

export async function updateTable(number: number, patch: { name?: string; capacity?: number }) {
  await requireHost();
  const clean: { name?: string; capacity?: number } = {};
  if (patch.name !== undefined) clean.name = patch.name.trim().slice(0, 60) || "Mesa";
  if (patch.capacity !== undefined) clean.capacity = Math.min(20, Math.max(2, Math.round(patch.capacity)));
  await getStore().updateTable(number, clean);
  refreshHost();
}

// ---------------------------------------------------------------- gifts

export async function addGift(title: string) {
  await requireHost();
  const clean = title.trim().slice(0, 120);
  if (!clean) return;
  await getStore().addGift(clean);
  refreshHost();
}

export async function releaseGift(giftId: string) {
  await requireHost();
  await getStore().releaseGift(giftId);
  refreshHost();
}

export async function removeGift(giftId: string) {
  await requireHost();
  await getStore().removeGift(giftId);
  refreshHost();
}
