import { NextResponse, type NextRequest } from "next/server";
import { googleOAuthClient } from "@wedding/core/host-auth";
import { OAUTH_STATE_COOKIE, authorizeUrl, newState, redirectUri } from "@/lib/google-oauth";

/** Starts "Entrar com Google": sends the browser to Google's account chooser. */
export async function GET(request: NextRequest) {
  const client = googleOAuthClient();
  if (!client) return NextResponse.redirect(new URL("/login?error=google-off", request.url));

  const state = newState();
  const response = NextResponse.redirect(authorizeUrl(client.clientId, redirectUri(request), state));
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/auth/google",
    maxAge: 10 * 60,
  });
  return response;
}
