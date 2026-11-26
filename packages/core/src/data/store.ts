import "server-only";
import { loadSharedEnv } from "../env";
import { MemoryStore } from "./memory-store";
import { SheetsStore } from "./sheets-store";
import type { WeddingStore } from "./types";

const globalForStore = globalThis as unknown as { __weddingStore?: WeddingStore };

export function isSheetsConfigured(): boolean {
  loadSharedEnv();
  return Boolean(
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY,
  );
}

/**
 * Returns the Google Sheets store when credentials are present,
 * otherwise an in-memory demo store seeded with sample data.
 */
export function getStore(): WeddingStore {
  if (globalForStore.__weddingStore) return globalForStore.__weddingStore;
  loadSharedEnv();

  let store: WeddingStore;
  if (isSheetsConfigured()) {
    store = new SheetsStore({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      // Keys pasted into .env usually carry literal "\n" sequences.
      privateKey: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    });
  } else {
    if (process.env.NODE_ENV === "production") {
      console.warn("[wedding] Google Sheets is not configured — using the in-memory demo store.");
    }
    store = new MemoryStore();
  }

  globalForStore.__weddingStore = store;
  return store;
}
