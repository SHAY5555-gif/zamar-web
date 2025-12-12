"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
}

interface SongDetails {
  _id: string;
  title: string;
  artist: string;
  lyrics: string;
  language: string;
}

export default function PerformancePage() {
  const params = useParams();
  const router = useRouter();
  const setlistId = params.id as string;

  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [currentSongDetails, setCurrentSongDetails] = useState<SongDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/auth/login";
      return;
    }
    fetchSetlist();
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

      if (data.songs && data.songs.length > 0) {
        const sortedSongs = [...data.songs].sort((a, b) => a.position - b.position);
        await fetchSongDetails(sortedSongs[0].song_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינת הרשימה");
    } finally {
      setLoading(false);
    }
  };

  const fetchSongDetails = async (songId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/zamar/songs/${songId}`,
        { headers: getAuthHeaders() }
      );

      if (response.ok) {
        const data = await response.json();
        setCurrentSongDetails(data);
      }
    } catch (err) {
      console.error("Failed to fetch song details:", err);
    }
  };

  const sortedSongs = setlist?.songs?.sort((a, b) => a.position - b.position) || [];

  const goToSong = useCallback(async (index: number) => {
    if (index >= 0 && index < sortedSongs.length) {
      setCurrentSongIndex(index);
      await fetchSongDetails(sortedSongs[index].song_id);
    }
  }, [sortedSongs]);

  const goToPrevious = useCallback(() => {
    if (currentSongIndex > 0) {
      goToSong(currentSongIndex - 1);
    }
  }, [currentSongIndex, goToSong]);

  const goToNext = useCallback(() => {
    if (currentSongIndex < sortedSongs.length - 1) {
      goToSong(currentSongIndex + 1);
    }
  }, [currentSongIndex, sortedSongs.length, goToSong]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        goToNext();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        goToPrevious();
      } else if (e.key === "Escape") {
        router.push(`/dashboard/setlists/${setlistId}`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, router, setlistId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !setlist || sortedSongs.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <p className="mb-4">{error || "אין שירים ברשימה"}</p>
          <Link href={`/dashboard/setlists/${setlistId}`} className="text-indigo-400 hover:underline">
            חזרה לרשימה
          </Link>
        </div>
      </div>
    );
  }

  const currentSong = sortedSongs[currentSongIndex];
  const isRTL = currentSongDetails?.language === "he" ||
                currentSongDetails?.language === "ar" ||
                currentSongDetails?.language === "aramaic";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/setlists/${setlistId}`}
            className="text-gray-400 hover:text-white"
          >
            X סגור
          </Link>
          <span className="text-gray-400">|</span>
          <span className="text-white font-medium">{setlist.name}</span>
        </div>
        <div className="text-gray-400">
          {currentSongIndex + 1} / {sortedSongs.length}
        </div>
      </header>

      {/* Song Title */}
      <div className="bg-gray-800 px-4 py-4 text-center">
        <h1 className="text-2xl font-bold text-white">{currentSong.title}</h1>
        <p className="text-gray-400">{currentSong.artist}</p>
      </div>

      {/* Lyrics */}
      <main className="flex-1 overflow-y-auto p-6">
        {currentSongDetails ? (
          <div
            className={`max-w-3xl mx-auto whitespace-pre-wrap text-xl leading-relaxed ${isRTL ? "text-right" : "text-left"}`}
            dir={isRTL ? "rtl" : "ltr"}
          >
            {currentSongDetails.lyrics}
          </div>
        ) : (
          <div className="text-center text-gray-400">טוען מילים...</div>
        )}
      </main>

      {/* Navigation */}
      <footer className="bg-gray-900 px-4 py-4">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <button
            onClick={goToPrevious}
            disabled={currentSongIndex === 0}
            className="flex items-center gap-2 px-6 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span>הקודם</span>
          </button>

          {/* Song List */}
          <div className="flex-1 mx-4 overflow-x-auto">
            <div className="flex gap-2 justify-center">
              {sortedSongs.map((song, index) => (
                <button
                  key={song.song_id}
                  onClick={() => goToSong(index)}
                  className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
                    index === currentSongIndex
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={goToNext}
            disabled={currentSongIndex === sortedSongs.length - 1}
            className="flex items-center gap-2 px-6 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span>הבא</span>
          </button>
        </div>

        <div className="text-center text-gray-500 text-sm mt-2">
          השתמש בחיצים לניווט | ESC לסגירה
        </div>
      </footer>
    </div>
  );
}
