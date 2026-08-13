// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RequireAuth } from "./RequireAuth";
import { SessionProvider } from "@/lib/auth/session";
import { clearTokens, setTokens } from "@/lib/auth/tokens";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/home",
  useSearchParams: () => new URLSearchParams(),
}));

const getMe = vi.fn();

vi.mock("@/features/auth/api", () => ({
  getMe: () => getMe(),
  signOut: vi.fn(),
}));

const tree = (client: QueryClient) => (
  <QueryClientProvider client={client}>
    <SessionProvider>
      <RequireAuth>
        <p>dashboard</p>
      </RequireAuth>
    </SessionProvider>
  </QueryClientProvider>
);

async function reload(): Promise<Root> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const container = document.createElement("div");
  container.innerHTML = renderToString(tree(client));
  document.body.append(container);

  let root!: Root;
  await act(async () => {
    root = hydrateRoot(container, tree(client));
  });

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  return root;
}

describe("RequireAuth across a page reload", () => {
  beforeEach(() => {
    replace.mockClear();
    getMe.mockReset();
    getMe.mockResolvedValue({
      id: 1,
      email: "a@b.c",
      username: "a",
      accountType: "personal",
      roles: [],
    });
    clearTokens();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("keeps a stored session signed in", async () => {
    setTokens({ accessToken: "access-1", refreshToken: "refresh-1" });

    const root = await reload();

    expect(replace).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("dashboard");

    await act(async () => root.unmount());
  });

  it("still sends a visitor with no tokens to the login page", async () => {
    const root = await reload();

    expect(getMe).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/login?next=%2Fhome");

    await act(async () => root.unmount());
  });
});
