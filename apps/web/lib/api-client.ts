export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(status: number, error: ApiErrorBody) {
    super(error.message);
    this.name = "ApiError";
    this.status = status;
    this.code = error.code;
    this.details = error.details;
    this.requestId = error.requestId;
  }
}

export type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  csrfToken?: string | null;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

type SuccessEnvelope<T> = { data: T };
type ErrorEnvelope = { error: ApiErrorBody };

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as ErrorEnvelope).error === "object" &&
    (value as ErrorEnvelope).error !== null
  );
}

function isSuccessEnvelope<T>(value: unknown): value is SuccessEnvelope<T> {
  return typeof value === "object" && value !== null && "data" in value;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.csrfToken) {
    headers["X-CSRF-Token"] = options.csrfToken;
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: "include",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : "Network request failed";
    throw new ApiError(0, {
      code: "NETWORK_ERROR",
      message: message || "Unable to reach the server",
    });
  }

  let payload: unknown = null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (isErrorEnvelope(payload)) {
      throw new ApiError(response.status, payload.error);
    }
    throw new ApiError(response.status, {
      code: "HTTP_ERROR",
      message: `Request failed with status ${response.status}`,
    });
  }

  if (!isSuccessEnvelope<T>(payload)) {
    throw new ApiError(response.status, {
      code: "INVALID_RESPONSE",
      message: "Unexpected response shape from the API",
    });
  }

  return payload.data;
}
