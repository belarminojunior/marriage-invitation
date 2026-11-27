import type { EventSettings } from "@wedding/core/event";
import { weddingDateDots, weddingDateLong } from "@wedding/core/wedding-date";
import { CoverSection } from "./CoverSection";
import { GallerySection } from "./GallerySection";
import { GiftsSection } from "./GiftsSection";
import { ProgramSection } from "./ProgramSection";
import { RsvpSection } from "./RsvpSection";
import { SaveTheDateSection } from "./SaveTheDateSection";
import type { GuestGift, GuestInvite } from "./types";
import { VenueSection } from "./VenueSection";

interface InvitationProps {
  event: EventSettings;
  invite: GuestInvite | null;
  gifts: GuestGift[];
}

/** The whole guest-facing invitation, one section per screen of the design. */
export function Invitation({ event, invite, gifts }: InvitationProps) {
  return (
    <main>
      <CoverSection event={event} guestLabel={invite?.label ?? null} dateLabel={weddingDateDots(event.date)} />
      <SaveTheDateSection event={event} />
      <ProgramSection event={event} />
      <VenueSection event={event} />
      <RsvpSection
        invite={invite}
        weddingDayLabel={weddingDateLong(event.date)}
        deadline={event.rsvpDeadline}
        giftsEnabled={event.giftsEnabled}
      />
      <GallerySection photos={event.galleryPhotos} quote={event.galleryQuote} />
      {event.giftsEnabled && <GiftsSection invite={invite} gifts={gifts} />}
    </main>
  );
}
