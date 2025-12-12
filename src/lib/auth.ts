// Auth utility functions for the web app

const TOKEN_KEY = 'zamar_auth_token';
const IMPERSONATION_TOKEN_KEY = 'zamar_impersonation_token';
const IMPERSONATION_USER_KEY = 'zamar_impersonation_user';

export interface AuthUser {
  _id: string;
  email: string;
  username?: string;
  credits?: {
    count: number;
    last_updated: string;
  };
  subscription?: {
    active: boolean;
    tier: 'free' | 'premium_10';
    expires_at?: string;
  };
}

// Check if we're in impersonation mode
export function isImpersonating(): boolean {
  if (typeof window === 'undefined') return false;
  return !!sessionStorage.getItem(IMPERSONATION_TOKEN_KEY);
}

// Get impersonation token
export function getImpersonationToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(IMPERSONATION_TOKEN_KEY);
}

// Get impersonation user info
export function getImpersonationUser(): { email: string; username?: string } | null {
  if (typeof window === 'undefined') return null;
  const data = sessionStorage.getItem(IMPERSONATION_USER_KEY);
  return data ? JSON.parse(data) : null;
}

// Set impersonation mode
export function setImpersonation(token: string, user: { email: string; username?: string }): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(IMPERSONATION_TOKEN_KEY, token);
  sessionStorage.setItem(IMPERSONATION_USER_KEY, JSON.stringify(user));
}

// Clear impersonation mode
export function clearImpersonation(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(IMPERSONATION_TOKEN_KEY);
  sessionStorage.removeItem(IMPERSONATION_USER_KEY);
}

// Get stored token (returns impersonation token if in impersonation mode)
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  // If impersonating, return the impersonation token
  const impersonationToken = sessionStorage.getItem(IMPERSONATION_TOKEN_KEY);
  if (impersonationToken) return impersonationToken;
  return localStorage.getItem(TOKEN_KEY);
}

// Store token
export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

// Clear token
export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

// Get auth headers
export function getAuthHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Fetch current user from API
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const token = getToken();
    if (!token) return null;

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
      {
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        clearToken();
      }
      return null;
    }

    const data = await response.json();
    return data.user;
  } catch {
    return null;
  }
}

// Logout user
export async function logout(): Promise<void> {
  clearToken();
  window.location.href = '/';
}

// Check if user is authenticated (client-side check)
export function isAuthenticated(): boolean {
  return !!getToken();
}
