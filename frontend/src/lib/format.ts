import type { Task } from "@/api/types";

// Dates such as due dates / deadlines are stored as UTC midnight, so format them in UTC
// to avoid showing the previous day in timezones behind UTC.
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const dateTimeFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export const formatDate = (iso: string | null | undefined) => (iso ? dateFormat.format(new Date(iso)) : "—");
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso));

/** "2026-10-20T00:00:00.000Z" -> "2026-10-20" for <input type="date">. */
export const toDateInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");

export const todayInput = () => new Date().toISOString().slice(0, 10);

export function timeAgo(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "just now";

  const units: [number, string][] = [
    [60, "minute"],
    [3600, "hour"],
    [86400, "day"],
    [2592000, "month"],
    [31536000, "year"],
  ];

  let unit = units[0]!;
  for (const candidate of units) if (seconds >= candidate[0]) unit = candidate;

  const value = Math.floor(seconds / unit[0]);
  return `${value} ${unit[1]}${value === 1 ? "" : "s"} ago`;
}

export const isOverdue = (task: Pick<Task, "dueDate" | "status">) =>
  task.dueDate !== null && task.status !== "Done" && new Date(task.dueDate).getTime() < Date.now();

export const initial = (name: string) => (name.trim()[0] ?? "?").toUpperCase();
