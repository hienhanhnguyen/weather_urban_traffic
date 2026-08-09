"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, signOut as signOutRequest } from "@/features/auth/api";
import { setSessionExpiredHandler } from "./refresh";
import { clearTokens, getTokens, setTokens, subscribe } from "./tokens";
import type { AuthResponse, Role, TokenPair, User } from "./types";

export const SESSION_QUERY_KEY = ["session", "me"] as const;

export type SessionStatus = "loading" | "authenticated" | "anonymous";

export interface Session {
  status: SessionStatus;
  user: User | null;
  // Store the tokens and seed the cache from a sign-in/sign-up response
  adopt: (response: AuthResponse) => void;
  // Revoke the refresh token server side, then drop all local state
  signOut: () => Promise<void>;
  hasRole: (role: Role) => boolean;
}

const SessionContext = createContext<Session | null>(null);

// Server has no localStorage, so it always render the anonymous branch
const serverSnapshot = (): TokenPair | null => null;

export function useTokenPair(): TokenPair | null {
  return useSyncExternalStore(subscribe, getTokens, serverSnapshot);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const tokens = useTokenPair();

  const query = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: getMe,
    // No tokens means no request to make
    enabled: tokens !== null,
    // apiRequest already retried once behind a token refresh, a second failure is real, and retrying a 401
    retry: false,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    setSessionExpiredHandler(() => {
      queryClient.removeQueries({ queryKey: SESSION_QUERY_KEY });
    });
    return () => setSessionExpiredHandler(null);
  }, [queryClient]);

  const adopt = useCallback(
    (response: AuthResponse) => {
      setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      queryClient.setQueryData(SESSION_QUERY_KEY, response.user);
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    const current = getTokens();
    try {
      if (current) await signOutRequest(current.refreshToken);
    } catch {
    } finally {
      clearTokens();
      queryClient.clear();
    }
  }, [queryClient]);

  const value = useMemo<Session>(() => {
    const user = tokens ? (query.data ?? null) : null;

    let status: SessionStatus = "anonymous";
    if (tokens && query.isPending) status = "loading";
    else if (user) status = "authenticated";

    return {
      status,
      user,
      adopt,
      signOut,
      hasRole: (role) => user?.roles.includes(role) ?? false,
    };
  }, [tokens, query.data, query.isPending, adopt, signOut]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSession must be used inside <SessionProvider>");
  }
  return session;
}
