const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError("The API is unavailable. Check the backend and network connection.", 0, null);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: unknown } | null;
    const detail = body?.detail;
    const message = typeof detail === "string"
      ? detail
      : response.status === 422
        ? "The request contains invalid values."
        : response.status === 409
          ? "This operation conflicts with the current attendance state."
          : `Request failed (${response.status})`;
    throw new ApiError(message, response.status, detail ?? null);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
