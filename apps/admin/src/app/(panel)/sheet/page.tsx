import type { Metadata } from "next";
import { SheetOverview } from "@/components/admin/SheetOverview";
import { loadSheetOverview, spreadsheetUrl } from "@/lib/admin-view";
import { getStore } from "@wedding/core/data/store";
import { coupleNamesOf } from "@wedding/core/event";

export const metadata: Metadata = { title: "Folha" };

export default async function SheetPage() {
  const [data, event] = await Promise.all([loadSheetOverview(), getStore().getEvent()]);
  return <SheetOverview data={data} sheetUrl={spreadsheetUrl()} coupleNames={coupleNamesOf(event)} />;
}
