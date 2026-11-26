import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "host_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function hostPassword(): string {
  const password = process.env.HOST_PASSWORD;
  if (password) return password;
  if (process.env.NODE_ENV === "production") {
    throw new Error("HOST_PASSWORD must be set in production.");
  }
  return "noivos"; // development default
}

function sessionToken(): string {
  return createHmac("sha256", hostPassword()).update("wedding-host-session").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function checkPassword(candidate: string): boolean {
  return safeEqual(candidate, hostPassword());
}

export async function startHostSession() {
  (await cookies()).set(COOKIE_NAME, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endHostSession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function isHost(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return Boolean(token && safeEqual(token, sessionToken()));
}

/** Use at the top of every host page and host server action. */
export async function requireHost() {
  if (!(await isHost())) redirect("/host/login");
}
