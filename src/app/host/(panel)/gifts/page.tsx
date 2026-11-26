import { HostGifts } from "@/components/host/HostGifts";
import { loadHostGifts, spreadsheetUrl } from "@/lib/host-view";

export default async function HostGiftsPage() {
  const gifts = await loadHostGifts();
  return <HostGifts gifts={gifts} sheetUrl={spreadsheetUrl()} />;
}
