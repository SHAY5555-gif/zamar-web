"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAuthHeaders, getToken, getCurrentUser, type AuthUser } from "@/lib/auth";

const ADMIN_EMAIL = "yeshayaavitan@gmail.com";

interface User {
  _id: string;
  email: string;
  username?: string;
  display_name?: string;
}

interface Song {
  _id: string;
  title: string;
  artist: string;
  lyrics: string;
  language: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  created_at: string;
}

interface SetlistSong {
  song_id: string;
  title: string;
  artist: string;
  position: number;
}

interface Setlist {
  _id: string;
  name: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  songs: SetlistSong[];
  created_at: string;
}

type AssignType = "song" | "setlist";

export default function AdminLibraryPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"songs" | "setlists">("songs");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignType, setAssignType] = useState<AssignType>("song");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [selectedItemName, setSelectedItemName] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userSearch, setUserSearch] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState("");

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/auth/login";
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
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

      // Fetch all data in parallel
      const [usersRes, songsRes, setlistsRes] = await Promise.all([
        fetch("/api/admin/users", { headers: getAuthHeaders() }),
        fetch("/api/admin/all-songs", { headers: getAuthHeaders() }),
        fetch("/api/admin/all-setlists", { headers: getAuthHeaders() }),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      }

      if (songsRes.ok) {
        const songsData = await songsRes.json();
        setSongs(Array.isArray(songsData) ? songsData : []);
      }

      if (setlistsRes.ok) {
        const setlistsData = await setlistsRes.json();
        setSetlists(Array.isArray(setlistsData) ? setlistsData : []);
      }
    } catch (err) {
      console.error("Error:", err);
      setError("שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  };

  const openAssignModal = (type: AssignType, itemId: string, itemName: string) => {
    setAssignType(type);
    setSelectedItemId(itemId);
    setSelectedItemName(itemName);
    setSelectedUserId("");
    setUserSearch("");
    setAssignSuccess("");
    setShowAssignModal(true);
  };

  const handleAssign = async () => {
    if (!selectedUserId) {
      return;
    }

    setAssigning(true);
    setAssignSuccess("");

    try {
      const endpoint = assignType === "song"
        ? "/api/admin/assign-song"
        : "/api/admin/assign-setlist";

      const body = assignType === "song"
        ? { songId: selectedItemId, targetUserId: selectedUserId }
        : { setlistId: selectedItemId, targetUserId: selectedUserId, copySongs: true };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const targetUser = users.find(u => u._id === selectedUserId);
        const userName = targetUser?.display_name || targetUser?.email || "המשתמש";
        setAssignSuccess(`${assignType === "song" ? "השיר" : "ההופעה"} הועתק/ה בהצלחה ל-${userName}`);

        // Reload data to show updated content
        loadData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "שגיאה בהעתקה");
      }
    } catch (err) {
      console.error("Error assigning:", err);
      setError("שגיאה בהעתקה");
    } finally {
      setAssigning(false);
    }
  };

  const filteredSongs = songs.filter(
    (s) =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.user_email && s.user_email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSetlists = setlists.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.user_email && s.user_email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.display_name && u.display_name.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.username && u.username.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const getUserDisplay = (userId: string, userEmail?: string, userName?: string) => {
    if (userName) return userName;
    if (userEmail) return userEmail;
    const foundUser = users.find(u => u._id === userId);
    return foundUser?.display_name || foundUser?.email || userId;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

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
      <header className="bg-white shadow-sm border-b-4 border-purple-500">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-purple-600">Zamar - ספריית תוכן</h1>
            {user && (
              <p className="text-sm text-gray-500">כל השירים וההופעות במערכת</p>
            )}
          </div>
          <nav className="flex gap-4">
            <Link href="/admin" className="text-gray-600 hover:text-indigo-600">
              ניהול משתמשים
            </Link>
            <Link href="/dashboard" className="text-gray-600 hover:text-indigo-600">
              דאשבורד
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-right">
            {error}
            <button
              onClick={() => setError("")}
              className="mr-4 text-red-500 hover:text-red-700"
            >
              X
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">סה"כ שירים</h3>
            <p className="text-3xl font-bold text-purple-600">{songs.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">סה"כ הופעות</h3>
            <p className="text-3xl font-bold text-indigo-600">{setlists.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("songs")}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === "songs"
                ? "bg-purple-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            שירים ({songs.length})
          </button>
          <button
            onClick={() => setActiveTab("setlists")}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === "setlists"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            הופעות ({setlists.length})
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeTab === "songs" ? "חיפוש לפי שם שיר, אמן או משתמש..." : "חיפוש לפי שם הופעה או משתמש..."}
            className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-right placeholder:text-gray-500"
          />
        </div>

        {/* Songs Tab */}
        {activeTab === "songs" && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {filteredSongs.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                {songs.length === 0
                  ? "אין שירים במערכת. יש להוסיף endpoint בבקאנד: GET /api/admin/all-songs"
                  : "לא נמצאו שירים התואמים לחיפוש"}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">שם השיר</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">אמן</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">שפה</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">בעלים</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSongs.map((song) => (
                    <tr key={song._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-900 font-medium">{song.title}</td>
                      <td className="px-6 py-4 text-gray-600">{song.artist}</td>
                      <td className="px-6 py-4 text-gray-600">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          song.language === "he" ? "bg-blue-100 text-blue-800" :
                          song.language === "ar" ? "bg-green-100 text-green-800" :
                          song.language === "aramaic" ? "bg-purple-100 text-purple-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {song.language === "he" ? "עברית" :
                           song.language === "ar" ? "ערבית" :
                           song.language === "aramaic" ? "ארמית" : "אנגלית"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {getUserDisplay(song.user_id, song.user_email, song.user_name)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openAssignModal("song", song._id, song.title)}
                          className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg text-sm hover:bg-purple-200 transition-colors"
                        >
                          צמד למשתמש
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Setlists Tab */}
        {activeTab === "setlists" && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {filteredSetlists.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                {setlists.length === 0
                  ? "אין הופעות במערכת. יש להוסיף endpoint בבקאנד: GET /api/admin/all-setlists"
                  : "לא נמצאו הופעות התואמות לחיפוש"}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">שם ההופעה</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">מספר שירים</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">בעלים</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">תאריך יצירה</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSetlists.map((setlist) => (
                    <tr key={setlist._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-900 font-medium">{setlist.name}</td>
                      <td className="px-6 py-4 text-gray-600">{setlist.songs?.length || 0} שירים</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {getUserDisplay(setlist.user_id, setlist.user_email, setlist.user_name)}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {setlist.created_at ? new Date(setlist.created_at).toLocaleDateString("he-IL") : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openAssignModal("setlist", setlist._id, setlist.name)}
                          className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-sm hover:bg-indigo-200 transition-colors"
                        >
                          צמד למשתמש
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Stats Footer */}
        <div className="mt-8 text-gray-500 text-sm text-right">
          {activeTab === "songs" && songs.length > 0 && (
            <p>
              סה"כ {songs.length} שירים{" "}
              {searchTerm && `(מוצגים ${filteredSongs.length})`}
            </p>
          )}
          {activeTab === "setlists" && setlists.length > 0 && (
            <p>
              סה"כ {setlists.length} הופעות{" "}
              {searchTerm && `(מוצגות ${filteredSetlists.length})`}
            </p>
          )}
        </div>
      </main>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4" dir="rtl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              צמד {assignType === "song" ? "שיר" : "הופעה"} למשתמש
            </h2>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">
                {assignType === "song" ? "השיר שנבחר:" : "ההופעה שנבחרה:"}
              </p>
              <p className="font-medium text-gray-900">{selectedItemName}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                ייוצר עותק של {assignType === "song" ? "השיר" : "ההופעה והשירים שבה"} עבור המשתמש שתבחר.
                המשתמש יוכל לערוך את העותק שלו מבלי להשפיע על המקור.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                בחר משתמש יעד:
              </label>
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="חפש לפי מייל או שם..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2 text-right"
              />
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredUsers.length === 0 ? (
                  <p className="p-4 text-center text-gray-500 text-sm">לא נמצאו משתמשים</p>
                ) : (
                  filteredUsers.map((u) => (
                    <button
                      key={u._id}
                      onClick={() => setSelectedUserId(u._id)}
                      className={`w-full px-4 py-3 text-right hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                        selectedUserId === u._id ? "bg-purple-50 border-purple-200" : ""
                      }`}
                    >
                      <p className="font-medium text-gray-900">
                        {u.display_name || u.username || u.email}
                      </p>
                      {u.display_name && (
                        <p className="text-sm text-gray-500">{u.email}</p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            {assignSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-right">
                {assignSuccess}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                סגור
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedUserId || assigning}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {assigning ? "מעתיק..." : "צמד והעתק"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
