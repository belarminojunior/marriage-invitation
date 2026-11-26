import type { Attendance, InviteStatus } from "@wedding/core/data/types";

export interface HostInviteRow {
  id: string;
  label: string;
  people: string[];
  going: string[];
  status: InviteStatus;
  tableNumber: number | null;
  seats: number;
  link: string;
  displayLink: string;
  phone: string;
  /** One answer per person, same order as `people`. */
  attendance: Attendance[];
  message: string;
}

export interface HostTableRow {
  number: number;
  name: string;
  capacity: number;
}

export interface HostGiftRow {
  id: string;
  title: string;
  reservedBy: string;
  phone: string;
}

/** Spreadsheet overview: one row per person, like the "Convidados" tab. */
export interface SheetPersonRow {
  name: string;
  invite: string;
  link: string;
  table: string;
  sent: string;
  opened: string;
  attendance: "yes" | "no" | "";
  message: string;
}

export interface SheetGiftRow {
  title: string;
  reserved: boolean;
  reservedBy: string;
  link: string;
  reservedAt: string;
}

export interface SheetTableRow {
  number: number;
  name: string;
  capacity: number;
  used: number;
  guests: string;
}

export interface SheetOverviewData {
  people: SheetPersonRow[];
  gifts: SheetGiftRow[];
  tables: SheetTableRow[];
}
