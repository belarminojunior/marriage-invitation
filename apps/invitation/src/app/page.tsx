import { Invitation } from "@/components/invitation/Invitation";
import { loadGuestGifts } from "@/lib/guest-view";

export const dynamic = "force-dynamic";

/** Public, non-personal version of the invitation. RSVP and gift reservations need a personal link. */
export default async function HomePage() {
  const gifts = await loadGuestGifts(null);
  return <Invitation invite={null} gifts={gifts} />;
}
