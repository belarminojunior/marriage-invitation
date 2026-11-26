import { wedding } from "./wedding";

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const WEEKDAYS_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Year / month (1-12) / day of the ceremony in the venue's time zone. */
export function weddingDateParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: wedding.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(wedding.ceremonyStart));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "13.02.2027" */
export function weddingDateDots(): string {
  const { year, month, day } = weddingDateParts();
  return `${pad(day)}.${pad(month)}.${year}`;
}

/** "13 de fevereiro" */
export function weddingDateLong(): string {
  const { month, day } = weddingDateParts();
  return `${day} de ${MONTHS_PT[month - 1].toLowerCase()}`;
}

export interface CalendarCell {
  day: number | null;
  weekend: boolean;
  isWeddingDay: boolean;
}

/** Month grid starting on Monday, as in the design. */
export function weddingMonth(): { title: string; cells: CalendarCell[] } {
  const { year, month, day } = weddingDateParts();
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
