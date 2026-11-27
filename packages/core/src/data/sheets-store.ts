import "server-only";
import { auth, sheets, type sheets_v4 } from "@googleapis/sheets";
import { wedding } from "../wedding";
import { EVENT_FIELDS, eventFromTexts, eventValueToText, type EventSettings } from "../event";
import { personalLink } from "../site";
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
 *  - "Evento":     the event details (names, date, venue, photos…) edited on the admin app.
 *
 * The couple can edit the sheet by hand; the app re-reads it on every request.
 */

const SHEET = {
  guests: "Convidados",
  gifts: "Presentes",
  tables: "Mesas",
  event: "Evento",
} as const;

const HEADERS = {
  guests: ["Convite ID", "Nome do convite", "Pessoa", "Link pessoal", "Mesa", "Telefone", "Enviado", "Aberto", "Resposta", "Mensagem"],
  gifts: ["ID", "Presente", "Categoria", "Estado", "Reservado por", "Convite ID", "Data"],
  tables: ["N.º", "Nome da mesa", "Lugares", "Ocupados", "Quem está sentado"],
  event: ["Chave", "Campo", "Valor"],
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

/**
 * Google allows ~60 read requests per minute per service account. All three tabs are read in one
 * batched request and cached briefly, so a burst of guests opening their links stays far below that.
 * Writes always re-read fresh data first and clear the cache afterwards.
 */
const CACHE_TTL_MS = 15_000;

type TabKey = keyof typeof SHEET;
type Snapshot = Record<TabKey, string[][]>;
const RANGES: Record<TabKey, string> = { guests: "A2:J", gifts: "A2:G", tables: "A2:C", event: "A2:C" };

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
  private cache: { at: number; data: Snapshot } | null = null;
  private inflight: Promise<Snapshot> | null = null;
  private lastMissRefresh = 0;
  private writeVersion = 0;

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

    if (missing.includes("event")) {
      const defaults = eventFromTexts({});
      await this.appendRows(
        SHEET.event,
        EVENT_FIELDS.map(({ key, label }) => [key, label, eventValueToText(key, defaults)]),
      );
    }

    if (missing.includes("tables")) {
      await this.appendRows(
        SHEET.tables,
        wedding.defaultTables.map((name, i) => this.tableRow(i + 1, name, wedding.defaultTableCapacity)),
        "USER_ENTERED",
      );
    }
  }

  // ---------------------------------------------------------------- low-level helpers

  /** Rows of one tab (without the header). `fresh` bypasses the cache; use it before every write. */
  private async readRows(tab: TabKey, fresh = false): Promise<string[][]> {
    return (await this.readAll(fresh))[tab];
  }

  private async readAll(fresh: boolean): Promise<Snapshot> {
    await this.ensureSchema();
    if (!fresh && this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) return this.cache.data;
    if (!fresh && this.inflight) return this.inflight;

    // A read that started before a write may return pre-write data: never cache it, never share it.
    const version = this.writeVersion;
    const request: Promise<Snapshot> = this.fetchAll()
      .then((data) => {
        if (version === this.writeVersion) this.cache = { at: Date.now(), data };
        return data;
      })
      .catch((error) => {
        // Quota or network hiccup: serve the last good data for reads rather than failing the page.
        if (!fresh && this.cache) return this.cache.data;
        throw error;
      })
      .finally(() => {
        if (this.inflight === request) this.inflight = null;
      });
    if (!fresh) this.inflight = request;
    return request;
  }

  private async fetchAll(): Promise<Snapshot> {
    const keys = Object.keys(SHEET) as TabKey[];
    const res = await this.api.spreadsheets.values.batchGet({
      spreadsheetId: this.spreadsheetId,
      ranges: keys.map((k) => `${SHEET[k]}!${RANGES[k]}`),
      valueRenderOption: "FORMATTED_VALUE",
    });
    const ranges = res.data.valueRanges ?? [];
    return Object.fromEntries(keys.map((k, i) => [k, (ranges[i]?.values ?? []) as string[][]])) as Snapshot;
  }

  private invalidate() {
    this.writeVersion++;
    this.cache = null;
    this.inflight = null;
  }

  private async appendRows(sheet: string, rows: (string | number)[][], input: "RAW" | "USER_ENTERED" = "RAW") {
    await this.api.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${sheet}!A1`,
      valueInputOption: input,
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rows },
    });
    this.invalidate();
  }

  private async writeRanges(data: { range: string; values: (string | number)[][] }[]) {
    if (data.length === 0) return;
    await this.api.spreadsheets.values.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: { valueInputOption: "RAW", data },
    });
    this.invalidate();
  }

  private async deleteRow(sheet: string, rowNumber: number) {
    await this.deleteRows(sheet, [rowNumber]);
  }

  /** Deletes several rows in one request, bottom-up so the row numbers stay valid. */
  private async deleteRows(sheet: string, rowNumbers: number[]) {
    if (rowNumbers.length === 0) return;
    const sheetId = this.sheetIds.get(sheet);
    if (sheetId == null) throw new Error(`Unknown sheet ${sheet}`);
    const requests = [...new Set(rowNumbers)]
      .sort((a, b) => b - a)
      .map((n) => ({ deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: n - 1, endIndex: n } } }));
    await this.api.spreadsheets.batchUpdate({ spreadsheetId: this.spreadsheetId, requestBody: { requests } });
    this.invalidate();
  }

  // ---------------------------------------------------------------- invites

  private async readGuestRows(fresh = false): Promise<Map<string, GuestRow[]>> {
    const rows = await this.readRows("guests", fresh);
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
    let rows = (await this.readGuestRows()).get(id);
    // A just-created invite may not be in the cache yet (e.g. made in the admin app seconds ago).
    // Refresh at most every 5 s so mistyped or random links can't burn through the read quota.
    if (!rows && Date.now() - this.lastMissRefresh > 5_000) {
      this.lastMissRefresh = Date.now();
      rows = (await this.readGuestRows(true)).get(id);
    }
    return rows ? this.toInvite(id, rows) : null;
  }

  createInvite(names: string[]) {
    return exclusive(async () => {
      const existing = await this.readGuestRows(true);
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
      const rows = (await this.readGuestRows(true)).get(id);
      if (!rows) throw new NotFoundError("Invite");
      const current = this.toInvite(id, rows);
      const { attendance, names, ...rest } = patch;
      const people = names
        ? names.map((name, i) => ({ name, attendance: current.people[i]?.attendance ?? ("" as const) }))
        : current.people;
      const next: Invite = {
        ...current,
        ...rest,
        people: people.map((p, i) => ({ ...p, attendance: attendance?.[i] ?? p.attendance })),
      };
      // Rewrite the rows the invite keeps, append rows for new people, then delete rows for removed people.
      const kept = Math.min(rows.length, next.people.length);
      await this.writeRanges(
        rows.slice(0, kept).map((row, i) => ({
          range: `${SHEET.guests}!A${row.rowNumber}:J${row.rowNumber}`,
          values: [this.guestRowValues(next, i)],
        })),
      );
      if (next.people.length > kept) {
        await this.appendRows(
          SHEET.guests,
          next.people.slice(kept).map((_, i) => this.guestRowValues(next, kept + i)),
        );
      }
      await this.deleteRows(SHEET.guests, rows.slice(kept).map((r) => r.rowNumber));
      return next;
    });
  }

  deleteInvite(id: string) {
    return exclusive(async () => {
      const rows = (await this.readGuestRows(true)).get(id);
      const gifts = (await this.readGiftRows(true)).filter(({ gift }) => gift.inviteId === id);
      await this.writeRanges(
        gifts.map(({ gift, rowNumber }) => ({
          range: `${SHEET.gifts}!A${rowNumber}:G${rowNumber}`,
          values: [this.giftRowValues({ ...gift, reservedBy: "", inviteId: "", reservedAt: "" })],
        })),
      );
      if (rows) await this.deleteRows(SHEET.guests, rows.map((r) => r.rowNumber));
    });
  }

  // ---------------------------------------------------------------- gifts

  private async readGiftRows(fresh = false): Promise<{ gift: Gift; rowNumber: number }[]> {
    const rows = await this.readRows("gifts", fresh);
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
      const rows = await this.readGiftRows(true);
      const nextId = rows.reduce((max, { gift }) => Math.max(max, Number(gift.id) || 0), 0) + 1;
      const gift: Gift = { id: String(nextId), title, category, reservedBy: "", inviteId: "", reservedAt: "" };
      await this.appendRows(SHEET.gifts, [this.giftRowValues(gift)]);
      return gift;
    });
  }

  private updateGift(giftId: string, change: (gift: Gift) => Gift) {
    return exclusive(async () => {
      const found = (await this.readGiftRows(true)).find(({ gift }) => gift.id === giftId);
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

  async renameGift(giftId: string, title: string) {
    await this.updateGift(giftId, (gift) => ({ ...gift, title }));
  }

  removeGift(giftId: string) {
    return exclusive(async () => {
      const found = (await this.readGiftRows(true)).find(({ gift }) => gift.id === giftId);
      if (found) await this.deleteRow(SHEET.gifts, found.rowNumber);
    });
  }

  // ---------------------------------------------------------------- event

  private async readEventRows(fresh = false): Promise<Map<string, { value: string; rowNumber: number }>> {
    const rows = await this.readRows("event", fresh);
    const byKey = new Map<string, { value: string; rowNumber: number }>();
    rows.forEach((values, i) => {
      const key = cell(values, 0);
      if (key) byKey.set(key, { value: (values[2] ?? "").toString(), rowNumber: i + 2 });
    });
    return byKey;
  }

  async getEvent() {
    const rows = await this.readEventRows();
    return eventFromTexts(Object.fromEntries(Array.from(rows, ([key, { value }]) => [key, value])));
  }

  updateEvent(patch: Partial<EventSettings>) {
    return exclusive(async () => {
      const rows = await this.readEventRows(true);
      const current = eventFromTexts(Object.fromEntries(Array.from(rows, ([key, { value }]) => [key, value])));
      const next: EventSettings = { ...current, ...patch };
      const changed = EVENT_FIELDS.filter(({ key }) => key in patch);
      await this.writeRanges(
        changed.flatMap(({ key }) => {
          const row = rows.get(key);
          return row ? [{ range: `${SHEET.event}!C${row.rowNumber}`, values: [[eventValueToText(key, next)]] }] : [];
        }),
      );
      const missingRows = changed.filter(({ key }) => !rows.has(key));
      if (missingRows.length > 0) {
        await this.appendRows(SHEET.event, missingRows.map(({ key, label }) => [key, label, eventValueToText(key, next)]));
      }
      return next;
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

  private async readTableRows(fresh = false): Promise<{ table: SeatingTable; rowNumber: number }[]> {
    const rows = await this.readRows("tables", fresh);
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
      const rows = await this.readTableRows(true);
      const number = rows.reduce((max, { table }) => Math.max(max, table.number), 0) + 1;
      await this.appendRows(SHEET.tables, [this.tableRow(number, name, capacity)], "USER_ENTERED");
      return { number, name, capacity };
    });
  }

  updateTable(number: number, patch: Partial<Omit<SeatingTable, "number">>) {
    return exclusive(async () => {
      const found = (await this.readTableRows(true)).find(({ table }) => table.number === number);
      if (!found) throw new NotFoundError("Table");
      const next = { ...found.table, ...patch };
      await this.writeRanges([
        { range: `${SHEET.tables}!B${found.rowNumber}:C${found.rowNumber}`, values: [[next.name, next.capacity]] },
      ]);
    });
  }

  removeTable(number: number) {
    return exclusive(async () => {
      const found = (await this.readTableRows(true)).find(({ table }) => table.number === number);
      if (!found) return;
      // Unseat everyone at this table first, so no guest points at a table that no longer exists.
      const guestRows = await this.readRows("guests", true);
      await this.writeRanges(
        guestRows.flatMap((values, i) =>
          parseTableNumber(cell(values, 4)) === number ? [{ range: `${SHEET.guests}!E${i + 2}`, values: [[""]] }] : [],
        ),
      );
      await this.deleteRow(SHEET.tables, found.rowNumber);
    });
  }
}
