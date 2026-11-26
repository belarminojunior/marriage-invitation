import { HostGuests } from "@/components/admin/HostGuests";
import { loadHostInvites, loadHostTables, spreadsheetUrl } from "@/lib/admin-view";

export default async function HostGuestsPage() {
  const [invites, tables] = await Promise.all([loadHostInvites(), loadHostTables()]);
  return <HostGuests invites={invites} tables={tables} sheetUrl={spreadsheetUrl()} />;
}
