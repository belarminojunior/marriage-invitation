"use client";

import { useActionState } from "react";
import { logIn } from "@/app/actions/host";
import styles from "./host.module.css";

export function LoginForm() {
  const [state, action, pending] = useActionState(logIn, null);

  return (
    <main className={styles.login}>
      <form className={styles.loginCard} action={action}>
        <div className={styles.headerTitles}>
          <span className={styles.kicker} style={{ color: "var(--bronze)" }}>
            Painel dos noivos
          </span>
          <h1 className={styles.title}>Entrar</h1>
        </div>
        <label className={styles.sheetLabel}>
          Palavra-passe
          <input
            className={styles.input}
            style={{ flex: "none", letterSpacing: 0, textTransform: "none", fontFamily: "var(--sans)" }}
            type="password"
            name="password"
            autoComplete="current-password"
            required
            autoFocus
          />
        </label>
        {state?.error && (
          <p className={styles.loginError} role="alert">
            {state.error}
          </p>
        )}
        <button type="submit" className={styles.doneButton} disabled={pending}>
          {pending ? "A entrar…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
