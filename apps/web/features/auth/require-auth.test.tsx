import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RequireAuth, RedirectIfAuthenticated } from "./require-auth";

const replace = vi.fn();
const refreshSession = vi.fn();
const useAuth = vi.fn();
const navState = {
  pathname: "/employees",
  search: "",
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => navState.pathname,
  useSearchParams: () => new URLSearchParams(navState.search),
}));

vi.mock("./auth-provider", () => ({
  useAuth: () => useAuth(),
}));

describe("route guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshSession.mockResolvedValue(undefined);
    navState.pathname = "/employees";
    navState.search = "";
  });

  afterEach(() => {
    cleanup();
  });

  it("shows loading while session restores and does not flash children", () => {
    useAuth.mockReturnValue({
      status: "loading",
      error: null,
      refreshSession,
    });

    render(
      <RequireAuth>
        <p>Protected content</p>
      </RequireAuth>,
    );

    expect(screen.getByText("Restoring session…")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to login", async () => {
    useAuth.mockReturnValue({
      status: "unauthenticated",
      error: null,
      refreshSession,
    });

    render(
      <RequireAuth>
        <p>Protected content</p>
      </RequireAuth>,
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        `/login?next=${encodeURIComponent("/employees")}`,
      );
    });
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("preserves query parameters in the login next redirect", async () => {
    navState.pathname = "/employees";
    navState.search = "countryId=IN&page=3";
    useAuth.mockReturnValue({
      status: "unauthenticated",
      error: null,
      refreshSession,
    });

    render(
      <RequireAuth>
        <p>Protected content</p>
      </RequireAuth>,
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        `/login?next=${encodeURIComponent("/employees?countryId=IN&page=3")}`,
      );
    });
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("does not redirect to login while authentication status is error", async () => {
    useAuth.mockReturnValue({
      status: "error",
      error: "Unable to reach the server",
      refreshSession,
    });

    render(
      <RequireAuth>
        <p>Protected content</p>
      </RequireAuth>,
    );

    expect(screen.getByText("Session unavailable")).toBeInTheDocument();
    expect(screen.getByText("Unable to reach the server")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("retries session restoration from the error panel", async () => {
    useAuth.mockReturnValue({
      status: "error",
      error: "Unable to reach the server",
      refreshSession,
    });
    const user = userEvent.setup();

    render(
      <RequireAuth>
        <p>Protected content</p>
      </RequireAuth>,
    );

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it("renders children when authenticated", () => {
    useAuth.mockReturnValue({
      status: "authenticated",
      error: null,
      refreshSession,
    });

    render(
      <RequireAuth>
        <p>Protected content</p>
      </RequireAuth>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("redirects authenticated users away from login", async () => {
    navState.search = "next=%2Femployees%3Fpage%3D2";
    useAuth.mockReturnValue({
      status: "authenticated",
      error: null,
      refreshSession,
    });

    render(
      <RedirectIfAuthenticated>
        <p>Login form</p>
      </RedirectIfAuthenticated>,
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/employees?page=2");
    });
    expect(screen.queryByText("Login form")).not.toBeInTheDocument();
  });
});
