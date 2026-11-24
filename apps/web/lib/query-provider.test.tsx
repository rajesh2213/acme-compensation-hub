import { useState } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useQueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/features/auth/auth-provider";
import { AppQueryProvider } from "./query-provider";

const fetchCurrentUser = vi.fn();
const fetchCsrfToken = vi.fn();
const loginRequest = vi.fn();
const logoutRequest = vi.fn();

vi.mock("@/features/auth/api", () => ({
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

function QueryProbe() {
  const queryClient = useQueryClient();
  const { status, logout } = useAuth();
  const [cacheLabel, setCacheLabel] = useState("empty");

  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="cache">{cacheLabel}</p>
      <button
        type="button"
        onClick={() => {
          queryClient.setQueryData(["probe"], { ok: true });
          setCacheLabel(
            queryClient.getQueryData(["probe"]) ? "present" : "empty",
          );
        }}
      >
        Seed cache
      </button>
      <button
        type="button"
        onClick={() => {
          void logout().then(() => {
            setCacheLabel(
              queryClient.getQueryData(["probe"]) ? "present" : "empty",
            );
          });
        }}
      >
        Logout
      </button>
    </div>
  );
}

describe("AppQueryProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchCurrentUser.mockResolvedValue(demoUser);
    fetchCsrfToken.mockResolvedValue("csrf-out");
    logoutRequest.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("mounts QueryClient and clears cache on logout", async () => {
    const user = userEvent.setup();

    render(
      <AppQueryProvider>
        <AuthProvider>
          <QueryProbe />
        </AuthProvider>
      </AppQueryProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Seed cache" }));
    });
    expect(screen.getByTestId("cache")).toHaveTextContent("present");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Logout" }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated");
    });
    expect(screen.getByTestId("cache")).toHaveTextContent("empty");
  });
});
