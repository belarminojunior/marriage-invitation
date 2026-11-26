import { wedding } from "../wedding";
import { defaultInviteLabel, newId, nowStamp } from "./invite-helpers";
import {
  GiftTakenError,
  NotFoundError,
  type Gift,
  type Invite,
  type InvitePatch,
  type SeatingTable,
  type WeddingStore,
} from "./types";

/**
 * In-memory store used when Google Sheets is not configured (local development / demo).
 * Data is seeded with sample guests and resets when the server restarts.
 */
interface MemoryData {
  invites: Invite[];
  gifts: Gift[];
  tables: SeatingTable[];
}

function person(name: string, attendance: "yes" | "no" | "" = "") {
  return { name, attendance };
}

function seed(): MemoryData {
  const invite = (
    id: string,
    names: [string, "yes" | "no" | ""][],
    extra: Partial<Invite> = {},
  ): Invite => ({
    id,
    label: defaultInviteLabel(names.map(([n]) => n)),
    people: names.map(([n, a]) => person(n, a)),
    tableNumber: null,
    phone: "",
    sentAt: "",
    openedAt: "",
    message: "",
    ...extra,
  });

  return {
    invites: [
      invite("a7k2", [["Convidado 01", "yes"], ["Acompanhante 01", "yes"]], {
        tableNumber: 1, sentAt: "2026-11-20 10:00", openedAt: "2026-11-20 12:10",
      }),
      invite("m3p9", [["Convidado 02", "yes"]], {
        tableNumber: 1, sentAt: "2026-11-20 10:00", openedAt: "2026-11-21 09:00", message: "Vegetariano",
      }),
      invite("z1r6", [["Convidado 04", "yes"], ["Acompanhante 04", "yes"], ["Filho 04", "no"], ["Filha 04", "yes"]], {
        tableNumber: 2, sentAt: "2026-11-21 10:00", openedAt: "2026-11-21 19:30",
      }),
      invite("q8d4", [["Convidado 03", "no"], ["Acompanhante 03", "no"]], {
        sentAt: "2026-11-20 10:00", openedAt: "2026-11-22 08:00", message: "Vamos estar fora",
      }),
      invite("c9w3", [["Convidado 06", ""], ["Acompanhante 06", ""]], {
        tableNumber: 1, sentAt: "2026-11-22 10:00", openedAt: "2026-11-22 15:00",
      }),
      invite("u4n8", [["Convidado 07", ""]], { sentAt: "2026-11-22 10:00" }),
      invite("e2j7", [["Convidado 08", ""], ["Acompanhante 08", ""], ["Filho 08", ""]]),
    ],
    gifts: [
      ["Serviço de jantar (12 peças)", "Cozinha", "Convidado 01", "a7k2", "2026-11-20 18:02"],
      ["Micro-ondas", "Cozinha"],
      ["Jogo de lençóis (casal)", "Quarto"],
      ["Liquidificadora", "Cozinha", "Convidado 04", "z1r6", "2026-11-21 20:15"],
      ["Conjunto de panelas", "Cozinha"],
      ["Conjunto de toalhas de banho", "Casa de banho", "Convidado 02", "m3p9", "2026-11-23 09:47"],
      ["Fritadeira de ar", "Cozinha"],
      ["Ferro e tábua de engomar", "Casa"],
      ["Copos de vinho (6)", "Sala de jantar"],
    ].map(([title, category, reservedBy = "", inviteId = "", reservedAt = ""], i) => ({
      id: String(i + 1), title, category, reservedBy, inviteId, reservedAt,
    })),
    tables: wedding.defaultTables.map((name, i) => ({
      number: i + 1, name, capacity: wedding.defaultTableCapacity,
    })),
  };
}

const globalForStore = globalThis as unknown as { __weddingMemoryData?: MemoryData };

function data(): MemoryData {
  globalForStore.__weddingMemoryData ??= seed();
  return globalForStore.__weddingMemoryData;
}

const clone = <T,>(value: T): T => structuredClone(value);

export class MemoryStore implements WeddingStore {
  async listInvites() {
    return clone(data().invites);
  }

  async getInvite(id: string) {
    const found = data().invites.find((i) => i.id === id);
    return found ? clone(found) : null;
  }

  async createInvite(names: string[]) {
    const invite: Invite = {
      id: newId(),
      label: defaultInviteLabel(names),
      people: names.map((n) => person(n)),
      tableNumber: null,
      phone: "",
      sentAt: "",
      openedAt: "",
      message: "",
    };
    data().invites.unshift(invite);
    return clone(invite);
  }

  async updateInvite(id: string, patch: InvitePatch) {
    const invite = data().invites.find((i) => i.id === id);
    if (!invite) throw new NotFoundError("Invite");
    const { attendance, names, ...rest } = patch;
    Object.assign(invite, rest);
    if (names) {
      invite.people = names.map((name, i) => ({ name, attendance: invite.people[i]?.attendance ?? "" }));
    }
    if (attendance) {
      invite.people = invite.people.map((p, i) => ({ ...p, attendance: attendance[i] ?? p.attendance }));
    }
    return clone(invite);
  }

  async deleteInvite(id: string) {
    data().invites = data().invites.filter((i) => i.id !== id);
    for (const gift of data().gifts) {
      if (gift.inviteId === id) Object.assign(gift, { reservedBy: "", inviteId: "", reservedAt: "" });
    }
  }

  async listGifts() {
    return clone(data().gifts);
  }

  async addGift(title: string, category = "") {
    const gifts = data().gifts;
    const nextId = gifts.reduce((max, g) => Math.max(max, Number(g.id) || 0), 0) + 1;
    const gift: Gift = { id: String(nextId), title, category, reservedBy: "", inviteId: "", reservedAt: "" };
    gifts.push(gift);
    return clone(gift);
  }

  async reserveGift(giftId: string, inviteId: string, reservedBy: string) {
    const gift = data().gifts.find((g) => g.id === giftId);
    if (!gift) throw new NotFoundError("Gift");
    if (gift.inviteId && gift.inviteId !== inviteId) throw new GiftTakenError();
    Object.assign(gift, { reservedBy, inviteId, reservedAt: nowStamp(wedding.timeZone) });
    return clone(gift);
  }

  async releaseGift(giftId: string) {
    const gift = data().gifts.find((g) => g.id === giftId);
    if (gift) Object.assign(gift, { reservedBy: "", inviteId: "", reservedAt: "" });
  }

  async renameGift(giftId: string, title: string) {
    const gift = data().gifts.find((g) => g.id === giftId);
    if (!gift) throw new NotFoundError("Gift");
    gift.title = title;
  }

  async removeGift(giftId: string) {
    data().gifts = data().gifts.filter((g) => g.id !== giftId);
  }

  async listTables() {
    return clone(data().tables);
  }

  async addTable(name: string, capacity: number) {
    const tables = data().tables;
    const table = { number: tables.reduce((m, t) => Math.max(m, t.number), 0) + 1, name, capacity };
    tables.push(table);
    return clone(table);
  }

  async updateTable(number: number, patch: Partial<Omit<SeatingTable, "number">>) {
    const table = data().tables.find((t) => t.number === number);
    if (!table) throw new NotFoundError("Table");
    Object.assign(table, patch);
  }

  async removeTable(number: number) {
    data().tables = data().tables.filter((t) => t.number !== number);
    for (const invite of data().invites) {
      if (invite.tableNumber === number) invite.tableNumber = null;
    }
  }
}
