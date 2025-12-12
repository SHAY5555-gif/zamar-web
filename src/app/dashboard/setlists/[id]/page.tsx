"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
}

export default function SetlistDetailPage() {
  const params = useParams();
  const setlistId = params.id as string;

  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddSongs, setShowAddSongs] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/auth/login";
      return;
    }
    fetchSetlist();
    fetchAllSongs();
  }, [setlistId]);

  const fetchSetlist = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/zamar/setlists/${setlistId}`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/auth/login";
          return;
        }
        throw new Error("Failed to fetch setlist");
      }

      const data = await response.json();
      setSetlist(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינת הרשימה");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSongs = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/zamar/songs`,
        { headers: getAuthHeaders() }
      );

      if (response.ok) {
        const data = await response.json();
        setAllSongs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch songs:", err);
    }
  };

  const handleAddSong = async (songId: string) => {
    setAdding(songId);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/zamar/setlists/${setlistId}/songs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ song_id: songId }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add song");
      }

      const updatedSetlist = await response.json();
      setSetlist(updatedSetlist);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהוספת השיר");
    } finally {
      setAdding(null);
    }
  };

  const handleRemoveSong = async (songId: string) => {
    if (!confirm("להסיר את השיר מהרשימה?")) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/zamar/setlists/${setlistId}/songs/${songId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove song");
      }

      const updatedSetlist = await response.json();
      setSetlist(updatedSetlist);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהסרת השיר");
    }
  };

  // Filter songs that are not already in setlist
  const availableSongs = allSongs.filter(
    (song) => !setlist?.songs.some((s) => s.song_id === song._id)
  );

  const filteredSongs = availableSongs.filter(
    (song) =>
      song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!setlist) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">הרשימה לא נמצאה</p>
          <Link href="/dashboard/setlists" className="text-indigo-600 hover:underline">
            חזרה לרשימות
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/setlists" className="text-gray-600 hover:text-indigo-600">
              חזרה
            </Link>
            <h1 className="text-xl font-bold text-gray-900">{setlist.name}</h1>
            <span className="text-gray-500">({setlist.songs.length} שירים)</span>
          </div>
          <div className="flex items-center gap-2">
            {setlist.songs.length > 0 && (
              <Link
                href={`/dashboard/setlists/${setlistId}/perform`}
                className="bg-green-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
              >
                התחל הופעה
              </Link>
            )}
            <button
              onClick={() => setShowAddSongs(!showAddSongs)}
              className="bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {showAddSongs ? "סגור" : "הוסף שירים"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-right">
            {error}
          </div>
        )}

        {/* Add Songs Panel */}
        {showAddSongs && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 text-right">הוספת שירים</h2>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="חיפוש שיר..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 text-right"
            />
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredSongs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  {searchTerm ? "לא נמצאו שירים" : "כל השירים כבר ברשימה"}
                </p>
              ) : (
                filteredSongs.map((song) => (
                  <div
                    key={song._id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{song.title}</p>
                      <p className="text-sm text-gray-500">{song.artist}</p>
                    </div>
                    <button
                      onClick={() => handleAddSong(song._id)}
                      disabled={adding === song._id}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {adding === song._id ? "מוסיף..." : "הוסף"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Setlist Songs */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold text-gray-900 text-right">שירים ברשימה</h2>
          </div>
          {setlist.songs.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 mb-4">אין שירים ברשימה עדיין</p>
              <button
                onClick={() => setShowAddSongs(true)}
                className="text-indigo-600 hover:underline"
              >
                הוסף שירים
              </button>
            </div>
          ) : (
            <ul className="divide-y">
              {setlist.songs
                .sort((a, b) => a.position - b.position)
                .map((song, index) => (
                  <li
                    key={song.song_id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-full font-bold">
                        {index + 1}
                      </span>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{song.title}</p>
                        <p className="text-sm text-gray-500">{song.artist}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveSong(song.song_id)}
                      className="text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg"
                    >
                      הסר
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
