import type { Metadata } from "next";
import { HostTabBar } from "@/components/host/HostChrome";
import styles from "@/components/host/host.module.css";
import { requireHost } from "@/lib/host-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Painel dos noivos",
  robots: { index: false, follow: false },
};

export default async function HostPanelLayout({ children }: { children: React.ReactNode }) {
  await requireHost();
  return (
    <div className={styles.shell}>
      <div className={styles.frame}>{children}</div>
      <HostTabBar />
    </div>
  );
}
