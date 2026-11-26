import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loadSharedEnv } from "./env";

/**
 * Admin sessions. Two ways in:
 * - Google sign-in (when GOOGLE_OAUTH_CLIENT_ID/SECRET and ADMIN_EMAILS are set): only the listed e-mails.
 * - A shared password (HOST_PASSWORD), used only while Google sign-in is not configured.
 *
 * The session cookie holds `<who>.<expiry>.<signature>`, signed with AUTH_SECRET.
 */
const COOKIE_NAME = "host_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_SUBJECT = "password";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function hostPassword(): string {
  loadSharedEnv();
  const password = process.env.HOST_PASSWORD;
  if (password) return password;
  if (isProduction() && !googleSignInEnabled()) {
    throw new Error("Set HOST_PASSWORD, or configure Google sign-in, in production.");
  }
  return "noivos"; // development default
}

function signingSecret(): string {
  loadSharedEnv();
  const secret = process.env.AUTH_SECRET || process.env.HOST_PASSWORD;
  if (secret) return secret;
  if (isProduction()) throw new Error("AUTH_SECRET must be set in production.");
  return "dev-only-secret";
}

/** Lower-cased e-mails allowed into the admin app (ADMIN_EMAILS, comma or space separated). */
export function adminEmails(): string[] {
  loadSharedEnv();
  return (process.env.ADMIN_EMAILS ?? "")
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function googleOAuthClient(): { clientId: string; clientSecret: string } | null {
  loadSharedEnv();
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function googleSignInEnabled(): boolean {
  return Boolean(googleOAuthClient()) && adminEmails().length > 0;
}

export function isAllowedEmail(email: string): boolean {
  return adminEmails().includes(email.trim().toLowerCase());
}

function sign(payload: string): string {
  return createHmac("sha256", signingSecret()).update(`wedding-host-session:${payload}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function checkPassword(candidate: string): boolean {
  if (googleSignInEnabled()) return false;
  return safeEqual(candidate, hostPassword());
}

/** The session cookie for `subject`: the signed-in Google e-mail, or "password". */
export function sessionCookie(subject: string = PASSWORD_SUBJECT) {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `${Buffer.from(subject.toLowerCase()).toString("base64url")}.${expires}`;
  return {
    name: COOKIE_NAME,
    value: `${payload}.${sign(payload)}`,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction(),
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

/** Starts a password session (from a server action). Google sign-in sets `sessionCookie(email)` itself. */
export async function startHostSession() {
  (await cookies()).set(sessionCookie());
}

export async function endHostSession() {
  (await cookies()).delete(COOKIE_NAME);
}

/** The signed-in e-mail ("password" for a password session), or null. */
export async function currentHost(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [subjectPart, expiresPart, signature] = token.split(".");
  if (!subjectPart || !expiresPart || !signature) return null;
  if (!safeEqual(signature, sign(`${subjectPart}.${expiresPart}`))) return null;
  if (Number(expiresPart) * 1000 < Date.now()) return null;

  const subject = Buffer.from(subjectPart, "base64url").toString();
  if (googleSignInEnabled()) {
    // Removing an e-mail from ADMIN_EMAILS signs that person out on their next request.
    return subject !== PASSWORD_SUBJECT && isAllowedEmail(subject) ? subject : null;
  }
  return subject === PASSWORD_SUBJECT ? subject : null;
}

export async function isHost(): Promise<boolean> {
  return (await currentHost()) !== null;
}

/** Use at the top of every admin page and admin server action. */
export async function requireHost() {
  if (!(await isHost())) redirect("/login");
}
