import { HostGuests } from "@/components/admin/HostGuests";
import { loadHostInvites, loadHostTables, spreadsheetUrl } from "@/lib/admin-view";
import { getStore } from "@wedding/core/data/store";
import { coupleNamesOf } from "@wedding/core/event";

export default async function HostGuestsPage() {
  const [invites, tables, event] = await Promise.all([loadHostInvites(), loadHostTables(), getStore().getEvent()]);
  return <HostGuests invites={invites} tables={tables} sheetUrl={spreadsheetUrl()} coupleNames={coupleNamesOf(event)} />;
}
