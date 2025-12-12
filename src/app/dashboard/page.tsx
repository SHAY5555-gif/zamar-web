"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { logout, getAuthHeaders, getToken, type AuthUser, isImpersonating, setImpersonation, clearImpersonation, getImpersonationUser } from "@/lib/auth";

interface DashboardStats {
  songsCount: number;
  setlistsCount: number;
  credits: number;
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    songsCount: 0,
    setlistsCount: 0,
    credits: 0,
  });
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonatingState] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<{ email: string; username?: string } | null>(null);

  useEffect(() => {
    // Check for impersonation token in URL
    const impersonationToken = searchParams.get('impersonationToken');
    const impersonationEmail = searchParams.get('email');
    const impersonationUsername = searchParams.get('username');

    if (impersonationToken) {
      // Set impersonation mode
      setImpersonation(impersonationToken, {
        email: impersonationEmail || 'Unknown',
        username: impersonationUsername || undefined
      });
      // Remove query params from URL
      window.history.replaceState({}, '', '/dashboard');
    }

    // Check if we're impersonating
    if (isImpersonating()) {
      setImpersonatingState(true);
      setImpersonatedUser(getImpersonationUser());
    }

    // Check if logged in
    if (!getToken()) {
      window.location.href = "/auth/login";
      return;
    }
    fetchDashboardData();
  }, [searchParams]);

  const fetchDashboardData = async () => {
    try {
      const headers = getAuthHeaders();

      // Fetch user info
      const userResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
        { headers }
      );

      if (!userResponse.ok) {
        window.location.href = "/auth/login";
        return;
      }

      const userData = await userResponse.json();
      setUser(userData.user);

      // Fetch songs count
      const songsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/zamar/songs`,
        { headers }
      );
      const songsData = await songsResponse.json();

      // Fetch setlists count
      const setlistsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/zamar/setlists`,
        { headers }
      );
      const setlistsData = await setlistsResponse.json();

      // API returns arrays directly, not wrapped in objects
      const songsArray = Array.isArray(songsData) ? songsData : songsData.songs || [];
      const setlistsArray = Array.isArray(setlistsData) ? setlistsData : setlistsData.setlists || [];

      setStats({
        songsCount: songsArray.length,
        setlistsCount: setlistsArray.length,
        credits: userData.user?.credits?.count || 0,
      });
    } catch {
      // If error, redirect to login
      window.location.href = "/auth/login";
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const handleExitImpersonation = () => {
    clearImpersonation();
    window.location.href = "/admin";
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Impersonation Banner */}
      {impersonating && (
        <div className="bg-red-600 text-white py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎭</span>
              <div>
                <p className="font-bold">מצב התחזות פעיל</p>
                <p className="text-sm text-red-100">
                  צופה כמשתמש: {impersonatedUser?.username || impersonatedUser?.email || 'Unknown'}
                </p>
              </div>
            </div>
            <button
              onClick={handleExitImpersonation}
              className="bg-white text-red-600 font-bold py-2 px-4 rounded-lg hover:bg-red-100 transition-colors"
            >
              יציאה מהתחזות
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`bg-white shadow-sm ${impersonating ? 'border-t-4 border-red-500' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-indigo-600">Zamar</h1>
            {user && (
              <p className="text-sm text-gray-500">שלום, {user.username || user.email}</p>
            )}
          </div>
          <nav className="flex gap-4">
            {impersonating && (
              <Link href="/admin" className="text-red-600 hover:text-red-700 font-medium">
                חזרה לאדמין
              </Link>
            )}
            <Link href="/credits" className="text-gray-600 hover:text-indigo-600">
              יתרה
            </Link>
            {!impersonating && (
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-red-600"
              >
                התנתקות
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Songs Card */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">השירים שלי</h2>
            <p className="text-gray-600 mb-4">נהלו את ספריית השירים שלכם</p>
            <p className="text-2xl font-bold text-indigo-600 mb-4">{stats.songsCount} שירים</p>
            <Link
              href="/dashboard/songs"
              className="inline-block bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              צפייה בשירים
            </Link>
          </div>

          {/* Setlists Card */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">רשימות הופעות</h2>
            <p className="text-gray-600 mb-4">צרו וערכו רשימות הופעות</p>
            <p className="text-2xl font-bold text-indigo-600 mb-4">{stats.setlistsCount} רשימות</p>
            <Link
              href="/dashboard/setlists"
              className="inline-block bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              צפייה ברשימות
            </Link>
          </div>

          {/* Credits Card */}
          <div className="bg-white rounded-xl shadow p-6 md:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">יתרה</h2>
            <p className="text-gray-600 mb-2">יתרה נוכחית:</p>
            <p className="text-4xl font-bold text-green-600 mb-4">
              ${(stats.credits / 100).toFixed(2)}
            </p>
            <Link
              href="/credits"
              className="inline-block bg-green-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              הטענת יתרה
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
