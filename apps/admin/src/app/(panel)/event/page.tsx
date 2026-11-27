import type { Metadata } from "next";
import { EventEditor } from "@/components/admin/EventEditor";
import { spreadsheetUrl } from "@/lib/admin-view";
import { getStore } from "@wedding/core/data/store";
import { loadSharedEnv } from "@wedding/core/env";

export const metadata: Metadata = { title: "Evento" };

export default async function EventPage() {
  loadSharedEnv();
  const event = await getStore().getEvent();
  return <EventEditor initial={event} uploadsEnabled={Boolean(process.env.BLOB_READ_WRITE_TOKEN)} sheetUrl={spreadsheetUrl()} />;
}
