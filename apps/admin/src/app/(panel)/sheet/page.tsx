import type { Metadata } from "next";
import { SheetOverview } from "@/components/admin/SheetOverview";
import { loadSheetOverview, spreadsheetUrl } from "@/lib/admin-view";

export const metadata: Metadata = { title: "Folha" };

export default async function SheetPage() {
  const data = await loadSheetOverview();
  return <SheetOverview data={data} sheetUrl={spreadsheetUrl()} />;
}
