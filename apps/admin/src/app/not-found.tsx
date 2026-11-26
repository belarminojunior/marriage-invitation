import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        textAlign: "center",
        background: "var(--paper-light)",
      }}
    >
      <h1 style={{ margin: 0, fontFamily: "var(--serif)", fontWeight: 400, fontSize: 28 }}>Página não encontrada</h1>
      <Link href="/guests">Voltar ao painel</Link>
    </main>
  );
}
