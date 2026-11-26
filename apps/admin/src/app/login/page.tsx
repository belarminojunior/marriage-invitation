import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { googleSignInEnabled, isHost } from "@wedding/core/host-auth";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  "not-allowed": "Esta conta Google não tem acesso ao painel. Entre com a conta dos noivos.",
  cancelled: "O início de sessão com Google foi cancelado.",
  expired: "O pedido expirou. Tente novamente.",
  google: "Não foi possível confirmar a conta Google. Tente novamente.",
  "google-off": "O início de sessão com Google não está configurado.",
};

export default async function HostLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isHost()) redirect("/guests");
  const { error } = await searchParams;
  return <LoginForm google={googleSignInEnabled()} error={(error && ERRORS[error]) ?? null} />;
}
