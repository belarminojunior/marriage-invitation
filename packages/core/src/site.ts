import { loadSharedEnv } from "./env";

/** Public base URL of the guest invitation app. Both apps use it to build personal invitation links. */
export function siteUrl(): string {
  loadSharedEnv();
  const url = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

export function personalLink(inviteId: string): string {
  return `${siteUrl()}/i/${inviteId}`;
}

/** Link without the protocol, for display ("convite.example.com/i/a7k2"). */
export function displayLink(inviteId: string): string {
  return personalLink(inviteId).replace(/^https?:\/\//, "");
}
