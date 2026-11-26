import type { InviteStatus } from "@/lib/data/types";

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
