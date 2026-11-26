import { HostTabBar } from "@/components/admin/HostChrome";
import styles from "@/components/admin/host.module.css";
import { requireHost } from "@wedding/core/host-auth";

export const dynamic = "force-dynamic";


export default async function HostPanelLayout({ children }: { children: React.ReactNode }) {
  await requireHost();
  return (
    <div className={styles.shell}>
      <div className={styles.frame}>{children}</div>
      <HostTabBar />
    </div>
  );
}
