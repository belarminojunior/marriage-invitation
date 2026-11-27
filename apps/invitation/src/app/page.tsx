import { Invitation } from "@/components/invitation/Invitation";
import { loadGuestGifts } from "@/lib/guest-view";
import { getStore } from "@wedding/core/data/store";

export const dynamic = "force-dynamic";

/** Public, non-personal version of the invitation. RSVP and gift reservations need a personal link. */
export default async function HomePage() {
  const event = await getStore().getEvent();
  const gifts = event.giftsEnabled ? await loadGuestGifts(null) : [];
  return <Invitation event={event} invite={null} gifts={gifts} />;
}
