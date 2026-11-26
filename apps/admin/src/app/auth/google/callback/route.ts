import { NextResponse, type NextRequest } from "next/server";
import { googleOAuthClient, isAllowedEmail, sessionCookie } from "@wedding/core/host-auth";
import { OAUTH_STATE_COOKIE, redirectUri, verifiedEmailFromCode } from "@/lib/google-oauth";

/** Google sends the browser back here after the person picks an account. */
export async function GET(request: NextRequest) {
  const fail = (reason: string) => {
    const response = NextResponse.redirect(new URL(`/login?error=${reason}`, request.url));
    response.cookies.delete({ name: OAUTH_STATE_COOKIE, path: "/auth/google" });
    return response;
  };

  const client = googleOAuthClient();
  if (!client) return fail("google-off");

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (params.get("error")) return fail("cancelled");
  if (!code || !state || !expectedState || state !== expectedState) return fail("expired");

  const email = await verifiedEmailFromCode(code, client, redirectUri(request));
  if (!email) return fail("google");
  if (!isAllowedEmail(email)) return fail("not-allowed");

  const response = NextResponse.redirect(new URL("/guests", request.url));
  response.cookies.set(sessionCookie(email));
  response.cookies.delete({ name: OAUTH_STATE_COOKIE, path: "/auth/google" });
  return response;
}
