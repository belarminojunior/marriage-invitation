import { HostGifts } from "@/components/admin/HostGifts";
import { loadHostGifts, spreadsheetUrl } from "@/lib/admin-view";

export default async function HostGiftsPage() {
  const gifts = await loadHostGifts();
  return <HostGifts gifts={gifts} sheetUrl={spreadsheetUrl()} />;
}
