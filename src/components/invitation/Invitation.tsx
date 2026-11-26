import { weddingDateDots, weddingDateLong } from "@/lib/wedding-date";
import { CoverSection } from "./CoverSection";
import { GallerySection } from "./GallerySection";
import { GiftsSection } from "./GiftsSection";
import { ProgramSection } from "./ProgramSection";
import { RsvpSection } from "./RsvpSection";
import { SaveTheDateSection } from "./SaveTheDateSection";
import type { GuestGift, GuestInvite } from "./types";
import { VenueSection } from "./VenueSection";

interface InvitationProps {
  invite: GuestInvite | null;
  gifts: GuestGift[];
}

/** The whole guest-facing invitation, one section per screen of the design. */
export function Invitation({ invite, gifts }: InvitationProps) {
  return (
    <main>
      <CoverSection guestLabel={invite?.label ?? null} dateLabel={weddingDateDots()} />
      <SaveTheDateSection />
      <ProgramSection />
      <VenueSection />
      <RsvpSection invite={invite} weddingDayLabel={weddingDateLong()} />
      <GallerySection />
      <GiftsSection invite={invite} gifts={gifts} />
    </main>
  );
}
