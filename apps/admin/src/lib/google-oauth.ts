import "server-only";
import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";

/** Short-lived cookie that ties Google's callback to the browser that started the sign-in. */
export const OAUTH_STATE_COOKIE = "google_oauth_state";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export function newState(): string {
  return randomBytes(24).toString("base64url");
}

/** The callback address registered in Google Cloud: <admin origin>/auth/google/callback. */
export function redirectUri(request: NextRequest): string {
  return `${request.nextUrl.origin}/auth/google/callback`;
}

export function authorizeUrl(clientId: string, redirect: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: "code",
    scope: "openid email",
    state,
    prompt: "select_account",
  });
  return `${AUTHORIZE_URL}?${params}`;
}

/**
 * Exchanges the authorization code for an ID token and returns the verified e-mail.
 * The token comes straight from Google over TLS, so its claims can be read without checking the signature
 * (OpenID Connect Core §3.1.3.7); we still check the audience, issuer, expiry and e-mail verification.
 */
export async function verifiedEmailFromCode(
  code: string,
  client: { clientId: string; clientSecret: string },
  redirect: string,
): Promise<string | null> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: client.clientId,
      client_secret: client.clientSecret,
      redirect_uri: redirect,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!response.ok) return null;

  const { id_token: idToken } = (await response.json()) as { id_token?: string };
  const payloadPart = idToken?.split(".")[1];
  if (!payloadPart) return null;

  const claims = JSON.parse(Buffer.from(payloadPart, "base64url").toString()) as {
    aud?: string;
    iss?: string;
    exp?: number;
    email?: string;
    email_verified?: boolean;
  };
  const issuerOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  const fresh = typeof claims.exp === "number" && claims.exp * 1000 > Date.now();
  if (claims.aud !== client.clientId || !issuerOk || !fresh) return null;
  if (!claims.email || claims.email_verified !== true) return null;
  return claims.email.toLowerCase();
}
