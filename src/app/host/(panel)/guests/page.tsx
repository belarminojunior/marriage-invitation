import { HostGuests } from "@/components/host/HostGuests";
import { loadHostInvites, loadHostTables, spreadsheetUrl } from "@/lib/host-view";

export default async function HostGuestsPage() {
  const [invites, tables] = await Promise.all([loadHostInvites(), loadHostTables()]);
  return <HostGuests invites={invites} tables={tables} sheetUrl={spreadsheetUrl()} />;
}
