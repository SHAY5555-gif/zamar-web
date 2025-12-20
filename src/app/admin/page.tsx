"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAuthHeaders, getToken, getCurrentUser, logout, type AuthUser } from "@/lib/auth";

const ADMIN_EMAIL = "yeshayaavitan@gmail.com";

interface User {
  _id: string;
  email: string;
  username?: string;
  credits?: {
    count: number;
    last_updated: string;
  };
  subscription?: {
    active: boolean;
    tier: string;
  };
  createdAt?: string;
}

export default function AdminPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/auth/login";
      return;
    }
    checkAdminAndFetchUsers();
  }, []);

  const checkAdminAndFetchUsers = async () => {
    try {
      // Check if current user is admin
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        window.location.href = "/auth/login";
        return;
      }

      setUser(currentUser);

      if (currentUser.email !== ADMIN_EMAIL) {
        setError("אין לך הרשאות גישה לעמוד זה");
        setLoading(false);
        return;
      }

      // Fetch all users
      const response = await fetch("/api/admin/users", {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError("אין לך הרשאות גישה לעמוד זה");
        } else {
          throw new Error("Failed to fetch users");
        }
        setLoading(false);
        return;
      }

      const usersData = await response.json();
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error("Error:", err);
      setError("שגיאה בטעינת המשתמשים");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // If user is not admin, show access denied
  if (user && user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">גישה נדחתה</h1>
          <p className="text-gray-600 mb-6">אין לך הרשאות גישה לאזור המנהל</p>
          <Link
            href="/dashboard"
            className="inline-block bg-indigo-600 text-white font-medium py-2 px-6 rounded-lg hover:bg-indigo-700 transition-colors">
            חזרה לדאשבורד
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-4 border-red-500">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-red-600">Zamar - Admin</h1>
            {user && (
              <p className="text-sm text-gray-500">מחובר כ: {user.email}</p>
            )}
          </div>
          <nav className="flex gap-4">
            <Link href="/admin/library" className="text-purple-600 hover:text-purple-800 font-medium">
              ספריית תוכן
            </Link>
            <Link href="/dashboard" className="text-gray-600 hover:text-indigo-600">
              דאשבורד רגיל
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-red-600">
              התנתקות
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-right">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">לוח בקרה מנהל</h2>
          <p className="text-gray-600">ניהול משתמשים, שירים והופעות</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">סה"כ משתמשים</h3>
            <p className="text-3xl font-bold text-indigo-600">{users.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">משתמשים פעילים</h3>
            <p className="text-3xl font-bold text-green-600">
              {users.filter((u) => u.subscription?.active).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">משתמשים חינמיים</h3>
            <p className="text-3xl font-bold text-gray-600">
              {users.filter((u) => !u.subscription?.active).length}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="חיפוש לפי מייל או שם משתמש..."
            className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right placeholder:text-gray-500"
          />
        </div>

        {/* Users List */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <p className="text-gray-500">
              {users.length === 0
                ? "לא נמצאו משתמשים. ייתכן שצריך להוסיף endpoints בבקאנד."
                : "לא נמצאו משתמשים התואמים לחיפוש"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                    מייל
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                    שם משתמש
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                    יתרה
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                    מצב
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      {u.email}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {u.username || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      ${((u.credits?.count || 0) / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {u.subscription?.active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          פעיל
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          חינמי
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/users/${u._id}`}
                        className="text-indigo-600 hover:underline font-medium">
                        ניהול
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Stats Footer */}
        <div className="mt-8 text-gray-500 text-sm text-right">
          {users.length > 0 && (
            <p>
              סה"כ {users.length} משתמשים{" "}
              {searchTerm && `(מוצגים ${filteredUsers.length})`}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
