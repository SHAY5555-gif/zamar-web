"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getAuthHeaders, getToken } from "@/lib/auth";

interface Song {
  _id: string;
  title: string;
  artist: string;
  lyrics: string;
  language: 'he' | 'ar' | 'aramaic' | 'en';
}

interface ImportSong {
  title: string;
  artist: string;
  lyrics: string;
  language?: 'he' | 'ar' | 'aramaic' | 'en';
}

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [newSong, setNewSong] = useState({
    title: "",
    artist: "",
    lyrics: "",
    language: "he" as Song["language"],
  });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Import state
  const [showAIImportModal, setShowAIImportModal] = useState(false);
  const [aiSearchQueries, setAiSearchQueries] = useState<string[]>([""]);
  const [aiSearchingIndexes, setAiSearchingIndexes] = useState<Set<number>>(new Set());
  const [aiResults, setAiResults] = useState<({ title: string; artist: string; lyrics: string } | null)[]>([null]);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/auth/login";
      return;
    }
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

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/auth/login";
          return;
        }
        throw new Error("Failed to fetch songs");
      }

      const data = await response.json();
      setSongs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינת השירים");
    } finally {
      setLoading(false);
    }
  };

  const filteredSongs = songs.filter(
    (song) =>
      song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSong = async () => {
    if (!newSong.title || !newSong.artist || !newSong.lyrics) {
      setError("יש למלא את כל השדות");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/zamar/songs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify(newSong),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add song");
      }

      const data = await response.json();
      setSongs([...songs, data]);
      setNewSong({ title: "", artist: "", lyrics: "", language: "he" });
      setShowAddModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהוספת השיר");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSong = async (songId: string) => {
    if (!confirm("האם למחוק את השיר?")) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/zamar/songs/${songId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete song");
      }

      setSongs(songs.filter((s) => s._id !== songId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה במחיקת השיר");
    }
  };

  const handleEditClick = (song: Song) => {
    setEditingSong({ ...song });
    setShowEditModal(true);
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccessMessage("");
    setImporting(true);

    try {
      const text = await file.text();
      let importData: ImportSong[];

      try {
        const parsed = JSON.parse(text);
        // Support both array format and { songs: [] } format
        importData = Array.isArray(parsed) ? parsed : parsed.songs;

        if (!Array.isArray(importData)) {
          throw new Error("Invalid format");
        }
      } catch {
        setError("קובץ JSON לא תקין. הפורמט הנדרש: מערך של שירים עם title, artist, lyrics");
        setImporting(false);
        return;
      }

      // Validate each song
      const validSongs = importData.filter(song =>
        song.title && song.artist && song.lyrics
      );

      if (validSongs.length === 0) {
        setError("לא נמצאו שירים תקינים בקובץ. כל שיר חייב להכיל: title, artist, lyrics");
        setImporting(false);
        return;
      }

      setImportProgress({ current: 0, total: validSongs.length });
      const newSongs: Song[] = [];
      let failedCount = 0;

      for (let i = 0; i < validSongs.length; i++) {
        const song = validSongs[i];
        try {
          const response = await fetch(
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

          if (response.ok) {
            const newSong = await response.json();
            newSongs.push(newSong);
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
        setImportProgress({ current: i + 1, total: validSongs.length });
      }

      setSongs([...songs, ...newSongs]);

      if (failedCount === 0) {
        setSuccessMessage(`יובאו בהצלחה ${newSongs.length} שירים`);
      } else {
        setSuccessMessage(`יובאו ${newSongs.length} שירים. ${failedCount} שירים נכשלו.`);
      }

      setShowImportModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בייבוא הקובץ");
    } finally {
      setImporting(false);
      setImportProgress({ current: 0, total: 0 });
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleExportJSON = () => {
    const exportData = songs.map(song => ({
      title: song.title,
      artist: song.artist,
      lyrics: song.lyrics,
      language: song.language,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "songs.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // AI Import functions
  const handleOpenAIImport = () => {
    setShowAIImportModal(true);
    setAiError("");
    setAiResults([null]);
    setAiSearchQueries([""]);
    setAiSearchingIndexes(new Set());
  };

  const handleAddSongInput = () => {
    setAiSearchQueries([...aiSearchQueries, ""]);
    setAiResults([...aiResults, null]);
  };

  const handleRemoveSongInput = (index: number) => {
    if (aiSearchQueries.length <= 1) return;
    setAiSearchQueries(aiSearchQueries.filter((_, i) => i !== index));
    setAiResults(aiResults.filter((_, i) => i !== index));
  };

  const handleAISearch = async (index: number) => {
    const query = aiSearchQueries[index];
    if (!query.trim()) {
      setAiError("יש להזין שם שיר או אמן לחיפוש");
      return;
    }

    // Add to searching set
    setAiSearchingIndexes(prev => new Set(prev).add(index));
    setAiError("");

    try {
      // Create new thread for this search (parallel - each song gets its own thread)
      const threadResponse = await fetch("/api/langgraph");
      if (!threadResponse.ok) throw new Error("Failed to create thread");
      const threadData = await threadResponse.json();
      const currentThreadId = threadData.thread_id;

      // Send search query
      const response = await fetch("/api/langgraph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: currentThreadId,
          message: `${query}\n\nReturn JSON: {"title":"...","artist":"...","lyrics":"..."}`,
        }),
      });

      if (!response.ok) throw new Error("Failed to search");

      const data = await response.json();
      const aiMessage = data.message;

      if (!aiMessage || aiMessage.trim() === "") {
        setAiError("לא התקבלה תשובה מה-AI. נסה שוב.");
        return;
      }

      // Try to parse JSON from response
      let result: { title: string; artist: string; lyrics: string };
      const jsonMatch = aiMessage.match(/\{[\s\S]*"title"[\s\S]*"artist"[\s\S]*"lyrics"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.title && parsed.artist && parsed.lyrics) {
            result = parsed;
          } else {
            throw new Error("Invalid JSON");
          }
        } catch {
          result = {
            title: query.split(" - ")[0] || query,
            artist: query.split(" - ")[1] || "",
            lyrics: aiMessage,
          };
        }
      } else {
        result = {
          title: query.split(" - ")[0] || query,
          artist: query.split(" - ")[1] || "",
          lyrics: aiMessage,
        };
      }

      // Update the specific result
      setAiResults(prev => {
        const newResults = [...prev];
        newResults[index] = result;
        return newResults;
      });
    } catch (err) {
      console.error("AI Search error:", err);
      setAiError(err instanceof Error ? err.message : "שגיאה בחיפוש. נסה שוב.");
    } finally {
      // Remove from searching set
      setAiSearchingIndexes(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  // Search all songs in parallel
  const handleSearchAll = () => {
    const queriesToSearch = aiSearchQueries
      .map((q, i) => ({ query: q, index: i }))
      .filter(({ query, index }) => query.trim() && !aiResults[index] && !aiSearchingIndexes.has(index));

    queriesToSearch.forEach(({ index }) => {
      handleAISearch(index);
    });
  };

  const handleUpdateAIResult = (index: number, field: string, value: string) => {
    const newResults = [...aiResults];
    if (newResults[index]) {
      newResults[index] = { ...newResults[index]!, [field]: value };
      setAiResults(newResults);
    }
  };

  const handleSaveAllAIResults = async () => {
    const validResults = aiResults.filter(r => r && r.title && r.artist && r.lyrics);
    if (validResults.length === 0) {
      setAiError("אין שירים לשמירה");
      return;
    }

    setSaving(true);
    setAiError("");
    const newSongs: Song[] = [];
    let failedCount = 0;

    for (const result of validResults) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/zamar/songs`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              title: result!.title,
              artist: result!.artist,
              lyrics: result!.lyrics,
              language: "he",
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          newSongs.push(data);
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }
    }

    setSongs([...songs, ...newSongs]);
    if (failedCount === 0) {
      setSuccessMessage(`נשמרו בהצלחה ${newSongs.length} שירים`);
    } else {
      setSuccessMessage(`נשמרו ${newSongs.length} שירים. ${failedCount} נכשלו.`);
    }
    setShowAIImportModal(false);
    setAiResults([null]);
    setAiSearchQueries([""]);
    setSaving(false);
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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/zamar/songs/${editingSong._id}`,
        {
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
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update song");
      }

      const updatedSong = await response.json();
      setSongs(songs.map((s) => (s._id === updatedSong._id ? updatedSong : s)));
      setShowEditModal(false);
      setEditingSong(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בעדכון השיר");
    } finally {
      setSaving(false);
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
            <h1 className="text-xl font-bold text-gray-900">השירים שלי</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAIImport}
              className="bg-purple-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
              ייבוא עם AI
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-green-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
              ייבוא JSON
            </button>
            {songs.length > 0 && (
              <button
                onClick={handleExportJSON}
                className="bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                יצוא JSON
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
              הוסף שיר
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

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="חיפוש לפי שם שיר או אמן..."
            className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Songs List */}
        {filteredSongs.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <p className="text-gray-500 mb-4">
              {songs.length === 0
                ? "עדיין אין לך שירים. הוסף את השיר הראשון!"
                : "לא נמצאו שירים התואמים לחיפוש"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                    שם השיר
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                    אמן
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                    שפה
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSongs.map((song) => (
                  <tr key={song._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      {song.title}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{song.artist}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {song.language === "he"
                        ? "עברית"
                        : song.language === "ar"
                        ? "ערבית"
                        : song.language === "aramaic"
                        ? "ארמית"
                        : "אנגלית"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleEditClick(song)}
                        className="text-indigo-600 hover:underline ml-4">
                        עריכה
                      </button>
                      <button
                        onClick={() => handleDeleteSong(song._id)}
                        className="text-red-600 hover:underline">
                        מחיקה
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 text-gray-500 text-sm">
          {songs.length > 0 && (
            <p>
              סה"כ {songs.length} שירים{" "}
              {searchTerm && `(מוצגים ${filteredSongs.length})`}
            </p>
          )}
        </div>
      </main>

      {/* Add Song Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">הוספת שיר חדש</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600">
                  X
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    שם השיר
                  </label>
                  <input
                    type="text"
                    value={newSong.title}
                    onChange={(e) => setNewSong({ ...newSong, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right"
                    placeholder="הכנס שם שיר"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    אמן
                  </label>
                  <input
                    type="text"
                    value={newSong.artist}
                    onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right"
                    placeholder="הכנס שם אמן"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    שפה
                  </label>
                  <select
                    value={newSong.language}
                    onChange={(e) => setNewSong({ ...newSong, language: e.target.value as Song["language"] })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right">
                    <option value="he">עברית</option>
                    <option value="ar">ערבית</option>
                    <option value="aramaic">ארמית</option>
                    <option value="en">אנגלית</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    מילות השיר
                  </label>
                  <textarea
                    value={newSong.lyrics}
                    onChange={(e) => setNewSong({ ...newSong, lyrics: e.target.value })}
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right"
                    placeholder="הכנס מילות שיר"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddSong}
                  disabled={saving}
                  className="flex-1 bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? "שומר..." : "שמור שיר"}
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-300">
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Song Modal */}
      {showEditModal && editingSong && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">עריכת שיר</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSong(null);
                  }}
                  className="text-gray-400 hover:text-gray-600">
                  X
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    שם השיר
                  </label>
                  <input
                    type="text"
                    value={editingSong.title}
                    onChange={(e) => setEditingSong({ ...editingSong, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    אמן
                  </label>
                  <input
                    type="text"
                    value={editingSong.artist}
                    onChange={(e) => setEditingSong({ ...editingSong, artist: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    שפה
                  </label>
                  <select
                    value={editingSong.language}
                    onChange={(e) => setEditingSong({ ...editingSong, language: e.target.value as Song["language"] })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right">
                    <option value="he">עברית</option>
                    <option value="ar">ערבית</option>
                    <option value="aramaic">ארמית</option>
                    <option value="en">אנגלית</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    מילות השיר
                  </label>
                  <textarea
                    value={editingSong.lyrics}
                    onChange={(e) => setEditingSong({ ...editingSong, lyrics: e.target.value })}
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleUpdateSong}
                  disabled={saving}
                  className="flex-1 bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? "שומר..." : "שמור שינויים"}
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSong(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-300">
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import JSON Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4" dir="rtl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">ייבוא שירים מ-JSON</h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  disabled={importing}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
                  X
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 mb-2">פורמט נדרש:</p>
                  <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-x-auto" dir="ltr">
{`[
  {
    "title": "שם השיר",
    "artist": "שם האמן",
    "lyrics": "מילות השיר",
    "language": "he"
  }
]`}
                  </pre>
                  <p className="text-xs text-gray-500 mt-2">
                    * language: he (עברית), ar (ערבית), aramaic (ארמית), en (אנגלית)
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
                    id="json-file-input"
                  />
                  <label
                    htmlFor="json-file-input"
                    className={`block w-full text-center py-4 px-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 transition-colors ${importing ? "opacity-50 cursor-not-allowed" : ""}`}>
                    {importing ? (
                      <span className="text-gray-500">
                        מייבא... {importProgress.current}/{importProgress.total}
                      </span>
                    ) : (
                      <span className="text-gray-600">לחץ לבחירת קובץ JSON</span>
                    )}
                  </label>
                </div>

                {importing && (
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
                  className="flex-1 bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50">
                  סגור
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Import Modal */}
      {showAIImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">ייבוא שירים עם AI</h2>
                <button
                  onClick={() => {
                    setShowAIImportModal(false);
                    setAiResults([null]);
                    setAiSearchQueries([""]);
                    setAiError("");
                  }}
                  className="text-gray-400 hover:text-gray-600">
                  X
                </button>
              </div>

              {aiError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-right">
                  {aiError}
                </div>
              )}

              {/* Search Section - Multiple Songs */}
              <div className="space-y-4 mb-6">
                {aiSearchQueries.map((query, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">שיר {index + 1}</span>
                      {aiSearchQueries.length > 1 && (
                        <button
                          onClick={() => handleRemoveSongInput(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                          disabled={aiSearchingIndexes.has(index)}>
                          הסר
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                          const newQueries = [...aiSearchQueries];
                          newQueries[index] = e.target.value;
                          setAiSearchQueries(newQueries);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && !aiSearchingIndexes.has(index) && handleAISearch(index)}
                        placeholder='לדוגמה: "Hallelujah - Leonard Cohen"'
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-right"
                        disabled={aiSearchingIndexes.has(index)}
                      />
                      <button
                        onClick={() => handleAISearch(index)}
                        disabled={aiSearchingIndexes.has(index) || !query.trim()}
                        className="bg-purple-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">
                        {aiSearchingIndexes.has(index) ? "..." : "חפש"}
                      </button>
                    </div>

                    {/* Loading indicator for this song */}
                    {aiSearchingIndexes.has(index) && (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                        <span className="mr-2 text-gray-600 text-sm">מחפש...</span>
                      </div>
                    )}

                    {/* Result for this song */}
                    {aiResults[index] && !aiSearchingIndexes.has(index) && (
                      <div className="mt-4 space-y-3 border-t pt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 text-sm font-medium">נמצא</span>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">שם השיר</label>
                          <input
                            type="text"
                            value={aiResults[index]!.title}
                            onChange={(e) => handleUpdateAIResult(index, "title", e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm text-right"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">אמן</label>
                          <input
                            type="text"
                            value={aiResults[index]!.artist}
                            onChange={(e) => handleUpdateAIResult(index, "artist", e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm text-right"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">מילות השיר</label>
                          <textarea
                            value={aiResults[index]!.lyrics}
                            onChange={(e) => handleUpdateAIResult(index, "lyrics", e.target.value)}
                            rows={6}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm text-right"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Song Button */}
                <button
                  onClick={handleAddSongInput}
                  className="w-full py-2 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:bg-purple-50 hover:border-purple-400 transition-colors">
                  + הוסף שיר
                </button>

                {/* Search All Button */}
                {aiSearchQueries.filter((q, i) => q.trim() && !aiResults[i]).length > 1 && (
                  <button
                    onClick={handleSearchAll}
                    disabled={aiSearchingIndexes.size > 0}
                    className="w-full py-2 bg-purple-100 text-purple-700 font-medium rounded-lg hover:bg-purple-200 disabled:opacity-50 transition-colors">
                    {aiSearchingIndexes.size > 0 ? `מחפש ${aiSearchingIndexes.size} שירים...` : "חפש את כולם במקביל"}
                  </button>
                )}

                <p className="text-xs text-gray-500 text-right">
                  ה-AI יחפש את מילות השיר באינטרנט. ניתן לחפש מספר שירים במקביל ולשמור את כולם יחד.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 border-t pt-4">
                {aiResults.some(r => r !== null) && (
                  <button
                    onClick={handleSaveAllAIResults}
                    disabled={saving || aiSearchingIndexes.size > 0}
                    className="flex-1 bg-purple-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50">
                    {saving ? "שומר..." : `שמור ${aiResults.filter(r => r !== null).length} שירים`}
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowAIImportModal(false);
                    setAiResults([null]);
                    setAiSearchQueries([""]);
                  }}
                  disabled={saving || aiSearchingIndexes.size > 0}
                  className="flex-1 bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50">
                  סגור
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
