import type { Attendance } from "@wedding/core/data/types";

/** What a guest's browser receives about their own invite — nothing about other guests. */
export interface GuestInvite {
  id: string;
  label: string;
  people: { name: string; attendance: Attendance }[];
  message: string;
  tableName: string | null;
}

export type GuestGiftState = "free" | "taken" | "mine";

export interface GuestGift {
  id: string;
  title: string;
  category: string;
  state: GuestGiftState;
}
