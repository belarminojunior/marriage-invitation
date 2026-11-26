import "server-only";
import { auth, sheets, type sheets_v4 } from "@googleapis/sheets";
import { wedding } from "@/config/wedding";
import { personalLink } from "@/lib/site";
import { defaultInviteLabel, newId, nowStamp } from "./invite-helpers";
import {
  GiftTakenError,
  NotFoundError,
  type Attendance,
  type Gift,
  type Invite,
  type InvitePatch,
  type SeatingTable,
  type WeddingStore,
} from "./types";

/**
 * Google Sheets backed store.
 *
 * The spreadsheet holds three tabs (created automatically on first use):
 *  - "Convidados": one row per person. Rows sharing an invite ID form one personal invite.
 *  - "Presentes":  the gift list and who reserved each gift.
 *  - "Mesas":      seating tables, with formulas showing who sits where.
 *
 * The couple can edit the sheet by hand; the app re-reads it on every request.
 */

const SHEET = {
  guests: "Convidados",
  gifts: "Presentes",
  tables: "Mesas",
} as const;

const HEADERS = {
  guests: ["Convite ID", "Nome do convite", "Pessoa", "Link pessoal", "Mesa", "Telefone", "Enviado", "Aberto", "Resposta", "Mensagem"],
  gifts: ["ID", "Presente", "Categoria", "Estado", "Reservado por", "Convite ID", "Data"],
  tables: ["N.º", "Nome da mesa", "Lugares", "Ocupados", "Quem está sentado"],
} as const;

const ATTENDANCE_TEXT: Record<Attendance, string> = { yes: "Vem", no: "Não vem", "": "Por responder" };

function parseAttendance(value: string): Attendance {
  const v = value.trim().toLowerCase();
  if (v === "vem" || v === "sim" || v === "yes") return "yes";
  if (v === "não vem" || v === "nao vem" || v === "não" || v === "no") return "no";
  return "";
}

function parseTableNumber(value: string): number | null {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** True when the spreadsheet locale writes 1.5 as "1,5"; such locales use ";" between formula arguments. */
function usesDecimalComma(locale: string | null | undefined): boolean {
  if (!locale) return false;
  try {
    return new Intl.NumberFormat(locale.replace("_", "-")).format(1.5).includes(",");
  } catch {
    return false;
  }
}

const cell = (row: string[], i: number) => (row[i] ?? "").toString().trim();

interface GuestRow {
  rowNumber: number;
  values: string[];
}

/** Serialises writes inside this server instance so read-modify-write sequences don't interleave. */
let writeQueue: Promise<unknown> = Promise.resolve();
function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => undefined);
  return run;
}

export class SheetsStore implements WeddingStore {
  private api: sheets_v4.Sheets;
  private spreadsheetId: string;
  private sheetIds = new Map<string, number>();
  private ready: Promise<void> | null = null;
  /** Formula argument separator: "," for en-US-style locales, ";" where "," is the decimal mark (e.g. pt_PT). */
  private argSeparator = ",";

  constructor(options: { spreadsheetId: string; clientEmail: string; privateKey: string }) {
    const client = new auth.GoogleAuth({
      credentials: { client_email: options.clientEmail, private_key: options.privateKey },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    this.api = sheets({ version: "v4", auth: client });
    this.spreadsheetId = options.spreadsheetId;
  }

  // ---------------------------------------------------------------- schema

  private ensureSchema(): Promise<void> {
    this.ready ??= this.setUpSheets().catch((error) => {
      this.ready = null;
      throw error;
    });
    return this.ready;
  }

  private async setUpSheets() {
    const meta = await this.api.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: "properties.locale,sheets.properties",
    });
    for (const s of meta.data.sheets ?? []) {
      if (s.properties?.title != null && s.properties.sheetId != null) {
        this.sheetIds.set(s.properties.title, s.properties.sheetId);
      }
    }
    this.argSeparator = usesDecimalComma(meta.data.properties?.locale) ? ";" : ",";

    await this.createMissingSheets();
    await this.refreshTableFormulas();
  }

  /** Rewrites the "Mesas" formula columns so they match the sheet's locale (and repairs broken ones). */
  private async refreshTableFormulas() {
    const res = await this.api.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `${SHEET.tables}!A2:A` });
    const data = (res.data.values ?? [])
      .map((row, i) => ({ number: parseTableNumber(cell(row as string[], 0)), rowNumber: i + 2 }))
      .filter((r): r is { number: number; rowNumber: number } => r.number !== null)
      .map(({ number, rowNumber }) => ({
        range: `${SHEET.tables}!D${rowNumber}:E${rowNumber}`,
        values: [this.tableRow(number, "", 0).slice(3)],
      }));
    if (data.length === 0) return;
    await this.api.spreadsheets.values.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: { valueInputOption: "USER_ENTERED", data },
    });
  }

  private async createMissingSheets() {
    const missing = (Object.keys(SHEET) as (keyof typeof SHEET)[]).filter((k) => !this.sheetIds.has(SHEET[k]));
    if (missing.length === 0) return;

    const result = await this.api.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: missing.map((key) => ({
          addSheet: { properties: { title: SHEET[key], gridProperties: { frozenRowCount: 1 } } },
        })),
      },
    });
    for (const reply of result.data.replies ?? []) {
      const p = reply.addSheet?.properties;
      if (p?.title != null && p.sheetId != null) this.sheetIds.set(p.title, p.sheetId);
    }

    await this.api.spreadsheets.values.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: missing.map((key) => ({ range: `${SHEET[key]}!A1`, values: [[...HEADERS[key]]] })),
      },
    });

    if (missing.includes("tables")) {
      await this.appendRows(
        SHEET.tables,
        wedding.defaultTables.map((name, i) => this.tableRow(i + 1, name, wedding.defaultTableCapacity)),
        "USER_ENTERED",
      );
    }
  }

  // ---------------------------------------------------------------- low-level helpers

  private async readRows(sheet: string, lastColumn: string): Promise<string[][]> {
    await this.ensureSchema();
    const res = await this.api.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${sheet}!A2:${lastColumn}`,
      valueRenderOption: "FORMATTED_VALUE",
    });
    return (res.data.values ?? []) as string[][];
  }

  private async appendRows(sheet: string, rows: (string | number)[][], input: "RAW" | "USER_ENTERED" = "RAW") {
    await this.api.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${sheet}!A1`,
      valueInputOption: input,
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rows },
    });
  }

  private async writeRanges(data: { range: string; values: (string | number)[][] }[]) {
    if (data.length === 0) return;
    await this.api.spreadsheets.values.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: { valueInputOption: "RAW", data },
    });
  }

  private async deleteRow(sheet: string, rowNumber: number) {
    const sheetId = this.sheetIds.get(sheet);
    if (sheetId == null) throw new Error(`Unknown sheet ${sheet}`);
    await this.api.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [
          { deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: rowNumber - 1, endIndex: rowNumber } } },
        ],
      },
    });
  }

  // ---------------------------------------------------------------- invites

  private async readGuestRows(): Promise<Map<string, GuestRow[]>> {
    const rows = await this.readRows(SHEET.guests, "J");
    const byInvite = new Map<string, GuestRow[]>();
    rows.forEach((values, i) => {
      const id = cell(values, 0);
      if (!id || !cell(values, 2)) return;
      const list = byInvite.get(id) ?? [];
      list.push({ rowNumber: i + 2, values });
      byInvite.set(id, list);
    });
    return byInvite;
  }

  private toInvite(id: string, rows: GuestRow[]): Invite {
    const first = rows[0].values;
    const names = rows.map((r) => cell(r.values, 2));
    // Invite-level columns: take the first non-empty value across the invite's rows.
    const pick = (col: number) => rows.map((r) => cell(r.values, col)).find(Boolean) ?? "";
    return {
      id,
      label: pick(1) || defaultInviteLabel(names),
      people: rows.map((r) => ({ name: cell(r.values, 2), attendance: parseAttendance(cell(r.values, 8)) })),
      tableNumber: parseTableNumber(pick(4)),
      phone: pick(5),
      sentAt: pick(6),
      openedAt: pick(7),
      message: cell(first, 9),
    };
  }

  private guestRowValues(invite: Invite, index: number): string[] {
    const p = invite.people[index];
    return [
      invite.id,
      invite.label,
      p.name,
      personalLink(invite.id),
      invite.tableNumber ? String(invite.tableNumber) : "",
      invite.phone,
      invite.sentAt,
      invite.openedAt,
      ATTENDANCE_TEXT[p.attendance],
      index === 0 ? invite.message : "",
    ];
  }

  async listInvites() {
    const byInvite = await this.readGuestRows();
    return Array.from(byInvite, ([id, rows]) => this.toInvite(id, rows));
  }

  async getInvite(id: string) {
    const rows = (await this.readGuestRows()).get(id);
    return rows ? this.toInvite(id, rows) : null;
  }

  createInvite(names: string[]) {
    return exclusive(async () => {
      const existing = await this.readGuestRows();
      let id = newId();
      while (existing.has(id)) id = newId();
      const invite: Invite = {
        id,
        label: defaultInviteLabel(names),
        people: names.map((name) => ({ name, attendance: "" as const })),
        tableNumber: null,
        phone: "",
        sentAt: "",
        openedAt: "",
        message: "",
      };
      await this.appendRows(SHEET.guests, invite.people.map((_, i) => this.guestRowValues(invite, i)));
      return invite;
    });
  }

  updateInvite(id: string, patch: InvitePatch) {
    return exclusive(async () => {
      const rows = (await this.readGuestRows()).get(id);
      if (!rows) throw new NotFoundError("Invite");
      const current = this.toInvite(id, rows);
      const { attendance, ...rest } = patch;
      const next: Invite = {
        ...current,
        ...rest,
        people: current.people.map((p, i) => ({ ...p, attendance: attendance?.[i] ?? p.attendance })),
      };
      await this.writeRanges(
        rows.map((row, i) => ({
          range: `${SHEET.guests}!A${row.rowNumber}:J${row.rowNumber}`,
          values: [this.guestRowValues(next, i)],
        })),
      );
      return next;
    });
  }

  // ---------------------------------------------------------------- gifts

  private async readGiftRows(): Promise<{ gift: Gift; rowNumber: number }[]> {
    const rows = await this.readRows(SHEET.gifts, "G");
    return rows
      .map((values, i) => ({
        rowNumber: i + 2,
        gift: {
          id: cell(values, 0),
          title: cell(values, 1),
          category: cell(values, 2),
          reservedBy: cell(values, 4),
          inviteId: cell(values, 5),
          reservedAt: cell(values, 6),
        },
      }))
      .filter(({ gift }) => gift.id && gift.title);
  }

  private giftRowValues(gift: Gift): string[] {
    const taken = Boolean(gift.inviteId || gift.reservedBy);
    return [gift.id, gift.title, gift.category, taken ? "Reservado" : "Livre", gift.reservedBy, gift.inviteId, gift.reservedAt];
  }

  async listGifts() {
    return (await this.readGiftRows()).map(({ gift }) => gift);
  }

  addGift(title: string, category = "") {
    return exclusive(async () => {
      const rows = await this.readGiftRows();
      const nextId = rows.reduce((max, { gift }) => Math.max(max, Number(gift.id) || 0), 0) + 1;
      const gift: Gift = { id: String(nextId), title, category, reservedBy: "", inviteId: "", reservedAt: "" };
      await this.appendRows(SHEET.gifts, [this.giftRowValues(gift)]);
      return gift;
    });
  }

  private updateGift(giftId: string, change: (gift: Gift) => Gift) {
    return exclusive(async () => {
      const found = (await this.readGiftRows()).find(({ gift }) => gift.id === giftId);
      if (!found) throw new NotFoundError("Gift");
      const next = change(found.gift);
      await this.writeRanges([
        { range: `${SHEET.gifts}!A${found.rowNumber}:G${found.rowNumber}`, values: [this.giftRowValues(next)] },
      ]);
      return next;
    });
  }

  reserveGift(giftId: string, inviteId: string, reservedBy: string) {
    return this.updateGift(giftId, (gift) => {
      const takenBySomeoneElse = (gift.inviteId && gift.inviteId !== inviteId) || (!gift.inviteId && gift.reservedBy);
      if (takenBySomeoneElse) throw new GiftTakenError();
      return { ...gift, reservedBy, inviteId, reservedAt: nowStamp(wedding.timeZone) };
    });
  }

  async releaseGift(giftId: string) {
    await this.updateGift(giftId, (gift) => ({ ...gift, reservedBy: "", inviteId: "", reservedAt: "" }));
  }

  removeGift(giftId: string) {
    return exclusive(async () => {
      const found = (await this.readGiftRows()).find(({ gift }) => gift.id === giftId);
      if (found) await this.deleteRow(SHEET.gifts, found.rowNumber);
    });
  }

  // ---------------------------------------------------------------- tables

  /** Row for the "Mesas" tab; the last two columns are live formulas over "Convidados". */
  private tableRow(number: number, name: string, capacity: number): (string | number)[] {
    const g = SHEET.guests;
    const s = this.argSeparator;
    const seated = [`'${g}'!E:E`, number, `'${g}'!I:I`, `"<>Não vem"`].join(s);
    const names = [`'${g}'!C:C`, `'${g}'!E:E&""="${number}"`, `'${g}'!I:I<>"Não vem"`].join(s);
    return [
      number,
      name,
      capacity,
      `=COUNTIFS(${seated})`,
      `=IFERROR(TEXTJOIN(", "${s}TRUE${s}FILTER(${names}))${s}"")`,
    ];
  }

  private async readTableRows(): Promise<{ table: SeatingTable; rowNumber: number }[]> {
    const rows = await this.readRows(SHEET.tables, "C");
    return rows
      .map((values, i) => ({
        rowNumber: i + 2,
        table: {
          number: parseTableNumber(cell(values, 0)) ?? 0,
          name: cell(values, 1),
          capacity: parseInt(cell(values, 2), 10) || wedding.defaultTableCapacity,
        },
      }))
      .filter(({ table }) => table.number > 0);
  }

  async listTables() {
    return (await this.readTableRows()).map(({ table }) => table).sort((a, b) => a.number - b.number);
  }

  addTable(name: string, capacity: number) {
    return exclusive(async () => {
      const rows = await this.readTableRows();
      const number = rows.reduce((max, { table }) => Math.max(max, table.number), 0) + 1;
      await this.appendRows(SHEET.tables, [this.tableRow(number, name, capacity)], "USER_ENTERED");
      return { number, name, capacity };
    });
  }

  updateTable(number: number, patch: Partial<Omit<SeatingTable, "number">>) {
    return exclusive(async () => {
      const found = (await this.readTableRows()).find(({ table }) => table.number === number);
      if (!found) throw new NotFoundError("Table");
      const next = { ...found.table, ...patch };
      await this.writeRanges([
        { range: `${SHEET.tables}!B${found.rowNumber}:C${found.rowNumber}`, values: [[next.name, next.capacity]] },
      ]);
    });
  }
}
