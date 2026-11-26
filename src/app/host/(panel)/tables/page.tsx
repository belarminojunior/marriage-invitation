import { HostTables } from "@/components/host/HostTables";
import { loadHostInvites, loadHostTables, spreadsheetUrl } from "@/lib/host-view";

export default async function HostTablesPage() {
  const [invites, tables] = await Promise.all([loadHostInvites(), loadHostTables()]);
  return <HostTables invites={invites} tables={tables} sheetUrl={spreadsheetUrl()} />;
}
