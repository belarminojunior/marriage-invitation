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
        background: "var(--paper)",
      }}
    >
      <h1 style={{ margin: 0, fontFamily: "var(--script)", fontWeight: 400, fontSize: 46, color: "var(--gold-text)" }}>
        Convite não encontrado
      </h1>
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-soft)", maxWidth: 320, lineHeight: 1.6 }}>
        Este link não é válido. Confirme o link pessoal que recebeu dos noivos.
      </p>
      <Link href="/">Ver o convite</Link>
    </main>
  );
}
