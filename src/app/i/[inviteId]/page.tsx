import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { coupleNames, wedding } from "@/config/wedding";
import { Invitation } from "@/components/invitation/Invitation";
import { nowStamp } from "@/lib/data/invite-helpers";
import { getStore } from "@/lib/data/store";
import { toGuestGifts, toGuestInvite } from "@/lib/guest-view";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ inviteId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { inviteId } = await params;
  const invite = await getStore().getInvite(inviteId);
  return {
    title: invite ? `Para ${invite.label} · ${coupleNames}` : coupleNames,
    robots: { index: false, follow: false },
  };
}

/** A guest's personal invitation link. */
export default async function PersonalInvitePage({ params }: PageProps) {
  const { inviteId } = await params;
  const store = getStore();
  const [invite, tables, gifts] = await Promise.all([
    store.getInvite(inviteId),
    store.listTables(),
    store.listGifts(),
  ]);
  if (!invite) notFound();

  if (!invite.openedAt) {
    // Record the first time the guest opens the link, without delaying the page.
    after(() => store.updateInvite(invite.id, { openedAt: nowStamp(wedding.timeZone) }));
  }

  return <Invitation invite={toGuestInvite(invite, tables)} gifts={toGuestGifts(gifts, invite.id)} />;
}
