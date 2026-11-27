import { HostGifts } from "@/components/admin/HostGifts";
import { loadHostGifts, spreadsheetUrl } from "@/lib/admin-view";
import { getStore } from "@wedding/core/data/store";

export default async function HostGiftsPage() {
  const [gifts, event] = await Promise.all([loadHostGifts(), getStore().getEvent()]);
  return <HostGifts gifts={gifts} sheetUrl={spreadsheetUrl()} giftsEnabled={event.giftsEnabled} />;
}
