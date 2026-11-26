"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { wedding } from "@wedding/core/wedding";
import { getStore } from "@wedding/core/data/store";
import { defaultInviteLabel, nowStamp } from "@wedding/core/data/invite-helpers";
import type { Attendance } from "@wedding/core/data/types";
import { checkPassword, endHostSession, requireHost, startHostSession } from "@wedding/core/host-auth";

/** After a change: drop cached pages and refresh the screen the couple is looking at. */
function refreshAdmin() {
  revalidatePath("/", "layout");
  refresh();
}

// ---------------------------------------------------------------- session

export async function logIn(_prev: { error: string } | null, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) return { error: "Palavra-passe incorreta." };
  await startHostSession();
  redirect("/guests");
}

export async function logOut() {
  await endHostSession();
  redirect("/login");
}

// ---------------------------------------------------------------- invites

export async function createInvite(names: string[]) {
  await requireHost();
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length === 0) return null;
  const invite = await getStore().createInvite(clean);
  refreshAdmin();
  return invite;
}

export async function setInviteTable(inviteId: string, tableNumber: number | null) {
  await requireHost();
  await getStore().updateInvite(inviteId, { tableNumber });
  refreshAdmin();
}

export async function markInviteSent(inviteId: string) {
  await requireHost();
  const store = getStore();
  const invite = await store.getInvite(inviteId);
  if (invite && !invite.sentAt) {
    await store.updateInvite(inviteId, { sentAt: nowStamp(wedding.timeZone) });
    refreshAdmin();
  }
}

export async function saveInvite(
  inviteId: string,
  input: { label: string; names: string[]; phone: string; attendance: Attendance[] },
) {
  await requireHost();
  const names = input.names.map((n) => n.trim().slice(0, 80)).filter(Boolean);
  if (names.length === 0) return { error: "O convite precisa de pelo menos uma pessoa." };
  const attendance = input.attendance.slice(0, names.length).map((a) => (a === "yes" || a === "no" ? a : ""));
  await getStore().updateInvite(inviteId, {
    label: input.label.trim().slice(0, 80) || defaultInviteLabel(names),
    names,
    phone: input.phone.replace(/[^\d+ ]/g, "").trim().slice(0, 20),
    attendance,
  });
  refreshAdmin();
  return { error: null };
}

export async function deleteInvite(inviteId: string) {
  await requireHost();
  await getStore().deleteInvite(inviteId);
  refreshAdmin();
}

// ---------------------------------------------------------------- tables

export async function addTable() {
  await requireHost();
  const table = await getStore().addTable("Nova mesa", wedding.defaultTableCapacity);
  refreshAdmin();
  return table;
}

export async function updateTable(number: number, patch: { name?: string; capacity?: number }) {
  await requireHost();
  const clean: { name?: string; capacity?: number } = {};
  if (patch.name !== undefined) clean.name = patch.name.trim().slice(0, 60) || "Mesa";
  if (patch.capacity !== undefined) clean.capacity = Math.min(20, Math.max(2, Math.round(patch.capacity)));
  await getStore().updateTable(number, clean);
  refreshAdmin();
}

export async function removeTable(number: number) {
  await requireHost();
  await getStore().removeTable(number);
  refreshAdmin();
}

// ---------------------------------------------------------------- gifts

export async function addGift(title: string) {
  await requireHost();
  const clean = title.trim().slice(0, 120);
  if (!clean) return;
  await getStore().addGift(clean);
  refreshAdmin();
}

export async function renameGift(giftId: string, title: string) {
  await requireHost();
  const clean = title.trim().slice(0, 120);
  if (!clean) return;
  await getStore().renameGift(giftId, clean);
  refreshAdmin();
}

export async function releaseGift(giftId: string) {
  await requireHost();
  await getStore().releaseGift(giftId);
  refreshAdmin();
}

export async function removeGift(giftId: string) {
  await requireHost();
  await getStore().removeGift(giftId);
  refreshAdmin();
}
