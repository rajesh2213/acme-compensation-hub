import type { ReactNode } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { AuthProvider, useAuth } from "./auth-provider";

const fetchCurrentUser = vi.fn();
const fetchCsrfToken = vi.fn();
const loginRequest = vi.fn();
const logoutRequest = vi.fn();

vi.mock("./api", () => ({
  fetchCurrentUser: (...args: unknown[]) => fetchCurrentUser(...args),
  fetchCsrfToken: (...args: unknown[]) => fetchCsrfToken(...args),
  loginRequest: (...args: unknown[]) => loginRequest(...args),
  logoutRequest: (...args: unknown[]) => logoutRequest(...args),
}));

const demoUser = {
  id: "u1",
  email: "hr.demo@acme.local",
  displayName: "Demo HR Manager",
  isActive: true,
};

function AuthProbe() {
  const { user, status, error, login, logout, refreshSession } = useAuth();
  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="user">{user?.email ?? "none"}</p>
      <p data-testid="error">{error ?? "none"}</p>
      <button type="button" onClick={() => void login("a@b.c", "secret")}>
        Login
      </button>
      <button
        type="button"
        onClick={() => {
          void logout().catch(() => undefined);
        }}
      >
        Logout
      </button>
      <button type="button" onClick={() => void refreshSession()}>
        Retry
      </button>
    </div>
  );
}

function renderAuth(ui: ReactNode = <AuthProbe />) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{ui}</AuthProvider>
      </QueryClientProvider>,
    ),
  };
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("restores an authenticated session via /me", async () => {
    fetchCurrentUser.mockResolvedValue(demoUser);

    renderAuth();

    expect(screen.getByTestId("status")).toHaveTextContent("loading");

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });
    expect(screen.getByTestId("user")).toHaveTextContent(demoUser.email);
  });

  it("treats 401 from /me as unauthenticated", async () => {
    fetchCurrentUser.mockResolvedValue(null);

    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated");
    });
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("sets error status on network failure during session restoration", async () => {
    fetchCurrentUser.mockRejectedValue(
      new ApiError(0, {
        code: "NETWORK_ERROR",
        message: "Failed to fetch",
      }),
    );

    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("error");
    });
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(screen.getByTestId("error")).not.toHaveTextContent("none");
  });

  it("sets error status on API 500 during session restoration", async () => {
    fetchCurrentUser.mockRejectedValue(
      new ApiError(500, {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error",
      }),
    );

    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("error");
    });
    expect(screen.getByTestId("error")).toHaveTextContent(
      "Unexpected server error",
    );
  });

  it("retries successfully after a session restoration error", async () => {
    fetchCurrentUser
      .mockRejectedValueOnce(
        new ApiError(0, {
          code: "NETWORK_ERROR",
          message: "Failed to fetch",
        }),
      )
      .mockResolvedValueOnce(demoUser);
    const user = userEvent.setup();

    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("error");
    });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Retry" }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });
    expect(screen.getByTestId("user")).toHaveTextContent(demoUser.email);
    expect(screen.getByTestId("error")).toHaveTextContent("none");
  });

  it("logs in with CSRF then stores the user", async () => {
    fetchCurrentUser.mockResolvedValue(null);
    fetchCsrfToken.mockResolvedValue("csrf-login");
    loginRequest.mockResolvedValue(demoUser);
    const user = userEvent.setup();

    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated");
    });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Login" }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });
    expect(fetchCsrfToken).toHaveBeenCalled();
    expect(loginRequest).toHaveBeenCalledWith("a@b.c", "secret", "csrf-login");
  });

  it("clears auth state after successful logout", async () => {
    fetchCurrentUser.mockResolvedValue(demoUser);
    fetchCsrfToken.mockResolvedValue("csrf-out");
    logoutRequest.mockResolvedValue(undefined);
    const user = userEvent.setup();

    const { queryClient } = renderAuth();
    queryClient.setQueryData(["probe"], { keep: true });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Logout" }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated");
    });
    expect(logoutRequest).toHaveBeenCalledWith("csrf-out");
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(queryClient.getQueryData(["probe"])).toBeUndefined();
  });

  it("clears local auth when logout returns 401", async () => {
    fetchCurrentUser.mockResolvedValue(demoUser);
    fetchCsrfToken.mockResolvedValue("csrf-out");
    logoutRequest.mockRejectedValue(
      new ApiError(401, {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      }),
    );
    const user = userEvent.setup();

    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Logout" }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated");
    });
  });

  it("preserves authenticated state on logout network failure", async () => {
    fetchCurrentUser.mockResolvedValue(demoUser);
    fetchCsrfToken.mockResolvedValue("csrf-out");
    logoutRequest.mockRejectedValue(
      new ApiError(0, {
        code: "NETWORK_ERROR",
        message: "Failed to fetch",
      }),
    );
    const user = userEvent.setup();

    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Logout" }));
    });

    await waitFor(() => {
      expect(logoutRequest).toHaveBeenCalled();
    });
    expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    expect(screen.getByTestId("user")).toHaveTextContent(demoUser.email);
  });

  it("preserves authenticated state on logout 500", async () => {
    fetchCurrentUser.mockResolvedValue(demoUser);
    fetchCsrfToken.mockResolvedValue("csrf-out");
    logoutRequest.mockRejectedValue(
      new ApiError(500, {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error",
      }),
    );
    const user = userEvent.setup();

    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Logout" }));
    });

    await waitFor(() => {
      expect(logoutRequest).toHaveBeenCalled();
    });
    expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    expect(screen.getByTestId("user")).toHaveTextContent(demoUser.email);
  });

  it("allows retrying logout after a failure", async () => {
    fetchCurrentUser.mockResolvedValue(demoUser);
    fetchCsrfToken.mockResolvedValue("csrf-out");
    logoutRequest
      .mockRejectedValueOnce(
        new ApiError(0, {
          code: "NETWORK_ERROR",
          message: "Failed to fetch",
        }),
      )
      .mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Logout" }));
    });

    await waitFor(() => {
      expect(logoutRequest).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId("status")).toHaveTextContent("authenticated");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Logout" }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated");
    });
    expect(logoutRequest).toHaveBeenCalledTimes(2);
  });
});
