"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getAuthHeaders, getToken } from "@/lib/auth";

interface SetlistSong {
  song_id: string;
  title: string;
  artist: string;
  position: number;
}

interface Setlist {
  _id: string;
  name: string;
  songs: SetlistSong[];
  created_at: string;
}

interface Song {
  _id: string;
  title: string;
  artist: string;
  lyrics: string;
  language: 'he' | 'ar' | 'aramaic' | 'en';
}

interface ImportSetlist {
  name: string;
  songs: {
    title: string;
    artist: string;
    lyrics: string;
    language?: 'he' | 'ar' | 'aramaic' | 'en';
  }[];
}

export default function SetlistsPage() {
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newSetlistName, setNewSetlistName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, status: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/auth/login";
      return;
    }
    fetchSetlists();
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/zamar/songs`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAllSongs(Array.isArray(data) ? data : []);
      }
    } catch {
      // Silently fail - songs are only needed for export
    }
  };

  const fetchSetlists = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/zamar/setlists`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/auth/login";
          return;
        }
        throw new Error("Failed to fetch setlists");
      }

      const data = await response.json();
      setSetlists(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינת הרשימות");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSetlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetlistName.trim()) return;

    setCreating(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/zamar/setlists`,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: newSetlistName }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create setlist");
      }

      const data = await response.json();
      setSetlists([...setlists, data]);
      setNewSetlistName("");
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה ביצירת הרשימה");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSetlist = async (setlistId: string, setlistName: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את "${setlistName}"?`)) {
      return;
    }

    setDeleting(setlistId);
    setError("");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/zamar/setlists/${setlistId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete setlist");
      }

      // Remove from local state
      setSetlists(setlists.filter((s) => s._id !== setlistId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה במחיקת הרשימה");
    } finally {
      setDeleting(null);
    }
  };

  const handleExportJSON = () => {
    // Build export data with full song details
    const exportData = setlists.map(setlist => {
      const songsWithLyrics = setlist.songs.map(setlistSong => {
        const fullSong = allSongs.find(s => s._id === setlistSong.song_id);
        return {
          title: setlistSong.title,
          artist: setlistSong.artist,
          lyrics: fullSong?.lyrics || "",
          language: fullSong?.language || "he",
          position: setlistSong.position,
        };
      });

      return {
        name: setlist.name,
        songs: songsWithLyrics,
        created_at: setlist.created_at,
      };
    });

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "setlists.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccessMessage("");
    setImporting(true);

    try {
      const text = await file.text();
      let importData: ImportSetlist[];

      try {
        const parsed = JSON.parse(text);
        // Support both array format and { setlists: [] } format
        importData = Array.isArray(parsed) ? parsed : parsed.setlists;

        if (!Array.isArray(importData)) {
          throw new Error("Invalid format");
        }
      } catch {
        setError("קובץ JSON לא תקין. הפורמט הנדרש: מערך של הופעות עם name ו-songs");
        setImporting(false);
        return;
      }

      // Validate each setlist
      const validSetlists = importData.filter(setlist =>
        setlist.name && Array.isArray(setlist.songs)
      );

      if (validSetlists.length === 0) {
        setError("לא נמצאו הופעות תקינות בקובץ. כל הופעה חייבת להכיל: name, songs (מערך)");
        setImporting(false);
        return;
      }

      const totalSongs = validSetlists.reduce((acc, s) => acc + s.songs.length, 0);
      setImportProgress({ current: 0, total: validSetlists.length, status: "מתחיל ייבוא..." });

      const newSetlists: Setlist[] = [];
      let failedCount = 0;

      for (let i = 0; i < validSetlists.length; i++) {
        const setlistData = validSetlists[i];
        setImportProgress({ current: i, total: validSetlists.length, status: `מייבא: ${setlistData.name}` });

        try {
          // First, create/find the songs
          const songIds: string[] = [];

          for (const song of setlistData.songs) {
            if (!song.title || !song.artist || !song.lyrics) continue;

            // Check if song already exists
            let existingSong = allSongs.find(
              s => s.title.toLowerCase() === song.title.toLowerCase() &&
                   s.artist.toLowerCase() === song.artist.toLowerCase()
            );

            if (existingSong) {
              songIds.push(existingSong._id);
            } else {
              // Create new song
              const songResponse = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/zamar/songs`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders(),
                  },
                  body: JSON.stringify({
                    title: song.title,
                    artist: song.artist,
                    lyrics: song.lyrics,
                    language: song.language || "he",
                  }),
                }
              );

              if (songResponse.ok) {
                const newSong = await songResponse.json();
                setAllSongs(prev => [...prev, newSong]);
                songIds.push(newSong._id);
              }
            }
          }

          // Create the setlist with the song IDs
          const setlistResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/zamar/setlists`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
              },
              body: JSON.stringify({
                name: setlistData.name,
                song_ids: songIds,
              }),
            }
          );

          if (setlistResponse.ok) {
            const newSetlist = await setlistResponse.json();
            newSetlists.push(newSetlist);
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
      }

      setSetlists([...setlists, ...newSetlists]);

      if (failedCount === 0) {
        setSuccessMessage(`יובאו בהצלחה ${newSetlists.length} הופעות`);
      } else {
        setSuccessMessage(`יובאו ${newSetlists.length} הופעות. ${failedCount} הופעות נכשלו.`);
      }

      setShowImportModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בייבוא הקובץ");
    } finally {
      setImporting(false);
      setImportProgress({ current: 0, total: 0, status: "" });
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-indigo-600">
              חזרה
            </Link>
            <h1 className="text-xl font-bold text-gray-900">רשימות הופעות</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-green-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              ייבוא JSON
            </button>
            {setlists.length > 0 && (
              <button
                onClick={handleExportJSON}
                className="bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                יצוא JSON
              </button>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              צור רשימה חדשה
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {successMessage}
          </div>
        )}

        {/* Setlists Grid */}
        {setlists.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <p className="text-gray-500 mb-4">
              עדיין אין לך רשימות הופעות. צור את הרשימה הראשונה!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              צור רשימה חדשה
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {setlists.map((setlist) => (
              <div
                key={setlist._id}
                className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {setlist.name}
                </h2>
                <p className="text-gray-500 mb-4">
                  {setlist.songs?.length || 0} שירים
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/setlists/${setlist._id}`}
                    className="flex-1 text-center bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    עריכה
                  </Link>
                  <button
                    onClick={() => handleDeleteSetlist(setlist._id, setlist.name)}
                    disabled={deleting === setlist._id}
                    className="text-red-600 hover:bg-red-50 py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deleting === setlist._id ? "מוחק..." : "מחיקה"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              יצירת רשימת הופעות חדשה
            </h2>
            <form onSubmit={handleCreateSetlist}>
              <div className="mb-6">
                <label
                  htmlFor="setlistName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  שם הרשימה
                </label>
                <input
                  id="setlistName"
                  type="text"
                  value={newSetlistName}
                  onChange={(e) => setNewSetlistName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="לדוגמה: הופעת חתונה 15.01"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {creating ? "יוצר..." : "צור רשימה"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import JSON Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg" dir="rtl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">ייבוא הופעות מ-JSON</h2>
              <button
                onClick={() => setShowImportModal(false)}
                disabled={importing}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                X
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">פורמט נדרש:</p>
                <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-x-auto" dir="ltr">
{`[
  {
    "name": "שם ההופעה",
    "songs": [
      {
        "title": "שם השיר",
        "artist": "שם האמן",
        "lyrics": "מילות השיר",
        "language": "he"
      }
    ]
  }
]`}
                </pre>
                <p className="text-xs text-gray-500 mt-2">
                  * שירים קיימים (לפי שם ואמן) ישויכו אוטומטית
                </p>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  disabled={importing}
                  className="hidden"
                  id="setlist-json-file-input"
                />
                <label
                  htmlFor="setlist-json-file-input"
                  className={`block w-full text-center py-4 px-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 transition-colors ${importing ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {importing ? (
                    <span className="text-gray-500">
                      {importProgress.status || `מייבא... ${importProgress.current}/${importProgress.total}`}
                    </span>
                  ) : (
                    <span className="text-gray-600">לחץ לבחירת קובץ JSON</span>
                  )}
                </label>
              </div>

              {importing && importProgress.total > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowImportModal(false)}
                disabled={importing}
                className="flex-1 bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
