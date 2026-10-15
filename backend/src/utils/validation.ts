import type { Request } from "express";
import { badRequest } from "./http-error.js";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 1_000_000;

// Everything from the client (params, query, body) is untrusted.
// These helpers check one value each and either return it clean
// or throw a 400 error, so controllers never see bad input.


// Express 5 leaves req.body undefined when no body is sent.
// This always gives back a plain object, so destructuring is safe.
export function readBody(req: Request): Record<string, unknown> {
  const body: unknown = req.body;

  return body !== null && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}


// "5" -> 5. Rejects "", "abc", "1.5", "-3", "0", arrays and huge numbers.
export function parseId(value: unknown, label: string): number {
  const isNumeric = typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value));
  const id = isNumeric ? Number(value) : Number.NaN;

  if (!Number.isSafeInteger(id) || id < 1) throw badRequest(`Invalid ${label}`);

  return id;
}


// Same as parseId, but "no value" is allowed and becomes null.
// Used for optional things like assigneeId.
export function parseNullableId(value: unknown, label: string): number | null {
  return value === undefined || value === null || value === "" ? null : parseId(value, label);
}


// Checks the value is one of the allowed enum values (e.g. TaskStatus).
export function parseEnum<T extends Record<string, string>>(values: T, value: unknown, label: string): T[keyof T] {
  const allowed: string[] = Object.values(values);

  if (typeof value !== "string" || !allowed.includes(value)) {
    throw badRequest(`Invalid ${label}. Allowed values: ${allowed.join(", ")}`);
  }

  return value as T[keyof T];
}


// A required string: must exist and not be blank. Returned trimmed.
export function parseRequiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw badRequest(`${label} is required`);

  return value.trim();
}


// An optional string. Missing or blank becomes null.
export function parseOptionalText(value: unknown, label: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw badRequest(`${label} must be text`);

  return value.trim() || null;
}


// A date string becomes a Date. Missing or "" becomes null.
export function parseDate(value: unknown, label: string): Date | null {
  if (value === undefined || value === null || value === "") return null;

  const date = typeof value === "string" ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) throw badRequest(`${label} must be a valid date`);

  return date;
}


// A project cannot start after its deadline.
export function assertDateOrder(startDate: Date | null, deadline: Date | null) {
  if (startDate && deadline && startDate > deadline) {
    throw badRequest("startDate must not be after deadline");
  }
}


// A search term from the query string: trimmed, or undefined if empty.
export function queryText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}


// Turns ?page=2&pageSize=20 into safe numbers.
// skip = how many rows to jump over, take = how many rows to return.
export function parsePagination(query: Request["query"]) {
  const toInt = (value: unknown, fallback: number) => {
    const n = typeof value === "string" ? Math.floor(Number(value)) : Number.NaN;

    return Number.isFinite(n) ? n : fallback;
  };

  const page = Math.min(MAX_PAGE, Math.max(1, toInt(query.page, 1)));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, toInt(query.pageSize, DEFAULT_PAGE_SIZE)));

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}


// The pagination block sent back in list responses.
export function paginationMeta(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, pages: Math.ceil(total / pageSize) };
}


// Reads ?sortBy=...&sortOrder=... but only accepts fields from the allowed list.
// Anything else falls back to the default, so users cannot sort by random columns.
export function parseSort<T extends string>(query: Request["query"], allowed: readonly T[], fallback: T) {
  const sortBy = allowed.find((field) => field === query.sortBy) ?? fallback;
  const sortOrder: "asc" | "desc" = query.sortOrder === "asc" ? "asc" : "desc";

  return { sortBy, sortOrder };
}
