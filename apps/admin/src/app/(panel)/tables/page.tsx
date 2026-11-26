import { HostTables } from "@/components/admin/HostTables";
import { loadHostInvites, loadHostTables, spreadsheetUrl } from "@/lib/admin-view";

export default async function HostTablesPage() {
  const [invites, tables] = await Promise.all([loadHostInvites(), loadHostTables()]);
  return <HostTables invites={invites} tables={tables} sheetUrl={spreadsheetUrl()} />;
}
