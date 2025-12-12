"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { logout, getAuthHeaders, getToken, type AuthUser } from "@/lib/auth";

interface DashboardStats {
  songsCount: number;
  setlistsCount: number;
  credits: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    songsCount: 0,
    setlistsCount: 0,
    credits: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if logged in
    if (!getToken()) {
      window.location.href = "/auth/login";
      return;
    }
    fetchDashboardData();
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-indigo-600">Zamar</h1>
            {user && (
              <p className="text-sm text-gray-500">שלום, {user.username || user.email}</p>
            )}
          </div>
          <nav className="flex gap-4">
            <Link href="/credits" className="text-gray-600 hover:text-indigo-600">
              יתרה
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-red-600"
            >
              התנתקות
            </button>
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
