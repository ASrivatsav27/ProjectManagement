import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type QueryValue = string | number | boolean | undefined | null;
type Query = object;

interface RequestOptions {
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
  /** Do not treat a 401 as "session expired" (used by the initial session check and login). */
  silent401?: boolean;
}

let unauthorizedHandler: (() => void) | null = null;

/** AuthContext registers a callback so any 401 from the API logs the user out of the UI. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function buildQuery(query?: Query): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries((query ?? {}) as Record<string, QueryValue>)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }

  const text = params.toString();
  return text ? `?${text}` : "";
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, signal, silent401 } = options;
  try {
    const response = await api.request<T>({
      url: `${path}${buildQuery(query)}`,
      method,
      data: body,
      ...(signal ? { signal } : {}),
    });
    return response.data;
  } catch (error) {
    // Existing hooks ignore AbortError when a page unmounts or a query changes.
    if (axios.isCancel(error)) {
      throw new DOMException("Request canceled", "AbortError");
    }
    if (!axios.isAxiosError(error)) throw error;
    if (!error.response) {
      throw new ApiError(0, "Cannot reach the server. Check your connection and try again.");
    }
    const { status, data: payload, statusText } = error.response;
    if (status === 401 && !silent401) unauthorizedHandler?.();
    const message =
      payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : statusText || "Request failed";
    throw new ApiError(status, message);
  }
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("POST", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PATCH", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PUT", path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, options),
};
