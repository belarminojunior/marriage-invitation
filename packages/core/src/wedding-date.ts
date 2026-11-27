import { isValidDate } from "./event";

/** Date helpers for the ceremony day. `date` is the event's "YYYY-MM-DD" (venue local date). */

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const WEEKDAYS_LONG_PT = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export const WEEKDAYS_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Year / month (1-12) / day of the ceremony. */
export function weddingDateParts(date: string) {
  const safe = isValidDate(date) ? date : "2027-01-01";
  const [year, month, day] = safe.split("-").map(Number);
  return { year, month, day };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "13.02.2027" */
export function weddingDateDots(date: string): string {
  const { year, month, day } = weddingDateParts(date);
  return `${pad(day)}.${pad(month)}.${year}`;
}

/** "13 de fevereiro" */
export function weddingDateLong(date: string): string {
  const { month, day } = weddingDateParts(date);
  return `${day} de ${MONTHS_PT[month - 1].toLowerCase()}`;
}

/** "Sábado" */
export function weddingWeekday(date: string): string {
  const { year, month, day } = weddingDateParts(date);
  return WEEKDAYS_LONG_PT[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

export interface CalendarCell {
  day: number | null;
  weekend: boolean;
  isWeddingDay: boolean;
}

/** Month grid starting on Monday, as in the design. */
export function weddingMonth(date: string): { title: string; cells: CalendarCell[] } {
  const { year, month, day } = weddingDateParts(date);
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = Sunday
  const lead = (firstWeekday + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: CalendarCell[] = Array.from({ length: lead }, () => ({ day: null, weekend: false, isWeddingDay: false }));
  for (let n = 1; n <= daysInMonth; n++) {
    const column = (lead + n - 1) % 7;
    cells.push({ day: n, weekend: column >= 5, isWeddingDay: n === day });
  }
  return { title: `${MONTHS_PT[month - 1]} ${year}`, cells };
}
