'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

const API = 'http://localhost:8000';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarInitial: string;
  githubUsername?: string;
  githubConnected: boolean;
  githubAvatarUrl?: string;
  role: 'developer' | 'client';
  joinedAt: string;
  emailVerified: boolean;
}

interface GitHubPayload {
  token: string;
  username: string;
  name: string;
  avatarUrl: string;
  email: string;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: 'developer' | 'client') => Promise<void>;
  loginAsGuest: () => Promise<void>;
  loginWithGitHub: () => void;
  connectGitHub: (payload: GitHubPayload) => Promise<void>;
  disconnectGitHub: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

function mapUser(raw: Record<string, unknown>): AuthUser {
  return {
    id: raw.id as string,
    name: raw.name as string,
    email: raw.email as string,
    avatarInitial: ((raw.name as string)?.[0] ?? '?').toUpperCase(),
    githubUsername: raw.githubUsername as string | undefined,
    githubConnected: Boolean(raw.githubConnected),
    githubAvatarUrl: raw.githubAvatarUrl as string | undefined,
    role: (raw.role as 'developer' | 'client') ?? 'developer',
    joinedAt: raw.joinedAt as string,
    emailVerified: Boolean(raw.emailVerified),
  };
}

async function apiFetch(path: string, opts?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${API}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...opts,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail ?? `Request failed: ${res.status}`);
    }
    return res.json();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiFetch('/api/auth/me');
      setUser(mapUser(data.user));
    } catch {
      // Try refresh token
      try {
        const data = await apiFetch('/api/auth/refresh', { method: 'POST' });
        setUser(mapUser(data.user));
      } catch {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(mapUser(data.user));
    router.push('/dashboard');
  };

  const signup = async (name: string, email: string, password: string, role: 'developer' | 'client') => {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
    setUser(mapUser(data.user));
    router.push('/dashboard');
  };

  const loginAsGuest = async () => {
    const data = await apiFetch('/api/auth/guest', { method: 'POST' });
    setUser(mapUser(data.user));
    router.push('/dashboard');
  };

  // Opens GitHub OAuth in a small popup — main page never navigates away
  const loginWithGitHub = () => {
    const w = 600, h = 700;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    window.open(
      '/api/auth/github',
      'github-oauth',
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`
    );

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'github-connected') {
        window.removeEventListener('message', onMessage);
        connectGitHub(e.data.payload);
      }
    };
    window.addEventListener('message', onMessage);
  };

  const connectGitHub = async (payload: GitHubPayload) => {
    try {
      if (user) {
        // Already logged in — just link GitHub to existing account
        const data = await apiFetch('/api/auth/github/connect', {
          method: 'POST',
          body: JSON.stringify({
            github_token: payload.token,
            github_username: payload.username,
            github_name: payload.name,
            github_avatar_url: payload.avatarUrl,
            github_email: payload.email,
          }),
        });
        setUser(mapUser(data.user));
      } else {
        // Not logged in — create/find account by GitHub identity
        const data = await apiFetch('/api/auth/github/login', {
          method: 'POST',
          body: JSON.stringify({
            github_token: payload.token,
            github_username: payload.username,
            github_name: payload.name,
            github_avatar_url: payload.avatarUrl,
            github_email: payload.email,
          }),
        });
        setUser(mapUser(data.user));
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('GitHub connect failed:', err);
    }
  };

  const disconnectGitHub = async () => {
    const data = await apiFetch('/api/auth/github/disconnect', { method: 'POST' });
    setUser(mapUser(data.user));
  };

  const logout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    router.push('/login');
  };

  return (
    <Ctx.Provider value={{ user, loading, login, signup, loginAsGuest, loginWithGitHub, connectGitHub, disconnectGitHub, logout, refreshUser }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
