export type Attendance = "yes" | "no" | "";

export interface InvitePerson {
  name: string;
  attendance: Attendance;
}

/** One personal invitation link, shared by one or more people (a couple, a family…). */
export interface Invite {
  id: string;
  /** Display name, e.g. "Família Machava". Defaults to the people's names. */
  label: string;
  people: InvitePerson[];
  tableNumber: number | null;
  phone: string;
  sentAt: string;
  openedAt: string;
  message: string;
}

export type InviteStatus = "new" | "sent" | "opened" | "accepted" | "declined";

export interface Gift {
  id: string;
  title: string;
  category: string;
  reservedBy: string;
  inviteId: string;
  reservedAt: string;
}

export interface SeatingTable {
  number: number;
  name: string;
  capacity: number;
}

export interface InvitePatch {
  label?: string;
  tableNumber?: number | null;
  phone?: string;
  sentAt?: string;
  openedAt?: string;
  message?: string;
  attendance?: Attendance[];
}

export interface WeddingStore {
  listInvites(): Promise<Invite[]>;
  getInvite(id: string): Promise<Invite | null>;
  createInvite(names: string[]): Promise<Invite>;
  updateInvite(id: string, patch: InvitePatch): Promise<Invite>;

  listGifts(): Promise<Gift[]>;
  addGift(title: string, category?: string): Promise<Gift>;
  /** Reserves a gift for an invite. Throws GiftTakenError if someone else already has it. */
  reserveGift(giftId: string, inviteId: string, reservedBy: string): Promise<Gift>;
  releaseGift(giftId: string): Promise<void>;
  removeGift(giftId: string): Promise<void>;

  listTables(): Promise<SeatingTable[]>;
  addTable(name: string, capacity: number): Promise<SeatingTable>;
  updateTable(number: number, patch: Partial<Omit<SeatingTable, "number">>): Promise<void>;
}

export class GiftTakenError extends Error {
  constructor() {
    super("This gift has already been reserved by another guest.");
    this.name = "GiftTakenError";
  }
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found.`);
    this.name = "NotFoundError";
  }
}
