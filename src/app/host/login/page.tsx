import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/host/LoginForm";
import { isHost } from "@/lib/host-auth";

export const metadata: Metadata = {
  title: "Entrar · Painel dos noivos",
  robots: { index: false, follow: false },
};

export default async function HostLoginPage() {
  if (await isHost()) redirect("/host/guests");
  return <LoginForm />;
}
