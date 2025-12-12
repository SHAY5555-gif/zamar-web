"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { getAuthHeaders, getToken, getCurrentUser, type AuthUser } from "@/lib/auth";

const ADMIN_EMAIL = "yeshayaavitan@gmail.com";

interface Song {
  _id: string;
  title: string;
  artist: string;
  lyrics: string;
  language: "he" | "ar" | "aramaic" | "en";
  createdAt?: string;
  updatedAt?: string;
}

interface Setlist {
  _id: string;
  name: string;
  songs: string[] | Song[];
  createdAt?: string;
}

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
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Navigation state for native view
  const [currentScreen, setCurrentScreen] = useState<"songs" | "setlists" | "song-detail" | "setlist-detail">("songs");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [showAddSongModal, setShowAddSongModal] = useState(false);
  const [showEditSongModal, setShowEditSongModal] = useState(false);
  const [showAddSetlistModal, setShowAddSetlistModal] = useState(false);
  const [showEditSetlistModal, setShowEditSetlistModal] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null>(null);
  const [newSong, setNewSong] = useState({
    title: "",
    artist: "",
    lyrics: "",
    language: "he" as Song["language"],
  });
  const [newSetlist, setNewSetlist] = useState({ name: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/auth/login";
      return;
    }
    checkAdminAndFetchData();
  }, [userId]);

  const checkAdminAndFetchData = async () => {
    try {
      const user = await getCurrentUser();

      if (!user) {
        window.location.href = "/auth/login";
        return;
      }

      setCurrentUser(user);

      if (user.email !== ADMIN_EMAIL) {
        setError("אין לך הרשאות גישה לעמוד זה");
        setLoading(false);
        return;
      }

      // Fetch user info
      const userResponse = await fetch(`/api/admin/users`, {
        headers: getAuthHeaders(),
      });

      if (userResponse.ok) {
        const usersData = await userResponse.json();
        const target = usersData.find((u: User) => u._id === userId);
        if (target) {
          setTargetUser(target);
        }
      }

      // Fetch user's songs
      const songsResponse = await fetch(`/api/admin/users/${userId}/songs`, {
        headers: getAuthHeaders(),
      });

      if (songsResponse.ok) {
        const songsData = await songsResponse.json();
        setSongs(Array.isArray(songsData) ? songsData : []);
      }

      // Fetch user's setlists
      const setlistsResponse = await fetch(`/api/admin/users/${userId}/setlists`, {
        headers: getAuthHeaders(),
      });

      if (setlistsResponse.ok) {
        const setlistsData = await setlistsResponse.json();
        setSetlists(Array.isArray(setlistsData) ? setlistsData : []);
      }
    } catch (err) {
      console.error("Error:", err);
      setError("שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  };

  // Filter songs based on search
  const filteredSongs = songs.filter(
    (song) =>
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.lyrics.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Song Functions
  const handleAddSong = async () => {
    if (!newSong.title || !newSong.artist || !newSong.lyrics) {
      setError("יש למלא את כל השדות");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${userId}/songs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(newSong),
      });

      if (!response.ok) {
        throw new Error("Failed to add song");
      }

      const data = await response.json();
      setSongs([...songs, data]);
      setNewSong({ title: "", artist: "", lyrics: "", language: "he" });
      setShowAddSongModal(false);
      setSuccessMessage("השיר נוסף בהצלחה");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהוספת השיר");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSong = async () => {
    if (!editingSong) return;
    if (!editingSong.title || !editingSong.artist || !editingSong.lyrics) {
      setError("יש למלא את כל השדות");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${userId}/songs/${editingSong._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          title: editingSong.title,
          artist: editingSong.artist,
          lyrics: editingSong.lyrics,
          language: editingSong.language,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update song");
      }

      const updatedSong = await response.json();
      setSongs(songs.map((s) => (s._id === updatedSong._id ? updatedSong : s)));
      setShowEditSongModal(false);
      setEditingSong(null);
      if (selectedSong?._id === updatedSong._id) {
        setSelectedSong(updatedSong);
      }
      setSuccessMessage("השיר עודכן בהצלחה");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בעדכון השיר");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSong = async (songId: string) => {
    if (!confirm("האם למחוק את השיר?")) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/songs/${songId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to delete song");
      }

      setSongs(songs.filter((s) => s._id !== songId));
      if (selectedSong?._id === songId) {
        setSelectedSong(null);
        setCurrentScreen("songs");
      }
      setSuccessMessage("השיר נמחק בהצלחה");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה במחיקת השיר");
    }
  };

  // Setlist Functions
  const handleAddSetlist = async () => {
    if (!newSetlist.name) {
      setError("יש להזין שם לרשימה");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${userId}/setlists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ name: newSetlist.name, songs: [] }),
      });

      if (!response.ok) {
        throw new Error("Failed to add setlist");
      }

      const data = await response.json();
      setSetlists([...setlists, data]);
      setNewSetlist({ name: "" });
      setShowAddSetlistModal(false);
      setSuccessMessage("הרשימה נוספה בהצלחה");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהוספת הרשימה");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSetlist = async () => {
    if (!editingSetlist) return;
    if (!editingSetlist.name) {
      setError("יש להזין שם לרשימה");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${userId}/setlists/${editingSetlist._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ name: editingSetlist.name }),
      });

      if (!response.ok) {
        throw new Error("Failed to update setlist");
      }

      const updatedSetlist = await response.json();
      setSetlists(setlists.map((s) => (s._id === updatedSetlist._id ? updatedSetlist : s)));
      setShowEditSetlistModal(false);
      setEditingSetlist(null);
      setSuccessMessage("הרשימה עודכנה בהצלחה");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בעדכון הרשימה");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSetlist = async (setlistId: string) => {
    if (!confirm("האם למחוק את הרשימה?")) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/setlists/${setlistId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to delete setlist");
      }

      setSetlists(setlists.filter((s) => s._id !== setlistId));
      if (selectedSetlist?._id === setlistId) {
        setSelectedSetlist(null);
        setCurrentScreen("setlists");
      }
      setSuccessMessage("הרשימה נמחקה בהצלחה");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה במחיקת הרשימה");
    }
  };

  const getLanguageDisplay = (lang: string) => {
    switch (lang) {
      case "he": return "עברית";
      case "ar": return "ערבית";
      case "aramaic": return "ארמית";
      case "en": return "אנגלית";
      default: return lang;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (currentUser && currentUser.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center" dir="rtl">
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

  // Render the native-like phone view
  const renderPhoneScreen = () => {
    // Songs List Screen
    if (currentScreen === "songs") {
      return (
        <div className="flex flex-col h-full bg-gray-50">
          {/* Search Bar */}
          <div className="bg-white p-4 border-b border-gray-200">
            <input
              type="text"
              placeholder="חפש שיר..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 text-right text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              dir="rtl"
            />
          </div>

          {/* Header */}
          <div className="bg-white p-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 text-right">הספרייה שלי</h2>
            <p className="text-gray-500 text-right">{songs.length} שירים</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowAddSongModal(true)}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                + שיר חדש
              </button>
            </div>
          </div>

          {/* Songs List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {filteredSongs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎵</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {songs.length === 0 ? "אין שירים עדיין" : "לא נמצאו תוצאות"}
                </h3>
                <p className="text-gray-500">
                  {songs.length === 0 ? "הוסף את השיר הראשון שלך" : "נסה חיפוש אחר"}
                </p>
              </div>
            ) : (
              filteredSongs.map((song) => (
                <div
                  key={song._id}
                  className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      setSelectedSong(song);
                      setCurrentScreen("song-detail");
                    }}>
                    <h3 className="text-lg font-bold text-gray-800 text-right mb-1">
                      {song.title}
                    </h3>
                    <p className="text-indigo-600 text-right mb-2">{song.artist}</p>
                    <p className="text-gray-500 text-right text-sm line-clamp-2">
                      {song.lyrics}
                    </p>
                  </div>
                  <div className="flex border-t border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedSong(song);
                        setCurrentScreen("song-detail");
                      }}
                      className="flex-1 py-3 text-indigo-600 font-semibold hover:bg-indigo-50 transition-colors">
                      צפה
                    </button>
                    <button
                      onClick={() => handleDeleteSong(song._id)}
                      className="flex-1 py-3 text-red-600 font-semibold hover:bg-red-50 transition-colors border-r border-gray-100">
                      מחק
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    // Song Detail Screen
    if (currentScreen === "song-detail" && selectedSong) {
      return (
        <div className="flex flex-col h-full bg-gray-50">
          {/* Header */}
          <div className="bg-white p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800 text-right mb-2">
              {selectedSong.title}
            </h1>
            <p className="text-indigo-600 text-right text-lg">{selectedSong.artist}</p>
            <div className="flex gap-2 mt-3">
              <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-sm">
                {getLanguageDisplay(selectedSong.language)}
              </span>
            </div>
          </div>

          {/* Lyrics */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-bold text-gray-800 text-right mb-4">
                מילות השיר
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <pre className="text-right text-gray-800 whitespace-pre-wrap font-sans leading-7">
                  {selectedSong.lyrics}
                </pre>
              </div>
            </div>

            {selectedSong.createdAt && (
              <div className="mt-4 text-gray-400 text-sm text-right">
                נוצר: {new Date(selectedSong.createdAt).toLocaleDateString("he-IL")}
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="bg-white p-4 border-t border-gray-200 flex gap-3">
            <button
              onClick={() => {
                setEditingSong({ ...selectedSong });
                setShowEditSongModal(true);
              }}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
              ערוך
            </button>
            <button
              onClick={() => handleDeleteSong(selectedSong._id)}
              className="flex-1 bg-red-100 text-red-600 py-3 rounded-lg font-semibold hover:bg-red-200 transition-colors">
              מחק
            </button>
          </div>
        </div>
      );
    }

    // Setlists Screen
    if (currentScreen === "setlists") {
      return (
        <div className="flex flex-col h-full bg-gray-50">
          {/* Header */}
          <div className="bg-white p-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 text-right">רשימות הופעה</h2>
            <p className="text-gray-500 text-right">{setlists.length} רשימות</p>
            <button
              onClick={() => setShowAddSetlistModal(true)}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold mt-3 hover:bg-indigo-700 transition-colors">
              + רשימה חדשה
            </button>
          </div>

          {/* Setlists Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {setlists.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">אין רשימות עדיין</h3>
                <p className="text-gray-500">צור את הרשימה הראשונה שלך</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {setlists.map((setlist) => (
                  <div
                    key={setlist._id}
                    className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 text-right mb-2">
                      {setlist.name}
                    </h3>
                    <p className="text-gray-500 text-right mb-4">
                      {Array.isArray(setlist.songs) ? setlist.songs.length : 0} שירים
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingSetlist({ ...setlist });
                          setShowEditSetlistModal(true);
                        }}
                        className="flex-1 py-2 text-indigo-600 font-semibold bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                        עריכה
                      </button>
                      <button
                        onClick={() => handleDeleteSetlist(setlist._id)}
                        className="flex-1 py-2 text-red-600 font-semibold bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                        מחיקה
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-4 border-red-500">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-600 hover:text-indigo-600 flex items-center gap-2">
              <span>←</span>
              <span>חזרה לרשימה</span>
            </Link>
            <h1 className="text-xl font-bold text-red-600">ניהול משתמש</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-right">
            {error}
            <button onClick={() => setError("")} className="float-left text-red-500 hover:text-red-700">✕</button>
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 text-right">
            {successMessage}
          </div>
        )}

        <div className="flex gap-8">
          {/* User Info Sidebar */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl text-indigo-600">
                    {(targetUser?.username || targetUser?.email || "U")[0].toUpperCase()}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {targetUser?.username || "משתמש"}
                </h2>
                <p className="text-gray-500 text-sm">{targetUser?.email}</p>
              </div>

              <div className="space-y-4">
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-indigo-600">{songs.length}</div>
                  <div className="text-indigo-600 text-sm">שירים</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{setlists.length}</div>
                  <div className="text-green-600 text-sm">רשימות</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-600">
                    ${((targetUser?.credits?.count || 0) / 100).toFixed(2)}
                  </div>
                  <div className="text-yellow-600 text-sm">יתרה</div>
                </div>
                <div className={`rounded-lg p-4 text-center ${targetUser?.subscription?.active ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <div className={`text-lg font-bold ${targetUser?.subscription?.active ? 'text-green-600' : 'text-gray-600'}`}>
                    {targetUser?.subscription?.active ? "פרימיום" : "חינמי"}
                  </div>
                  <div className={`text-sm ${targetUser?.subscription?.active ? 'text-green-600' : 'text-gray-500'}`}>
                    מנוי
                  </div>
                </div>
              </div>

              {/* View as Native App Button */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={async () => {
                    try {
                      // Get impersonation token from backend
                      const response = await fetch(`/api/admin/users/${userId}/impersonate`, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                      });

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to get impersonation token');
                      }

                      const data = await response.json();
                      const expoWebUrl = process.env.NEXT_PUBLIC_EXPO_WEB_URL || 'https://zamar.hebrew-transliteration.com';
                      const impersonationUrl = `${expoWebUrl}?impersonationToken=${encodeURIComponent(data.token)}`;
                      window.open(impersonationUrl, '_blank');
                    } catch (err) {
                      console.error('Failed to open native view:', err);
                      setError(err instanceof Error ? err.message : 'Failed to open native view');
                    }
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2">
                  <span className="text-lg">📱</span>
                  <span>צפה באפליקציה הנייטיב</span>
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  פותח את תצוגת האפליקציה כמשתמש זה
                </p>
              </div>
            </div>
          </div>

          {/* Phone Frame with Native App View */}
          <div className="flex-1 flex justify-center">
            <div className="relative">
              {/* Phone Frame */}
              <div className="w-[375px] h-[812px] bg-gray-900 rounded-[50px] p-3 shadow-2xl">
                {/* Phone Notch */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-gray-900 rounded-b-3xl z-10"></div>

                {/* Phone Screen */}
                <div className="w-full h-full bg-white rounded-[40px] overflow-hidden flex flex-col">
                  {/* Status Bar */}
                  <div className="h-12 bg-white flex items-center justify-between px-6 pt-2">
                    <span className="text-sm font-semibold text-gray-900">9:41</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs">📶</span>
                      <span className="text-xs">📡</span>
                      <span className="text-xs">🔋</span>
                    </div>
                  </div>

                  {/* App Header with Back Button */}
                  <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between">
                    {(currentScreen === "song-detail" || currentScreen === "setlist-detail") && (
                      <button
                        onClick={() => {
                          if (currentScreen === "song-detail") {
                            setCurrentScreen("songs");
                            setSelectedSong(null);
                          } else {
                            setCurrentScreen("setlists");
                            setSelectedSetlist(null);
                          }
                        }}
                        className="text-white font-semibold">
                        → חזרה
                      </button>
                    )}
                    <h1 className="text-white font-bold text-lg flex-1 text-center">
                      Zamar
                    </h1>
                    {(currentScreen === "song-detail" || currentScreen === "setlist-detail") && (
                      <div className="w-12"></div>
                    )}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 overflow-hidden">
                    {renderPhoneScreen()}
                  </div>

                  {/* Bottom Tab Bar */}
                  <div className="h-20 bg-white border-t border-gray-200 flex items-center justify-around pb-4">
                    <button
                      onClick={() => {
                        setCurrentScreen("songs");
                        setSelectedSong(null);
                      }}
                      className={`flex flex-col items-center gap-1 ${
                        currentScreen === "songs" || currentScreen === "song-detail"
                          ? "text-indigo-600"
                          : "text-gray-400"
                      }`}>
                      <span className="text-2xl">🎵</span>
                      <span className="text-xs font-medium">שירים</span>
                    </button>
                    <button
                      onClick={() => {
                        setCurrentScreen("setlists");
                        setSelectedSetlist(null);
                      }}
                      className={`flex flex-col items-center gap-1 ${
                        currentScreen === "setlists" || currentScreen === "setlist-detail"
                          ? "text-indigo-600"
                          : "text-gray-400"
                      }`}>
                      <span className="text-2xl">📋</span>
                      <span className="text-xs font-medium">רשימות</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Admin Badge */}
              <div className="absolute -top-4 -right-4 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg font-bold text-sm">
                מצב אדמין
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Song Modal */}
      {showAddSongModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">הוספת שיר חדש</h2>
                <button onClick={() => setShowAddSongModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">שם השיר</label>
                  <input
                    type="text"
                    value={newSong.title}
                    onChange={(e) => setNewSong({ ...newSong, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right"
                    placeholder="הכנס שם שיר"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">אמן</label>
                  <input
                    type="text"
                    value={newSong.artist}
                    onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right"
                    placeholder="הכנס שם אמן"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">שפה</label>
                  <select
                    value={newSong.language}
                    onChange={(e) => setNewSong({ ...newSong, language: e.target.value as Song["language"] })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right">
                    <option value="he">עברית</option>
                    <option value="ar">ערבית</option>
                    <option value="aramaic">ארמית</option>
                    <option value="en">אנגלית</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">מילות השיר</label>
                  <textarea
                    value={newSong.lyrics}
                    onChange={(e) => setNewSong({ ...newSong, lyrics: e.target.value })}
                    rows={10}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right resize-none"
                    placeholder="הכנס מילות שיר"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddSong}
                  disabled={saving}
                  className="flex-1 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {saving ? "שומר..." : "שמור שיר"}
                </button>
                <button
                  onClick={() => setShowAddSongModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors">
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Song Modal */}
      {showEditSongModal && editingSong && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">עריכת שיר</h2>
                <button
                  onClick={() => {
                    setShowEditSongModal(false);
                    setEditingSong(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl">
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">שם השיר</label>
                  <input
                    type="text"
                    value={editingSong.title}
                    onChange={(e) => setEditingSong({ ...editingSong, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">אמן</label>
                  <input
                    type="text"
                    value={editingSong.artist}
                    onChange={(e) => setEditingSong({ ...editingSong, artist: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">שפה</label>
                  <select
                    value={editingSong.language}
                    onChange={(e) => setEditingSong({ ...editingSong, language: e.target.value as Song["language"] })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right">
                    <option value="he">עברית</option>
                    <option value="ar">ערבית</option>
                    <option value="aramaic">ארמית</option>
                    <option value="en">אנגלית</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">מילות השיר</label>
                  <textarea
                    value={editingSong.lyrics}
                    onChange={(e) => setEditingSong({ ...editingSong, lyrics: e.target.value })}
                    rows={10}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleUpdateSong}
                  disabled={saving}
                  className="flex-1 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {saving ? "שומר..." : "שמור שינויים"}
                </button>
                <button
                  onClick={() => {
                    setShowEditSongModal(false);
                    setEditingSong(null);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors">
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Setlist Modal */}
      {showAddSetlistModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" dir="rtl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">הוספת רשימה חדשה</h2>
                <button onClick={() => setShowAddSetlistModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">שם הרשימה</label>
                <input
                  type="text"
                  value={newSetlist.name}
                  onChange={(e) => setNewSetlist({ name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right"
                  placeholder="הכנס שם לרשימה"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddSetlist}
                  disabled={saving}
                  className="flex-1 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {saving ? "שומר..." : "שמור רשימה"}
                </button>
                <button
                  onClick={() => setShowAddSetlistModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors">
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Setlist Modal */}
      {showEditSetlistModal && editingSetlist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" dir="rtl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">עריכת רשימה</h2>
                <button
                  onClick={() => {
                    setShowEditSetlistModal(false);
                    setEditingSetlist(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl">
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">שם הרשימה</label>
                <input
                  type="text"
                  value={editingSetlist.name}
                  onChange={(e) => setEditingSetlist({ ...editingSetlist, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleUpdateSetlist}
                  disabled={saving}
                  className="flex-1 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {saving ? "שומר..." : "שמור שינויים"}
                </button>
                <button
                  onClick={() => {
                    setShowEditSetlistModal(false);
                    setEditingSetlist(null);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors">
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
