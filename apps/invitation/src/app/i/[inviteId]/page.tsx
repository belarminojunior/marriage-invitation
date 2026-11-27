import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { wedding } from "@wedding/core/wedding";
import { coupleNamesOf } from "@wedding/core/event";
import { Invitation } from "@/components/invitation/Invitation";
import { nowStamp } from "@wedding/core/data/invite-helpers";
import { getStore } from "@wedding/core/data/store";
import { toGuestGifts, toGuestInvite } from "@/lib/guest-view";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ inviteId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { inviteId } = await params;
  const [invite, event] = await Promise.all([getStore().getInvite(inviteId), getStore().getEvent()]);
  const couple = coupleNamesOf(event);
  return {
    title: invite ? `Para ${invite.label} · ${couple}` : couple,
    robots: { index: false, follow: false },
  };
}

/** A guest's personal invitation link. */
export default async function PersonalInvitePage({ params }: PageProps) {
  const { inviteId } = await params;
  const store = getStore();
  const [invite, tables, gifts, event] = await Promise.all([
    store.getInvite(inviteId),
    store.listTables(),
    store.listGifts(),
    store.getEvent(),
  ]);
  if (!invite) notFound();

  if (!invite.openedAt) {
    // Record the first time the guest opens the link, without delaying the page.
    after(() => store.updateInvite(invite.id, { openedAt: nowStamp(wedding.timeZone) }));
  }

  return (
    <Invitation
      event={event}
      invite={toGuestInvite(invite, tables)}
      gifts={event.giftsEnabled ? toGuestGifts(gifts, invite.id) : []}
    />
  );
}
