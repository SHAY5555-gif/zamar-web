// Auth utility functions for the web app

const TOKEN_KEY = 'zamar_auth_token';

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

// Get stored token
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
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
